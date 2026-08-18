/**
 * 행동 옵코드 핸들러 — `AttackTo` · `ActionMoveAttackRange` · `MoveTo` · `ActionMoveIdle`
 * · `GuardTo` · `HealMindTo`.
 *
 * 정본 = `~/fesim_data/extracted/il2cpp/ai_engine_src/H_handlers.md`(MP4 디스어셈블).
 * ☠판독에 없는 규칙은 만들지 않는다 — 못 하는 옵코드는 `deficit`으로 올린다.
 */
import {
  allianceOf,
  effectiveWeapons,
  canChainGuard,
  effectiveSkills,
  makeCostAt,
  staffHealAmount,
  movePower,
  movePredicates,
  piercePath,
  moveBudgetOn,
  type BattleAction,
  type BattleMap,
  type GameState,
  type RandomSource,
  type UnitState,
} from "../battle.js";
import { attackRange, movementRange, type MoveType } from "../range.js";
import {
  aiIsRandom,
  betterAttack,
  getAttackPosition,
  getAttackScore,
  moveImageOf,
  type AttackContext,
  type AttackEvaluation,
} from "./attack.js";
import { movePowerOf, parsePos } from "./cause.js";
import { NONE, type ActionResult } from "./interpreter.js";
import { enumerateRing, healRodPositionScore, sidePosition, terrainScoreAt } from "./position.js";
import { ACT, AI_FLAG, AI_THINK, AI_VALUE, ATTACK_FLAG } from "./types.js";
import { aiHealCondition, moveLimitAllows, parseMoveLimit } from "./unit.js";

/** `AIThink.MoveFlag`. */
export const MOVE_FLAG = { through: 1, break: 2, back: 4, slow: 8, door: 16, ignore: 32, ignoreIceTile: 64 } as const;

export interface HandlerContext extends AttackContext {
  unit: UnitState;
  /** 이 슬롯의 dispos CSV 토큰. */
  args: readonly string[];
  /** `AIOrder.m_IsAllowIdle` — 페이즈 스텝 10 이후에만 true. */
  allowIdle: boolean;
  /** `AIThink[+0x50]` — 표적별 "이미 노린 아군 수". 확정될 때마다 +1(호출측이 소유). */
  targeted: Record<string, number>;
}

const key = (state: GameState, x: number, y: number): number => y * state.map.width + x;

/**
 * `MapFor$$EachEnemyUnit`(0x1DC6960) 열거 순서 —
 * ★진영 0(Player) → 1(Enemy) → 2(Ally) 순, 각 진영 안에서는 배치(dispos) 순. 조기 종료 없음.
 */
export function eachEnemyUnit(state: GameState, actor: UnitState): UnitState[] {
  const mine = allianceOf(state.map, actor.force);
  const out: UnitState[] = [];
  for (const force of [0, 1, 2]) {
    if (allianceOf(state.map, force) === mine) continue;
    for (const u of state.units) if (!u.dead && u.force === force) out.push(u);
  }
  return out;
}

/**
 * `AIThink$$IsAttackPermission`(0x192ED50) 중 엔진이 사영한 조건.
 * ☠UnderRoof·부활대기(HpStock)·TerrainData.IsNotTarget·`Unit.IsDontAttack`는 미사영이라 판정하지 않는다.
 */
const isAttackPermission = (state: GameState, target: UnitState): boolean =>
  !target.dead && target.x >= 0 && target.y >= 0 && target.x < state.map.width && target.y < state.map.height;

/**
 * `AIThink$$IsAttackPermissionOnlyCommand`(0x193C830) — 옵코드별 표적 필터.
 * ★`AT_Default(0)`는 필터가 전혀 없다. 나머지는 한 줄짜리 술어 하나씩.
 * 반환 `undefined` = 판정에 필요한 사영이 없다(정직 결손).
 */
export function targetFilter(opcode: number, args: readonly string[], target: UnitState): boolean | undefined {
  switch (opcode) {
    case ACT.attackDefault:
    case ACT.attackMiddleLow:
    case ACT.attackLow:
    case ACT.attackPriorItem:
      return true;
    case ACT.attackPerson:
      return target.pid === args[0];
    case ACT.attackExcludePerson:
      return target.pid !== args[0];
    case ACT.attackExcludePerson2:
      return target.pid !== args[0] && target.pid !== args[1];
    case ACT.attackExcludeBand:
      return (target.ai?.bandNo ?? 0) !== Number(args[0]);
    case ACT.attackForce: {
      const want = FORCE_TOKENS[args[0] ?? ""];
      return want === undefined ? undefined : target.force === want;
    }
    case ACT.attackHero:
      // ★`PersonData$$IsHero`(0x1F2A0B0) = `CommonSkills`에 `SkillData.s_HeroSkill`이 서 있는가이고,
      //   그 정적 필드는 `OnCompletedEnd`(0x248D3F8)에서 **`SID_主人公`**로 채워진다.
      //   ⇒ "보스"가 아니라 **주인공 지정**이다(전 1523인물 중 PID_リュール 1건).
      return effectiveSkills(target)?.some((sk) => sk.Sid === "SID_主人公") === true;
    case ACT.attackJob:
    case ACT.attackJobNearestPosition:
      // `t.m_Job(0x48) == v0.GetJob()` — 8(JobNearestPosition)은 7과 판정이 완전히 동일하다(점프테이블 동일 분기).
      return target.jid === undefined ? undefined : target.jid === args[0];
    default:
      return undefined;
  }
}

/** `AIValue.GetValue`의 FORCE_* 리터럴 → `Force.Type`(dispos force 번호와 같은 체계). */
const FORCE_TOKENS: Record<string, number> = { FORCE_PLAYER: 0, FORCE_ENEMY: 1, FORCE_ALLY: 2 };

/**
 * `AIThink$$AttackTo`(0x1945DB0).
 * ★`GetAttackScore`에 넘기는 `AttackFlag`는 **항상 0**이다(0x19466EC `str wzr` 하나뿐) —
 * Break/Chain/Nearest/Side/ChainAttackCount 어느 비트도 붙지 않는다.
 */
export function attackTo(ctx: HandlerContext, opcode: number): ActionResult {
  const actor = ctx.unit;
  // 이동 이미지는 표적 루프 **밖에서 한 번만** 만든다(movePower = -1 = 실이동력).
  const image = moveImageOf(ctx.state, actor);
  let best: AttackEvaluation | undefined;
  let unsupported: string | undefined;

  for (const target of eachEnemyUnit(ctx.state, actor)) {
    if (!isAttackPermission(ctx.state, target)) continue;
    const ok = targetFilter(opcode, ctx.args, target);
    if (ok === undefined) {
      unsupported = `표적 필터 미사영: AT ${opcode}`;
      break;
    }
    if (!ok) continue;
    const cand = getAttackScore(ctx, actor, target, 0, image);
    if (cand === undefined) continue;
    if (best === undefined || betterAttack(cand, best, ctx.rng)) best = cand;
  }
  if (unsupported !== undefined) return { kind: "deficit", reason: unsupported };
  if (best === undefined) return NONE;

  // ★AttackLongRange(4) 회전인데 근접무기가 뽑혔으면 Reserve — 뒤 페이즈로 미룬다.
  const weapon = effectiveWeapons(actor)?.[best.weapon];
  if (ctx.think === AI_THINK.attackLongRange && (weapon?.rangeMax ?? 0) < 2) return NONE;

  ctx.targeted[best.target] = (ctx.targeted[best.target] ?? 0) + 1;
  const actions: BattleAction[] = [];
  if (best.moveX !== actor.x || best.moveY !== actor.y) {
    actions.push({ type: "move", unit: actor.id, x: best.moveX, y: best.moveY });
  }
  /**
   * ★인게이지 중인 적은 **통상 공격 대신 기술을 쓴다** — 실기 앵커(2026-08-18 사용자 관측):
   * m002 2회전 뤼미에르가 인게이지 상태로 H9(8,7)의 리월에게 닿으면 오버드라이브를 쓴다.
   * ⚠근사 = **표적·발판 선택은 통상 공격 점수 그대로**다(`EG_Attack`(50)의 점수·도색 람다는 미판독).
   * 리워프형(세리카류)은 착지 칸 선택이 그 람다에 있어 손대지 않는다 — 정직 결손으로 남긴다.
   */
  const art = actor.engage?.engaging === true ? actor.engageArt : undefined;
  if (art !== undefined && (art.rewarp ?? 0) === 0 && (actor.engage?.count ?? 0) >= (art.cost ?? 0)) {
    // ☠관통형은 발판에서 경로가 성립해야만 나간다(아군 차단·맵 밖·착지 불가) — reduce와 **같은 함수**로
    //   먼저 물어본다. 안 물으면 엔진이 거부하고 그 유닛의 턴이 조용히 증발한다.
    const target = ctx.state.units.find((u) => u.id === best.target);
    const stand = { ...actor, x: best.moveX, y: best.moveY };
    const ok =
      art.pierce !== true ||
      (target !== undefined && piercePath(ctx.state, ctx.state.units, stand, target) !== undefined);
    if (ok) {
      actions.push({ type: "engageAttack", unit: actor.id, target: best.target });
      return { kind: "decide", actions };
    }
  }
  actions.push({ type: "attack", unit: actor.id, target: best.target, weapon: best.weapon });
  return { kind: "decide", actions };
}

/**
 * `AIThink$$MoveTo`(0x1948E20) — 접근 알고리즘 정본.
 * A버퍼 = 이번 턴 이동 코스트, B버퍼 = **목표로부터의 거리장**.
 * 칸 점수 가중치 = `distB(1<<16) ≫ 지형(1<<12) ≫ costA(1<<5) ≫ ||dx|-|dz||(1)`.
 * ★초기 임계가 "제자리의 distB"라 **목표에 가까워지는 칸만** 후보가 되고,
 * 그래서 사거리가 닿지 않아도 **여러 턴에 걸친 접근이 자연 발생**한다.
 */
export function moveTo(
  state: GameState,
  actor: UnitState,
  goalX: number,
  goalY: number,
  flag: number,
  rng: RandomSource,
): { x: number; y: number } | undefined {
  const image = moveImageOf(state, actor);
  const field = distanceField(state, actor, goalX, goalY);
  const ownDist = field.get(key(state, actor.x, actor.y));
  if (ownDist === undefined) return undefined;
  const ignore = (flag & MOVE_FLAG.ignore) !== 0;
  const ignoreIce = (flag & MOVE_FLAG.ignoreIceTile) !== 0;
  // base = 100 - 제자리 distB (Back 플래그면 0 = 어디든 후보)
  let best = ((flag & MOVE_FLAG.back) !== 0 ? 0 : 100 - ownDist) * 2 ** 16;
  let pick: { x: number; y: number } | undefined;
  const occupied = new Set(
    state.units.filter((u) => !u.dead && u.id !== actor.id).map((u) => key(state, u.x, u.y)),
  );

  for (const [k, costA] of image) {
    const distB = field.get(k);
    if (distB === undefined) continue;
    if (occupied.has(k)) continue;
    const x = k % state.map.width;
    const y = Math.floor(k / state.map.width);
    // `GetBoundaryIceTileMove`(0x1942B80) — 얼음 지형이 없으면 목표 칸에서만 4, 그 외 0(코드 확정).
    const ice = ignoreIce ? 0 : x === goalX && y === goalY ? 4 : 0;
    const base = ice - distB + 100;
    const terrain = terrainScoreAt(state.map, actor, x, y, state.terrainPatches);
    const v = ignore
      ? (((base << 7) - costA + 100) << 4) + terrain
      : ((terrain + (base << 4)) << 7) - costA + 100;
    const score = v * 32 - Math.abs(Math.abs(goalX - x) - Math.abs(goalY - y)) + 31;
    if (score < best) continue;
    if (score === best && aiIsRandom(rng)) continue;
    best = score;
    pick = { x, y };
  }
  return pick;
}

/** 목표 칸으로부터의 지형 거리장(`UnitAIMoveXY(goal, 100)`) — 점유는 보지 않는다(거리장이지 도달성이 아니다). */
function distanceField(state: GameState, actor: UnitState, goalX: number, goalY: number): Map<number, number> {
  const out = new Map<number, number>();
  if (state.map.costs[actor.moveType] === undefined) return out;
  for (const t of movementRange({
    width: state.map.width,
    height: state.map.height,
    movePoints: 100,
    start: { x: goalX, y: goalY },
    costAt: makeCostAt(state.map, state.structures, actor.moveType, state.terrainPatches),
  })) {
    out.set(key(state, t.x, t.y), Math.min(t.cost, 99));
  }
  return out;
}

/**
 * `AIThink$$ActionMoveAttackRange`(0x194E0D0) → `Impl`(0x194E160).
 * ★`isWeak`(86·87)는 `GetAttackScore(ScoreExpectation)` = **기대 가한 데미지를 최대화**하고,
 *   그 외(82~85·109)는 `(도달 턴 수)*256 + (이미 노린 아군 수)`를 **최소화**한다
 *   = "가장 가깝고 아직 아무도 안 노린 적".
 * ☠이 옵코드는 **공격을 커밋하지 않는다** — 목적지만 정한다(실제 공격은 앞선 Attack 페이즈의 몫).
 */
export function moveAttackRange(ctx: HandlerContext, opcode: number, v0: number | undefined): ActionResult {
  const actor = ctx.unit;
  const isSide = (opcode | 4) === 87;
  const isWeak = (opcode | 1) === 87;
  const isIgnore = opcode === ACT.moveAttackRangeIgnore;
  const divisor = Math.min(Math.max(movePower(actor), 0), 99);
  if (divisor < 1) return NONE; // ★movePower < 1이면 즉시 None(0나눗셈 방지)

  // factor: cmd 109 또는 V_Max → -1(무제한) · V_Default → isWeak ? 200 : 100 · 그 외 v0 수치.
  const factor =
    opcode === ACT.moveAttackRangeExcludePerson2 || v0 === AI_VALUE.max
      ? -1
      : v0 === undefined || v0 === AI_VALUE.default
        ? isWeak
          ? 200
          : 100
        : v0;
  const person0 =
    opcode === ACT.moveAttackRangeExcludePerson
      ? ctx.args[1]
      : opcode === ACT.moveAttackRangeExcludePerson2
        ? ctx.args[0]
        : undefined;
  const person1 = opcode === ACT.moveAttackRangeExcludePerson2 ? ctx.args[1] : undefined;

  const image = moveImageOf(ctx.state, actor, factor);
  const attackable = attackImageOf(ctx.state, actor, image);
  const flag = ATTACK_FLAG.nearest | ATTACK_FLAG.aheadIgnore | (isSide ? ATTACK_FLAG.side : 0);

  let best = isWeak ? 0 : 0x6500;
  let chosen: { target: UnitState; moveX: number; moveY: number } | undefined;

  for (const target of eachEnemyUnit(ctx.state, actor)) {
    if (!isAttackPermission(ctx.state, target)) continue;
    if (person0 !== undefined && target.pid === person0) continue;
    if (person1 !== undefined && target.pid === person1) continue;
    if (!attackable.has(key(ctx.state, target.x, target.y))) continue;

    const n0 = ctx.targeted[target.id] ?? 0;
    let moveX: number;
    let moveY: number;
    let score: number;
    if (isWeak) {
      const ev = getAttackScore(ctx, actor, target, flag | ATTACK_FLAG.scoreExpectation, image);
      if (ev === undefined) continue;
      const moveCost = image.get(key(ctx.state, ev.moveX, ev.moveY)) ?? 0;
      moveX = ev.moveX;
      moveY = ev.moveY;
      score = ev.battle - 3 * n0 - Math.floor((moveCost + 1) / 3) + 512;
    } else {
      const pos = bestPositionAnyWeapon(ctx, actor, target, flag, image);
      if (pos === undefined) continue;
      const moveCost = image.get(key(ctx.state, pos.moveX, pos.moveY)) ?? 0;
      moveX = pos.moveX;
      moveY = pos.moveY;
      score = n0 + (Math.trunc((n0 + moveCost) / divisor) << 8);
    }
    if (isWeak ? score < best : score > best) continue;
    if (score === best && aiIsRandom(ctx.rng)) continue;
    best = score;
    chosen = { target, moveX, moveY };
  }
  if (chosen === undefined) return NONE;

  const moveFlag = isIgnore ? MOVE_FLAG.ignore : 0;
  // 1차 목표 = 적이 서 있는 칸, 실패하면 2차 = 공격 위치.
  const dest =
    moveTo(ctx.state, actor, chosen.target.x, chosen.target.y, moveFlag, ctx.rng) ??
    moveTo(ctx.state, actor, chosen.moveX, chosen.moveY, moveFlag, ctx.rng);
  if (dest === undefined) return NONE;
  ctx.targeted[chosen.target.id] = (ctx.targeted[chosen.target.id] ?? 0) + 1;
  // 목적지만 확정한다 — 이동 후 대기(그 유닛의 그 턴 행동 종료).
  const actions: BattleAction[] = [];
  if (dest.x !== actor.x || dest.y !== actor.y) {
    actions.push({ type: "move", unit: actor.id, x: dest.x, y: dest.y });
  }
  actions.push({ type: "wait", unit: actor.id });
  return { kind: "decide", actions };
}

/** `AIDeploy.AttackImage` — 도달 가능 칸 + 무기 사거리로 칠한 "때릴 수 있는 칸" 집합. */
function attackImageOf(state: GameState, actor: UnitState, image: Map<number, number>): Set<number> {
  const weapons = effectiveWeapons(actor) ?? [];
  let min = Infinity;
  let max = 0;
  for (const w of weapons) {
    min = Math.min(min, w.rangeMin);
    max = Math.max(max, w.rangeMax);
  }
  if (max === 0) return new Set();
  const stand = [...image.keys()].map((k) => ({ x: k % state.map.width, y: Math.floor(k / state.map.width) }));
  return new Set(
    attackRange(stand, min, max, state.map.width, state.map.height).map((t) => key(state, t.x, t.y)),
  );
}

/** `GetAttackPosition(itemIndex = -1)` — 무기 슬롯 전수 중 최선의 공격 위치. */
function bestPositionAnyWeapon(
  ctx: AttackContext,
  actor: UnitState,
  target: UnitState,
  flag: number,
  image: Map<number, number>,
): { moveX: number; moveY: number } | undefined {
  const weapons = effectiveWeapons(actor) ?? [];
  let best: { moveX: number; moveY: number; score: number } | undefined;
  for (let i = 0; i < weapons.length; i++) {
    const pos = getAttackPosition(ctx, actor, target, i, flag, image);
    if (pos === undefined) continue;
    if (best === undefined || pos.score > best.score) best = { moveX: pos.moveX, moveY: pos.moveY, score: pos.score };
  }
  return best;
}

/**
 * `AIThink$$ActionMoveIdle`(0x194D890).
 * ★"제자리 대기"를 **행동으로 확정하지 않는다** — `UnitAI.Idle`만 세우고 None을 반환한다.
 * 즉 루틴 마지막이 MV_Idle이면 그 유닛은 그 턴에 문자 그대로 아무것도 하지 않는다(결손이 아니라 정상 거동).
 * `m_IsAllowIdle`은 페이즈 스텝 10 이후에만 참이지만, 어느 쪽이든 반환값은 None이다
 * (Decide는 `ProcessingMutation`이 행동을 갈아끼웠을 때뿐 — 그 경로는 미배선).
 */
export function moveIdle(): ActionResult {
  return NONE;
}

/**
 * `AIThink$$CalcHealRodScore`(0x19598B0) — 회복 지팡이 **대상+아이템** 선택 키.
 *
 * ☠**AI_ENGINE §5-5의 비트 위치는 8비트씩 높게 적혀 있었다**(MP4 2라운드 직접 재판독으로 정정).
 * 실제 꼬리(0x19599A4~0x19599CC):
 * ```
 * cset w8, eq ; lsl w21, w8, #8     ; inPlace << 8
 * w0 = Math.Max(heal, 0) + w21
 * add w8, w19, w0, lsl #8           ; ★score = damage + (max(heal,0) << 8) + (inPlace << 16)
 * ```
 * 플레이어 진영 경로(0x1959958)는 `inPlace` 항을 빼고 `damage + (max(heal,0) << 8)`만 만든다.
 * `inPlace` = 시전 위치가 **자기 현재 칸**인가(`cneg`/`cset eq`로 |dx|,|dz| 동시 0 판정).
 * ⇒ 우선순위 자체는 §5-5와 같다: **제자리 ≫ 회복량 ≫ 부수 대미지**.
 * ☠**`damage`는 "부수 대미지"가 아니라 대상의 부족 HP**(maxHp - hp)다
 * (`GetHealRodScoreImpl` 0x1959E48 `str w21,[x19,#0x14]`, w21 = maxHp - hp) — AI_ENGINE §5-5의 오독을 정정한다.
 * `heal`은 `Min(지팡이 회복력, 부족분)`이라 만피에 가까운 대상은 heal이 깎이고 damage만 남는다
 * ⇒ **"많이 회복되는 대상 우선, 같으면 더 많이 다친 대상 우선"**.
 */
export function calcHealRodScore(heal: number, damage: number, inPlace: boolean, isPlayerForce: boolean): number {
  const base = damage + (Math.max(heal, 0) << 8);
  return isPlayerForce ? base : base + ((inPlace ? 1 : 0) << 16);
}

/**
 * `AIThink$$GetHealRodPosition`(0x1958120) — 회복 시전 위치.
 * ☠공격 위치와 **층위가 정반대**다(AI_ENGINE §5-A-8): `score = ((100 - move) << 4) + 지형`
 * — 힐러는 좋은 지형보다 **덜 움직이는 것**을 우선한다. 동점은 `AI.IsRandom` 코인플립.
 */
function healRodPosition(
  ctx: HandlerContext,
  target: UnitState,
  staff: { rangeMin: number; rangeMax: number },
  image: Map<number, number>,
): { moveX: number; moveY: number; move: number } | undefined {
  let best: { moveX: number; moveY: number; move: number; score: number } | undefined;
  for (const tile of enumerateRing(
    target.x, target.y, staff.rangeMin, staff.rangeMax, ctx.state.map.width, ctx.state.map.height,
  )) {
    const move = image.get(key(ctx.state, tile.x, tile.y));
    if (move === undefined) continue;
    const terrain = terrainScoreAt(ctx.state.map, ctx.unit, tile.x, tile.y, ctx.state.terrainPatches);
    const score = healRodPositionScore(move, terrain);
    if (best !== undefined) {
      if (score < best.score) continue;
      if (score === best.score && aiIsRandom(ctx.rng)) continue;
    }
    best = { moveX: tile.x, moveY: tile.y, move, score };
  }
  return best === undefined ? undefined : { moveX: best.moveX, moveY: best.moveY, move: best.move };
}

/**
 * `AIThink$$RodHealTo`(0x1946A00) — `RD_Heal(20)`. `ActionRodHeal`(0x19469F0)은 `b RodHealTo` 썽크다.
 *
 * 판독(MP4 2라운드 직접 디스어셈블):
 * ```
 * 0x01946B20  HasHealRod(unit, 0) 거짓  → None(0)
 * 0x01946B94  UnitAIMove(deploy, unit, movePower = -1, flag = 2, weaponFlag = 0x8000000)
 * 0x01946C90  MapFor$$EachAllyUnit(ForceCursor, UnitFunction(<RodHealTo>b__0))   ; ★아군 전수
 * 0x01946C9C  dc.itemIndex == -1 이면 → None(0)
 * 0x01946D04~ mind.ItemIndex / mind.X / mind.Z 커밋
 * ```
 * `<RodHealTo>b__0(ally)` 0x294BF60 = 대상의 셀마다 `GetHealRodScore` → **최댓값 채택, 동점 `AI.IsRandom`**.
 * `GetHealRodScore` 0x1959E80 = 슬롯 0..7 중 `ItemData.UseType(0x50) == 2`만 순회 →
 * `GetHealRodScoreImpl` 0x19599F0(= `IsHealRodPermission` + **자기 자신 제외** + `ItemData[0x80] == 2`(RodType 회복)
 * + `GetHealRodPosition`) → `CalcHealRodScore` 최댓값.
 *
 * ☠**미판독 잔여**: `IsHealRodPermission`(0x19594E0) 본문 전량. AI_ENGINE §9-1이 이 함수를 `AskHealA`의
 * 소비처로 명시하므로 **AskHealA(대상 HP% < healRateA) + 피해 있음**으로 이식하고 장부에 assumed로 남긴다.
 */
export function rodHealTo(ctx: HandlerContext): ActionResult {
  const actor = ctx.unit;
  const staves = (actor.staves ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.rodType === 2 && s.uses > 0);
  if (staves.length === 0) return NONE; // HasHealRod 게이트
  const image = moveImageOf(ctx.state, actor);
  let best: { score: number; target: string; staff: number; moveX: number; moveY: number } | undefined;

  for (const ally of ctx.state.units) {
    if (ally.dead || ally.id === actor.id || ally.force !== actor.force) continue;
    const missing = ally.stats.hp - ally.hp;
    if (missing < 1) continue;
    // `IsHealRodPermission`(0x19594E0) 5·6단: 비플레이어 진영 대상은 `AskHealA | AskHealB` 중 하나,
    // 플레이어 진영 대상은 `hp*100/maxHp < 75` 고정. ★aiHealCondition이 force 0에 75/30을 강제하므로
    //   두 규칙 모두 `askHealA || askHealB`로 정확히 표현된다.
    const ask = aiHealCondition(ally);
    if (!ask.askHealA && !ask.askHealB) continue;
    for (const { s, i } of staves) {
      const pos = healRodPosition(ctx, ally, s, image);
      if (pos === undefined) continue;
      const healed = Math.min(staffHealAmount(actor, ally, s), missing);
      const score = calcHealRodScore(
        healed, missing, pos.moveX === actor.x && pos.moveY === actor.y, actor.force === 0,
      );
      if (best !== undefined) {
        if (score < best.score) continue;
        if (score === best.score && ctx.rng.next(2) !== 0) continue;
      }
      best = { score, target: ally.id, staff: i, moveX: pos.moveX, moveY: pos.moveY };
    }
  }
  if (best === undefined) return NONE;
  const actions: BattleAction[] = [];
  if (best.moveX !== actor.x || best.moveY !== actor.y) {
    actions.push({ type: "move", unit: actor.id, x: best.moveX, y: best.moveY });
  }
  actions.push({ type: "staff", unit: actor.id, target: best.target, staff: best.staff });
  return { kind: "decide", actions };
}

/**
 * `AIThink$$ActionMovePosition`(0x194F5A0) — `MV_Position(91)`.
 *
 * 판독(MP4 2라운드 직접 디스어셈블):
 * ```
 * 0x0194F6A4  Unit$$CanUnlockDoor(unit, 1) → moveFlag 베이스 0x1200 : 0x1000
 * 0x0194F6F0  mov w2, #0x64
 * 0x0194F704  UnitAIMove(deploy, unit, movePower = 100, flag, weaponFlag = 0)   ; ★맵 전역 이미지
 * 0x0194F71C  x = v0.get_X() ; 0x0194F72C  z = v0.get_Z()                       ; dispos `pos(x,z)`
 * 0x0194F784  tbnz w8, #0x1f → None(0)                                          ; 목표 칸 도달 불가
 * 0x0194F7B4  mov w3, #0x10 → MoveTo(this, x, z, MoveFlag.Door(16))
 * ```
 * ★`Door(16)`은 `MoveTo` 칸 채점에 쓰이지 않는다(채점이 보는 것은 Ignore/Back/IgnoreIceTile뿐) —
 * 확정 뒤 `ToDoor`로 문을 여는 데만 쓰이며, 그 부수효과는 엔진 미모델링이다.
 */
export function movePosition(ctx: HandlerContext): ActionResult {
  const pos = parsePos(ctx.args[0]);
  if (pos === undefined) return { kind: "deficit", reason: "MV_Position 좌표 인자(pos(x,z)) 부재" };
  // 목표 칸이 **맵 전역 이동 이미지**에 없으면(도달 불가) None.
  const wide = moveImageOf(ctx.state, ctx.unit, -1);
  if (!wide.has(key(ctx.state, pos.x, pos.y))) return NONE;
  const dest = moveTo(ctx.state, ctx.unit, pos.x, pos.y, MOVE_FLAG.door, ctx.rng);
  // ★이미 목표 칸에 있으면 MoveTo의 초기 임계를 넘는 칸이 없어 `UnitAI.Idle`만 서고 None이 된다.
  if (dest === undefined || (dest.x === ctx.unit.x && dest.y === ctx.unit.y)) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: ctx.unit.id, x: dest.x, y: dest.y },
      { type: "wait", unit: ctx.unit.id },
    ],
  };
}

/** 국면의 조사 지점 중 종별 일치분. */
const interactionsOf = (ctx: HandlerContext, kind: string): { x: number; y: number; pid?: string }[] =>
  (ctx.state.map.interactions ?? []).filter((i) => i.kind === kind);

/**
 * `AIThink$$ActionMoveEscape`(0x1950C40) — `MV_Escape(96)`/`MV_EscapeSlow`.
 *
 * 판독(I_handlers2 §5): A버퍼 = movePower 100 이동 이미지, 후보는 `IsEscapePosition`(0x195FDF0)인 칸,
 * 점수 `100 - costA` 최대(= 가장 싸게 닿는 이탈점), 동점 코인플립. 끝은
 * `MoveTo(tx, tz, flag = Through|Break|Door(0x13))`.
 * ★**도착해도 이 핸들러는 유닛을 제거하지 않는다**(488명령 전수에 제거 계열 호출 없음) —
 * 이탈 소멸은 별도 계층이므로 **이동 축만 배선해도 오재현이 아니다**.
 *
 * ☠`IsEscapePosition`의 두 갈래 중 **"플레이 영역 테두리" 갈래는 미배선**이다 —
 * 엔진에 PlayArea 사각형 사영이 없어(맵 경계와 다르다) 지어낼 수 없다.
 * 조사 지점(`MapInspectors.IsEnable(Kind.Escape)`) 갈래만 소비하고, 지점이 아예 없으면 정직 결손으로 올린다.
 */
export function moveEscape(ctx: HandlerContext): ActionResult {
  const actor = ctx.unit;
  // 이탈점에 인물이 걸려 있으면 그 유닛 전용이다(S015 반지 소지 적).
  const claimed = (ctx.state.map.interactions ?? []).filter(
    (i) => i.kind === "escape" && i.pid !== undefined && i.pid !== actor.pid,
  );
  const isClaimedByOther = (x: number, y: number): boolean => claimed.some((c) => c.x === x && c.y === y);
  const image = moveImageOf(ctx.state, actor, -1); // 목표 선정은 맵 전역 도달성으로
  const spots: { x: number; y: number }[] = [];
  for (const k of image.keys()) {
    const x = k % ctx.state.map.width;
    const y = Math.floor(k / ctx.state.map.width);
    if (!isEscapePosition(ctx.state.map, x, y, actor.moveType)) continue;
    if (isClaimedByOther(x, y)) continue;
    spots.push({ x, y });
  }
  if (spots.length === 0) return NONE;
  return moveToward(ctx, spots, MOVE_FLAG.through | MOVE_FLAG.break | MOVE_FLAG.door);
}


/**
 * `AIThink$$ActionMindTreasure`(0x194AC70) — `MI_Treasure(61)`.
 *
 * 판독(I_handlers2 §6): `MapFor.EachPoke(Kind.Tbox(5))` 열거 → 도달 가능·칸 비어 있음 필터 →
 * 점수 `100 - costA` 최대(동점 코인플립 없음) → `MapMind.Type = TreasureBox(23)`, 목적지 = 이동칸.
 *
 * ☠**이동 축만 배선한다** — 상자 개방 실행(내용물 취득·상자 소멸)은 국면에 상자 상태가 없어 미배선이다.
 * ⚠그 결과 도달한 유닛은 이후 턴에 제자리에서 아무것도 하지 않는다(MoveTo가 목표 칸에서 None을 내므로
 * 대기로 흘러간다). 원기라면 열고 떠났을 것이므로 **이 고착은 알려진 오재현**이다(장부 ai.action-handlers).
 */
export function mindTreasure(ctx: HandlerContext): ActionResult {
  const chests = interactionsOf(ctx, "chest");
  if (chests.length === 0) return { kind: "deficit", reason: "상자 미사영: chest 조사 지점 없음" };
  return moveToward(ctx, chests, 0);
}

/** 후보 지점들 중 **이동 코스트가 가장 싼** 곳으로 향한다(`100 - costA` 최대와 동치). */
function moveToward(
  ctx: HandlerContext,
  spots: readonly { x: number; y: number }[],
  flag: number,
): ActionResult {
  const image = moveImageOf(ctx.state, ctx.unit, -1); // movePower 100 = 맵 전역 도달성
  const occupied = new Set(
    ctx.state.units.filter((u) => !u.dead && u.id !== ctx.unit.id).map((u) => key(ctx.state, u.x, u.y)),
  );
  let goal: { x: number; y: number; cost: number } | undefined;
  for (const s of spots) {
    const k = key(ctx.state, s.x, s.y);
    const cost = image.get(k);
    if (cost === undefined || occupied.has(k)) continue;
    if (goal === undefined || cost < goal.cost) goal = { x: s.x, y: s.y, cost };
  }
  if (goal === undefined) return NONE;
  const dest = moveTo(ctx.state, ctx.unit, goal.x, goal.y, flag, ctx.rng);
  if (dest === undefined || (dest.x === ctx.unit.x && dest.y === ctx.unit.y)) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: ctx.unit.id, x: dest.x, y: dest.y },
      { type: "wait", unit: ctx.unit.id },
    ],
  };
}

/**
 * `IsEscapePosition`(0x195FDF0) — 이탈 가능 칸.
 *
 * ★**플레이 영역은 맵 전체가 아니라 "맵에서 바깥 1칸 테두리를 뺀 사각형"**이다.
 * 유일한 기입자 `MapImage$$SetSize(w, h)`(0x1DE2BA0)가 `PlayAreaX = PlayAreaZ = 1`,
 * `PlayAreaX2 = w - 2`, `PlayAreaZ2 = h - 2`를 **상수로** 박고, 호출자는
 * `MapTerrain$$UpdateMapImage`(0x201C400)가 `m_Width`/`m_Height`만 넘기는 곳 하나뿐이다
 * (☠`m_X`/`m_Z`는 쓰이지 않는다 — "플레이 영역 = 맵 사각형"이라는 가설은 반증됐다).
 * 실데이터 대조: 전 54챕터 6090유닛 중 6088이 이 사각형 안이고, 예외 2건은 (0,0) 대기 유닛이다.
 *
 * 판정 = **플레이 영역 테두리 칸이면서 바깥 한 칸이 통행 가능**, 아니면 **Escape 조사 지점**.
 */
export function isEscapePosition(map: BattleMap, x: number, y: number, moveType: MoveType): boolean {
  if ((map.interactions ?? []).some((i) => i.kind === "escape" && i.x === x && i.y === y)) return true;
  const x1 = 1;
  const y1 = 1;
  const x2 = map.width - 2;
  const y2 = map.height - 2;
  if (x < x1 || y < y1 || x > x2 || y > y2) return false;
  const outside =
    x === x1 ? { x: 0, y } : x === x2 ? { x: map.width - 1, y } : y === y1 ? { x, y: 0 } : y === y2 ? { x, y: map.height - 1 } : undefined;
  if (outside === undefined) return false;
  // `IsNoMove` = 이동타입 진입 코스트가 0xFE 초과.
  return (map.costs[moveType]?.[outside.y]?.[outside.x] ?? 255) <= 0xfe;
}

/**
 * `AIThink$$ActionMindEscape`(0x194B390) — `MI_Escape(63)` / `MI_EscapeSlow(64)`.
 *
 * 판독(K_interference_escape §P4): 게이트는 `BmapSize > 1`(대형 유닛) 하나뿐이고,
 * `MapFor.EachPlayArea` + `IsEscapePosition`으로 후보를 모아 **`100 - costA` 최대**를 고른다
 * (☠동점 코인플립이 **없다** — 나중 후보가 이긴다). 칸에 유닛이 있으면 제외.
 * 커밋은 `MapMind.X/Z` + **`MapMind.Type = Escape(19)`**이고 `MoveTo`를 부르지 않는다.
 *
 * ☠**이탈 실행은 이 핸들러가 하지 않는다** — `ProcEscape.OnDispose`(0x1E3A130)가
 * `SetStatus(PureHide|EscapeHere)`로 **은닉+표식**할 뿐이고(사망 아님), 소지품은 유닛과 함께 사라진다.
 * 관측 훅은 `EventSequence.Poke(Kind.Escape)`라 **Lua 층**이다(S015의 "반지 소지 적 이탈 = 패배"가 그것).
 * ⇒ 엔진에는 은닉 상태가 없어 **이동만 배선**한다. 도달한 적이 사라지지 않는 것은 **알려진 오재현**이다.
 */
export function mindEscape(ctx: HandlerContext): ActionResult {
  const actor = ctx.unit;
  // ★`UnitAIMove(movePower = -1)`은 "무제한"이 아니라 **유닛 실이동력**이다(H_handlers §1-1).
  //   맵 전역 이미지를 쓰면 이번 턴에 못 닿는 칸을 목적지로 골라 reduce가 이동을 거부한다
  //   (다턴 소크 게이트가 s015에서 실제로 잡았다 — "불법 이동: (14,27)는 이동 범위 밖").
  const image = moveImageOf(ctx.state, actor);
  const occupied = new Set(
    ctx.state.units.filter((u) => !u.dead && u.id !== actor.id).map((u) => key(ctx.state, u.x, u.y)),
  );
  let best: { x: number; y: number; cost: number } | undefined;
  for (const [k, cost] of image) {
    if (occupied.has(k)) continue;
    const x = k % ctx.state.map.width;
    const y = Math.floor(k / ctx.state.map.width);
    if (!isEscapePosition(ctx.state.map, x, y, actor.moveType)) continue;
    // 점수 = 100 - costA 최대 ⇒ 코스트 최소. 동점은 **나중 후보가 이긴다**(코인플립 없음).
    if (best === undefined || cost <= best.cost) best = { x, y, cost };
  }
  if (best === undefined) return NONE;
  if (best.x === actor.x && best.y === actor.y) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: actor.id, x: best.x, y: best.y },
      { type: "wait", unit: actor.id },
    ],
  };
}

/**
 * `MI_BreakDown(65)` — `ActionMindBreakDown`(0x194C290) · `MV_BreakDown(100)` — `ActionMoveBreakDown`(0x1951E20).
 *
 * ☠**이름과 달리 "구조물 파괴"가 아니다.** 대상은 오직
 * **`MapFor.EachPoke(MapInspector.Kind.BreakdownEnemy = 12)`가 주는 좌표 집합**이고,
 * 구조물의 HP·종별·`Destroyer`는 선택에 **전혀 관여하지 않는다**(전수 확인).
 * 파이프라인은 이 인스펙터를 `EventEntryBreakdownEnemy` → **`defendArea`**로 사영하고 있으며,
 * 실측된 타일이 `TID_防衛床`(방어 바닥)이다 ⇒ **"적이 방어 지점으로 밀고 들어가는" 이동 축**이다.
 *
 * 차이:
 * - `MI_BreakDown` = 실이동력 이미지 · 후보 칸이 **비어 있어야** 함 · `100 - cost` 최대 ·
 *   ☠**동점 코인플립 없음**(뒤 poke가 이긴다) · 커밋 = `MapMind.Type = BreakdownEnemy(18)` + 그 칸.
 * - `MV_BreakDown` = movePower 100 + `BlockFree|DoorFree` 이미지 · 점유 검사 **없음** ·
 *   `100 - cost` 최대 · 동점 **코인플립** · `MoveTo(x, z, MoveFlag.Break(2))`.
 */
export function mindBreakDown(ctx: HandlerContext): ActionResult {
  const spots = interactionsOf(ctx, "defendArea");
  if (spots.length === 0) return { kind: "deficit", reason: "방어 지점 미사영: BreakdownEnemy(defendArea) 조사 지점 없음" };
  const image = moveImageOf(ctx.state, ctx.unit); // 실이동력
  const occupied = new Set(
    ctx.state.units.filter((u) => !u.dead && u.id !== ctx.unit.id).map((u) => key(ctx.state, u.x, u.y)),
  );
  let best: { x: number; y: number; cost: number } | undefined;
  for (const s of spots) {
    const k = key(ctx.state, s.x, s.y);
    if (occupied.has(k)) continue;
    const cost = image.get(k);
    if (cost === undefined) continue;
    // `100 - cost` 최대 = 코스트 최소. 동점은 **뒤 후보가 이긴다**(코인플립 없음).
    if (best === undefined || cost <= best.cost) best = { x: s.x, y: s.y, cost };
  }
  if (best === undefined) return NONE;
  if (best.x === ctx.unit.x && best.y === ctx.unit.y) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: ctx.unit.id, x: best.x, y: best.y },
      { type: "wait", unit: ctx.unit.id },
    ],
  };
}

export function moveBreakDown(ctx: HandlerContext): ActionResult {
  const spots = interactionsOf(ctx, "defendArea");
  if (spots.length === 0) return { kind: "deficit", reason: "방어 지점 미사영: BreakdownEnemy(defendArea) 조사 지점 없음" };
  // movePower 100 + BlockFree — 점유를 무시한 맵 전역 도달성으로 목표만 고른다.
  const image = moveImageOf(ctx.state, ctx.unit, -1, true);
  let best: { x: number; y: number; cost: number } | undefined;
  for (const s of spots) {
    const cost = image.get(key(ctx.state, s.x, s.y));
    if (cost === undefined) continue;
    if (best === undefined || cost < best.cost) best = { x: s.x, y: s.y, cost };
    else if (cost === best.cost && !aiIsRandom(ctx.rng)) best = { x: s.x, y: s.y, cost };
  }
  if (best === undefined) return NONE;
  const dest = moveTo(ctx.state, ctx.unit, best.x, best.y, MOVE_FLAG.break, ctx.rng);
  if (dest === undefined || (dest.x === ctx.unit.x && dest.y === ctx.unit.y)) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: ctx.unit.id, x: dest.x, y: dest.y },
      { type: "wait", unit: ctx.unit.id },
    ],
  };
}

/**
 * 방해 지팡이 등급 — `AIInterferenceSimulator$$CalculateScore`(0x1930740)의 `rank` 항.
 * ☠**이름이 아니라 `ItemData.UseType` 수치로 판별한다** — `コラプス`(Collapse)의 UseType은 `Stun(29)`이고,
 * `Sleep(10)`·`Charm(12)` 등 다른 상태이상은 이 분기에서 **전부 0**이다(M_rod_breakdown §1-5-A).
 */
export function interferenceRank(useType: number | undefined): number {
  if (useType === 27) return 4; // Draw
  if (useType === 29) return 3; // Stun
  if (useType === 11) return 2; // Silence
  if (useType === 9) return 1; // Freeze
  return 0;
}

/**
 * 방해 스코어 조립식 — `P + ((100 - 맨해튼거리) << 9) + (magicVal << 17) + (rank << 25)`.
 * ⇒ **아이템 등급 ≫ 대상 마력 ≫ 근접도 ≫ 위력**.
 */
export function interferenceScore(p: number, distance: number, magicVal: number, rank: number): number {
  return p + (100 - distance) * 2 ** 9 + magicVal * 2 ** 17 + rank * 2 ** 25;
}

/** 침묵 적합성 — 대상 소지품에 `(Kind & ~1) == 6`(마도서 계열)이 있어야 한다(0x1930924~). */
const hasTome = (u: UnitState): boolean =>
  (u.weapons ?? (u.weapon === undefined ? [] : [u.weapon])).some((w) => (w.kind & ~1) === 6)
  || (u.staves ?? []).length > 0; // 지팡이 Kind 7도 (7 & ~1) == 6이다

/**
 * `AIThink$$ActionRodInterference`(0x1948350) → `InterferenceTo`(0x1948360) — `IR_*(30~36)`.
 *
 * 게이트: `m_Think`가 AttackLongRange(4)·AttackHigh(5)면 실행하지 않는다 · 대형 유닛 제외.
 * 도색은 `weaponFlag = InterferenceRod`(☠`IgnoreSilent` **없음** — AC_InterferenceRange와 다르다).
 * 표적은 `EachEnemyUnit` 전수 + 옵코드 필터, 점수는 위 조립식 최대, 동점은 50% 코인플립.
 * 커밋 = `MapMind.Type = RodInterference(30)`.
 *
 * ☠**엔진 경계**: reduce는 `gives`가 빈 방해 지팡이(= `ドロー`, UseType 27)를 **정직하게 거부**한다
 * (효과 경로 미판독). AI가 그걸 고르면 액션이 튕기므로 후보에서 빼고, 그것뿐이면 정직 결손으로 올린다.
 * ⚠`P` 항은 Draw에서만 `Min(대상 위력, 511)`이고 나머지는 0인데, Draw가 실행 불가라 실질 항상 0이다.
 * ⚠`IR_Frequency(36)`는 `prohibitRod`(사용 빈도 잠금) 상태를 요구하는데 국면에 없어 결손으로 올린다.
 */
export function rodInterferenceTo(ctx: HandlerContext, opcode: number): ActionResult {
  if (ctx.think === AI_THINK.attackLongRange || ctx.think === AI_THINK.attackHigh) return NONE;
  if (opcode === ACT.rodInterferenceFrequency) {
    return { kind: "deficit", reason: "IR_Frequency 미배선: prohibitRod(사용 빈도 잠금) 국면 미모델" };
  }
  const actor = ctx.unit;
  const rods = (actor.staves ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.rodType === 3 && s.uses > 0);
  if (rods.length === 0) return NONE;
  const usable = rods.filter(({ s }) => (s.gives ?? []).length > 0);
  if (usable.length === 0) {
    return { kind: "deficit", reason: "방해 지팡이 효과 미배선: ドロー(UseType 27) 경로는 reduce가 정직 거부" };
  }
  // HighMagic(31)/LowMagic(32)만 마력 항을 켠다.
  const high = opcode === ACT.rodInterferenceHighMagic;
  const low = opcode === ACT.rodInterferenceLowMagic;
  const image = moveImageOf(ctx.state, actor);

  let best: { score: number; target: string; staff: number; x: number; y: number } | undefined;
  for (const foe of eachEnemyUnit(ctx.state, actor)) {
    if (!isAttackPermission(ctx.state, foe)) continue;
    const ok = interferenceTargetFilter(opcode, ctx.args, foe);
    if (ok === undefined) return { kind: "deficit", reason: `방해 표적 필터 미사영: IR ${opcode}` };
    if (!ok) continue;
    for (const { s, i } of usable) {
      if (s.useType === 11 && !hasTome(foe)) continue; // 침묵시킬 것이 없으면 부적합
      for (const tile of enumerateRing(foe.x, foe.y, s.rangeMin, s.rangeMax, ctx.state.map.width, ctx.state.map.height)) {
        if (!image.has(key(ctx.state, tile.x, tile.y))) continue;
        const d = Math.abs(tile.x - foe.x) + Math.abs(tile.y - foe.y);
        if (s.useType === 27 && d <= 3) continue; // Draw 근접 부적합
        const magicVal = high ? foe.stats.mag : low ? 255 - foe.stats.mag : 0;
        const score = interferenceScore(0, d, magicVal, interferenceRank(s.useType));
        if (best !== undefined) {
          if (score < best.score) continue;
          if (score === best.score && aiIsRandom(ctx.rng)) continue;
        }
        best = { score, target: foe.id, staff: i, x: tile.x, y: tile.y };
      }
    }
  }
  if (best === undefined) return NONE;
  const actions: BattleAction[] = [];
  if (best.x !== actor.x || best.y !== actor.y) {
    actions.push({ type: "move", unit: actor.id, x: best.x, y: best.y });
  }
  actions.push({ type: "staff", unit: actor.id, target: best.target, staff: best.staff });
  return { kind: "decide", actions };
}

/** 방해 계열 옵코드의 표적 필터(`IsAttackPermissionOnlyCommand` 표 — H_handlers §1-5). */
function interferenceTargetFilter(opcode: number, args: readonly string[], t: UnitState): boolean | undefined {
  switch (opcode) {
    case ACT.rodInterference:
    case ACT.rodInterferenceHighMagic:
    case ACT.rodInterferenceLowMagic:
      return true;
    case ACT.rodInterferencePerson:
      return t.pid === args[0];
    case ACT.rodInterferenceExcludePerson:
      return t.pid !== args[0];
    case ACT.rodInterferenceWeapon:
      return t.weapon === undefined ? false : t.weapon.kind === Number(args[0]);
    default:
      return undefined;
  }
}

/**
 * `AIThink$$ActionMovePerson`(0x194F2E0) — `MV_Person(90)`.
 *
 * 판독(MP4 3라운드 직접 디스어셈블):
 * ```
 * 0x0194F488  mov w2, #0x64 ; UnitAIMove(deploy, unit, movePower = 100, ...)   ; ★맵 전역 이미지
 * 0x0194F4BC  mov w8, #0x65 ; dc.best = 101                                     ; 코스트 최솟값 탐색용 센티널
 * 0x0194F518  bl MapFor$$EachUnit(UnitFunction(b__0))                           ; ★전 유닛(진영 무관)
 * 0x0194F530  bl AIThink$$MoveTo(this, tx, tz, flag = 0)
 * ```
 * `b__0`(0x2948540) = `CheckMoveTargetWithAttack` → **`unit.m_Person == v0.GetPerson()`** →
 * 대상 셀마다 `cost = (sbyte)MoveImage[x|z<<5]`, `cost < 0`이면 기각, `dc.best < cost`면 기각
 * ⇒ **가장 싸게 닿는 칸을 고르고 동점은 50% 코인플립**이다.
 *
 * ☠`CheckMoveTargetWithAttack`(0x195FA90)은 미판독이다 — 후보를 **좁히는** 필터라 누락 시 후보가 넓어질 뿐이고,
 * PID 일치 조건이 이미 대상을 거의 1건으로 좁힌다.
 */
export function movePerson(ctx: HandlerContext): ActionResult {
  const pid = ctx.args[0];
  if (pid === undefined || pid === "") return { kind: "deficit", reason: "MV_Person 인물 인자 부재" };
  // ★도색은 `moveFlag = BlockFree`라 **유닛 점유를 무시**한다 — 대상이 선 칸 자체가 목적지이므로
  //   점유를 보면 후보가 통째로 사라진다.
  const image = moveImageOf(ctx.state, ctx.unit, -1, true);
  let best: { x: number; y: number; cost: number } | undefined;
  for (const u of ctx.state.units) {
    if (u.dead || u.id === ctx.unit.id || u.pid !== pid) continue;
    const cost = image.get(key(ctx.state, u.x, u.y));
    if (cost === undefined) continue;
    if (best === undefined || cost < best.cost) {
      best = { x: u.x, y: u.y, cost };
    } else if (cost === best.cost && !aiIsRandom(ctx.rng)) {
      best = { x: u.x, y: u.y, cost }; // ★동점은 50% 코인플립(뒤 후보가 이길 확률 1/2)
    }
  }
  if (best === undefined) return NONE;
  const dest = moveTo(ctx.state, ctx.unit, best.x, best.y, 0, ctx.rng);
  if (dest === undefined || (dest.x === ctx.unit.x && dest.y === ctx.unit.y)) return NONE;
  return {
    kind: "decide",
    actions: [
      { type: "move", unit: ctx.unit.id, x: dest.x, y: dest.y },
      { type: "wait", unit: ctx.unit.id },
    ],
  };
}

/**
 * `AIThink$$ActionMindTorch`(0x194CAF0) — `MI_Torch(70)`.
 *
 * ★☠**횃불 아이템이 아니라 맵의 조사 지점이다.** 본문이 도는 것은
 * `MapFor.EachPoke(MapInspector.Kind.Torch = 7, b__0)`(0x194CC34 `mov w0,#7` → 0x1DC2E00)이고,
 * 후보 술어 `b__0`(0x2947850)은 `(sbyte)AIDeploy.MoveImage[x|z<<5] < 0`이면 기각(도달 불가)한 뒤
 * `MapImage` 층 판정을 통과한 칸만 채택한다. 채택되면 `mind.X/Z` + `MapMind.Type = Torch(22)`.
 *
 * ★**None(0)으로 빠지는 경로 3개**(전부 코드 확정):
 *  (1) `person.BmapSize(0x8C) > 1` — 대형 유닛(0x194CBB0)
 *  (2) ☠**`IsAttackableEnemy`(0x194CD10)가 참이면 즉시 None**(0x194CBC8) —
 *      즉 **때릴 적이 있으면 횃불을 켜지 않고 공격하러 간다**. 슬롯 순서가 Mind→Attack이라
 *      이 게이트가 없었다면 횃불 유닛은 영영 공격을 못 했을 것이다.
 *  (3) 후보 칸을 못 찾으면 `dc.x == -1`로 남아 None(0x194CC4C)
 *
 * ⇒ ☠**FESim은 Torch 조사 지점을 모델링하지 않는다** — 파이프라인이 추출하는 interaction 종별은
 * chest·visit·door·escape·destroy·defendArea뿐이고 torch는 0건이며, `GameState`에도 조사 지점 층이 없다.
 * 따라서 (3)이 **항상** 성립해 이 옵코드는 **None을 반환하는 것이 코드상 정답**이다(근거 없는 대기 강하가 아니다).
 * 시야(전장의 안개) 자체도 미모델링이라 횃불로 바뀔 국면이 없다.
 */
export function mindTorch(): ActionResult {
  return NONE;
}

/**
 * `AIThink$$GuardTo`(0x194CF60) + 람다 `<GuardTo>b__0`(0x294E410) — ☠"제자리 방어"가 아니라
 * **체인가드로 아군을 감싸는 행동**이다. 전제 게이트(만HP·HP 2 이상·체인가드 스킬)를 못 넘으면 None.
 *
 * ★위치 규칙 판독 완료(2026-08-18) — 종전엔 결손이었고 그 하나가 전 54챕터 결손의 **78%**였다.
 * 본문 = `MapFor.EachSelfForceUnit(b__0)`으로 **같은 진영 유닛을 전수** 훑으며, 후보마다
 * `GetSidePosition(actor, ally.X, ally.Z)`으로 그 아군의 인접 1칸을 고르고 **같은 식**으로 점수를 낸다:
 * `((100 - 이동코스트) << 4) + GetTerrainScore` · 동점은 `AI.IsRandom()` 코인플립.
 * 결과는 `MapMind.X/Z`(= 이동 목적지)로 확정된다.
 *
 * 후보 아군 게이트(코드 확정분) = 생존(`m_Hp > 0`, 단 HP 스톡 보유면 통과) · 맵 영역 안 ·
 * 대상 칸 지형이 `TerrainData.IsNotTarget`이 아님. ⚠미해석 = `unit[0xF0][0x38] & 0x4D0` 상태 마스크
 * (비트 4·6·7·10 — 우리 국면에 대응 필드가 없어 통과로 둔다, 장부 `ai.guard-target-status`).
 */
export function guardTo(ctx: HandlerContext): ActionResult {
  const actor = ctx.unit;
  if (!canChainGuard(actor)) return NONE; // 코드 확정: 게이트 실패 = None(0)
  const state = ctx.state;
  const image = moveImageOf(state, actor);
  if (image.size === 0) return NONE;
  const occupied = new Set(
    state.units.filter((u) => !u.dead && u.id !== actor.id).map((u) => key(state, u.x, u.y)),
  );
  const terrainScore = (x: number, y: number): number =>
    terrainScoreAt(state.map, actor, x, y, state.terrainPatches);
  const isRandom = (): boolean => aiIsRandom(ctx.rng);

  let best = 0;
  let pick: { x: number; y: number } | undefined;
  // 열거 순서 = `MapFor.EachSelfForceUnit` = 배치 순(units 배열 순). 동점 코인플립이 순서에 의존한다.
  for (const ally of state.units) {
    if (ally.force !== actor.force || ally.id === actor.id) continue;
    // 생존 게이트 — HP 0이어도 HP 스톡이 남았으면 후보다(0x294E5AC: hpStock + extraHpStock != 0이면 HP 검사 생략).
    if (ally.dead && (ally.hpStock ?? 0) === 0) continue;
    if (!ally.dead && ally.hp <= 0 && (ally.hpStock ?? 0) === 0) continue;
    const spot = sidePosition(ally.x, ally.y, {
      width: state.map.width,
      height: state.map.height,
      image,
      occupied,
      terrainScore,
      isRandom,
    });
    if (spot === undefined) continue;
    const cost = image.get(key(state, spot.x, spot.y));
    if (cost === undefined) continue;
    const score = ((100 - cost) << 4) + terrainScore(spot.x, spot.y);
    if (pick !== undefined) {
      if (score < best) continue;
      if (score === best && isRandom()) continue;
    }
    best = score;
    pick = spot;
  }
  if (pick === undefined) return NONE;
  return {
    kind: "decide",
    actions: [
      ...(pick.x === actor.x && pick.y === actor.y
        ? []
        : [{ type: "move", unit: actor.id, x: pick.x, y: pick.y } as const]),
      { type: "guard", unit: actor.id },
    ],
  };
}

/**
 * `AIThink$$ActionHealMiddleLow`(0x1948A60) → `HealMindTo`(0x19489E0).
 * 진입 게이트는 **`AskHealB` 하나뿐**이고, 상처약 경로는 그 안에서 `Hc_Vulnerary`(dispos AI_Flag Heal)를 본다.
 * 아이템은 **인벤토리 순서상 첫 회복 아이템**(회복량 최적화 없음).
 */
export function healMindTo(ctx: HandlerContext, opcode: number): ActionResult {
  // ActionHealMiddleLow만 `m_Think == AttackHigh(5)`에서 차단된다.
  if (opcode === ACT.healMiddleLow && ctx.think === AI_THINK.attackHigh) return NONE;
  if (!aiHealCondition(ctx.unit).askHealB) return NONE;
  if (((ctx.unit.ai?.flag ?? 0) & AI_FLAG.heal) === 0) {
    // 상처약 경로가 막혔다 → 회복 지형 경로(Hc_Terrain)로 넘어가는데 그 플래그의 출처가 미판독이다.
    return { kind: "deficit", reason: "회복 지형 경로 미판독: HealMindToTerrain 게이트(Hc_Terrain)" };
  }
  const idx = (ctx.unit.consumables ?? []).findIndex((c) => c.addType === 2 && c.uses > 0);
  if (idx < 0) {
    return { kind: "deficit", reason: "회복 지형 경로 미판독: HealMindToTerrain 게이트(Hc_Terrain)" };
  }
  return { kind: "decide", actions: [{ type: "item", unit: ctx.unit.id, item: idx }] };
}

/** 이동 제한 박스를 존중하는지 확인용(테스트·디버그 노출). */
export const respectsMoveLimit = (u: UnitState, x: number, y: number): boolean =>
  moveLimitAllows(parseMoveLimit(u.ai?.moveLimit), u, x, y);

/** 도달 가능 칸 수 — 디버그·테스트용. */
export const reachableCount = (state: GameState, u: UnitState): number => {
  const budget = moveBudgetOn(state.map, u, state.terrainPatches);
  if (budget === undefined || state.map.costs[u.moveType] === undefined) return 0;
  return movementRange({
    width: state.map.width,
    height: state.map.height,
    movePoints: movePowerOf(budget, 100),
    start: { x: u.x, y: u.y },
    costAt: makeCostAt(state.map, state.structures, u.moveType, state.terrainPatches),
    ...movePredicates(state.map, state.units, u),
  }).length;
};
