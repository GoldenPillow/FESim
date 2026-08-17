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
  makeCostAt,
  movePower,
  movePredicates,
  moveBudgetOn,
  type BattleAction,
  type GameState,
  type RandomSource,
  type UnitState,
} from "../battle.js";
import { attackRange, movementRange } from "../range.js";
import { getAttackPosition, getAttackScore, moveImageOf, aiIsRandom, type AttackContext, type AttackEvaluation } from "./attack.js";
import { movePowerOf } from "./cause.js";
import { NONE, type ActionResult } from "./interpreter.js";
import { terrainScoreAt } from "./position.js";
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
    default:
      // AT_Hero(3)는 PersonData.IsHero, AT_Job(7/8)은 Job 사영이 필요한데 UnitState에 없다.
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
    if (best === undefined || betterTarget(cand, best, ctx.targeted, ctx.rng)) best = cand;
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
  actions.push({ type: "attack", unit: actor.id, target: best.target, weapon: best.weapon });
  return { kind: "decide", actions };
}

/** `CheckAttackPriorityImpl`의 파레토 비교(연계수 → 밀치기 → 스코어 → 동점 코인플립). */
function betterTarget(
  next: AttackEvaluation,
  cur: AttackEvaluation,
  _targeted: Record<string, number>,
  rng: RandomSource,
): boolean {
  if (next.chainCount < cur.chainCount) return false;
  if (next.chainCount > cur.chainCount) return true;
  if (next.battle < cur.battle) return false;
  if (next.battle !== cur.battle) return true;
  return rng.next(2) === 0;
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
 * `AIThink$$GuardTo`(0x194CF60) — ☠"제자리 방어"가 아니라 **체인가드로 아군을 감싸는 행동**이다.
 * 전제 게이트(만HP·HP 2 이상·체인가드 스킬)를 못 넘으면 None → 루틴의 다음 후보로 넘어간다.
 * ☠게이트를 넘는 유닛의 가드 **위치** 규칙(`GetSidePosition` 0x195FC80)은 미판독이라 결손으로 올린다.
 */
export function guardTo(ctx: HandlerContext): ActionResult {
  if (!canChainGuard(ctx.unit)) return NONE; // 코드 확정: 게이트 실패 = None(0)
  return { kind: "deficit", reason: "가드 위치 규칙 미판독: GetSidePosition(0x195FC80)" };
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
