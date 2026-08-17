import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  canDance,
  createCalculator,
  createReducer,
  createReplayer,
  type BattleAction,
  type GameState,
  type RandomSource,
  type SkillRow,
  type UnitState,
} from "@fesim/engine";

/**
 * 춤(MP1-3) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 재행동 = 행동 완료 유닛에게만, 인접 1칸(실기 확인 2026-08-17) — 미행동 유닛에 걸리면 과대 재현.
 * (2) 재행동은 이동 창까지 새로 연다(acted·moved 리셋) — moved를 안 풀면 이동 없는 반쪽 재행동.
 * (3) 경험치 = 踊り経験計算 원문(자기 레벨 기본값 + 레벨차 감쇠, clamp 1..100) — 수기 상수 금지.
 * (4) refresh 이벤트가 기보에 실려야 절대 재생이 재행동을 복원한다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const noRolls: RandomSource = {
  next: () => {
    throw new Error("춤은 난수를 소비하지 않는다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const danceSkill: SkillRow = { Sid: "SID_踊り" };

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

const dance = (unit: string, target: string): BattleAction => ({ type: "dance", unit, target }) as BattleAction;

describe("춤 — 재행동 부여", () => {
  it("행동 완료 인접 아군을 되살린다(acted·moved 리셋), refresh 이벤트·경험 13(노멀 저레벨)", () => {
    const dancer = unit({ id: "d", force: 0, x: 0, y: 0, skills: [danceSkill] });
    const spent = unit({ id: "s", force: 0, x: 1, y: 0, acted: true, moved: false });
    const next = reduce(state([dancer, spent]), dance("d", "s"), noRolls);
    expect(next.units[1].acted).toBe(false);
    expect(next.units[1].moved).toBe(false);
    expect(next.units[0].acted).toBe(true);
    expect(next.events).toContainEqual({ type: "refresh", unit: "s" });
    expect(next.events).toContainEqual({ type: "exp", unit: "d", amount: 13, total: 13 });
  });

  it("경험치 감쇠 — 루나틱 레벨 20 무희가 레벨 1을 되살리면 8-62 → clamp 하한 1", () => {
    const dancer = unit({ id: "d", force: 0, x: 0, y: 0, level: 20, skills: [danceSkill] });
    const spent = unit({ id: "s", force: 0, x: 1, y: 0, acted: true });
    const next = reduce(state([dancer, spent], "l"), dance("d", "s"), noRolls);
    expect(next.events).toContainEqual({ type: "exp", unit: "d", amount: 1, total: 1 });
  });

  it("불법 춤은 던진다 — 스킬 없음·미행동 대상·비인접·적 대상·자기 자신", () => {
    const dancer = unit({ id: "d", force: 0, x: 0, y: 0, skills: [danceSkill] });
    const plain = unit({ id: "p", force: 0, x: 0, y: 1 }); // 미행동
    const far = unit({ id: "f", force: 0, x: 3, y: 0, acted: true });
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0, acted: true });
    const noskill = unit({ id: "n", force: 0, x: 1, y: 1, skills: [] });
    const st = state([dancer, plain, far, enemy, noskill]);
    expect(() => reduce(st, dance("d", "p"), noRolls)).toThrow(/행동 완료/);
    expect(() => reduce(st, dance("d", "f"), noRolls)).toThrow(/인접/);
    expect(() => reduce(st, dance("d", "e"), noRolls)).toThrow();
    expect(() => reduce(st, dance("d", "d"), noRolls)).toThrow();
    expect(() => reduce(st, dance("n", "d"), noRolls)).toThrow(/춤 스킬/);
  });

  it("canDance — SID_踊り/SID_特別な踊り 보유 판정 (UI 공용)", () => {
    expect(canDance(unit({ id: "a", force: 0, x: 0, y: 0, skills: [danceSkill] }))).toBe(true);
    expect(canDance(unit({ id: "b", force: 0, x: 0, y: 0, skills: [{ Sid: "SID_特別な踊り" }] }))).toBe(true);
    expect(canDance(unit({ id: "c", force: 0, x: 0, y: 0 }))).toBe(false);
  });
});

describe("춤 재생(절대 적용)", () => {
  it("events가 있으면 reduce 없이 복원 — 재행동·경험치까지", () => {
    const dancer = unit({ id: "d", force: 0, x: 0, y: 0, skills: [danceSkill] });
    const spent = unit({ id: "s", force: 0, x: 1, y: 0, acted: true });
    const initial = state([dancer, spent]);
    const recorded = reduce(initial, dance("d", "s"), noRolls);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: dance("d", "s"), events: recorded.events });
    expect(replayed.units[1].acted).toBe(false);
    expect(replayed.units[0].acted).toBe(true);
    expect(replayed.units[0].exp).toBe(13);
  });
});
