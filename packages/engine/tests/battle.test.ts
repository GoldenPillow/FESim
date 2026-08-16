import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  moveBudget,
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
    // 롤 소비: 명중 → 필살 → 스탯당 1롤(STAT_KEYS 순서, str은 2번째)
    const over = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(0, 99, 0, 4));
    expect(over.units.find((u) => u.id === "a")!.stats.str).toBe(baseStats.str + 2); // 확정 1 + 잔여 롤 4 < 5
    const one = reduce(mk(), { type: "attack", unit: "a", target: "e" }, seq(0, 99, 0, 5));
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
