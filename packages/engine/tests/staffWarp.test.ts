import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  warpDestinations,
  type BattleAction,
  type GameState,
  type RandomSource,
  type StaffItem,
  type UnitState,
} from "@fesim/engine";

/**
 * 워프 지팡이(MP1-5) — 목적지 규칙의 정본 = MapDeployTemplate.UnitWarp RVA 0x2C1F880 디스어셈블:
 * (1) 반경 = ItemData.Distance(마력 의존 아님), 중심 = **워프되는 대상 유닛의 현재 좌표**(시전자 아님),
 * (2) 거리 척도 = 맨해튼, (3) 타일 유효 = Unit.CanWarp — 비통행(IsNoMove) 제외·점유 제외.
 * ☠지형 IsNotWarp(Flag bit17)는 BattleMap 스키마에 플래그가 없어 미배선(장부 movement.warp에 등재).
 * 워프는 명중 롤 무소비(대상 = 아군, CalcRodAttack의 방해 분기만 롤을 굴린다).
 * レスキュー·リワープ는 별도 경로(UnitRewarp) 미판독 — 정직 거부.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);
const reduce = createReducer(calc);

const noRolls: RandomSource = {
  next: () => {
    throw new Error("워프는 난수를 소비하지 않는다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 14, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
/** ワープ 실값(items.json): Range 1-1 · Distance 5 · Endurance 5 · RodExp 35. */
const warp: StaffItem = { power: 0, rangeMin: 1, rangeMax: 1, uses: 5, rodType: 0, useType: 5, distance: 5, rodExp: 35 };
/** レスキュー 실값 — UseType 6, 목적지 규칙 미판독 = 정직 거부. */
const rescue: StaffItem = { power: 0, rangeMin: 1, rangeMax: 8, uses: 5, rodType: 0, useType: 6, rodExp: 35 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: partial.stats?.hp ?? baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

function state(units: UnitState[]): GameState {
  return {
    turn: 1,
    phase: 0,
    difficulty: "n",
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

const castWarp = (unit: string, target: string, x: number, y: number): BattleAction =>
  ({ type: "staff", unit, target, staff: 0, x, y });

describe("워프 지팡이", () => {
  it("인접 아군을 대상 좌표 중심 맨해튼 Distance 안으로 이동 + 경험치·횟수 소모", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [warp] });
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    // (4,2): 대상 (1,0)에서 |3|+|2| = 5 = Distance 상한
    const next = reduce(state([caster, ally]), castWarp("c", "a", 4, 2), noRolls);
    expect(next.units[1].x).toBe(4);
    expect(next.units[1].y).toBe(2);
    expect(next.events).toContainEqual({ type: "warp", unit: "c", target: "a", x: 4, y: 2 });
    expect(next.units[0].staves?.[0].uses).toBe(4);
    expect(next.units[0].acted).toBe(true);
    expect(next.events).toContainEqual({ type: "exp", unit: "c", amount: 35, total: 35 });
    // 워프된 아군의 행동 창은 불변
    expect(next.units[1].acted).toBe(false);
  });

  it("목적지 규칙: 반경 밖·점유 칸·비통행 칸은 던진다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [warp] });
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    const enemy = unit({ id: "e", force: 1, x: 3, y: 0 });
    const st = state([caster, ally, enemy]);
    st.map.costs.foot![2][4] = 255; // (4,2) 비통행
    expect(() => reduce(st, castWarp("c", "a", 4, 3), noRolls)).toThrow(/목적지/); // 거리 6 > 5
    expect(() => reduce(st, castWarp("c", "a", 3, 0), noRolls)).toThrow(/목적지/); // 적 점유
    expect(() => reduce(st, castWarp("c", "a", 4, 2), noRolls)).toThrow(/목적지/); // 비통행
  });

  it("warpDestinations = 엔진·UI 공용 목적지 열거(중복 구현 금지)", () => {
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    const blocker = unit({ id: "b", force: 0, x: 2, y: 0 });
    const st = state([ally, blocker]);
    const tiles = warpDestinations(ally, warp, st.map, st.units);
    const has = (x: number, y: number) => tiles.some((t) => t.x === x && t.y === y);
    expect(has(4, 2)).toBe(true); // 경계(거리 5)
    expect(has(7, 0)).toBe(false); // 거리 6
    expect(has(2, 0)).toBe(false); // 점유
  });

  it("사거리(1-1) 밖 대상·적 대상·목적지 누락·미배선(レスキュー)은 던진다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [warp, rescue] });
    const far = unit({ id: "f", force: 0, x: 3, y: 0 });
    const adj = unit({ id: "a", force: 0, x: 1, y: 0 });
    const enemy = unit({ id: "e", force: 1, x: 0, y: 1 });
    const st = state([caster, far, adj, enemy]);
    expect(() => reduce(st, castWarp("c", "f", 3, 1), noRolls)).toThrow(/사거리/);
    expect(() => reduce(st, castWarp("c", "e", 2, 2), noRolls)).toThrow(/같은 군/);
    expect(() => reduce(st, { type: "staff", unit: "c", target: "a", staff: 0 }, noRolls)).toThrow(/목적지/);
    expect(() => reduce(st, { type: "staff", unit: "c", target: "f", staff: 1 }, noRolls)).toThrow(/미배선/);
  });

  it("재생(절대 적용) — warp 이벤트가 좌표를 그대로 복원한다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [warp] });
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    const initial = state([caster, ally]);
    const recorded = reduce(initial, castWarp("c", "a", 4, 2), noRolls);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: castWarp("c", "a", 4, 2), events: recorded.events });
    expect(replayed.units[1].x).toBe(4);
    expect(replayed.units[1].y).toBe(2);
    expect(replayed.units[0].staves?.[0].uses).toBe(4);
  });
});
