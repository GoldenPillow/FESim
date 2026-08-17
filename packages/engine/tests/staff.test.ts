import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  type BattleAction,
  type GameState,
  type RandomSource,
  type StaffItem,
  type UnitState,
} from "@fesim/engine";

/**
 * 지팡이·힐(MP0) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 회복량 = 위력 + floor(마력/2), 잃은 HP 상한 (CalcRodHit 0x2473E10 판독 — EXP_CHAIN_ENGAGE §7),
 * (2) 경험치 = 杖経験計算 원문 공식(자기 레벨 감쇠 + 레벨차 감쇠, clamp 1..100) — 수기 상수 금지,
 * (3) 사용 횟수 소모가 기보 재생(절대 적용)에서도 복원돼야 한다 — 안 하면 재생 중 잔여 횟수가 표류한다,
 * (4) 회복은 난수 무소비(레벨업 제외) — 소비하면 리플레이 롤 정렬이 전부 밀린다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);
const reduce = createReducer(calc);

const noRolls: RandomSource = {
  next: () => {
    throw new Error("지팡이 회복은 난수를 소비하지 않는다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 14, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
/** ライブ 실값(items.json): Power 10 · Range 1-1 · Endurance 25 · RodType 2 · RodExp 25. */
const live: StaffItem = { power: 10, rangeMin: 1, rangeMax: 1, uses: 25, rodType: 2, rodExp: 25 };
const freeze: StaffItem = { power: 0, rangeMin: 1, rangeMax: 5, uses: 5, rodType: 3, rodExp: 35 };

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

function state(units: UnitState[], difficulty: GameState["difficulty"] = "n"): GameState {
  return {
    turn: 1,
    phase: 0,
    difficulty,
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

const heal = (unit: string, target: string, staff?: number): BattleAction =>
  ({ type: "staff", unit, target, ...(staff !== undefined ? { staff } : {}) }) as BattleAction;

describe("지팡이 회복", () => {
  it("회복량 = 위력 + floor(마력/2), 사용 횟수 1 감소, 난수 무소비", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [live] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const next = reduce(state([healer, hurt]), heal("h", "t"), noRolls);
    // 10 + floor(14/2) = 17 → 5 + 17 = 22
    expect(next.units[1].hp).toBe(22);
    expect(next.events).toContainEqual({ type: "heal", unit: "h", target: "t", amount: 17, hpAfter: 22 });
    expect(next.units[0].staves?.[0].uses).toBe(24);
    expect(next.units[0].acted).toBe(true);
    // 불변성: 원 국면은 그대로
    expect(healer.staves?.[0].uses).toBe(25);
  });

  it("회복량은 잃은 HP를 넘지 않는다", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [live] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 28 });
    const next = reduce(state([healer, hurt]), heal("h", "t"), noRolls);
    expect(next.units[1].hp).toBe(30);
    expect(next.events).toContainEqual({ type: "heal", unit: "h", target: "t", amount: 2, hpAfter: 30 });
  });

  it("경험치 = 杖経験計算 — 노멀 저레벨은 감쇠 0이라 RodExp 그대로", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [live] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const next = reduce(state([healer, hurt]), heal("h", "t"), noRolls);
    expect(next.events).toContainEqual({ type: "exp", unit: "h", amount: 25, total: 25 });
  });

  it("경험치 감쇠 — 루나틱 레벨 20이 레벨 1을 회복하면 25-19-62 → clamp 하한 1", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, level: 20, staves: [live] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const next = reduce(state([healer, hurt], "l"), heal("h", "t"), noRolls);
    expect(next.events).toContainEqual({ type: "exp", unit: "h", amount: 1, total: 1 });
  });

  it("적군(force 1) 지팡이는 경험치 없음", () => {
    const healer = unit({ id: "h", force: 1, x: 0, y: 0, staves: [live] });
    const hurt = unit({ id: "t", force: 1, x: 1, y: 0, hp: 5 });
    const next = reduce({ ...state([healer, hurt]), phase: 1 }, heal("h", "t"), noRolls);
    expect(next.units[1].hp).toBe(22);
    expect(next.events.some((e) => e.type === "exp")).toBe(false);
  });

  it("불법 지팡이 사용은 던진다 — 적 대상·자기 자신·무손상·사거리 밖·소진·미배선 종류", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [live, freeze] });
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0, hp: 5 });
    const full = unit({ id: "f", force: 0, x: 0, y: 1 });
    const far = unit({ id: "r", force: 0, x: 3, y: 0, hp: 5 });
    const st = state([healer, enemy, full, far]);
    expect(() => reduce(st, heal("h", "e"), noRolls)).toThrow();
    expect(() => reduce(st, heal("h", "h"), noRolls)).toThrow();
    expect(() => reduce(st, heal("h", "f"), noRolls)).toThrow();
    expect(() => reduce(st, heal("h", "r"), noRolls)).toThrow();
    expect(() => reduce(st, heal("h", "e", 9), noRolls)).toThrow(); // 없는 지팡이 인덱스
  });

  it("소진 지팡이는 잔여 0에서 던진다", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [{ ...live, uses: 0 }] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    expect(() => reduce(state([healer, hurt]), heal("h", "t"), noRolls)).toThrow(/소진/);
  });

  it("미배선 지팡이 종류(RodType≠2)는 던진다 — 과대 재현보다 정직한 거부", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [freeze] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    expect(() => reduce(state([healer, hurt]), heal("h", "t"), noRolls)).toThrow();
  });
});

describe("지팡이 재생(절대 적용)", () => {
  it("events가 있으면 reduce 없이 복원 — HP·경험치·사용 횟수까지", () => {
    const healer = unit({ id: "h", force: 0, x: 0, y: 0, staves: [live] });
    const hurt = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const initial = state([healer, hurt]);
    const recorded = reduce(initial, heal("h", "t"), noRolls);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: heal("h", "t"), events: recorded.events });
    expect(replayed.units[1].hp).toBe(22);
    expect(replayed.units[0].exp).toBe(25);
    expect(replayed.units[0].staves?.[0].uses).toBe(24);
    expect(replayed.units[0].acted).toBe(true);
  });
});
