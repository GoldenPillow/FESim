import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import type { EphemerisStep } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  type BattleAction,
  type GameState,
  type RandomSource,
} from "@fesim/engine";

/**
 * 엔진 계약 서명: (국면, 행동, 난수소스) → 다음 국면.
 * 순수 함수여야 하는 이유 — 뷰어(리플레이 재생)·샌드박스·솔버(열거 탐색)가
 * 같은 함수를 공유하므로, 입력 변이나 숨은 난수가 있으면 세 소비자 전부가 깨진다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const cost = [[1, 1], [1, 1]];
const mkState = (): GameState => ({
  turn: 1,
  phase: 0,
  map: { width: 2, height: 2, costs: { foot: cost } },
  units: [
    {
      id: "a", force: 0, x: 0, y: 0, hp: 10,
      stats: { hp: 10, str: 5, mag: 0, dex: 5, spd: 5, lck: 0, def: 5, res: 5, bld: 5 },
      level: 1, exp: 0, movePoints: 2, moveType: "foot",
      acted: false, dead: false, broken: false,
    },
  ],
  events: [],
});
const action: BattleAction = { type: "move", unit: "a", x: 1, y: 0 };
const recorded: RandomSource = { next: () => 42 };

describe("엔진 계약", () => {
  it("reduce는 다음 국면을 반환한다", () => {
    const next = reduce(mkState(), action, recorded);
    expect(next.units[0].x).toBe(1);
    expect(typeof next.turn).toBe("number");
  });

  it("reduce는 입력 국면을 변이하지 않는다 (순수성)", () => {
    const state = mkState();
    Object.freeze(state);
    Object.freeze(state.units);
    state.units.forEach(Object.freeze);
    expect(() => reduce(state, action, recorded)).not.toThrow();
    expect(state.units[0].x).toBe(0);
  });

  it("같은 (국면, 행동, 난수 기록)이면 같은 국면 (결정성 = 리플레이 재현의 전제)", () => {
    const a = reduce(mkState(), action, { next: () => 7 });
    const b = reduce(mkState(), action, { next: () => 7 });
    expect(a).toEqual(b);
  });

  it("stateAt은 타임라인·초기 국면을 변이하지 않는다 (되감기가 원본을 갉으면 재생이 발산한다)", () => {
    const replayer = createReplayer(reduce);
    const steps: EphemerisStep[] = [
      { action },
      { action: { type: "wait", unit: "a" } },
      { action: { type: "endPhase" } },
    ];
    const initial = mkState();
    const timeline = replayer.buildTimeline(initial, steps);
    const before = JSON.stringify(timeline);
    Object.freeze(initial);
    Object.freeze(initial.units);
    initial.units.forEach(Object.freeze);

    for (let cursor = timeline.steps.length; cursor >= 0; cursor--) {
      expect(() => replayer.stateAt(timeline, cursor)).not.toThrow();
    }
    expect(JSON.stringify(timeline)).toBe(before);
    expect(replayer.stateAt(timeline, 0).units[0].x).toBe(0);
    expect(replayer.stateAt(timeline, 1).units[0].x).toBe(1);
  });
});
