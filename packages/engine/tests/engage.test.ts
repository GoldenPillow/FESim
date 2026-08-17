import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  type BattleAction,
  type EngageState,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 인게이지 상태 기계(MP1-4a) — 정본 = il2cpp/EMBLEM_ENGAGE §3(전부 코드 확정):
 * (1) 충전 = 전투 1회 참가당 +1(공격·피격 양측), 상한 클램프 · 인게이지 중엔 충전 없음 · 턴당 자연 증가 없음.
 * (2) 발동 = count >= limit, 행동 소모 없음(발동 후 이동·공격 가능) · 발동 시 turn = 0.
 * (3) 소비 = 자기 페이즈 시작마다 turn += 1, turnLimit 도달 시 해제 + count = 0.
 * 이 순서가 어긋나면 게이지·지속이 실기와 어긋나 답안지 기보가 통째로 틀어진다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const roll = (...values: number[]): RandomSource => ({ next: () => values.shift() ?? 0 });

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
const gauge = (over: Partial<EngageState> = {}): EngageState => ({
  count: 0,
  limit: 7,
  turnLimit: 3,
  turn: 0,
  engaging: false,
  ...over,
});

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

function state(units: UnitState[], phase = 0): GameState {
  return {
    turn: 1,
    phase,
    difficulty: "n",
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

describe("인게이지 충전", () => {
  it("전투 1회 = 공격·피격 양측 +1(상한 클램프), charge 이벤트 절대값", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, engage: gauge({ count: 6 }) });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, engage: gauge({ count: 0 }) });
    const next = reduce(state([a, e]), { type: "attack", unit: "a", target: "e" } as BattleAction, roll(9999, 9999, 9999, 9999));
    expect(next.units[0].engage?.count).toBe(7);
    expect(next.units[1].engage?.count).toBe(1);
    expect(next.events).toContainEqual({ type: "charge", unit: "a", count: 7 });
    expect(next.events).toContainEqual({ type: "charge", unit: "e", count: 1 });
  });

  it("인게이지 중인 유닛은 충전되지 않는다 · 만충도 그대로", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, engage: gauge({ count: 7, engaging: true }) });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword });
    const next = reduce(state([a, e]), { type: "attack", unit: "a", target: "e" } as BattleAction, roll(9999, 9999, 9999, 9999));
    expect(next.units[0].engage?.count).toBe(7);
    expect(next.events.some((ev) => ev.type === "charge" && ev.unit === "a")).toBe(false);
  });

  it("지팡이 사용도 술자 +1 (전투 계산기 경로 — 가정, 실측 대조 대상)", () => {
    const h = unit({
      id: "h", force: 0, x: 0, y: 0,
      staves: [{ power: 10, rangeMin: 1, rangeMax: 1, uses: 5, rodType: 2, rodExp: 25 }],
      engage: gauge({ count: 2 }),
    });
    const t = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const next = reduce(state([h, t]), { type: "staff", unit: "h", target: "t" } as BattleAction, roll(0, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(next.units[0].engage?.count).toBe(3);
  });
});

describe("인게이지 발동·지속·해제", () => {
  it("발동 = 만충 필요·행동 소모 없음·turn 리셋 — 미만충은 던진다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7 }) });
    const b = unit({ id: "b", force: 0, x: 3, y: 0, engage: gauge({ count: 3 }) });
    const next = reduce(state([a, b]), { type: "engage", unit: "a" } as BattleAction, roll());
    expect(next.units[0].engage?.engaging).toBe(true);
    expect(next.units[0].engage?.turn).toBe(0);
    expect(next.units[0].acted).toBe(false); // 발동 후에도 행동 가능
    expect(next.events).toContainEqual({ type: "engage", unit: "a" });
    expect(() => reduce(state([a, b]), { type: "engage", unit: "b" } as BattleAction, roll())).toThrow();
  });

  it("자기 페이즈 시작마다 turn +1, turnLimit 도달 시 해제 + count 0", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7, engaging: true, turn: 0 }) });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = state([a, e]);
    // 적 페이즈로 → 자기 페이즈 복귀 = 1턴 소비. 3회 반복하면 해제.
    for (let cycle = 1; cycle <= 3; cycle++) {
      s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 적 페이즈 (소비 없음)
      expect(s.units[0].engage?.engaging).toBe(true);
      s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 자기 페이즈 (turn += 1)
      if (cycle < 3) {
        expect(s.units[0].engage?.turn).toBe(cycle);
        expect(s.units[0].engage?.engaging).toBe(true);
      }
    }
    expect(s.units[0].engage?.engaging).toBe(false);
    expect(s.units[0].engage?.count).toBe(0);
    expect(s.events).toContainEqual({ type: "disengage", unit: "a" });
  });

  it("絆 11 이상(turnLimit 4)은 한 페이즈 더 지속된다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7, engaging: true, turnLimit: 4 }) });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = state([a, e]);
    for (let i = 0; i < 3; i++) {
      s = reduce(s, { type: "endPhase" } as BattleAction, roll());
      s = reduce(s, { type: "endPhase" } as BattleAction, roll());
    }
    expect(s.units[0].engage?.engaging).toBe(true); // 3주기 뒤에도 유지(4턴째까지)
  });
});
