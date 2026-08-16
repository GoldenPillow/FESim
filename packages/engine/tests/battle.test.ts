import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData, SupportsTable } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  forecastSide,
  hitThreshold10000,
  moveBudget,
  toCombatant,
  weaponAdvantage,
  type BattleAction,
  type GameState,
  type RandomSource,
  type SkillRow,
  type StatBlock,
  type SupportEffects,
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
const supportEffects: SupportEffects = (
  JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/supports.json", import.meta.url), "utf-8"),
  ) as SupportsTable
).effects;

const seq = (...rolls: number[]): RandomSource => ({ next: () => rolls.shift() ?? 0 });
const alwaysHit: RandomSource = { next: () => 0 };
const alwaysMiss: RandomSource = { next: (bound) => bound - 1 };

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

  it("활성화당 이동은 1회 — 재이동은 거부하고, 페이즈가 돌아오면 다시 이동한다", () => {
    // 왜 위험한가: 이동이 moved를 안 남기면 "이동 → 그 자리에서 또 최대사거리 이동"이 합법이 되어
    // 이동력 제한이 무의미해진다(2026-08-16 베타 실기 발견). 기보에도 불법 수순이 박제된다.
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword })]);
    const moved = reduce(s, { type: "move", unit: "a", x: 2, y: 1 }, alwaysHit);
    expect(() => reduce(moved, { type: "move", unit: "a", x: 4, y: 1 }, alwaysHit)).toThrow();
    const waited = reduce(moved, { type: "wait", unit: "a" }, alwaysHit);
    expect(() => reduce(waited, { type: "move", unit: "a", x: 3, y: 1 }, alwaysHit)).toThrow(); // 재이동 스킬 없음
    const nextRound = reduce(waited, { type: "endPhase" }, alwaysHit);
    expect(() => reduce(nextRound, { type: "move", unit: "a", x: 3, y: 1 }, alwaysHit)).not.toThrow();
  });

  it("재이동(시구르드): 행동 후 Power칸 1회 — 거리 정본 = skills.json Power", () => {
    // 왜 위험한가: 공식 도움말 "행동 후 2칸(재이동)/3칸(재이동+)" — 남은 이동력이 아니다.
    // 수기 상수로 박으면 재이동+와 어긋난다(Power가 정본). 행동 전 재이동 금지·창당 1회도 함께 박제.
    const canter = [{ Sid: "SID_再移動", Power: 2 }];
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: canter })]);
    const moved = reduce(s, { type: "move", unit: "a", x: 2, y: 0 }, alwaysHit);
    const acted = reduce(moved, { type: "wait", unit: "a" }, alwaysHit);
    expect(() => reduce(acted, { type: "move", unit: "a", x: 5, y: 0 }, alwaysHit)).toThrow(); // 3칸 > Power 2
    const canted = reduce(acted, { type: "move", unit: "a", x: 4, y: 0 }, alwaysHit);
    expect(canted.units[0]).toMatchObject({ x: 4, y: 0 });
    expect(() => reduce(canted, { type: "move", unit: "a", x: 5, y: 0 }, alwaysHit)).toThrow(); // 재이동은 1회
    // 재이동+ = Power 3
    const plus = [{ Sid: "SID_再移動＋", Power: 3 }];
    const s2 = state([unit({ id: "b", force: 0, x: 0, y: 0, weapon: sword, skills: plus })]);
    const acted2 = reduce(s2, { type: "wait", unit: "b" }, alwaysHit);
    expect(reduce(acted2, { type: "move", unit: "b", x: 3, y: 0 }, alwaysHit).units[0]).toMatchObject({ x: 3, y: 0 });
  });
});

describe("이동 예산(moveBudget) — UI가 소비하는 단일 정본", () => {
  it("행동 전 = 이동력 · 이동 후 = 0 · 행동 후 = 재이동 Power 또는 불가", () => {
    // 왜 위험한가: 이 판정이 UI에 중복 구현돼 있던 것이 C4(UI-엔진 표류)의 실존 사례였다
    // (2026-08-16 베타 이동 결함의 근본 원인 — design/verification.md §2-3). 엔진 수출 함수가 유일 정본이다.
    const canter = [{ Sid: "SID_再移動", Power: 2 }];
    const fresh = unit({ id: "a", force: 0, x: 0, y: 0 });
    expect(moveBudget(fresh)).toBe(4);
    expect(moveBudget({ ...fresh, moved: true })).toBe(0); // 행동 전 이동 소진 = 제자리 행동만
    expect(moveBudget({ ...fresh, acted: true })).toBeUndefined(); // 재이동 스킬 없음
    expect(moveBudget({ ...fresh, acted: true, skills: canter })).toBe(2);
    expect(moveBudget({ ...fresh, acted: true, moved: true, skills: canter })).toBeUndefined(); // 재이동도 1회
  });

  it("reduce의 이동 수락 = moveBudget과 일치한다", () => {
    const canter = [{ Sid: "SID_再移動", Power: 2 }];
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: canter })]);
    const acted = reduce(s, { type: "wait", unit: "a" }, alwaysHit);
    const u = acted.units[0];
    expect(moveBudget(u)).toBe(2);
    expect(reduce(acted, { type: "move", unit: "a", x: 2, y: 0 }, alwaysHit).units[0].x).toBe(2);
    expect(() => reduce(acted, { type: "move", unit: "a", x: 3, y: 0 }, alwaysHit)).toThrow();
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

  it("브레이크는 피격 전투 1회 직후 해제 — 같은 페이즈 세 번째 공격부터 반격 재개", () => {
    // 왜 위험한가: 종전 모델(자기 페이즈 복귀까지 유지)은 같은 아군 턴의 후속 공격 전부를
    // 반격 몰수로 과대 계산했다. 실기 반증 = 사용자 스크린샷 3장(2026-08-17, reference/screens):
    // 브레이크 걸린 적 피격 시 그 전투까지 반격 불가 유지 → 전투 직후 해제. 적턴 시작 해제와 양립
    // (kr 도움말 "한 번 전투를 하거나 다음 턴이 되기 전까지"의 '한 번 전투' 절이 이것이다).
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 10, def: 12, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a1", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "a2", force: 0, x: 1, y: 1, weapon: axe }),
      unit({ id: "a3", force: 0, x: 2, y: 0, weapon: axe }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: axe }),
    ]);
    const afterBreak = reduce(s, { type: "attack", unit: "a1", target: "e" }, alwaysHit);
    expect(afterBreak.units.find((u) => u.id === "e")!.broken).toBe(true);
    expect(afterBreak.units.find((u) => u.id === "a1")!.hp).toBe(30); // 브레이크로 반격 없음
    const afterSecond = reduce(afterBreak, { type: "attack", unit: "a2", target: "e" }, alwaysHit);
    expect(afterSecond.units.find((u) => u.id === "a2")!.hp).toBe(30); // 이 전투까지는 반격 불가
    expect(afterSecond.events.some((ev) => ev.type === "breakRelease")).toBe(true);
    expect(afterSecond.units.find((u) => u.id === "e")!.broken).toBe(false); // 직후 해제
    const afterThird = reduce(afterSecond, { type: "attack", unit: "a3", target: "e" }, alwaysHit);
    expect(afterThird.units.find((u) => u.id === "a3")!.hp).toBeLessThan(30); // 반격 재개
  });

  it("빗나감 = 데미지 0, 필살 = 3배 (롤 소비: 명중 → 명중시 필살)", () => {
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 2, res: 0, bld: 5 };
    const mk = () =>
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: { ...sword, hit: 10, crit: 100 } }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: sword }),
      ]);
    // 롤은 판정별 해상도를 따른다: 명중 [0,10000) · 필살 [0,100000).
    const missed = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(9999, 9999, 9999, 9999));
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

  it("체인어택 경험치 = 실제 체인 참가 수만큼 가산 (정본 チェインアタック基本値 * チェインアタック回数)", () => {
    // 왜 위험한가: 같은 처리에서 체인어택을 실제로 굴리면서 경험치 환경에는 체인 횟수 0을 고정
    // 전달하면 자기모순이다(A축 §6-1). 노멀 동레벨 = 전투 6 + 체인기본 1 × 참가 수.
    const enemyStats = { hp: 25, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 100, res: 0, bld: 5 };
    const mk = (chains: UnitState[]) =>
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
        ...chains,
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 25, weapon: sword }),
      ]);
    const chainOf = (id: string, x: number, y: number) =>
      unit({ id, force: 0, x, y, weapon: sword, style: "連携スタイル" });
    const expOf = (s: GameState) => (s.events.find((ev) => ev.type === "exp") as { amount: number }).amount;

    expect(expOf(reduce(mk([]), { type: "attack", unit: "a", target: "e" }, alwaysHit))).toBe(6);
    expect(expOf(reduce(mk([chainOf("b", 1, 1)]), { type: "attack", unit: "a", target: "e" }, alwaysHit))).toBe(7);
    expect(
      expOf(reduce(mk([chainOf("b", 1, 1), chainOf("c", 2, 0)]), { type: "attack", unit: "a", target: "e" }, alwaysHit)),
    ).toBe(8);
  });

  it("범용 브레이크 무효 스킬도 면역 (SID_ブレイク無効·_効果 — 41 인물 LunaticSids 실재)", () => {
    // 왜 위험한가: 엔진이 검사하던 SID_相性ブレイク無効은 어떤 인물·직업·엠블렘도 보유하지 않는다.
    // 실제로 쓰이는 것은 SID_ブレイク無効(PID_M002_ルミエル 등 41건 LunaticSids)과 그 부여 효과
    // SID_ブレイク無効_効果(熟練者·ヘクトル엔게이지 기술이 SyncSids로 부여)다 — 면역 유닛이 브레이크된다(A축 §6-5).
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 0, lck: 10, def: 5, res: 0, bld: 5 };
    const attack = (sid: string) => {
      const s = state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: axe, skills: [{ Sid: sid }] }),
      ]);
      return reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    };
    for (const sid of ["SID_相性ブレイク無効", "SID_ブレイク無効", "SID_ブレイク無効_効果"]) {
      const next = attack(sid);
      expect(next.events.some((ev) => ev.type === "break")).toBe(false);
      expect(next.units.find((u) => u.id === "a")!.hp).toBeLessThan(30); // 면역 = 반격 유효
    }
    // 면역이 없으면 종전대로 브레이크된다(대조군)
    expect(attack("SID_無関係").events.some((ev) => ev.type === "break")).toBe(true);
  });

  it("성장률 100 초과: 확정 가산 + 잔여 1롤 (105% = +1 확정, 잔여 5%)", () => {
    // 왜 위험한가: 1롤 모델(roll() < grow)은 롤이 [0,100)이라 100 초과분을 통째로 버린다 —
    // person.Grow 실측 최대 105(D축 §4)라 초과 성장이 영구 소실된다. 롤 소비 수는 스탯당 1회로 유지(리플레이 계약).
    const enemyStats = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const growth = { hp: 0, str: 105, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };
    const mk = () =>
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 1, weapon: sword }),
      ]);
    // 롤 소비: 명중 → 필살 → 성장률이 0이 아닌 스탯만 1롤(str뿐). 잔여 5% = 5000/100000.
    const over = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(0, 99, 4999));
    expect(over.units.find((u) => u.id === "a")!.stats.str).toBe(baseStats.str + 2); // 확정 1 + 잔여 성공
    // 잔여가 실패하면 획득 1스탯 < abort(2)라 최대 4시도까지 재굴림한다 — 전부 실패시켜야 +1로 끝난다.
    const one = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(0, 99, 5000, 5000, 5000, 5000));
    expect(one.units.find((u) => u.id === "a")!.stats.str).toBe(baseStats.str + 1); // 잔여 롤 5 = 실패
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

/**
 * 지원(絆) 보정 — 수치 정본 = reliance.xml 支援効果(data/fe17/tables/supports.json).
 * ★발동 거리 = 인접 1타일(사용자 실기 실측 2026-08-17) — 2칸 이상은 무효다.
 * 이 결함이 위험했던 이유: 계산기 공식(命中値 = ... + 支援命中)과 Combatant.support 슬롯이 이미 있는데
 * toCombatant가 채우지 않아, 인접 지원이 붙은 전투가 전부 명중·회피 과소 계산으로 조용히 어긋났다.
 */
describe("지원(絆) 보정", () => {
  const dullSword = { ...sword, hit: 30 }; // 명중률을 100 클램프 밖에 두어 보정이 관측되게 한다
  const forecast = (s: GameState, effects?: SupportEffects) =>
    forecastSide(
      calc,
      toCombatant(s.units.find((u) => u.id === "a")!, s.map, s.units, effects),
      toCombatant(s.units.find((u) => u.id === "d")!, s.map, s.units, effects),
    );

  // a(技10 幸運5 무기명중30) → 命中値 52 · d(速さ10 幸運5 무기없음) → 回避値 22 · 명중률 30이 기준선이다.
  const field = (partial: { a?: Partial<UnitState>; d?: Partial<UnitState>; allies?: UnitState[] }) =>
    state([
      unit({ id: "a", force: 0, x: 1, y: 1, weapon: dullSword, ...partial.a }),
      unit({ id: "d", force: 1, x: 2, y: 1, ...partial.d }),
      ...(partial.allies ?? []),
    ]);

  it("인접 파트너의 支援効果만큼 명중·회피가 변한다", () => {
    const base = field({});
    expect(forecast(base, supportEffects).hitRate).toBe(30);

    // b = 命中 archetype L1 → Hit15. a의 왼쪽 아래(맨해튼 1).
    const withHitter = field({
      a: { supports: { b: 1 } },
      allies: [unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" })],
    });
    expect(forecast(withHitter, supportEffects).hitRate).toBe(45); // 52+15 - 22

    // e = 回避 archetype L3 → Avoid10(방어측 회피가 오르면 명중률이 내린다).
    const both = field({
      a: { supports: { b: 1 } },
      d: { supports: { e: 3 } },
      allies: [
        unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" }),
        unit({ id: "e", force: 1, x: 3, y: 1, supportCategory: "回避" }),
      ],
    });
    expect(forecast(both, supportEffects).hitRate).toBe(35); // 67 - 32
  });

  it("복수 파트너는 합산한다(원문에 상한·배타 규정 없음 — 가정)", () => {
    const s = field({
      a: { supports: { b: 1, c: 4 } },
      allies: [
        unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" }), // L1 Hit15
        unit({ id: "c", force: 0, x: 0, y: 1, supportCategory: "必殺" }), // L4 Hit10/Crit12/Secure5
      ],
    });
    const f = forecast(s, supportEffects);
    expect(f.hitRate).toBe(55); // 52 + 15 + 10 - 22
    expect(f.critRate).toBe(12); // int(10/2) + 12 - 5
  });

  it("2칸 이상 떨어진 파트너는 무효다(발동 거리 = 인접 1타일, 실측 2026-08-17)", () => {
    const s = field({
      a: { supports: { b: 1 } },
      allies: [unit({ id: "b", force: 0, x: 1, y: 3, supportCategory: "命中" })], // 맨해튼 2
    });
    expect(forecast(s, supportEffects).hitRate).toBe(30);
    // 대각(1,2)→(2,2)도 맨해튼 2다 — 4방 인접 해석의 귀결(대각 발동은 미실측).
    const diagonal = field({
      a: { supports: { b: 1 } },
      allies: [unit({ id: "b", force: 0, x: 2, y: 2, supportCategory: "命中" })],
    });
    expect(forecast(diagonal, supportEffects).hitRate).toBe(30);
  });

  it("supports가 없으면 종전과 동일하다(무회귀)", () => {
    const s = field({
      allies: [unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" })],
    });
    expect(forecast(s, supportEffects)).toEqual(forecast(s, undefined));
    expect(forecast(s, supportEffects).hitRate).toBe(30);
  });

  it("archetype은 파트너의 SupportCategory로 인덱싱한다(수혜자 것이 아니다)", () => {
    // 왜 위험한가: 수혜자 기준으로 뒤집으면 인접한 두 유닛의 보정이 통째로 뒤바뀐다.
    // 정본 = App.UnitReliance.TryGetSupportData(RVA 0x1C5B150) — 파트너의 PersonData+0x80만 읽는다.
    const s = field({
      a: { supports: { b: 1 }, supportCategory: "回避" }, // 수혜자 = 回避
      allies: [unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" })], // 파트너 = 命中
    });
    expect(forecast(s, supportEffects).hitRate).toBe(45); // 파트너(命中) 기준. 수혜자 기준이면 40이다.
  });

  it("다른 세력 유닛은 파트너가 아니다(엄격 동일 Force — 동맹도 제외)", () => {
    // 왜 위험한가: '아군'을 동맹 포함으로 넓히면 청색 NPC 옆에서 없던 보정이 생긴다.
    // SupportCalculator.RangeFunction(0x20AE4B0)은 Force.Type 동일성만 보고 IsAllide를 쓰지 않는다.
    const s = field({
      a: { supports: { b: 1 } },
      allies: [unit({ id: "b", force: 2, x: 1, y: 2, supportCategory: "命中" })],
    });
    expect(forecast(s, supportEffects).hitRate).toBe(30);
  });

  it("reduce가 지원 보정을 태운다 — 같은 롤이 지원 유무로 명중/빗나감을 가른다", () => {
    const s = field({
      a: { supports: { b: 1 } },
      allies: [unit({ id: "b", force: 0, x: 1, y: 2, supportCategory: "命中" })],
    });
    const action: BattleAction = { type: "attack", unit: "a", target: "d" };
    // 롤 4400 < 4500(지원 후 명중 45%의 임계) → 명중 · 지원이 없으면 30%(3000)이라 빗나간다.
    const hit = createReducer(calc, supportEffects)(s, action, seq(4400));
    expect(hit.events.find((e) => e.type === "strike")).toMatchObject({ hit: true });
    const miss = reduce(s, action, seq(4400));
    expect(miss.events.find((e) => e.type === "strike")).toMatchObject({ hit: false });
  });
});

describe("명중 난수 — sin 곡선 배선(인게임 정본)", () => {
  /**
   * 왜 위험했나: 예보 수치가 같아도 결과 분포가 달랐다. 표시 명중 51~99는 실제로 더 잘 맞는데
   * 엔진은 표시값을 그대로 굴려 과소 명중을 냈다 — 전략 조언 자체가 틀어지는 구간이다.
   * 정본 = App.BattleMath.GetHitRatio10000 (RVA 0x1E8D200), 곡선 자체의 검증은 probability.test.ts.
   */
  const scene = () =>
    state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: { ...sword, hit: 55 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: { ...baseStats, spd: 0, lck: 0 } }),
    ]);
  const duel = (hitRoll: number): GameState =>
    reduce(scene(), { type: "attack", unit: "a", target: "e" }, seq(hitRoll, 99999));

  it("표시 명중과 임계 사이의 굴림이 명중이 된다(선형 모델이면 빗나갔을 구간)", () => {
    const s = scene();
    const rate = forecastSide(
      calc,
      toCombatant(s.units.find((u) => u.id === "a")!, s.map, s.units),
      toCombatant(s.units.find((u) => u.id === "e")!, s.map, s.units),
    ).hitRate;
    expect(rate).toBeGreaterThan(50); // 곡선 구간이라야 의미 있는 검사다
    expect(rate).toBeLessThan(100);

    const linearOnly = rate * 100; // 옛 모델이 쓰던 임계
    const curved = hitThreshold10000(rate);
    expect(curved).toBeGreaterThan(linearOnly);

    expect(duel(linearOnly).events.find((e) => e.type === "strike")).toMatchObject({ hit: true });
    expect(duel(curved - 1).events.find((e) => e.type === "strike")).toMatchObject({ hit: true });
    expect(duel(curved).events.find((e) => e.type === "strike")).toMatchObject({ hit: false });
  });

  /** 판정마다 해상도가 다르다 — 상한이 곧 리플레이 계약이라 소비 순서·개수와 함께 박제한다. */
  const consumedBounds = (crit: number): number[] => {
    const bounds: number[] = [];
    const spy: RandomSource = {
      next(bound) {
        bounds.push(bound);
        return 0;
      },
    };
    reduce(
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: { ...sword, crit } }),
        unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword }),
      ]),
      { type: "attack", unit: "a", target: "e" },
      spy,
    );
    return bounds;
  };

  it("명중은 [0,10000)·필살은 [0,100000)에서 뽑는다", () => {
    expect(consumedBounds(50).slice(0, 2)).toEqual([10000, 100000]);
  });

  it("필살률 0이면 필살 롤을 아예 소비하지 않는다(게임도 percent<=0이면 난수 미소모)", () => {
    expect(consumedBounds(0)[1]).not.toBe(100000);
  });
});

/**
 * 발동 필터가 실전투 수치를 가른다 — 필터의 의미론은 skills.test.ts가 소유하고,
 * 여기서는 "전투를 누가 걸었는가"가 reduce 경로로 제대로 전달되는지만 본다.
 * 이게 끊기면 필터를 구현해도 예보는 그대로 틀린다(C4류 표류와 같은 결함 형태).
 */
describe("발동 필터 배선 — Stand는 전투 주도권을 따른다", () => {
  /** 자기가 건 전투에서만 위력 +10 — 효과를 데미지로 관측하려고 큰 값을 쓴다. */
  const offensive: SkillRow = {
    Sid: "SID_鬼神の一撃",
    Timing: 5,
    Stand: 1,
    ActNames: ["威力"],
    ActOperations: ["+"],
    ActValues: ["10"],
  };
  const holderDamage = (holderInitiates: boolean): number => {
    const s = state(
      [
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: [offensive] }),
        unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword }),
      ],
      holderInitiates ? 0 : 1,
    );
    const next = reduce(
      s,
      holderInitiates
        ? { type: "attack", unit: "a", target: "e" }
        : { type: "attack", unit: "e", target: "a" },
      alwaysHit,
    );
    const strike = next.events.find((ev) => ev.type === "strike" && ev.attacker === "a");
    return strike !== undefined && strike.type === "strike" ? strike.damage : -1;
  };

  it("보유자가 걸면 보정이 붙고, 걸린 쪽이면 반격에도 붙지 않는다", () => {
    const attacking = holderDamage(true);
    const countering = holderDamage(false);
    expect(attacking).toBeGreaterThan(0);
    expect(countering).toBeGreaterThan(0); // 반격 자체는 성립한다
    expect(attacking - countering).toBe(10); // 차이는 정확히 스킬 보정분
  });
});

/**
 * 레벨업 성장 — 인게임 정본(App.Unit.LevelUp RVA 0x1A3A040, GrowMode.Random).
 *
 * 왜 위험했나: 엔진은 "스탯당 1롤, 캡 무시, 재굴림 없음"이었다. 게임은 셋 다 다르다 —
 * 성장 결과 분포가 통째로 어긋나므로 육성 시뮬레이션의 결론이 바뀐다.
 *   (1) 증가 1회마다 상한 게이트(확정분·잔여 롤분 각각)
 *   (2) 잔여가 0이면 난수를 아예 소모하지 않는다(IsProbability100이 percent<=0에서 즉시 false)
 *   (3) 획득 스탯이 abort(2) 미만이면 최대 4시도까지 재굴림하고 최선 시도를 채택한다
 */
describe("레벨업 성장 — 상한 게이트·재굴림", () => {
  const STAT_KEY_ORDER = ["hp", "str", "mag", "dex", "spd", "lck", "def", "res", "bld"] as const;
  const zeroGrowth = Object.fromEntries(STAT_KEY_ORDER.map((k) => [k, 0])) as StatBlock;
  const levelUpOnce = (
    growth: Partial<StatBlock>,
    rolls: number[],
    extra: Partial<UnitState> = {},
  ): { unit: UnitState; consumed: number } => {
    let consumed = 0;
    const src = [...rolls];
    const rng: RandomSource = {
      next() {
        consumed += 1;
        return src.shift() ?? 0;
      },
    };
    const enemy = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const s = state([
      unit({
        id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95,
        growth: { ...zeroGrowth, ...growth }, ...extra,
      }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemy, hp: 1, weapon: sword }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, rng);
    return { unit: next.units.find((u) => u.id === "a")!, consumed };
  };
  /** 전투에서 성장 롤보다 먼저 소비되는 몫 = 명중 + 필살(이 조합은 필살률이 0이 아니다). */
  const BEFORE_GROWTH = 2;
  const crit = 99999; // 필살 실패값 — 성장 롤에 영향 주지 않게 고정

  it("상한에 걸리면 확정 가산분도 막힌다(성장률 250이어도 캡까지만)", () => {
    const cap = { ...baseStats, str: baseStats.str + 1 };
    const { unit: grown } = levelUpOnce({ str: 250 }, [0, crit, 0], { cap });
    expect(grown.stats.str).toBe(cap.str);
  });

  it("잔여가 0이면 그 스탯은 난수를 소모하지 않는다", () => {
    const flat = levelUpOnce({ str: 200 }, [0, crit]); // 200 = 확정 2(획득 2 = abort 충족), 잔여 0
    const withRemainder = levelUpOnce({ str: 245 }, [0, crit, 0]); // 잔여 45 = 롤 1회 → 확정 2 + 1
    expect(withRemainder.consumed).toBe(flat.consumed + 1);
  });

  it("획득이 2스탯 미만이면 재굴림하고 최선 시도를 채택한다", () => {
    // 성장률 50 x 2스탯. 1시도차 = 롤 2개.
    // 시도1: str 실패(50000)·spd 실패 → 0스탯 → 재굴림
    // 시도2: str 성공(0)·spd 성공(0) → 2스탯 → 채택하고 종료
    const rolls = [0 /* 명중 */, crit, 50000, 50000, 0, 0];
    const { unit: grown } = levelUpOnce({ str: 50, spd: 50 }, rolls);
    expect(grown.stats.str).toBe(baseStats.str + 1);
    expect(grown.stats.spd).toBe(baseStats.spd + 1);
  });

  it("2스탯 이상이면 재굴림하지 않는다(첫 시도 채택)", () => {
    const { consumed } = levelUpOnce({ str: 50, spd: 50 }, [0, crit, 0, 0]);
    expect(consumed).toBe(BEFORE_GROWTH + 2); // 성장 롤 2회뿐 — 재굴림 없음
  });

  it("성장 확률은 0.001% 해상도로 판정한다", () => {
    const justHit = levelUpOnce({ str: 45 }, [0, crit, 44999]);
    // 실패하면 재굴림하므로 4시도 전부 실패시킨다.
    const justMiss = levelUpOnce({ str: 45 }, [0, crit, 45000, 45000, 45000, 45000]);
    expect(justHit.unit.stats.str).toBe(baseStats.str + 1);
    expect(justMiss.unit.stats.str).toBe(baseStats.str);
  });
});
