import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  itemTargets,
  type BattleAction,
  type ConsumableItem,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 아이템 사용(MP1-1) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 傷薬 = 자신+주위 AddRange(2)칸 아군 범위 회복(공식 도움말 원문 확정 — gaps/N-patch §2-7).
 *     자기 전용으로 만들면 인게임과 다른 과소 재현, 적·범위 밖까지 돌리면 과대 재현.
 * (2) 회복량 = AddPower 고정(마력 무관 — 지팡이와 다른 규칙. 섞이면 회복량이 통째로 어긋난다).
 * (3) 미배선 AddType(인게이지·상태해제·스킬부여)은 정직 거부 — 조용한 no-op이 최악.
 * (4) 사용 횟수 소모가 재생 절대 적용에서도 복원돼야 잔여 횟수 표류가 없다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const noRolls: RandomSource = {
  next: () => {
    throw new Error("아이템 사용은 난수를 소비하지 않는다");
  },
};

const baseStats = { hp: 30, str: 10, mag: 14, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
/** 傷薬 실값(items.json): AddType 2 · AddPower 15 · AddRange 2 · Endurance 3. */
const vulnerary: ConsumableItem = { addType: 2, power: 15, range: 2, uses: 3 };
const holyWater: ConsumableItem = { addType: 31, power: 0, range: 1, uses: 3 };

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

const use = (unit: string, item?: number): BattleAction =>
  ({ type: "item", unit, ...(item !== undefined ? { item } : {}) }) as BattleAction;

describe("아이템 사용 — 범위 회복", () => {
  it("자신+반경 2칸 아군만 회복(고정 15·잃은 HP 상한), 적·범위 밖 제외, 난수 무소비", () => {
    const user = unit({ id: "u", force: 0, x: 0, y: 0, hp: 20, consumables: [vulnerary] });
    const near = unit({ id: "n", force: 0, x: 2, y: 0, hp: 28 }); // 거리 2 — 포함, 잃은 HP 2 상한
    const far = unit({ id: "f", force: 0, x: 3, y: 0, hp: 5 }); // 거리 3 — 제외
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0, hp: 5 }); // 적 — 제외
    const next = reduce(state([user, near, far, enemy]), use("u"), noRolls);
    expect(next.units[0].hp).toBe(30); // 20 + min(15, 10)
    expect(next.units[1].hp).toBe(30); // 28 + min(15, 2)
    expect(next.units[2].hp).toBe(5);
    expect(next.units[3].hp).toBe(5);
    expect(next.events).toContainEqual({ type: "heal", unit: "u", target: "u", amount: 10, hpAfter: 30 });
    expect(next.events).toContainEqual({ type: "heal", unit: "u", target: "n", amount: 2, hpAfter: 30 });
    expect(next.units[0].consumables?.[0].uses).toBe(2);
    expect(next.units[0].acted).toBe(true);
    expect(next.events.some((e) => e.type === "exp")).toBe(false); // 아이템 경험식은 calculator에 없다
    // 불변성
    expect(user.consumables?.[0].uses).toBe(3);
  });

  it("회복 대상이 하나도 없으면(전원 만피) 던진다", () => {
    const user = unit({ id: "u", force: 0, x: 0, y: 0, consumables: [vulnerary] });
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    expect(() => reduce(state([user, ally]), use("u"), noRolls)).toThrow();
  });

  it("미배선 AddType(31 스킬부여)·소진·불법 인덱스는 던진다", () => {
    const user = unit({ id: "u", force: 0, x: 0, y: 0, hp: 5, consumables: [holyWater, { ...vulnerary, uses: 0 }] });
    const st = state([user]);
    expect(() => reduce(st, use("u", 0), noRolls)).toThrow(/미배선/);
    expect(() => reduce(st, use("u", 1), noRolls)).toThrow(/소진/);
    expect(() => reduce(st, use("u", 9), noRolls)).toThrow();
  });

  it("itemTargets — 예보 UI와 reduce가 같은 대상 판정을 쓴다", () => {
    const user = unit({ id: "u", force: 0, x: 0, y: 0, hp: 20 });
    const near = unit({ id: "n", force: 0, x: 0, y: 2, hp: 28 });
    const full = unit({ id: "f2", force: 0, x: 1, y: 0 });
    const ids = itemTargets(user, [user, near, full], vulnerary).map((u) => u.id);
    expect(ids).toEqual(["u", "n"]);
  });
});

describe("아이템 재생(절대 적용)", () => {
  it("events가 있으면 reduce 없이 복원 — HP·사용 횟수까지", () => {
    const user = unit({ id: "u", force: 0, x: 0, y: 0, hp: 20, consumables: [vulnerary] });
    const near = unit({ id: "n", force: 0, x: 2, y: 0, hp: 28 });
    const initial = state([user, near]);
    const recorded = reduce(initial, use("u"), noRolls);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: use("u"), events: recorded.events });
    expect(replayed.units[0].hp).toBe(30);
    expect(replayed.units[1].hp).toBe(30);
    expect(replayed.units[0].consumables?.[0].uses).toBe(2);
    expect(replayed.units[0].acted).toBe(true);
  });
});
