import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  weaponAdvantage,
  type BattleAction,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 전투 해결·턴 진행 — 인게임 재현의 위험 지점을 박제한다:
 * (1) 타격 순서(본공격 → 체인 → 반격 → 추격)와 사망 시 즉시 중단,
 * (2) 브레이크(상성 유리 + 명중) = 반격 몰수, 중장은 면역,
 * (3) 경험치는 calculator 원문 공식(테이블 포함)으로— 수기 상수 금지.
 * 난수 소서는 전부 주입: 명중 롤 → (명중 시) 필살 롤 순으로 소비한다(리플레이 재현 계약).
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);
const reduce = createReducer(calc);

const seq = (...rolls: number[]): RandomSource => ({ roll: () => rolls.shift() ?? 0 });
const alwaysHit: RandomSource = { roll: () => 0 };
const alwaysMiss: RandomSource = { roll: () => 99 };

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
const axe = { might: 8, hit: 70, crit: 0, weight: 10, kind: 3, rangeMin: 1, rangeMax: 1 };

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
  const cost = Array.from({ length: 6 }, () => [1, 1, 1, 1, 1, 1]);
  return {
    turn: 1,
    phase,
    difficulty: "n",
    map: { width: 6, height: 6, costs: { foot: cost } },
    units,
    events: [],
  };
}

describe("상성 (검>도끼>창>검 · 체술>활/단검/마도서)", () => {
  it("삼각 관계와 체술 우위", () => {
    expect(weaponAdvantage(1, 3)).toBe(1); // 검 > 도끼
    expect(weaponAdvantage(3, 2)).toBe(1); // 도끼 > 창
    expect(weaponAdvantage(2, 1)).toBe(1); // 창 > 검
    expect(weaponAdvantage(3, 1)).toBe(-1);
    expect(weaponAdvantage(8, 4)).toBe(1); // 체술 > 활
    expect(weaponAdvantage(4, 8)).toBe(-1); // 우위는 방향 불문(활이 체술을 이기지는 못함)
    expect(weaponAdvantage(1, 1)).toBe(0);
  });
});

describe("이동", () => {
  it("이동 범위 내로 이동한다", () => {
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword })]);
    const next = reduce(s, { type: "move", unit: "a", x: 2, y: 1 }, alwaysHit);
    expect(next.units[0]).toMatchObject({ x: 2, y: 1 });
    expect(s.units[0].x).toBe(0); // 불변
  });

  it("이동력 밖·타 페이즈 행동은 거부한다 (엔진 = 합법성 심판)", () => {
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0 })]);
    expect(() => reduce(s, { type: "move", unit: "a", x: 5, y: 5 }, alwaysHit)).toThrow();
    const enemyTurn = state([unit({ id: "a", force: 0, x: 0, y: 0 })], 1);
    expect(() => reduce(enemyTurn, { type: "move", unit: "a", x: 1, y: 0 }, alwaysHit)).toThrow();
  });
});

describe("전투 해결", () => {
  it("격파: 명중 → 브레이크(검>도끼) → 추격으로 사망, 반격 몰수, 승리 판정", () => {
    // A 데미지 = (10+5) - 2 = 13, E HP 20: 13 + 추격 13 → 사망
    const enemyStats = { hp: 20, str: 8, mag: 0, dex: 4, spd: 5, lck: 0, def: 2, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 20, weapon: axe }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    const e = next.units.find((u) => u.id === "e")!;
    expect(e.dead).toBe(true);
    expect(e.hp).toBe(0);
    expect(next.units.find((u) => u.id === "a")!.hp).toBe(30); // 브레이크로 반격 없음
    expect(next.events.some((ev) => ev.type === "break")).toBe(true);
    expect(next.outcome).toBe("victory");
    expect(next.units.find((u) => u.id === "a")!.acted).toBe(true);
  });

  it("동종 무기(상성 없음)면 반격이 들어온다", () => {
    // 행운 10 = 쌍방 필살률 0 — 롤 0 고정 소스가 필살을 오발하지 않게 하는 픽스처 설계
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 10, def: 2, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: sword }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    // 반격 데미지 = (8+5) - 5 = 8
    expect(next.units.find((u) => u.id === "a")!.hp).toBe(22);
    expect(next.outcome).toBeUndefined();
  });

  it("중장 스타일은 브레이크 면역", () => {
    const armorStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 0, lck: 0, def: 8, res: 0, bld: 8 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: armorStats, hp: 30, weapon: axe, style: "重装スタイル" }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    expect(next.events.some((ev) => ev.type === "break")).toBe(false);
    expect(next.units.find((u) => u.id === "a")!.hp).toBeLessThan(30); // 반격 유효
  });

  it("빗나감 = 데미지 0, 필살 = 3배 (롤 소비: 명중 → 명중시 필살)", () => {
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 2, res: 0, bld: 5 };
    const mk = () =>
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: { ...sword, hit: 10, crit: 100 } }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: sword }),
      ]);
    const missed = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(99, 99, 99, 99));
    expect(missed.units.find((u) => u.id === "e")!.hp).toBe(30);
    // 명중(0)·필살(0) → 13*3 = 39 → 즉사
    const crit = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(0, 0));
    expect(crit.units.find((u) => u.id === "e")!.dead).toBe(true);
  });

  it("체인어택: 연계 스타일 아군이 사거리 안이면 협공 (위력 = floor(max(MaxHP*0.1, 1)), 명중 80)", () => {
    const enemyStats = { hp: 25, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 100, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "b", force: 0, x: 1, y: 1, weapon: sword, style: "連携スタイル" }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 25, weapon: sword }),
    ]);
    // 본공격 0뎀(수비 100), 체인 floor(2.5)=2
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    expect(next.units.find((u) => u.id === "e")!.hp).toBe(23);
    expect(next.events.filter((ev) => ev.type === "strike" && ev.kind === "chain").length).toBe(1);
  });

  it("격파 경험치 = calculator 공식 그대로 (동레벨 노멀 = 18), 레벨업은 성장률 롤", () => {
    const enemyStats = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const growth = { hp: 100, str: 100, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 1, weapon: sword }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    const a = next.units.find((u) => u.id === "a")!;
    const expEvent = next.events.find((ev) => ev.type === "exp") as { amount: number };
    expect(expEvent.amount).toBe(18); // 戦闘6 + 撃破12 (테이블 유래)
    expect(a.level).toBe(2);
    expect(a.exp).toBe(95 + 18 - 100);
    expect(a.stats.hp).toBe(baseStats.hp + 1); // 성장 100% → +1, 롤 0 < 100
    expect(a.stats.str).toBe(baseStats.str + 1);
    expect(a.stats.spd).toBe(baseStats.spd); // 성장 0% → 롤 실패
  });
});

describe("턴/페이즈 진행", () => {
  it("페이즈 종료 → 다음 군, 자군 복귀 시 턴 증가, 시작 군의 행동/브레이크 해제", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, acted: true }),
      unit({ id: "e", force: 1, x: 3, y: 3, broken: true, acted: true }),
    ]);
    const enemyPhase = reduce(s, { type: "endPhase" }, alwaysHit);
    expect(enemyPhase.phase).toBe(1);
    expect(enemyPhase.turn).toBe(1);
    expect(enemyPhase.units.find((u) => u.id === "e")!.acted).toBe(false);
    expect(enemyPhase.units.find((u) => u.id === "e")!.broken).toBe(false);
    const back = reduce(enemyPhase, { type: "endPhase" }, alwaysHit);
    expect(back.phase).toBe(0);
    expect(back.turn).toBe(2);
    expect(back.units.find((u) => u.id === "a")!.acted).toBe(false);
  });

  it("대기 = 행동 완료", () => {
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0 })]);
    const next = reduce(s, { type: "wait", unit: "a" }, alwaysHit);
    expect(next.units[0].acted).toBe(true);
  });
});
