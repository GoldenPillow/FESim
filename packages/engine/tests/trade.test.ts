import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  type BattleAction,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 교환(MP1-2) — 실기 판별(2026-08-18 사용자) 계약을 박제한다:
 * (1) 교환 = 행동 소모 없음 + 이동 창 소진(제자리 행동·전투는 가능).
 * (2) ☠교환 후 인게이지 발동 불가(traded 창 플래그) — 이동 후 인게이지는 가능하므로 moved로 겸용하면 과대 차단.
 * (3) 장비 무기를 넘기면 주는 쪽은 남은 목록[0]으로 재장비(없으면 비무장) — 안 하면 유령 장비로 전투가 성립.
 * (4) 한 액션 = 한 아이템 이동(교환은 행동 무소모라 연속 액션이 인게임 다중 이동과 등가).
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const noRolls: RandomSource = {
  next: () => {
    throw new Error("교환은 난수를 소비하지 않는다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1, name: "검" };
const lance = { might: 6, hit: 90, crit: 0, weight: 7, kind: 2, rangeMin: 1, rangeMax: 1, name: "창" };
const vulnerary = { addType: 2, power: 15, range: 2, uses: 3 };

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

describe("교환", () => {
  it("무기 1점 이동 — 행동은 유지, 이동 창만 소진, 받는 쪽 목록 말미 증설", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword, lance] });
    const b = unit({ id: "b", force: 0, x: 1, y: 0 });
    const next = reduce(state([a, b]), { type: "trade", unit: "a", target: "b", kind: "weapon", index: 1 } as BattleAction, noRolls);
    expect(next.units[0].weapons).toEqual([sword]);
    expect(next.units[1].weapons).toEqual([lance]);
    expect(next.units[1].weapon).toEqual(lance); // 비무장이던 수령자는 첫 무기 장비
    expect(next.units[0].acted).toBe(false); // 행동 유지 — 제자리 전투 가능
    expect(next.units[0].moved).toBe(true); // 이동 창 소진
    expect(next.units[0].traded).toBe(true);
    expect(next.units[1].traded).toBeUndefined(); // 상대는 창 상태 불변
  });

  it("장비 무기를 넘기면 주는 쪽은 남은 목록[0] 재장비, 없으면 비무장", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword] });
    const b = unit({ id: "b", force: 0, x: 1, y: 0 });
    const next = reduce(state([a, b]), { type: "trade", unit: "a", target: "b", kind: "weapon", index: 0 } as BattleAction, noRolls);
    expect(next.units[0].weapons).toEqual([]);
    expect(next.units[0].weapon).toBeUndefined();
  });

  it("back = 상대 소지품을 받아온다 (사용형 아이템)", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0 });
    const b = unit({ id: "b", force: 0, x: 0, y: 1, consumables: [vulnerary] });
    const next = reduce(
      state([a, b]),
      { type: "trade", unit: "a", target: "b", kind: "consumable", index: 0, back: true } as BattleAction,
      noRolls,
    );
    expect(next.units[0].consumables).toEqual([vulnerary]);
    expect(next.units[1].consumables).toEqual([]);
    expect(next.units[0].traded).toBe(true); // 방향 무관 — 행동 주체가 교환을 썼다
  });

  it("교환 후 인게이지 발동은 거부, 제자리 공격은 허용", () => {
    const a = unit({
      id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword, lance],
      engage: { count: 7, limit: 7, turnLimit: 3, turn: 0, engaging: false },
    });
    const b = unit({ id: "b", force: 0, x: 1, y: 0 });
    const e = unit({ id: "e", force: 1, x: 0, y: 1, weapon: sword });
    const afterTrade = reduce(state([a, b, e]), { type: "trade", unit: "a", target: "b", kind: "weapon", index: 1 } as BattleAction, noRolls);
    expect(() => reduce(afterTrade, { type: "engage", unit: "a" } as BattleAction, noRolls)).toThrow(/교환/);
    const attacked = reduce(afterTrade, { type: "attack", unit: "a", target: "e" } as BattleAction, {
      next: () => 9999,
    });
    expect(attacked.units[0].acted).toBe(true);
  });

  it("인게이지 후 교환은 가능", () => {
    const a = unit({
      id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword, lance],
      engage: { count: 7, limit: 7, turnLimit: 3, turn: 0, engaging: false },
    });
    const b = unit({ id: "b", force: 0, x: 1, y: 0 });
    const engaged = reduce(state([a, b]), { type: "engage", unit: "a" } as BattleAction, noRolls);
    const next = reduce(engaged, { type: "trade", unit: "a", target: "b", kind: "weapon", index: 1 } as BattleAction, noRolls);
    expect(next.units[1].weapons).toEqual([lance]);
  });

  it("페이즈 복귀가 traded 창을 리셋한다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword, lance] });
    const b = unit({ id: "b", force: 0, x: 1, y: 0 });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = reduce(state([a, b, e]), { type: "trade", unit: "a", target: "b", kind: "weapon", index: 1 } as BattleAction, noRolls);
    s = reduce(s, { type: "endPhase" } as BattleAction, noRolls);
    s = reduce(s, { type: "endPhase" } as BattleAction, noRolls);
    expect(s.units[0].traded).toBeUndefined();
  });

  it("불법 교환은 던진다 — 비인접·적 대상·자기 자신·없는 인덱스·행동 완료", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapons: [sword] });
    const far = unit({ id: "f", force: 0, x: 3, y: 0 });
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0 });
    const spent = unit({ id: "s", force: 0, x: 0, y: 1, acted: true, weapons: [sword] });
    const st = state([a, far, enemy, spent]);
    const t = (over: Record<string, unknown>) =>
      ({ type: "trade", unit: "a", target: "f", kind: "weapon", index: 0, ...over }) as BattleAction;
    expect(() => reduce(st, t({}), noRolls)).toThrow(/인접/);
    expect(() => reduce(st, t({ target: "e" }), noRolls)).toThrow();
    expect(() => reduce(st, t({ target: "a" }), noRolls)).toThrow();
    expect(() => reduce(st, t({ target: "s", index: 5 }), noRolls)).toThrow();
    expect(() => reduce(st, ({ type: "trade", unit: "s", target: "a", kind: "weapon", index: 0 }) as BattleAction, noRolls)).toThrow();
  });
});
