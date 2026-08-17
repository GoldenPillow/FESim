import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  type GameState,
  type RandomSource,
  type StructureState,
  type UnitState,
} from "@fesim/engine";

/**
 * 파괴 커맨드 — ★IL2CPP 판독 확정(MP3_READINGS §3): 파괴는 전투가 아니라 **결정론적 공격력 차감**이다.
 * (1) 대미지 = min(공격력(攻撃力計算 — 방어 차감 없음), 구조물 잔여 HP) × ActionCount,
 * (2) 명중 롤·필살·반격·난수 소비 = 전부 없음(호출 전수 스캔에서 Random 0건),
 * (3) Destroyer 필터 = 0 양군 · 1 자군만 · 2 적군만, (4) HP 0 → 구조물 소멸 = 통행 자연 개방.
 */

const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

/** 난수를 건드리면 즉사 — 파괴가 난수를 소비하지 않는다는 계약의 강제 장치. */
const noRandom: RandomSource = {
  next: () => {
    throw new Error("파괴는 난수를 소비하면 안 된다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: baseStats.hp,
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

function wallAt(x: number, y: number, over: Partial<StructureState> = {}): StructureState {
  return { x, y, w: 1, h: 1, tid: "TID_壊れる壁", group: 0, hp: 20, costs: { foot: 255 }, ...over };
}

function state(units: UnitState[], structures: StructureState[]): GameState {
  const cost = Array.from({ length: 3 }, () => [1, 1, 1, 1, 1]);
  return {
    turn: 1,
    phase: 0,
    difficulty: "n",
    map: { width: 5, height: 3, costs: { foot: cost } },
    units,
    structures,
    events: [],
  };
}

describe("destroy 액션", () => {
  it("인접 파괴: 대미지 = 공격력(15 = 힘10+검5) · 난수 무소비 · HP 0 = 통행 개방", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword });
    const s = state([a, unit({ id: "e", force: 1, x: 4, y: 2 })], [wallAt(1, 0)]);
    const once = reduce(s, { type: "destroy", unit: "a", x: 1, y: 0 }, noRandom);
    expect(once.structures?.[0]?.hp).toBe(5); // 20 − 15
    expect(once.units[0].acted).toBe(true);
    expect(once.events.some((e) => e.type === "destroy" && e.hpAfter === 5)).toBe(true);
    // 다음 자기 페이즈에 마저 부수면 개방 — 벽 칸을 지나 이동 가능해진다.
    const cycle = reduce(reduce(once, { type: "endPhase" }, noRandom), { type: "endPhase" }, noRandom);
    const opened = reduce(cycle, { type: "destroy", unit: "a", x: 1, y: 0 }, noRandom);
    expect(opened.structures?.[0]?.hp).toBe(0);
    const refreshed = reduce(reduce(opened, { type: "endPhase" }, noRandom), { type: "endPhase" }, noRandom);
    expect(() => reduce(refreshed, { type: "move", unit: "a", x: 2, y: 0 }, noRandom)).not.toThrow();
  });

  it("합법성: 비인접·행동 완료·타 페이즈·비파괴물 거부", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword });
    const s = state([a, unit({ id: "e", force: 1, x: 4, y: 2 })], [wallAt(2, 0)]);
    expect(() => reduce(s, { type: "destroy", unit: "a", x: 2, y: 0 }, noRandom)).toThrow(); // 거리 2
    expect(() => reduce(s, { type: "destroy", unit: "a", x: 1, y: 0 }, noRandom)).toThrow(); // 구조물 없음
    const acted = { ...s, units: [{ ...a, acted: true }, ...s.units.slice(1)] };
    expect(() => reduce(acted, { type: "destroy", unit: "a", x: 2, y: 0 }, noRandom)).toThrow();
  });

  it("Destroyer 필터: 2(적군만)는 자군 거부·적군 허용, 지붕·파괴 불가(HP 0 데이터)는 대상 아님", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 2, y: 0, weapon: sword });
    const enemyOnly = wallAt(1, 0, { tid: "TID_壊れる壁_HP90_敵のみ", hp: 90, destroyer: 2 });
    const s = state([a, e], [enemyOnly]);
    expect(() => reduce(s, { type: "destroy", unit: "a", x: 1, y: 0 }, noRandom)).toThrow();
    const enemyTurn = reduce(s, { type: "endPhase" }, noRandom);
    const hit = reduce(enemyTurn, { type: "destroy", unit: "e", x: 1, y: 0 }, noRandom);
    expect(hit.structures?.[0]?.hp).toBe(75); // 90 − 15
    // 지붕은 파괴 대상이 아니다(렌더 전용).
    const roof = wallAt(1, 0, { tid: "TID_屋根", hp: 0, roof: true });
    expect(() => reduce(state([a, e], [roof]), { type: "destroy", unit: "a", x: 1, y: 0 }, noRandom)).toThrow();
  });
});
