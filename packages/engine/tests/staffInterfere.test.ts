import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData, StatusGive } from "@fesim/shared";
import {
  BAD_STATE,
  createCalculator,
  createReducer,
  createReplayer,
  hasBadState,
  moveBudget,
  staffHitRate,
  type BattleAction,
  type GameState,
  type RandomSource,
  type StaffItem,
  type UnitState,
} from "@fesim/engine";

/**
 * 방해 지팡이·상태 시스템(MP1-5) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 명중률 = clamp(clamp(妨害杖命中値,0,999) − clamp(妨害杖回避値,0,999), 0, 100) 원문 공식 —
 *     게이트는 InterferenceRod 상태 비트(HitParam.Calculate 0x19B7850, 회피는 상대측 게이트 0x19B73C0),
 *     명중률 자체는 통상 命中率計算 경로(CalcRodAttack 0x24731E0 → RandomCheckHit — 지팡이 전용 식은 없다),
 * (2) 명중 시 GiveSids 상태 부여, 빗나가도 사용 횟수는 소모(명중 롤 1회 = 리플레이 계약),
 * (3) 상태 지속 = Cycle=PhaseAfter → Life×3 페이즈 에이징(SkillArray.OnBuild 0x248AB64), Life 0 = 무제한(독 선례),
 * (4) 효과 게이트: 침묵 = 지팡이 봉인 · 이동불가 = 이동 예산 0 · 기절 = 전 행동 거부.
 * ☠명중 실패 시 경험치는 근거 부재(ExpRodMiss 소비처 미판독) — 0 채택, 실측 반증 시 갱신.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);
const reduce = createReducer(calc);

const roll = (...values: number[]): RandomSource => {
  const seq = [...values];
  return {
    next: () => {
      const v = seq.shift();
      if (v === undefined) throw new Error("테스트 롤 소진");
      return v;
    },
  };
};

const baseStats = { hp: 30, str: 10, mag: 14, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
/** SID_移動不可 실값(skills.json): BadState 256 · Life 1 · Cycle 3. */
const freezeGive: StatusGive = { sid: "SID_移動不可", badState: 256, life: 1 };
const silenceGive: StatusGive = { sid: "SID_沈黙", badState: 32, life: 1 };
/** SID_気絶 실값: Life 0 — 독 선례로 무제한 해석(실기 대조 대상). */
const stunGive: StatusGive = { sid: "SID_気絶", badState: 1024, life: 0 };
/** フリーズ 실값(items.json): Hit 70 · Range 1-6 · Endurance 5 · RodExp 35. */
const freezeStaff: StaffItem = {
  power: 0, rangeMin: 1, rangeMax: 6, uses: 5, rodType: 3, useType: 9, hit: 70, rodExp: 35,
  gives: [freezeGive],
};
const silenceStaff: StaffItem = { ...freezeStaff, useType: 11, gives: [silenceGive] };
const stunStaff: StaffItem = { ...freezeStaff, useType: 29, rangeMax: 10, uses: 10, rodExp: 30, gives: [stunGive] };
/** ドロー — GiveSids 없음(효과 미판독) = 정직 거부 판별자. */
const drawStaff: StaffItem = { power: 0, rangeMin: 1, rangeMax: 6, uses: 3, rodType: 3, useType: 27, hit: 50, rodExp: 35 };

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

const cast = (unit: string, target: string, staff = 0): BattleAction => ({ type: "staff", unit, target, staff });

describe("방해 지팡이 명중식", () => {
  it("명중률 = 妨害杖命中値(魔力+技+武器命中) − 妨害杖回避値(int((魔防*3+幸運)/2)+地形回避)", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    const st = state([caster, target]);
    // 14+10+70 = 94 · int((5*3+5)/2) = 10 → 84
    expect(staffHitRate(calc, caster, target, freezeStaff, st.map)).toBe(84);
  });

  it("지형 회피가 회피값에 가산된다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    const st = state([caster, target]);
    st.map.terrain = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ avoid: 0, def: 0 })));
    st.map.terrain[0][1] = { avoid: 30, def: 0 };
    expect(staffHitRate(calc, caster, target, freezeStaff, st.map)).toBe(54);
  });

  it("명중 → 상태 부여 + 사용 횟수 소모 + 경험치(杖経験計算)", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    const next = reduce(state([caster, target]), cast("c", "e"), roll(0));
    expect(next.events).toContainEqual({
      type: "status", unit: "c", target: "e", sid: "SID_移動不可", badState: 256, life: 1,
    });
    expect(next.units[1].statuses).toEqual([{ sid: "SID_移動不可", badState: 256, life: 1, age: 0 }]);
    expect(next.units[0].staves?.[0].uses).toBe(4);
    expect(next.units[0].acted).toBe(true);
    expect(next.events).toContainEqual({ type: "exp", unit: "c", amount: 35, total: 35 });
  });

  it("빗나감 → 상태 무부여·횟수는 소모·경험치 없음(근거 부재 = 0 채택)", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    const next = reduce(state([caster, target]), cast("c", "e"), roll(9999));
    expect(next.events).toContainEqual({ type: "staffMiss", unit: "c", target: "e" });
    expect(next.units[1].statuses).toBeUndefined();
    expect(next.units[0].staves?.[0].uses).toBe(4);
    expect(next.units[0].acted).toBe(true);
    expect(next.events.some((e) => e.type === "exp")).toBe(false);
  });

  it("아군 대상·효과 미판독(ドロー)은 던진다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff, drawStaff] });
    const ally = unit({ id: "a", force: 0, x: 1, y: 0 });
    const enemy = unit({ id: "e", force: 1, x: 2, y: 0 });
    const st = state([caster, ally, enemy]);
    expect(() => reduce(st, cast("c", "a"), roll(0))).toThrow(/적만/);
    expect(() => reduce(st, cast("c", "e", 1), roll(0))).toThrow(/미판독/);
  });
});

describe("상태 효과 게이트", () => {
  it("이동불가 = 이동 예산 0 (행동은 가능)", () => {
    const frozen = unit({
      id: "f", force: 0, x: 0, y: 0,
      statuses: [{ ...freezeGive, age: 0 }],
    });
    expect(moveBudget(frozen)).toBe(0);
    expect(hasBadState(frozen, BAD_STATE.freeze)).toBe(true);
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0 });
    const st = state([frozen, enemy]);
    expect(() => reduce(st, { type: "move", unit: "f", x: 1, y: 1 }, roll())).toThrow(/이동 범위 밖/);
  });

  it("침묵 = 지팡이 사용 불가", () => {
    const caster = unit({
      id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff],
      statuses: [{ ...silenceGive, age: 0 }],
    });
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0 });
    expect(() => reduce(state([caster, enemy]), cast("c", "e"), roll(0))).toThrow(/침묵/);
  });

  it("기절 = 전 행동 거부", () => {
    const stunned = unit({
      id: "s", force: 0, x: 0, y: 0, weapon: { might: 5, hit: 90, crit: 0, weight: 5, rangeMin: 1, rangeMax: 1, kind: 1 },
      statuses: [{ ...stunGive, age: 0 }],
    });
    const enemy = unit({ id: "e", force: 1, x: 1, y: 0 });
    const st = state([stunned, enemy]);
    expect(() => reduce(st, { type: "wait", unit: "s" }, roll())).toThrow(/기절/);
    expect(() => reduce(st, { type: "attack", unit: "s", target: "e" }, roll(0, 0))).toThrow(/기절/);
    expect(moveBudget(stunned)).toBe(0);
  });
});

describe("상태 지속(페이즈 에이징)", () => {
  it("Life 1 = 3페이즈 종료에 소멸 — 걸린 반대편 페이즈 정확히 1회를 봉쇄한다", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    let st = reduce(state([caster, target]), cast("c", "e"), roll(0));
    // 자군 페이즈 종료(1) → 적 페이즈 종료(2) → 자군 페이즈 종료(3) = 소멸
    st = reduce(st, { type: "endPhase" }, roll());
    expect(st.units[1].statuses?.[0].age).toBe(1);
    st = reduce(st, { type: "endPhase" }, roll());
    expect(st.units[1].statuses?.[0].age).toBe(2);
    st = reduce(st, { type: "endPhase" }, roll());
    expect(st.units[1].statuses).toBeUndefined();
  });

  it("Life 0(気絶)은 에이징으로 소멸하지 않는다 — 무제한(독 선례)", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [stunStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    let st = reduce(state([caster, target]), cast("c", "e"), roll(0));
    for (let i = 0; i < 6; i++) st = reduce(st, { type: "endPhase" }, roll());
    expect(st.units[1].statuses?.[0].sid).toBe("SID_気絶");
  });

  it("같은 상태 재부여는 중첩이 아니라 치환(age 리셋)", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [{ ...freezeStaff, uses: 5 }] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0, statuses: [{ ...freezeGive, age: 2 }] });
    const next = reduce(state([caster, target]), cast("c", "e"), roll(0));
    expect(next.units[1].statuses).toEqual([{ sid: "SID_移動不可", badState: 256, life: 1, age: 0 }]);
  });
});

describe("방해 지팡이 재생(절대 적용)", () => {
  it("명중 기록의 events 절대 적용 — 상태·경험치·사용 횟수 복원", () => {
    const caster = unit({ id: "c", force: 0, x: 0, y: 0, staves: [freezeStaff] });
    const target = unit({ id: "e", force: 1, x: 1, y: 0 });
    const initial = state([caster, target]);
    const recorded = reduce(initial, cast("c", "e"), roll(0));
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: cast("c", "e"), events: recorded.events });
    expect(replayed.units[1].statuses).toEqual([{ sid: "SID_移動不可", badState: 256, life: 1, age: 0 }]);
    expect(replayed.units[0].staves?.[0].uses).toBe(4);
    expect(replayed.units[0].exp).toBe(35);
    expect(replayed.units[0].acted).toBe(true);
  });
});
