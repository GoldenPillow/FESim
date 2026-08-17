/**
 * 개시 조건 AC/RC — `AIThink$$ActiveCause`(AI_ENGINE §8).
 *
 * ★두 가지가 핵심이다.
 *  (1) 거리 인자의 단위는 **칸 수가 아니라 이동력 백분율(%)**이다(§8-1).
 *  (2) 한 루틴의 여러 조건 행은 AND가 아니라 **OR**다 — 한 행이라도 참이면 기동(§8-2).
 */
import {
  makeCostAt,
  moveBudgetOn,
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

/** dispos `AI_*Val` CSV 원문 → 토큰 배열. */
export function argsOf(raw: string | undefined): string[] {
  return raw === undefined || raw === "" ? [] : raw.split(",").map((s) => s.trim());
}

/** 이 유닛이 `factor`% 이동력으로 닿는 칸 + 무기 사거리 = 사정권. */
export function threatTiles(state: GameState, u: UnitState, factor: number): { x: number; y: number }[] {
  const budget = movePowerOf(movePower(u), factor);
  const grid = state.map.costs[u.moveType];
  if (grid === undefined) return [];
  const reach = movementRange({
    width: state.map.width,
    height: state.map.height,
    movePoints: Math.min(budget, moveBudgetOn(state.map, u, state.terrainPatches) ?? budget, budget),
    start: { x: u.x, y: u.y },
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

/** 적(비동맹) 유닛 — AC 판정의 대상 집합. */
const foesOf = (state: GameState, u: UnitState): UnitState[] =>
  state.units.filter((v) => !v.dead && v.force !== u.force);

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
  _v1: number | undefined,
  ctx: CauseContext,
): boolean | undefined {
  switch (opcode) {
    case AC.everyTime:
      return true;
    case AC.turn:
      // `v0 <= MapSituation.m_Turn`. ★m_Turn은 1-based 전체 턴(3세력 1사이클마다 +1).
      return v0 !== undefined && v0 <= ctx.state.turn;
    case AC.attackRange: {
      // 이동력 v0% 사정권 안에 적이 있는가.
      if (v0 === undefined) return undefined;
      const tiles = threatTiles(ctx.state, ctx.unit, v0);
      const set = new Set(tiles.map((t) => t.y * ctx.state.map.width + t.x));
      return foesOf(ctx.state, ctx.unit).some((f) => set.has(f.y * ctx.state.map.width + f.x));
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

/** `AI_ActionVal`이 문자열 인자(플래그명 등)인 옵코드는 v0가 아니라 토큰 원문을 쓴다. */
export const CAUSE_STRING_ARG = new Set<number>([AC.flagTrue, AC.flagFalse]);
