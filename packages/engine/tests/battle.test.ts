import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData, SupportsTable } from "@fesim/shared";
import {
  battlePlan,
  canBreak,
  chainAttackers,
  chainNumbers,
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

describe("브레이크 가능 판정(canBreak) — 예보 UI와 reduce의 단일 정본", () => {
  it("상성 유리 + 대상 무장 시만 참, 중장·무효 스킬·기브레이크는 거짓", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, weapon: axe });
    expect(canBreak(a, e)).toBe(true);
    expect(canBreak(e, a)).toBe(false); // 상성 불리
    expect(canBreak(a, { ...e, weapon: undefined })).toBe(false);
    expect(canBreak(a, { ...e, broken: true })).toBe(false);
    expect(canBreak(a, { ...e, style: "重装スタイル" })).toBe(false);
    expect(canBreak(a, { ...e, skills: [{ Sid: "SID_ブレイク無効" } as SkillRow] })).toBe(false);
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

  it("재이동(시구르드): 행동 후 Removable칸 1회 — 거리 정본 = skills.json Removable(再移動力)", () => {
    // 왜 위험한가: 정본 필드는 Power가 아니라 Removable — Unit.GetMovePowerImpl(0x1A5B690)은
    // [skill+0x1e4]=Removable만 읽는다. Power(強さ)는 별개 필드로 값 2·3이 우연히 일치했을 뿐이라
    // Power를 읽으면 Removable≠Power인 미래 데이터에서 소리 없이 어긋난다(MOVE_TERRAIN.md FIX-4).
    const canter = [{ Sid: "SID_再移動", Removable: 2 }];
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: canter })]);
    const moved = reduce(s, { type: "move", unit: "a", x: 2, y: 0 }, alwaysHit);
    const acted = reduce(moved, { type: "wait", unit: "a" }, alwaysHit);
    expect(() => reduce(acted, { type: "move", unit: "a", x: 5, y: 0 }, alwaysHit)).toThrow(); // 3칸 > Removable 2
    const canted = reduce(acted, { type: "move", unit: "a", x: 4, y: 0 }, alwaysHit);
    expect(canted.units[0]).toMatchObject({ x: 4, y: 0 });
    expect(() => reduce(canted, { type: "move", unit: "a", x: 5, y: 0 }, alwaysHit)).toThrow(); // 재이동은 1회
    // 재이동+ = Removable 3
    const plus = [{ Sid: "SID_再移動＋", Removable: 3 }];
    const s2 = state([unit({ id: "b", force: 0, x: 0, y: 0, weapon: sword, skills: plus })]);
    const acted2 = reduce(s2, { type: "wait", unit: "b" }, alwaysHit);
    expect(reduce(acted2, { type: "move", unit: "b", x: 3, y: 0 }, alwaysHit).units[0]).toMatchObject({ x: 3, y: 0 });
  });

  it("재이동 거리는 Removable이 정본 — SID 접두·Power와 무관하다", () => {
    // 왜 위험한가: SID_再移動 접두 매칭·Power 소비는 둘 다 오독이었다(FIX-4). 코드는 보유 스킬을
    // 순회해 max(Removable)를 취한다 — 접두가 다른 스킬이 Removable을 갖고 있어도 재이동이 성립해야 한다.
    const fake = [{ Sid: "SID_다른스킬", Removable: 3, Power: 0 }];
    const fresh = unit({ id: "a", force: 0, x: 0, y: 0, skills: fake });
    expect(moveBudget({ ...fresh, acted: true })).toBe(3);
    // Power만 있고 Removable이 없으면 재이동 아님(별개 필드).
    const powerOnly = [{ Sid: "SID_再移動", Power: 2 }];
    expect(moveBudget({ ...fresh, acted: true, skills: powerOnly })).toBeUndefined();
  });

  it("통과 판정 = 진영 동맹표 — 자군은 우군 칸을 통과하고, 적은 양쪽과 상호 차단", () => {
    // 왜 위험한가: 현행 "군 동일" 판정은 자군이 우군(force 2) 칸을 못 지나가게 막는다 — 정본은
    // MapSituation.IsAllide(0x1F48EC0) 동맹표(기본 [0,1,0]): 자군0↔우군2 같은 진영 = 통과 가능·정지 불가.
    const ally = unit({ id: "g", force: 2, x: 1, y: 0 });
    const me = unit({ id: "a", force: 0, x: 0, y: 0 });
    const s = state([me, ally]);
    // 우군 칸 너머 통과 도달(현행 = 차단 레드), 우군 칸 정지는 거부.
    expect(reduce(s, { type: "move", unit: "a", x: 3, y: 0 }, alwaysHit).units[0]).toMatchObject({ x: 3, y: 0 });
    expect(() => reduce(s, { type: "move", unit: "a", x: 1, y: 0 }, alwaysHit)).toThrow();
    // 적(force 1)은 여전히 통과 차단.
    const foe = unit({ id: "e", force: 1, x: 1, y: 0 });
    const s2 = state([unit({ id: "b", force: 0, x: 0, y: 0, movePoints: 2 }), foe]);
    expect(() => reduce(s2, { type: "move", unit: "b", x: 2, y: 0 }, alwaysHit)).toThrow();
  });

  it("이동력 = 클램프된 베이스 + EnhanceValue.Move(런타임 가산·상한 99)", () => {
    // 왜 위험한가: Enhance는 직업 Limit 클램프 '뒤'에 더해진다(GetMovePowerImpl) — Limit로 잘라버리면
    // 迅走(+5~7) 등 19종이 무력화된다. 인게이지 중 부여 스킬도 effectiveSkills 경유로 실시간 반영돼야 한다.
    const swift = [{ Sid: "SID_迅走", "EnhanceValue.Move": 5 }];
    const fresh = unit({ id: "a", force: 0, x: 0, y: 0, movePoints: 8, skills: swift });
    expect(moveBudget(fresh)).toBe(13); // 8(Limit 클램프 후) + 5
    const capped = unit({ id: "b", force: 0, x: 0, y: 0, movePoints: 97, skills: swift });
    expect(moveBudget(capped)).toBe(99); // 최종 상한 99
    const minus = [{ Sid: "SID_移動－２", "EnhanceValue.Move": -2 }];
    expect(moveBudget(unit({ id: "c", force: 0, x: 0, y: 0, movePoints: 1, skills: minus }))).toBe(0); // 하한 0
  });
});

describe("이동 예산(moveBudget) — UI가 소비하는 단일 정본", () => {
  it("행동 전 = 이동력 · 이동 후 = 0 · 행동 후 = 재이동 Removable 또는 불가", () => {
    // 왜 위험한가: 이 판정이 UI에 중복 구현돼 있던 것이 C4(UI-엔진 표류)의 실존 사례였다
    // (2026-08-16 베타 이동 결함의 근본 원인 — design/verification.md §2-3). 엔진 수출 함수가 유일 정본이다.
    const canter = [{ Sid: "SID_再移動", Removable: 2 }];
    const fresh = unit({ id: "a", force: 0, x: 0, y: 0 });
    expect(moveBudget(fresh)).toBe(4);
    expect(moveBudget({ ...fresh, moved: true })).toBe(0); // 행동 전 이동 소진 = 제자리 행동만
    expect(moveBudget({ ...fresh, acted: true })).toBeUndefined(); // 재이동 스킬 없음
    expect(moveBudget({ ...fresh, acted: true, skills: canter })).toBe(2);
    expect(moveBudget({ ...fresh, acted: true, moved: true, skills: canter })).toBeUndefined(); // 재이동도 1회
  });

  it("reduce의 이동 수락 = moveBudget과 일치한다", () => {
    const canter = [{ Sid: "SID_再移動", Removable: 2 }];
    const s = state([unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: canter })]);
    const acted = reduce(s, { type: "wait", unit: "a" }, alwaysHit);
    const u = acted.units[0];
    expect(moveBudget(u)).toBe(2);
    expect(reduce(acted, { type: "move", unit: "a", x: 2, y: 0 }, alwaysHit).units[0].x).toBe(2);
    expect(() => reduce(acted, { type: "move", unit: "a", x: 3, y: 0 }, alwaysHit)).toThrow();
  });
});

describe("주인공 사망 = 상시 패배 (GameEndCheckUnitDead DeadHero=6)", () => {
  it("SID_主人公 보유 유닛이 죽으면 즉시 패배 — 다른 자군이 남아 있어도", () => {
    // 왜 위험한가: 승패가 WinRule 파라미터·전멸에만 걸려 있으면 주인공이 죽어도 판이 계속된다 —
    // 실측(m002 자율 플레이)에서 뤼에르 사망 후 '승리'까지 진행되는 오재현이 실제로 발생했다.
    // 정본 = MapSituation.GameEndCheckUnitDead(사망 즉시 판정·파라미터 없음 상시 — _wip_winrule §1.2·§1.5).
    const heroStats = { hp: 5, str: 1, mag: 0, dex: 1, spd: 1, lck: 0, def: 0, res: 0, bld: 5 };
    const hero = unit({ id: "h", force: 0, x: 0, y: 0, stats: heroStats, hp: 5, skills: [{ Sid: "SID_主人公" }] });
    const guard2 = unit({ id: "g", force: 0, x: 5, y: 5, weapon: sword });
    const foe = unit({ id: "e", force: 1, x: 1, y: 0, weapon: axe });
    let s = state([hero, guard2, foe]);
    s = reduce(s, { type: "endPhase" }, alwaysHit); // 적 페이즈
    const after = reduce(s, { type: "attack", unit: "e", target: "h" }, alwaysHit);
    expect(after.units[0].dead).toBe(true);
    expect(after.outcome).toBe("defeat");
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

  it("무기 지정 공격(weapon 인덱스): 지정 무기로 판정·장비하고, 사거리 심판도 그 무기 기준", () => {
    // 왜 위험한가: 무기 선택이 액션에 실리지 않으면 기보 재생이 '당시 장비'를 복원하지 못해
    // 데미지·반격 판정이 통째로 어긋난다 — 무기 선택 = 리플레이 계약의 일부.
    const bow = { might: 6, hit: 100, crit: 0, weight: 5, kind: 4, rangeMin: 2, rangeMax: 2 };
    const enemyStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 10, def: 2, res: 0, bld: 5 };
    const mk = () =>
      state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: bow, weapons: [bow, sword] }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 30, weapon: sword }),
      ]);
    // 거리 1: 장비(활 2-2)로는 사거리 밖 — 지정 무기(검 1-1)로는 합법
    expect(() => reduce(mk(), { type: "attack", unit: "a", target: "e" }, alwaysHit)).toThrow();
    const next = reduce(mk(), { type: "attack", unit: "a", target: "e", weapon: 1 }, alwaysHit);
    // 검 데미지 = (10+5) - 2 = 13, 동종 무기라 반격 8
    expect(next.units.find((u) => u.id === "e")!.hp).toBe(30 - 13);
    expect(next.units.find((u) => u.id === "a")!.hp).toBe(30 - 8);
    expect(next.units.find((u) => u.id === "a")!.weapon).toEqual(sword); // 선택 = 장비 전환(인게임 문법)
    // 없는 인덱스 = 불법 행동
    expect(() => reduce(mk(), { type: "attack", unit: "a", target: "e", weapon: 5 }, alwaysHit)).toThrow();
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

  it("체인어택 예상 수치(chainAttackers+chainNumbers) = 리듀서가 실제로 내는 체인 타격", () => {
    // 왜 위험한가: 체인 대미지는 `battlePlan` 오더 목록에 **없다**(리듀서가 따로 굴린다).
    // 그래서 오더 목록만 더해 위협을 재는 소비처(기보 정책 incoming)는 연계 스타일 적이 옆에 있을 때
    // 받는 대미지를 통째로 못 본다 — 정책은 잔여 HP 1까지 허용하므로 그 몫이 곧 사망인데
    // 예보에도 결손 목록에도 안 잡힌다(실측: m003 시드 13·7에서 뤼에르가 정확히 이 몫으로 죽었다).
    // 층이 갈리는 자리라 각 층만 보는 테스트로는 영원히 안 잡힌다 ⇒ 여기서 양끝을 묶는다.
    const enemyStats = { hp: 25, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 100, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "b", force: 0, x: 1, y: 1, weapon: sword, style: "連携スタイル" }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 25, weapon: sword }),
    ]);
    const at = s.units.find((u) => u.id === "a")!;
    const de = s.units.find((u) => u.id === "e")!;
    const backups = chainAttackers(at, de, s.units);
    expect(backups.map((u) => u.id)).toEqual(["b"]);
    const defenderC = { ...toCombatant(de, s.map, s.units, supportEffects), initiator: false };
    const predicted = chainNumbers(calc, toCombatant(backups[0], s.map, s.units, supportEffects), defenderC);

    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    const chain = next.events.find((ev) => ev.type === "strike" && ev.kind === "chain") as {
      damage: number;
    };
    expect(predicted.damage).toBe(2);
    expect(chain.damage).toBe(predicted.damage);
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
    const mk = (): GameState => ({
      ...state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 1, weapon: sword }),
      ]),
      growMode: "random", // 이 절은 정본 Random 분기 — 서비스 기본(fixed)과 다른 계약이다
    });
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
    const s: GameState = {
      ...state([
        unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth }),
        unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 1, weapon: sword }),
      ]),
      growMode: "random",
    };
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
  const zeroGrowth: StatBlock = { hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };
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
    // Random 모드 명시 — 서비스 기본은 fixed다(고정 성장). 이 절은 정본 Random 분기를 지킨다.
    const next = reduce({ ...s, growMode: "random" }, { type: "attack", unit: "a", target: "e" }, rng);
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

/**
 * 타격 순서·브레이크 조건 — 인게임 정본(il2cpp/SEQUENCE_BREAK.md).
 * 체인어택은 공격측 첫 오더 슬롯 **직전**에 1회 실행된다 — 엔진은 본공격 뒤에 두고 있었다(가정이었고 반증됐다).
 * 순서가 뒤집히면 "체인으로 먼저 죽어 본공격이 불발"되는 국면이 통째로 달라진다.
 */
describe("타격 순서·브레이크 발동 조건", () => {
  it("체인어택이 본공격보다 먼저다", () => {
    const enemyStats = { hp: 25, str: 8, mag: 0, dex: 4, spd: 10, lck: 0, def: 100, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "b", force: 0, x: 1, y: 1, weapon: sword, style: "連携スタイル" }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemyStats, hp: 25, weapon: sword }),
    ]);
    const kinds = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit)
      .events.filter((ev) => ev.type === "strike")
      .map((ev) => (ev.type === "strike" ? ev.kind : ""));
    expect(kinds[0]).toBe("chain");
    expect(kinds[1]).toBe("attack");
  });

  it("대미지가 0이면 브레이크되지 않는다(확정 대미지 1 이상이 조건)", () => {
    // 왜 위험한가: 상성만 맞으면 흠집 하나 못 내고도 반격을 몰수해 방어측이 통째로 무력화된다.
    const wall = { hp: 30, str: 8, mag: 0, dex: 4, spd: 5, lck: 0, def: 100, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }), // 검 > 도끼
      unit({ id: "e", force: 1, x: 1, y: 0, stats: wall, hp: 30, weapon: axe }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit);
    expect(next.events.some((ev) => ev.type === "break")).toBe(false);
    expect(next.units.find((u) => u.id === "a")!.hp).toBeLessThan(30); // 반격이 살아 있다
  });
});

/**
 * 최대 레벨 정지 — 정본 `App.Unit.AddExp`(RVA 0x1A39D40, STATS_GROWTH §2-7):
 * ```
 * if (m_Level >= job.MaxLevel) return
 * e = m_Exp + exp; if (e >= 100) { m_Level += 1; e %= 100 }
 * if (job.MaxLevel == m_Level) e = 0
 * ```
 * 왜 위험했나: `job.MaxLevel`을 읽는 코드가 저장소에 0건이라 20레벨을 넘겨도 계속 굴렸다.
 * 챕터가 늘 새 판이라 미발현이었지만 캠페인 인계(MP5)를 켜는 순간 무한 성장이 된다.
 */
describe("최대 레벨 정지 — job.MaxLevel", () => {
  const attackExp = (over: Partial<UnitState>): UnitState => {
    const enemy = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, ...over }),
      // 적 레벨을 맞춰 둔다 — 레벨차 감쇠로 획득 경험이 0이 되면 정지 여부를 못 가린다.
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemy, hp: 1, weapon: sword, level: over.level ?? 1 }),
    ]);
    return reduce(s, { type: "attack", unit: "a", target: "e" }, alwaysHit).units.find((u) => u.id === "a")!;
  };

  it("최대 레벨 유닛은 경험치를 아예 받지 않는다(AddExp 즉시 return)", () => {
    const grown = attackExp({ level: 20, maxLevel: 20 });
    expect(grown.level).toBe(20);
    expect(grown.exp).toBe(95);
  });

  it("최대 레벨 도달 레벨업은 잔여 경험치를 0으로 강제한다", () => {
    const grown = attackExp({ level: 19, maxLevel: 20 });
    expect(grown.level).toBe(20);
    expect(grown.exp).toBe(0);
  });

  it("최대 레벨 미지정이면 종전대로 굴린다(무회귀)", () => {
    const grown = attackExp({ level: 20 });
    expect(grown.level).toBe(21);
    expect(grown.exp).toBeGreaterThan(0);
  });
});

/**
 * 고정 성장(GrowMode.Fixed) — 인게임 실재 모드다. 사용자가 메인 메뉴에서 고르고
 * (`MainMenuSequence.GrowModeSelectMenuSequence`), 알고리즘은 `App.Unit.LevelUp`
 * (RVA 0x1A3A040) Fixed 분기에 있다(STATS_GROWTH §2-3(c)):
 * ```
 * g = percents[i]; if (g == 0) continue
 * if (GetNoEnhanceCapability(i) >= GetCapabilityLimit(i)) continue   ; 게이트는 진입 전 1회
 * acc[i] = Min(acc[i] + g, 255)
 * while (acc[i] > 99) { stat += 1; acc[i] -= 100 }
 * ```
 * 왜 위험한가: 누적기는 유닛 상태다. 초기값(person.Grow)·잔여값을 재생과 인계가 복원하지
 * 못하면 같은 기보가 다른 스탯을 낳는다 — 캠페인 사슬 전체가 어긋난다.
 */
describe("고정 성장 — GrowMode.Fixed 누적기", () => {
  const zeroGrowth: StatBlock = { hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };
  const levelUp = (over: Partial<UnitState>): UnitState => {
    const enemy = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, ...over }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemy, hp: 1, weapon: sword }),
    ]);
    return reduce({ ...s, growMode: "fixed" }, { type: "attack", unit: "a", target: "e" }, alwaysHit)
      .units.find((u) => u.id === "a")!;
  };

  it("누적기 초기값 = person.Grow — 성장률 60이면 첫 레벨업에 이미 120(= +1, 잔여 20)", () => {
    const grown = levelUp({ growth: { ...zeroGrowth, str: 60 } });
    expect(grown.stats.str).toBe(baseStats.str + 1);
    expect(grown.growthAcc?.str).toBe(20);
  });

  it("100 미만이면 오르지 않고 누적만 된다(성장률 40 → 80)", () => {
    const grown = levelUp({ growth: { ...zeroGrowth, str: 40 } });
    expect(grown.stats.str).toBe(baseStats.str);
    expect(grown.growthAcc?.str).toBe(80);
  });

  it("이월 누적기가 있으면 그것이 초기값을 대체한다(재생·인계 복원 통로)", () => {
    const grown = levelUp({
      growth: { ...zeroGrowth, str: 40 },
      growthAcc: { ...zeroGrowth, str: 95 },
    });
    expect(grown.stats.str).toBe(baseStats.str + 1); // 95 + 40 = 135
    expect(grown.growthAcc?.str).toBe(35);
  });

  it("성장률 250이면 한 레벨에 2 오른다(누적 500 → 255 클램프 → +2, 잔여 55)", () => {
    const grown = levelUp({ growth: { ...zeroGrowth, str: 250 } });
    expect(grown.stats.str).toBe(baseStats.str + 2);
    expect(grown.growthAcc?.str).toBe(55);
  });

  it("상한에 닿은 스탯은 누적조차 하지 않는다(게이트가 루프 진입 전 1회)", () => {
    const grown = levelUp({ growth: { ...zeroGrowth, str: 60 }, cap: { ...baseStats, str: baseStats.str } });
    expect(grown.stats.str).toBe(baseStats.str);
    expect(grown.growthAcc?.str).toBe(60); // 초기값(person.Grow) 그대로 — 가산조차 없다
  });

  /**
   * ☠수리 배선(2026-08-31, 빌더 B0-1 판독 — LEVELUP_GROW.md): 레벨업 rate는 개인 단독이 아니라
   * **개인(택일 base) + 현재 직업 DiffGrow** 합산이다(Unit.GetCapabilityGrow 0x1A2FF20 — Fixed/Random 공용).
   * 종전에는 개인만 써서 전 캠페인 레벨업이 클래스 성장분만큼 과소했고, 오류도 경고도 없었다.
   * acc 초기값(person.Grow 원본)과 rate는 **다른 값**이다 — 겸용하면 첫 레벨업이 어긋난다.
   */
  it("레벨업 rate = 개인 + 직업 DiffGrow 합산 · acc 초기값은 개인 원본(합산 아님)", () => {
    const grown = levelUp({
      growth: { ...zeroGrowth, str: 60 },
      growthJob: { ...zeroGrowth, str: 10 },
    });
    // acc0 = 60(개인 원본) + rate 70 = 130 → +1, 잔여 30. 합산 초기값(70)이었다면 잔여 40 — 구분점.
    expect(grown.stats.str).toBe(baseStats.str + 1);
    expect(grown.growthAcc?.str).toBe(30);
  });

  it("努力の才(Work=2 · '*' · 2) — 직업 몫만 2배가 된다(개인 몫은 그대로)", () => {
    const grown = levelUp({
      growth: { ...zeroGrowth, str: 60 },
      growthJob: { ...zeroGrowth, str: 10 },
      skills: [{ Sid: "SID_努力の才", Work: 2, WorkOperation: "*", WorkValue: 2 } as SkillRow],
    });
    // rate = 60 + 10*2 = 80 → acc 60+80 = 140 → +1, 잔여 40.
    expect(grown.stats.str).toBe(baseStats.str + 1);
    expect(grown.growthAcc?.str).toBe(40);
  });

  it("Random 경로도 같은 합산 rate를 쓴다(Fixed/Random이 같은 배열을 읽는다 — 판독 확정)", () => {
    // 개인 40 + 직업 60 = 100 → 확정 +1(잔여 롤 없음). 개인 단독(40)이면 rng가 실패값이라 +0 — 구분점.
    const enemy = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const s = state([
      unit({
        id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95,
        growth: { ...zeroGrowth, str: 40 },
        growthJob: { ...zeroGrowth, str: 60 },
      }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemy, hp: 1, weapon: sword }),
    ]);
    const never: RandomSource = { next: () => 99999 };
    const grown = reduce({ ...s, growMode: "random" }, { type: "attack", unit: "a", target: "e" }, never)
      .units.find((u) => u.id === "a")!;
    expect(grown.stats.str).toBe(baseStats.str + 1);
  });

  it("난수를 한 톨도 쓰지 않는다(Random 모드와 소비 계약이 다르다)", () => {
    let consumed = 0;
    const rng: RandomSource = { next: () => { consumed += 1; return 0; } };
    const enemy = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 5 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth: { ...zeroGrowth, str: 60 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: enemy, hp: 1, weapon: sword }),
    ]);
    reduce({ ...s, growMode: "fixed" }, { type: "attack", unit: "a", target: "e" }, rng);
    const fixedConsumed = consumed;
    consumed = 0;
    reduce({ ...s, growMode: "random" }, { type: "attack", unit: "a", target: "e" }, rng);
    expect(consumed).toBeGreaterThan(fixedConsumed);
  });
});

/**
 * 手番回数 오더 큐 — 고정 5단(attack/counter/followUp/counterFollowUp)을 정본 구조로 바꾼 층.
 * 정본 = `CalcNormalBattle`(0x246B580)이 8슬롯 교대 큐 [0,1,0,1,…]를 만들고, 슬롯마다
 * `min(手番回数, 4) > 그 측 総手番回数`면 실행하고 **끝난 뒤** 総手番回数를 +1 한다(PopOrder 0x19B6F48).
 * 실물 데이터(skills.json)를 그대로 먹인다 — 수기 이식 금지 규약.
 */
const skillTable = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/skills.json", import.meta.url), "utf-8"),
) as Record<string, SkillRow>;

/**
 * 웹 사영(fe17.ts slimSkill)과 **같은 규약**으로 GiveSids를 행으로 해소한다.
 * ☠엔진에는 스킬 표가 없다(행은 유닛이 들고 다닌다) — 이 해소를 빼먹으면 부여층이 SID 문자열만 받고
 *   아무것도 못 붙여 신속이 조용히 죽는다(배선 전 상태가 정확히 그것이었다).
 */
const skillRow = (sid: string, depth = 0): SkillRow => {
  const row = skillTable[sid];
  const gives = depth < 3 ? (row.GiveSids ?? []).map((given) => skillRow(given, depth + 1)) : [];
  return gives.length > 0 ? { ...row, Gives: gives } : row;
};

/** 명중은 하되 필살은 안 나는 롤(필살률 0이면 필살 롤 자체를 안 굴린다 — 리플레이 계약). */
const counting = (): RandomSource & { used: number } => {
  const src = { used: 0, next: () => { src.used += 1; return 9999; } };
  return src;
};
const kindsOf = (s: GameState): string[] =>
  s.events.filter((ev) => ev.type === "strike").map((ev) => (ev.type === "strike" ? ev.kind : ""));
const damagesOf = (s: GameState): number[] =>
  s.events.filter((ev) => ev.type === "strike").map((ev) => (ev.type === "strike" ? ev.damage : -1));

describe("手番回数 오더 큐 + 전투 로컬 부여층(신속)", () => {
  /**
   * ★호환 불변식. 왜 위험한가: 手番回数 스킬이 안 걸리는 판에서 순서나 롤 소비가 한 칸이라도 밀리면
   * `data/fe17/replays/*.eph.json` 5종이 **전부** 낡은 기록이 된다(verify의 deepEqual이 통째로 깨진다).
   * 오더 큐는 그 판에서 옛 고정 5단과 **완전히 같은** 수열을 내야 한다.
   */
  it("신속이 없으면 순서·롤 소비가 종전과 같다 (공격측 추격 / 방어측 추격)", () => {
    const fast = { ...sword, might: 1 };
    const offFollow = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: fast, stats: { ...baseStats, spd: 20 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: fast, stats: { ...baseStats, spd: 1 } }),
    ]);
    const rngA = counting();
    expect(kindsOf(reduce(offFollow, { type: "attack", unit: "a", target: "e" }, rngA)))
      .toEqual(["attack", "counter", "followUp"]);
    expect(rngA.used).toBe(3); // 명중 롤 3회 · 필살률 0이라 필살 롤 미소모

    const defFollow = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: fast, stats: { ...baseStats, spd: 1 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: fast, stats: { ...baseStats, spd: 20 } }),
    ]);
    const rngB = counting();
    expect(kindsOf(reduce(defFollow, { type: "attack", unit: "a", target: "e" }, rngB)))
      .toEqual(["attack", "counter", "counterFollowUp"]);
    expect(rngB.used).toBe(3);
  });

  /**
   * ★실기 앵커(뤼에르 인게이지 + 레이피어, 사용자 스크린샷 2026-08-19 = `8 + 4`).
   * 왜 위험한가: 이 사슬은 네 층(어휘·오더 큐·Timing 게이트·부여층) 중 **하나만 빠져도**
   * 오류 없이 종전과 똑같은 산출을 낸다 — 조용한 실패의 교과서다. 추가타의 자리(반격 뒤)와
   * 배율(정확히 절반)을 동시에 박아 둬야 어느 층이 빠졌는지 이 테스트 하나가 가리킨다.
   */
  it("신속: 手番回数 2 · 추격 없음 → [attack, counter, followUp]이고 추가타가 정확히 절반이다", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: [skillRow("SID_カウンター")] }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    expect(kindsOf(next)).toEqual(["attack", "counter", "followUp"]);
    const [first, , extra] = damagesOf(next);
    expect(extra).toBe(first / 2);
    expect(first).toBe(10); // 攻撃力 15 - 相手の防御力 5
  });

  /**
   * 왜 위험한가: 50% 조건은 `総手番回数 == 手番回数 - 1`이라 **오더마다 관측값이 0,1,2…로 올라가야만**
   * 마지막 한 번에서 참이 된다. 증가를 오더 시작에 두면 영원히 거짓이 되고(추가타가 전부 100%),
   * 手番回数를 오더마다 다시 굴리면 신속이 매 오더 +1 되어 발산한다 — 둘 다 오류 없이 조용하다.
   */
  it("추격 + 신속(手番回数 3) → 마지막 오더 하나만 절반이다", () => {
    const fast = { ...sword, might: 1 };
    const s = state([
      unit({
        id: "a", force: 0, x: 0, y: 0, weapon: fast,
        stats: { ...baseStats, spd: 20, str: 40 },
        skills: [skillRow("SID_カウンター")],
      }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: fast, hp: 200, stats: { ...baseStats, hp: 200, spd: 1 } }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    expect(kindsOf(next)).toEqual(["attack", "counter", "followUp", "extra"]);
    const dmg = damagesOf(next);
    expect(dmg[0]).toBe(36); // 41 - 5
    expect(dmg[2]).toBe(36);
    expect(dmg[3]).toBe(18); // 마지막 오더만 威力 * 0.5
  });

  /**
   * 왜 위험한가: `SID_カウンター`는 Stand 0(주도권 무관)이라 **맞는 쪽에서도** 발동한다.
   * 고정 5단에서는 방어측이 2회 치는 국면 자체를 표현할 수 없었다 — 오더 큐가 아니면 잡히지 않는 결손이다.
   */
  it("방어측 신속: 공격측 1회 · 방어측 2회 → [attack, counter, counterFollowUp]이고 반격 추가타가 절반", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, skills: [skillRow("SID_カウンター")] }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    expect(kindsOf(next)).toEqual(["attack", "counter", "counterFollowUp"]);
    const dmg = damagesOf(next);
    expect(dmg[2]).toBe(dmg[1] / 2);
  });

  /**
   * ☠왜 위험한가: 전투 로컬 부여(Cycle 0)가 유닛 상태로 새면 `SID_神速発動済み` 래치가 따라다녀
   * **다음 전투부터 신속이 조용히 죽는다**(오류도 경고도 없다). 정본은 매 전투 셋업의 SetUnitSkill이
   * 스킬 배열을 통째로 갈아엎어 이월이 불가능하다 — 그 성질을 두 전투 연속으로 박제한다.
   */
  it("부여가 전투 밖으로 안 샌다 — 다음 전투도 같은 8+4를 낸다 · 유닛 스킬은 불변", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: [skillRow("SID_カウンター")] }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, hp: 200, stats: { ...baseStats, hp: 200 } }),
    ]);
    const first = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    const sids = first.units[0].skills?.map((row) => row.Sid);
    expect(sids).toEqual(["SID_カウンター"]);

    const again = { ...first, units: first.units.map((u) => (u.id === "a" ? { ...u, acted: false } : u)) };
    const second = reduce(again, { type: "attack", unit: "a", target: "e" }, counting());
    expect(damagesOf(second)).toEqual(damagesOf(first));
    expect(kindsOf(second)).toEqual(["attack", "counter", "followUp"]);
  });

  /**
   * 왜 위험한가: 실기 앵커의 주체(뤼에르 = 神竜ノ子 = 竜族スタイル)가 실제로 드는 행은 `SID_カウンター`가
   * 아니라 **`SID_カウンター_竜族`**이다(사영의 스타일 분기는 별건 = skills.style-variant).
   * 분기 행은 GiveSids가 3개로 늘고 그중 둘이 우리에게 없는 훅(Timing 12 回復)을 쓴다 —
   * 그것들이 섞여도 手番回数·威力 산출이 본체와 **완전히 같아야** 앵커 해석이 유지된다.
   */
  it("스타일 분기(SID_カウンター_竜族)도 같은 8 + 4를 낸다", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: [skillRow("SID_カウンター_竜族")] }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    expect(kindsOf(next)).toEqual(["attack", "counter", "followUp"]);
    const [first, , extra] = damagesOf(next);
    expect(extra).toBe(first / 2);
  });

  /**
   * ☠**결손 박제**(2026-08-19 MP8 G4 실측). `SID_カウンター_竜族`이 딸고 오는
   * `SID_カウンター_竜族効果`(Timing 12 HitAffect · `回復 + min(相手のHP, 相手のダメージ)` ·
   * 조건 `HP < MaxHP && HP > 0`)는 **부여는 되는데 소비처가 없다** — 엔진에 Timing 11/12 훅이 없고
   * `回復`를 조회하는 자리가 한 곳도 없다.
   *
   * 왜 위험한가: 대미지는 앵커(8 + 4)와 맞아떨어지므로 **이 결손만 오류도 경고도 없이 잠든다**.
   * 실기라면 추가타 4만큼 흡수해 HP가 오르는데 우리는 그대로다(m002 앵커 국면의 뤼에르 14/23 = 조건 참).
   * 부여가 실제로 일어나는 것까지 함께 박아 둬야 "훅만 없다"와 "부여도 죽었다"를 구분할 수 있다.
   * ★제거 조건 = Timing 11/12 훅 + `回復` 질의 지점이 서면 이 테스트가 레드가 된다 — 그때 기대값을
   * 흡수 후 HP로 바꾸고 장부 skills.style-variant의 잔여 1건을 지운다.
   */
  it("☠결손: 竜族 신속의 HP 흡수(Timing 12 回復)는 무발현이다 — 부여는 되는데 훅이 없다", () => {
    const s = state([
      unit({
        id: "a", force: 0, x: 0, y: 0, weapon: sword, hp: 20,
        stats: { ...baseStats, hp: 30 },
        skills: [skillRow("SID_カウンター_竜族")],
      }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, hp: 200, stats: { ...baseStats, hp: 200 } }),
    ]);
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    const me = next.units.find((u) => u.id === "a")!;
    // 이 국면은 반격을 받는다 ⇒ HP가 MaxHP 미달로 유지되므로 조건 `HP < MaxHP`는 실제로 참이다.
    expect(me.hp).toBeLessThan(me.stats.hp);
    expect(damagesOf(next)[2]).toBe(damagesOf(next)[0] / 2); // 추가타는 살아 있다(대미지 층은 정상)
    expect(me.hp).toBe(20 - damagesOf(next)[1]); // 흡수가 있었다면 여기에 min(相手のHP, 추가타)가 더해진다
  });

  /**
   * 왜 위험한가: 브레이크는 "몇 번째 手番인지 보지 않는다"(CalcAttack 0x2471840~은 매 타격마다 평가).
   * `kind === "attack"` 한정이면 본공격이 빗나가고 추격이 명중한 국면에서 반격이 그대로 나가
   * 상성 유리의 이득이 통째로 사라진다.
   */
  it("본공격이 빗나가고 추격이 명중해도 브레이크가 선다", () => {
    const fast = { ...sword, hit: 60 };
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: fast, stats: { ...baseStats, spd: 20 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: axe, stats: { ...baseStats, spd: 1 } }),
    ]);
    // 본공격 빗나감(9999) → 반격 명중 → 추격 명중(0)
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, seq(9999, 0, 0));
    const strikes = next.events.filter((ev) => ev.type === "strike");
    expect(strikes.map((ev) => (ev.type === "strike" ? ev.hit : false))).toEqual([false, true, true]);
    expect(next.events.some((ev) => ev.type === "break")).toBe(true);
  });
});

/**
 * ★층이 갈리는 경계 — "이 전투가 실제로 어떤 타격을 몇 번 내는가"를 계산하는 자리는 하나여야 한다.
 * 리듀서·예보 패널·AI·기보 정책이 각자 근사하던 것을 공용 순수 함수 `battlePlan`으로 모은 층이다.
 *
 * 왜 위험했나: 예보는 `damage x battleTimes`를 그렸다 — 신속 판에서 예보 10, 실제 15.
 * 방향이 "격파한다" 쪽이라 확정타로 읽고 지르면 적이 산다(경고 표시 없음).
 * 같은 과대가 AI 표적 평가·기보 정책에도 있어 **생성 기보의 수 선택까지** 오염됐다.
 */
describe("오더 목록 공용 함수(battlePlan) — 층 관통", () => {
  const combatants = (s: GameState) => ({
    a: toCombatant(s.units[0], s.map, s.units),
    e: toCombatant(s.units[1], s.map, s.units),
  });

  it("신속 판: 오더 목록의 kind·대미지열이 리듀서 타격열과 같다", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: [skillRow("SID_カウンター")] }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword }),
    ]);
    const { a, e } = combatants(s);
    const orders = [...battlePlan(calc, a, e).orders];
    expect(orders.map((o) => o.kind)).toEqual(["attack", "counter", "followUp"]);
    expect(orders.map((o) => o.damage)).toEqual([10, 10, 5]); // 마지막 오더만 威力 * 0.5
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, counting());
    expect(kindsOf(next)).toEqual(orders.map((o) => o.kind));
    expect(damagesOf(next)).toEqual(orders.map((o) => o.damage));
  });

  /**
   * ☠`相手の手番回数`를 고치는 교차 행(SID_剣殺し·SID_不意打ち 계열)은 상대 쪽 flow가 env에 있어야 산다.
   * 종전 `battleTimesOf`는 self의 flow만 채우고 상대는 비워 둬 조건이 미지 식별자로 **던졌고**,
   * `makeSkillModifier`의 catch가 통째로 삼켰다 — 예보만 조용히 다른 手番回数를 봤다.
   */
  it("相手の手番回数 교차 행(SID_剣殺し)이 예보에서도 산다", () => {
    const s = state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, stats: { ...baseStats, spd: 20 } }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, skills: [skillRow("SID_剣殺し")] }),
    ]);
    const { a, e } = combatants(s);
    // 剣 상대에게 걸리는 행 = 자기 手番回数 2 대입 + **상대 手番回数를 1로 상한**.
    // 공속차 10이라 剣殺し가 없으면 [2, 1]이 나온다 — 교차 행이 죽으면 그 값이 그대로 새어 나온다.
    expect(battlePlan(calc, a, e).battleTimes).toEqual([1, 2]);
    expect(forecastSide(calc, { ...a, initiator: true }, { ...e, initiator: false }).battleTimes).toBe(1);
    expect(kindsOf(reduce(s, { type: "attack", unit: "a", target: "e" }, counting())))
      .toEqual(["attack", "counter", "counterFollowUp"]);
  });
});
