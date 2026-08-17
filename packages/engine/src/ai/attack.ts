/**
 * 표적·공격 위치 선정 — `GetAttackScore`(0x19561E0) + `GetAttackPosition`(0x193CB30)
 * + `CheckAttackPriorityImpl`(0x1955ED0).
 *
 * ★스코어는 **둘**이다. 표적 = §5-1 전투 비트필드(격파확률 최상위) ·
 * 위치 = §5-A 사전식(연계수 ≫ 밀치기 ≫ 아웃레인지 ≫ 지형 ≫ 이동코스트).
 * ☠섞지 말 것 — 위치 스코어에는 기대 대미지·격파확률이 들어가지 않는다.
 */
import {
  canBreak,
  chainAttackers,
  effectiveWeapons,
  makeCostAt,
  moveBudgetOn,
  movePredicates,
  toCombatant,
  type GameState,
  type RandomSource,
  type SupportEffects,
  type UnitState,
} from "../battle.js";
import type { Calculator } from "../formula/calculator.js";
import { forecastSide } from "../formula/combat.js";
import { movementRange } from "../range.js";
import {
  BLOW_SCORE,
  attackPositionScore,
  blowScoreAt,
  enumerateRing,
  rangeMask,
  terrainScoreAt,
} from "./position.js";
import { movePowerOf } from "./cause.js";
import { battleScore, simulateBattle, type Indication } from "./score.js";
import { moveLimitAllows, parseMoveLimit } from "./unit.js";
import { AI_FLAG, AI_THINK, ATTACK_FLAG, battleRateOf, BATTLE_RATE } from "./types.js";

/** `AI.IsRandom()`(0x19235D0) = `Random.System.GetValue(2) != 0` — 동점 50% 코인플립. */
export const aiIsRandom = (rng: RandomSource): boolean => rng.next(2) !== 0;

/**
 * 도달 가능 칸 → 이동 코스트 이미지(`AIDeploy.MoveImage`). ★턴 1회 캐시가 아니라 **행동 시도 단위 재계산**(§5-A-4).
 * `factor` = `GetMovePower`의 백분율 인자(음수 = 100 = 사실상 무제한). 기본 = 유닛 실이동력.
 */
export function moveImageOf(state: GameState, u: UnitState, factor?: number): Map<number, number> {
  const image = new Map<number, number>();
  const budget = moveBudgetOn(state.map, u, state.terrainPatches);
  if (budget === undefined || state.map.costs[u.moveType] === undefined) return image;
  const rect = parseMoveLimit(u.ai?.moveLimit);
  for (const t of movementRange({
    width: state.map.width,
    height: state.map.height,
    movePoints: factor === undefined ? budget : movePowerOf(budget, factor),
    start: { x: u.x, y: u.y },
    costAt: makeCostAt(state.map, state.structures, u.moveType, state.terrainPatches),
    ...movePredicates(state.map, state.units, u),
  })) {
    if (!moveLimitAllows(rect, u, t.x, t.y)) continue;
    image.set(t.y * state.map.width + t.x, Math.min(t.cost, 99));
  }
  return image;
}

export interface AttackPosition {
  moveX: number;
  moveY: number;
  attackX: number;
  attackY: number;
  score: number;
  blow: number;
  chainCount: number;
  weapon: number;
}

export interface AttackEvaluation extends AttackPosition {
  target: string;
  /** §5-1 전투 스코어(uint32). */
  battle: number;
  kill: number;
  dead: number;
  expectation: number;
}

export interface AttackContext {
  state: GameState;
  calc: Calculator;
  supportEffects?: SupportEffects;
  rng: RandomSource;
  think: number;
}

const key = (state: GameState, x: number, y: number): number => y * state.map.width + x;

/** 유닛을 후보 칸에 실제로 옮겨 놓은 사본 목록 — 지원(인접 보너스) 재계산의 입력(§5-A 12). */
function relocated(state: GameState, actor: UnitState, x: number, y: number): { moved: UnitState; units: UnitState[] } {
  const moved: UnitState = { ...actor, x, y };
  return { moved, units: state.units.map((u) => (u.id === actor.id ? moved : u)) };
}

/** 전투 1회의 명중 분포 — 엔진의 forecastSide를 그대로 쓴다(☠중복 구현 금지). */
function indicationOf(
  ctx: AttackContext,
  self: UnitState,
  foe: UnitState,
  units: readonly UnitState[],
  canAct: boolean,
): Indication {
  if (!canAct) {
    return { power: 0, miss: 1, hit: 0, critical: 0, actionCount: 1, battleTimes: 0 };
  }
  const map = ctx.state.map;
  const patches = ctx.state.terrainPatches;
  const a = { ...toCombatant(self, map, units, ctx.supportEffects, patches), initiator: true, striking: true };
  const b = { ...toCombatant(foe, map, units, ctx.supportEffects, patches), initiator: false, striking: false };
  const f = forecastSide(ctx.calc, a, b);
  // 명중 롤 → 명중 시에만 필살 롤(엔진 계약) → 필살은 명중의 부분집합이다.
  const hit = Math.min(Math.max(f.hitRate, 0), 100) / 100;
  const crit = Math.min(Math.max(f.critRate, 0), 100) / 100;
  return {
    power: f.damage,
    miss: 1 - hit,
    hit: hit * (1 - crit),
    critical: hit * crit,
    actionCount: 1,
    battleTimes: f.followUp ? 2 : 1,
  };
}

const distanceOf = (ax: number, ay: number, bx: number, by: number): number =>
  Math.abs(ax - bx) + Math.abs(ay - by);

const inRange = (u: UnitState, d: number): boolean =>
  u.weapon !== undefined && d >= u.weapon.rangeMin && d <= u.weapon.rangeMax;

/**
 * `GetAttackPosition` — 대상 주변 링을 열거해 **어느 칸에서 때릴지**를 고른다.
 * 단일 칸 유닛에서 이동 목적지 = 공격 위치다(별도 탐색 없음 — §5-A-4).
 */
export function getAttackPosition(
  ctx: AttackContext,
  actor: UnitState,
  target: UnitState,
  weaponIndex: number,
  flag: number,
  image: Map<number, number>,
): AttackPosition | undefined {
  const weapon = effectiveWeapons(actor)?.[weaponIndex];
  if (weapon === undefined) return undefined;
  let mRange = rangeMask(weapon.rangeMin, weapon.rangeMax);
  let maxRange = weapon.rangeMax;
  if ((flag & ATTACK_FLAG.side) !== 0) {
    mRange = 0b10;
    maxRange = 1;
  }
  if (maxRange === 0) return undefined;
  // ☠대상 유효무기 판정 세부(장비 봉인·인그레이브 사거리 등)는 미판독 — 장비 무기 사거리로 근사한다(§5-A-8 말미).
  const eRange = target.weapon === undefined ? 0 : rangeMask(target.weapon.rangeMin, target.weapon.rangeMax);

  const nearest = (flag & ATTACK_FLAG.nearest) !== 0;
  const wantBreak = (flag & ATTACK_FLAG.break) !== 0;
  const wantChain = (flag & ATTACK_FLAG.chain) !== 0;
  const countChain = (flag & ATTACK_FLAG.chainAttackCount) !== 0;

  let best: AttackPosition | undefined;
  for (const tile of enumerateRing(target.x, target.y, 1, maxRange, ctx.state.map.width, ctx.state.map.height)) {
    if (((mRange >> tile.d) & 1) === 0) continue; // 자기 사거리 마스크에 없는 거리는 즉시 기각
    const move = image.get(key(ctx.state, tile.x, tile.y));
    if (move === undefined) continue; // 도달 불가

    const { moved, units } = relocated(ctx.state, actor, tile.x, tile.y);
    const chainList = chainAttackers(moved, target, units);
    const chainCount = countChain ? chainList.length : 0;
    const canChain = chainList.length > 0;
    const breakable = canBreak({ ...moved, weapon }, target);
    // ☠밀치기(BlowRatio)는 엔진 미모델링 — 항상 0(장부 ai.attack-position assumed).
    const canBlow = false;

    if (wantBreak && wantChain) {
      if (!(breakable || canChain)) continue;
    } else if (wantBreak) {
      if (!breakable) continue;
    } else if (wantChain) {
      if (!canChain) continue;
    }

    const blow = canBlow
      ? blowScoreAt(ctx.state.map, ctx.state.structures, target, tile.x, tile.y, target.x, target.y, ctx.state.terrainPatches)
      : BLOW_SCORE.none;
    const score = attackPositionScore({
      chainCount,
      blow,
      outOfTargetRange: ((eRange >> tile.d) & 1) === 0,
      terrain: terrainScoreAt(ctx.state.map, moved, tile.x, tile.y, ctx.state.terrainPatches),
      move,
      nearest,
    });

    if (best !== undefined) {
      if (score < best.score) continue;
      if (score === best.score && aiIsRandom(ctx.rng)) continue; // ★동점 50% 코인플립
    }
    best = {
      moveX: tile.x,
      moveY: tile.y,
      attackX: tile.x,
      attackY: tile.y,
      score,
      blow,
      chainCount,
      weapon: weaponIndex,
    };
  }
  return best;
}

/**
 * `GetAttackScore` — 무기 8종을 전수 순회해 이 대상에 대한 최선을 고른다.
 * ★`m_Score`는 시프트·가감 없이 그대로 선택 키가 된다.
 */
export function getAttackScore(
  ctx: AttackContext,
  actor: UnitState,
  target: UnitState,
  flag: number,
  image: Map<number, number>,
): AttackEvaluation | undefined {
  const weapons = effectiveWeapons(actor) ?? [];
  const rate = battleRateOf(actor.ai?.battleRate);
  // ★플레이어 진영이 AI로 도는 국면(위임)은 항상 慎重 — 적턴 AI는 dispos 값 그대로.
  const layout = actor.force === 0 ? BATTLE_RATE.chariness : rate;
  const thinkBreak = ((actor.ai?.flag ?? 0) & AI_FLAG.break) !== 0;
  const thinkChain = ((actor.ai?.flag ?? 0) & AI_FLAG.chain) !== 0;

  let best: AttackEvaluation | undefined;
  for (let i = 0; i < weapons.length; i++) {
    const weapon = weapons[i]!;
    // ☠MagicOnly(2048)는 `item.Data.Attr == Magic` 판정인데 BattleWeapon에 Attr 사영이 없다 —
    // 이 필터를 쓰는 것은 방해(지팡이) 계열뿐이라 이 층에서는 발현하지 않는다(장부 assumed).
    const pos = getAttackPosition(ctx, actor, target, i, flag, image);
    if (pos === undefined) continue;

    const { moved, units } = relocated(ctx.state, actor, pos.moveX, pos.moveY);
    const armed: UnitState = { ...moved, weapon };
    const armedUnits = units.map((u) => (u.id === armed.id ? armed : u));
    const d = distanceOf(pos.attackX, pos.attackY, target.x, target.y);
    const offense = indicationOf(ctx, armed, target, armedUnits, true);
    // 반격 = 대상이 브레이크되지 않았고 자기 무기 사거리 안일 때만.
    const defense = indicationOf(ctx, target, armed, armedUnits, !target.broken && inRange(target, d));

    const chainExpectation = thinkChain
      ? chainAttackers(armed, target, armedUnits).length > 0
        ? 0 // ☠연계 기대 데미지 산식 미이식 — 인원수만 위치 스코어에 반영된다(장부 assumed).
        : 0
      : 0;
    const sim = simulateBattle({
      offense,
      defense,
      offenseHp: armed.hp,
      defenseHp: target.hp,
      chainExpectation,
    });
    // ★AttackHigh(5) 회전에서는 격파확률 0.3 미만 후보를 기각한다(0x19566A0).
    if (ctx.think === AI_THINK.attackHigh && sim.kill < 0.3) continue;

    const score = battleScore({
      rate: layout,
      kill: sim.kill,
      dead: sim.dead,
      expect_: sim.expectation,
      received: sim.expectationReceived,
      breakable: thinkBreak && canBreak(armed, target),
      defHp: target.hp,
      offHp: armed.hp,
    });
    const candidate: AttackEvaluation = {
      ...pos,
      weapon: i,
      target: target.id,
      battle: (flag & ATTACK_FLAG.scoreExpectation) !== 0 ? Math.trunc(sim.expectation) : score,
      kill: sim.kill,
      dead: sim.dead,
      expectation: sim.expectation,
    };
    if (best === undefined || betterAttack(candidate, best, ctx.rng)) best = candidate;
  }
  return best;
}

/**
 * `CheckAttackPriorityImpl` — 파레토 지배 5단 → 스코어 → 동점 50% 코인플립.
 * ★(2)~(5)는 서열이 아니라 **파레토 지배**다: 하나라도 열세면 즉시 기각,
 * 열세 없이 하나라도 우세면 **스코어를 보지 않고** 채택한다.
 * ☠유인(Decoy)·탄 적합성·AI 커맨드 좌표는 엔진 미모델링 = 무판정(장부 assumed).
 */
export function betterAttack(next: AttackEvaluation, cur: AttackEvaluation, rng: RandomSource): boolean {
  if (next.chainCount < cur.chainCount) return false;
  const chainCmp = next.chainCount > cur.chainCount ? -1 : 0;
  const blowCmp = compareBlow(next.blow, next.kill, cur.blow, cur.kill);
  if (blowCmp > 0) return false;
  if (chainCmp !== 0 || blowCmp !== 0) return true;
  if (next.battle < cur.battle) return false;
  if (next.battle !== cur.battle) return true;
  return rng.next(2) === 0;
}

/**
 * `CompareAttackPriorityWithBlow`(0x19552D0). -1 = 후보0 우선.
 * 밀치지 못해도 **킬레이트 0.95 이상**이면 우선한다(상수 0x3F733333).
 */
export function compareBlow(b0: number, kr0: number, b1: number, kr1: number): number {
  if (b0 === b1) return 0;
  if (b0 === 0) return kr0 >= 0.95 ? -1 : 1;
  if (b1 === 0) return kr1 < 0.95 ? -1 : 1;
  if (b0 === 3) return -1;
  return b1 === 3 ? 1 : 0;
}
