/**
 * 개시 조건 AC/RC — `AIThink$$ActiveCause`(AI_ENGINE §8).
 *
 * ★두 가지가 핵심이다.
 *  (1) 거리 인자의 단위는 **칸 수가 아니라 이동력 백분율(%)**이다(§8-1).
 *  (2) 한 루틴의 여러 조건 행은 AND가 아니라 **OR**다 — 한 행이라도 참이면 기동(§8-2).
 */
import {
  allianceOf,
  makeCostAt,
  movePower,
  movePredicates,
  effectiveWeapons,
  type GameState,
  type UnitState,
} from "../battle.js";
import { attackRange, movementRange } from "../range.js";
import { AC, AI_VALUE } from "./types.js";

/**
 * `AIThink$$GetMovePower(unit, factor)`(0x1943F70).
 * `factor < 0`이면 100(맵 전역), 아니면 `clamp(이동력, 0, 99) * factor / 100`(정수 절사).
 * ☠`AI_AC_AttackRange "7"`은 7칸이 아니라 **7%**다 — 이동력 14 이하면 0칸(e005 3건, §13 #8).
 */
export function movePowerOf(move: number, factor: number): number {
  if (factor < 0) return 100;
  return Math.trunc((Math.min(Math.max(move, 0), 99) * factor) / 100);
}

/** `AIValue` 원문 → 정수 인자. `V_0..V_3`은 dispos CSV 토큰 0..3을 가리킨다(`GetArgument` 0x27B3840). */
export function resolveValue(raw: string | undefined, args: readonly string[]): number | undefined {
  if (raw === undefined || raw === "") return AI_VALUE.default;
  if (raw === "V_Default") return AI_VALUE.default;
  if (raw === "V_Max") return AI_VALUE.max;
  if (raw === "V_Skip") return AI_VALUE.skip;
  const m = /^V_([0-3])$/.exec(raw);
  if (m !== null) {
    const token = args[Number(m[1])];
    // ★dispos가 그 토큰을 안 적었으면 슬롯은 V_Default로 남는다 →
    //   `AI_AC_TurnAttackRange "6"` = (턴>=6) 또는 (이동력 **100%** 사정권)(§8-1 (3)).
    if (token === undefined || token === "") return AI_VALUE.default;
    const n = Number(token);
    return Number.isFinite(n) ? n : AI_VALUE.default;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * `AIValue` → `GetMovePower`의 factor. ☠**V_Default와 V_Max는 다르다**(C_cause §AC_AttackRange):
 * `V_Default(-1)` → factor **100(퍼센트)** = 자기 이동력 그대로 ·
 * `V_Max(-2)` → factor **-1** → `GetMovePower`가 100을 반환 = **맵 전역**.
 * 둘을 섞으면 잠든 적이 1턴부터 전부 깨어난다.
 */
export function factorOf(v: number | undefined): number {
  if (v === undefined || v === AI_VALUE.default) return 100;
  if (v === AI_VALUE.max) return -1;
  return v;
}

/**
 * dispos `AI_*Val` CSV 원문 → 토큰 배열.
 * ☠**괄호 안의 쉼표는 구분자가 아니다** — `pos(6,9)`가 두 토큰으로 쪼개지면 안 된다.
 * 근거 = `AIValue$$SetValue`(0x27B2E80)의 스캐너: `'('`(0x28)에서 플래그를 세우고(0x27B2FF4)
 * `')'`(0x29)에서 지우며(0x27B2FBC), 플래그가 선 동안에는 `','`(0x2C) 검사 자체를 건너뛴다(0x27B3008).
 */
export function argsOf(raw: string | undefined): string[] {
  if (raw === undefined || raw === "") return [];
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of raw) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(depth - 1, 0);
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * 사정권 도색 — `UnitAIMoveXY(deploy, unit, x, z, movePower)` + 무기 사거리 채우기.
 * ★기준 좌표는 유닛의 현 위치가 아니라 인자 `(originX, originY)`다(AC_AttackRange의 v1 override).
 */
export function attackAreaFrom(
  state: GameState,
  u: UnitState,
  originX: number,
  originY: number,
  factor: number,
): { x: number; y: number }[] {
  const budget = movePowerOf(movePower(u), factor);
  if (state.map.costs[u.moveType] === undefined) return [];
  const reach = movementRange({
    width: state.map.width,
    height: state.map.height,
    movePoints: budget,
    start: { x: originX, y: originY },
    costAt: makeCostAt(state.map, state.structures, u.moveType, state.terrainPatches),
    ...movePredicates(state.map, state.units, u),
  });
  const weapons = effectiveWeapons(u) ?? [];
  let min = Infinity;
  let max = 0;
  for (const w of weapons) {
    min = Math.min(min, w.rangeMin);
    max = Math.max(max, w.rangeMax);
  }
  if (max === 0) return [];
  return attackRange(reach, min, max, state.map.width, state.map.height);
}

/** 이 유닛이 `factor`% 이동력으로 닿는 칸 + 무기 사거리 = 사정권(현 위치 기준). */
export const threatTiles = (state: GameState, u: UnitState, factor: number): { x: number; y: number }[] =>
  attackAreaFrom(state, u, u.x, u.y, factor);

/** 적(비동맹) 유닛 — AC 판정의 대상 집합. */
const foesOf = (state: GameState, u: UnitState): UnitState[] =>
  state.units.filter((v) => !v.dead && allianceOf(state.map, v.force) !== allianceOf(state.map, u.force));

const cellKey = (state: GameState, x: number, y: number): number => y * state.map.width + x;

/**
 * `AIThink$$IsEnemyInsideAttackAreaForAC`(0x1944330) — AC_AttackRange 계열과 AC_BandRange 계열의 **공용 판정**.
 *
 * ★`bandThreshold == 0`이면 "내 사정권에 적이 하나라도 있으면 true"(AttackRange 계열),
 * 0보다 크면 "그 적 칸을 덮은 **밴드원 수**가 임계 이상"이어야 한다(BandRange 계열).
 * ☠`isExcludeSelf`(AC_BandRangeExcludeSelf)면 **자기 사정권을 도색하지 않는다** —
 * 자기가 못 닿아도 밴드원이 덮으면 기동한다.
 */
function isEnemyInsideAttackAreaForAC(
  ctx: CauseContext,
  command: number,
  originX: number,
  originY: number,
  factor: number,
  bandThreshold: number,
  isExcludeSelf: boolean,
  bandCounter: Map<number, number>,
  excludePid: string | undefined,
): boolean {
  const { state, unit } = ctx;
  const mine = isExcludeSelf
    ? undefined
    : new Set(attackAreaFrom(state, unit, originX, originY, factor).map((t) => cellKey(state, t.x, t.y)));
  // isPerson = ((command | 4) == 6) — command 2(AttackRangeExcludePerson)와 6(BandRangeExcludePerson)뿐.
  const isPerson = (command | 4) === 6;
  for (const enemy of foesOf(state, unit)) {
    if (isPerson && excludePid !== undefined && enemy.pid === excludePid) continue;
    const k = cellKey(state, enemy.x, enemy.y);
    if (mine !== undefined && !mine.has(k)) continue;
    if (bandThreshold === 0) return true;
    if (bandThreshold <= (bandCounter.get(k) ?? 0)) return true;
  }
  return false;
}

/**
 * 밴드 도장 찍기 — `<ActiveCauseBandRange>b__0`(0x2946710) + `b__110_1`(0x2945A70).
 * 같은 `AI_BandNo`이고 아직 행동 가능한 아군의 사정권을 셀마다 +1 누적한다.
 */
function paintBand(ctx: CauseContext, command: number, factor: number, excludePid: string | undefined): {
  counter: Map<number, number>;
  members: number;
} {
  const counter = new Map<number, number>();
  const { state, unit } = ctx;
  const band = unit.ai?.bandNo ?? 0;
  let members = 0;
  if (band === 0) return { counter, members };
  const isPerson = command === AC.bandRangeExcludePerson;
  for (const u of state.units) {
    if (u.id === unit.id || u.dead || u.acted) continue;
    if (u.force !== unit.force) continue;
    if ((u.ai?.bandNo ?? 0) !== band) continue; // ★같은 AI_BandNo만
    if (isPerson && excludePid !== undefined && u.pid === excludePid) continue;
    for (const t of attackAreaFrom(state, u, u.x, u.y, factor)) {
      const k = cellKey(state, t.x, t.y);
      counter.set(k, (counter.get(k) ?? 0) + 1);
    }
    members += 1;
  }
  return { counter, members };
}

export interface CauseContext {
  state: GameState;
  unit: UnitState;
  /** dispos `AI_ActionVal` 토큰. */
  args: readonly string[];
}

/**
 * 조건 옵코드 1건의 판정(§8-3).
 * 미구현 옵코드는 `undefined`를 돌려 **정직 결손**으로 올린다(거짓으로 눌러 감추지 않는다).
 */
export function evaluateCause(
  opcode: number,
  v0: number | undefined,
  v1: number | undefined,
  ctx: CauseContext,
): boolean | undefined {
  switch (opcode) {
    case AC.everyTime:
      return true;
    case AC.turn:
      // `v0 <= MapSituation.m_Turn`. ★m_Turn은 1-based 전체 턴(3세력 1사이클마다 +1).
      return v0 !== undefined && v0 <= ctx.state.turn;
    case AC.attackRange:
    case AC.attackRangeExcludePerson: {
      // 이동력 v0% 사정권 안에 적이 있는가. ★command 1의 v1은 **기준 좌표 override**(pos(x,z)),
      //   command 2의 v1은 **제외할 PersonData**다(0x1943E90 `cmp w20,#2; b.eq`로 좌표 해석을 건너뛴다).
      if (v0 === undefined) return undefined;
      const origin =
        opcode === AC.attackRange ? parsePos(ctx.args[1]) ?? { x: ctx.unit.x, y: ctx.unit.y } : { x: ctx.unit.x, y: ctx.unit.y };
      return isEnemyInsideAttackAreaForAC(
        ctx, opcode, origin.x, origin.y, factorOf(v0), 0, false, new Map(), ctx.args[1],
      );
    }
    case AC.bandRange:
    case AC.bandRangeEvenTurn:
    case AC.bandRangeOddTurn:
    case AC.bandRangeExcludePerson:
    case AC.bandRangeExcludeFriend:
    case AC.bandRangeExcludeSelf: {
      // 턴 패리티 게이트가 가장 먼저다(0x1944844~0x1944860).
      if (opcode === AC.bandRangeEvenTurn && (ctx.state.turn & 1) !== 0) return false;
      if (opcode === AC.bandRangeOddTurn && (ctx.state.turn & 1) === 0) return false;
      const factor = factorOf(v0);
      const isExcludeSelf = opcode === AC.bandRangeExcludeSelf;
      // band 기본 = ExcludeSelf면 1, 그 외 2. ExcludePerson(6)·ExcludeFriend(7)는 v1을 읽지 않는다.
      let band = isExcludeSelf ? 1 : 2;
      if (opcode !== AC.bandRangeExcludePerson && opcode !== AC.bandRangeExcludeFriend
        && v1 !== undefined && v1 !== AI_VALUE.default) band = v1;
      const threshold0 = band - (isExcludeSelf ? 0 : 1);
      const excludePid = ctx.args[1];
      const { counter, members } = paintBand(ctx, opcode, factor, excludePid);
      // ★bandThreshold = min(threshold0, 실제 밴드원 수) — 밴드원이 없으면 0으로 떨어져 사정권 판정만 남는다.
      const bandThreshold = Math.min(threshold0, members);
      return isEnemyInsideAttackAreaForAC(
        ctx, opcode, ctx.unit.x, ctx.unit.y, factor, bandThreshold, isExcludeSelf, counter, excludePid,
      );
    }
    case AC.flagTrue:
    case AC.flagFalse: {
      // `GameVariable` 딕셔너리 조회 — Lua 이벤트가 세우는 플래그. 엔진은 state.variables가 정본.
      const key = ctx.args[0];
      if (key === undefined) return undefined;
      const value = ctx.state.variables?.[key];
      const truthy = value !== undefined && value !== 0 && value !== "";
      return opcode === AC.flagTrue ? truthy : !truthy;
    }
    default:
      return undefined; // 미판독·미구현 = 정직 결손
  }
}

/** dispos `pos(x,z)` 리터럴 → 좌표. `AIValue$$ParseCoord`(0x27B3520)가 읽는 형식. */
export function parsePos(raw: string | undefined): { x: number; y: number } | undefined {
  if (raw === undefined) return undefined;
  const m = /^\s*pos\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*$/.exec(raw);
  return m === null ? undefined : { x: Number(m[1]), y: Number(m[2]) };
}

/** `AI_ActionVal`이 문자열 인자(플래그명 등)인 옵코드는 v0가 아니라 토큰 원문을 쓴다. */
export const CAUSE_STRING_ARG = new Set<number>([AC.flagTrue, AC.flagFalse]);
