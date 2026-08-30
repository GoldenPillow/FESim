import { describe, expect, it } from "vitest";
import { deriveStats, grownLevels, type StatBlock } from "@fesim/engine";

/**
 * 스탯 산출 모델 — 검증 근거: SerenesForest 공개 영입 스탯 36명 × 9스탯 전수 일치(2026-08-16 실측)
 * + IL2CPP 판독(`STATS_GROWTH.md` §2-4·§2-5, `Unit.AutoGrowCapability` 0x1A0B1B0).
 * 공식: 스탯 = Clamp(직업Base + Clamp(성장분 + 인물Offset, -120, 120), 0, 상한)
 *       성장분 = max(trunc((성장률 × n + 50) / 100), 0) · n = 표시레벨 + (상급직 ? 19 : 0) + AutoGrowOffset(적만) - 1
 *       ☠성장률 소스 = **택일**: `person.Grow`가 전 0이면 `job.BaseGrow`(+난이도 델타), 아니면 `person.Grow`.
 * 반올림은 half-up — 파이썬 banker's rounding으로는 전수 일치가 깨진다(실측으로 배제됨).
 */
const zero: StatBlock = { hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };

describe("성장 레벨 수", () => {
  it("기본 클래스 = 표시레벨 - 1", () => {
    expect(grownLevels(0, 5)).toBe(4);
  });
  /**
   * 왜 위험한가: 종전 모델은 `job.InternalLevel - 1`을 성장 레벨로 썼다. 상급직 대부분이 20이라
   * 자군 앵커는 우연히 맞았지만, **InternalLevel이 20이 아닌 상급직**(JID_M002_神竜ノ王 = 5)에서
   * 성장분이 통째로 줄어든다 — 정본은 숫자가 아니라 `JobData.IsHigh`(Rank ≠ 0) 불리언이다.
   */
  it("상급 클래스(Rank≠0) Lv1 = 19 + 0 — InternalLevel 숫자가 아니라 Rank 불리언", () => {
    expect(grownLevels(1, 1)).toBe(19);
    expect(grownLevels(1, 5)).toBe(23);
  });
  it("AutoGrowOffset은 적(AssetForce=Enemy)에만 가산된다", () => {
    expect(grownLevels(0, 5, -3, true)).toBe(1);
    expect(grownLevels(0, 5, -3, false)).toBe(4);
    expect(grownLevels(0, 1, -3, true)).toBe(0);
  });
});

describe("deriveStats — 공개 실측 앵커", () => {
  it("Alear Lv1 신룡의아이: 성장 0레벨 = 직업Base + 인물Offset 그대로", () => {
    // 앵커: 공개 영입 스탯 22/6/0/5/7/5/5/3/4 (HP/힘/마/기/속/행/수/마방/체)
    const s = deriveStats({
      jobBase: { hp: 22, str: 6, mag: 0, dex: 2, spd: 7, lck: 2, def: 5, res: 3, bld: 4 },
      jobRank: 0,
      personOffset: { ...zero, dex: 3, lck: 3 },
      personGrowth: { hp: 60, str: 45, mag: 20, dex: 40, spd: 50, lck: 25, def: 40, res: 25, bld: 10 },
      level: 1,
    });
    expect(s).toEqual({ hp: 22, str: 6, mag: 0, dex: 5, spd: 7, lck: 5, def: 5, res: 3, bld: 4 });
  });

  it("Vander Lv1 팔라딘(내부 20): 19레벨 성장 half-up 반올림", () => {
    // 앵커: 공개 영입 스탯 40/11/5/10/8/6/10/8/8 — half-up이 아니면 Str/Mag 등이 어긋난다
    const s = deriveStats({
      jobBase: { hp: 25, str: 8, mag: 2, dex: 10, spd: 8, lck: 3, def: 6, res: 3, bld: 7 },
      jobRank: 1,
      personOffset: { hp: 4, str: -2, mag: 1, dex: -5, spd: -7, lck: 1, def: -3, res: 1, bld: 0 },
      personGrowth: { hp: 60, str: 25, mag: 10, dex: 25, spd: 35, lck: 10, def: 35, res: 20, bld: 5 },
      level: 1,
    });
    expect(s).toEqual({ hp: 40, str: 11, mag: 5, dex: 10, spd: 8, lck: 6, def: 10, res: 8, bld: 8 });
  });

  it("half-up 경계: 성장 50% × 1레벨 = +1 (banker's면 0)", () => {
    const s = deriveStats({
      jobBase: zero,
      jobRank: 0,
      personOffset: zero,
      personGrowth: { ...zero, str: 50 },
      level: 2,
    });
    expect(s.str).toBe(1);
  });

  it("상한(cap) 지정 시 스탯을 자른다", () => {
    const s = deriveStats({
      jobBase: { ...zero, hp: 20 },
      jobRank: 0,
      personOffset: zero,
      personGrowth: { ...zero, hp: 100 },
      level: 50,
      cap: { ...zero, hp: 40 },
    });
    expect(s.hp).toBe(40);
  });
});

/**
 * HP 하한 = 1 — 인게임 정본(App.Unit.GetCapability RVA 0x1A2DD80, 0x1a2df10 `mov w1,#1`).
 * 왜 위험한가: 음수 오프셋 유닛의 표시 HP가 0이 되면 살아있는 유닛이 즉사 판정 대상이 된다.
 * 나머지 스탯은 하한 0으로 남는다(인덱스 0 = HP만 1).
 */
describe("스탯 하한", () => {
  it("HP만 하한이 1이고 나머지는 0이다", () => {
    const zero = { hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };
    const derived = deriveStats({
      jobBase: zero,
      personOffset: { ...zero, hp: -5, str: -5 },
      personGrowth: { ...zero, hp: 1 },
      jobRank: 0,
      level: 1,
    });
    expect(derived.hp).toBe(1);
    expect(derived.str).toBe(0);
  });
});

/**
 * ★적 자동성장 — `person.Grow`가 전 0인 유닛(일반 적 1379행 + 일부 고유 적)은 성장률을 **직업**에서 받는다.
 *
 * 왜 위험한가: 이 갈래가 없으면 적이 통째로 약해진다. 실사례 = M002 보스 뤼미에르(루나틱)가
 * HP 18·속도 0·수비 0으로 나와 **리월의 반격 한 번(11 × 추격)에 죽었다** — 실기는 속도 7이라
 * 추격이 없고 수비 7이라 4밖에 안 들어간다(사용자 실기 관측 2026-08-18: "1회 공격뿐"). 그 한 칸이
 * 챕터 흐름을 통째로 바꿨다(1회전이 2턴에 끝나 스타 러시 수순이 성립하지 않았다).
 * 정본 = `Unit.AutoGrowCapability` 0x1A0B1B0 · `CalculateAutoGrowCapability` 0x1A0E0A0.
 */
describe("적 자동성장 — 성장률 택일(person.Grow 전 0 → job.BaseGrow)", () => {
  const lumiere = (difficulty: "n" | "l") =>
    deriveStats({
      jobBase: { hp: 24, str: 8, mag: 1, dex: 4, spd: 8, lck: 3, def: 6, res: 5, bld: 7 },
      jobRank: 1,
      jobBaseGrow: { hp: 75, str: 45, mag: 15, dex: 45, spd: 50, lck: 35, def: 40, res: 20, bld: 15 },
      personGrowth: zero,
      personOffset:
        difficulty === "n"
          ? { hp: -9, str: -9, mag: 0, dex: -6, spd: -12, lck: -5, def: -9, res: -7, bld: -3 }
          : { hp: -6, str: -8, mag: 1, dex: -4, spd: -13, lck: -4, def: -8, res: -6, bld: -2 },
      autoGrowOffset: difficulty === "n" ? -3 : 0,
      enemy: true,
      level: 5,
      cap: { hp: 68, str: 41, mag: 25, dex: 36, spd: 43, lck: 35, def: 35, res: 25, bld: 13 },
    });

  it("노멀 뤼미에르 = HP 30 · 힘 8 · 수비 5 (판독 문서 §1-12 대조값)", () => {
    const s = lumiere("n");
    expect([s.hp, s.str, s.def]).toEqual([30, 8, 5]);
  });

  it("★루나틱 뤼미에르 속도 7 — 리월(속도 7)이 추격하지 못한다(실기 관측)", () => {
    const s = lumiere("l");
    expect(s.spd).toBe(7);
    expect(s.hp).toBe(35);
    expect(s.def).toBe(7);
  });

  it("person.Grow가 비영이면 직업 성장률을 쓰지 않는다(자군 앵커 보존)", () => {
    const s = deriveStats({
      jobBase: { ...zero, str: 10 },
      jobRank: 0,
      jobBaseGrow: { ...zero, str: 100 },
      personGrowth: { ...zero, str: 50 },
      personOffset: zero,
      level: 3,
    });
    expect(s.str).toBe(11); // 50% × 2레벨 = 1 (직업 100%였다면 +2)
  });

  it("난이도 델타(job.DiffGrow*)는 직업 성장률 갈래에서만 붙는다", () => {
    const withDelta = deriveStats({
      jobBase: zero,
      jobRank: 0,
      jobBaseGrow: { ...zero, str: 40 },
      jobDiffGrow: { ...zero, str: 10 },
      personGrowth: zero,
      personOffset: zero,
      enemy: true,
      level: 3,
    });
    expect(withDelta.str).toBe(1); // (40+10)% × 2 = 1.0 → 1
    const personPath = deriveStats({
      jobBase: zero,
      jobRank: 0,
      jobBaseGrow: { ...zero, str: 40 },
      jobDiffGrow: { ...zero, str: 100 },
      personGrowth: { ...zero, str: 20 },
      personOffset: zero,
      enemy: true,
      level: 3,
    });
    expect(personPath.str).toBe(0); // 20% × 2 = 0.4 → 0 (델타 미적용)
  });
});

/**
 * 성장 경로(growthPath) — 캐릭터 빌더 B1. 합류(자동레벨) → [기본직 10까지] → 전직(Base/Limit 교체,
 * BaseCapability·누적기 불변) → 목표 내부 레벨까지 고정 성장 누적(rate = 개인 + 현재 직업 DiffGrow).
 * 왜 위험한가: 이 경로가 정본과 어긋나면 빌더 표가 통째로 거짓말을 하는데, 셀마다 오류가
 * 눈에 안 띈다(triangleattack 대조 표본이 B5 게이트인 이유).
 */
import { growthPath, type GrowthPathJob } from "@fesim/engine";

const gp = {
  sb: (over: Partial<StatBlock> = {}): StatBlock =>
    ({ hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0, ...over }),
};
const wide = gp.sb({ hp: 99, str: 99, mag: 99, dex: 99, spd: 99, lck: 99, def: 99, res: 99, bld: 99 });
const pathJob = (over: Partial<GrowthPathJob> = {}): GrowthPathJob =>
  ({ base: gp.sb(), limit: wide, diffGrow: gp.sb(), rank: 0, ...over });

describe("growthPath — 성장 경로(빌더 B1)", () => {
  it("사용자 앵커: 개인 10 + 클래스 10 = 5렙업에 +1 (누적기 초기값 = 개인 원본)", () => {
    const r = growthPath({
      joinJob: pathJob(), targetJob: pathJob({ diffGrow: gp.sb({ str: 10 }) }),
      joinLevel: 10, internalOffset: 0,
      personGrowth: gp.sb({ str: 10 }), personOffset: gp.sb(),
      targetInternal: 15,
    });
    // 합류 자동레벨 9렙분 = roundGrow(10*9=90) = 1 → 전직 후 5렙업: acc 10 + 20*5 = 110 → +1, 잔여 10.
    expect(r.stats.str).toBe(2);
    expect(r.acc.str).toBe(10);
    expect(r.internal).toBe(15);
    expect(r.promoted).toBe(true);
  });

  it("전직 = Base 교체 + BaseCapability 보존 (신Base − 구Base 차분이 그대로 반영)", () => {
    const r = growthPath({
      joinJob: pathJob({ base: gp.sb({ str: 2 }) }),
      targetJob: pathJob({ base: gp.sb({ str: 5 }) }),
      joinLevel: 10, internalOffset: 0,
      personGrowth: gp.sb({ str: 50, hp: 10 }), personOffset: gp.sb(),
      targetInternal: 10, // 전직 직후 상태(추가 렙업 0)
    });
    // 합류 표시 = 2 + roundGrow(50*9=450)=5 → 7. 전직 후 = 5 + 5 = 10 (차분 +3).
    expect(r.stats.str).toBe(10);
    expect(r.promoted).toBe(true);
  });

  it("캡에 막힌 스탯은 누적 정지 + capped 표시 (게이트가 루프 진입 전 1회)", () => {
    const r = growthPath({
      joinJob: pathJob(),
      targetJob: pathJob({ diffGrow: gp.sb({ str: 90 }), limit: { ...wide, str: 6 } }),
      joinLevel: 10, internalOffset: 0,
      personGrowth: gp.sb({ str: 60 }), personOffset: gp.sb(),
      targetInternal: 40,
    });
    // 합류 5(=roundGrow(540)) → 렙업 rate 150: 6에서 캡 → 이후 누적조차 없음.
    expect(r.stats.str).toBe(6);
    expect(r.capped).toContain("str");
    expect(r.capped).not.toContain("hp");
  });

  it("합류 내부 레벨 ≥ 목표면 강등 없이 합류 상태 그대로(전직 없음)", () => {
    const r = growthPath({
      joinJob: pathJob({ base: gp.sb({ str: 3 }), rank: 1 }),
      targetJob: pathJob({ base: gp.sb({ str: 9 }) }),
      joinLevel: 5, internalOffset: 20,
      personGrowth: gp.sb({ str: 5, hp: 10 }), personOffset: gp.sb(),
      targetInternal: 20,
    });
    expect(r.promoted).toBe(false);
    expect(r.internal).toBe(25);
    // 상급직 합류 자동레벨 = 5+19-1 = 23렙분: roundGrow(5*23=115)=1 → 표시 3+1=4 (targetJob Base 9는 미적용).
    expect(r.stats.str).toBe(4);
  });

  it("10 미만 합류: 전직 전은 합류 직업 DiffGrow, 후는 목표 직업 DiffGrow", () => {
    const r = growthPath({
      joinJob: pathJob({ diffGrow: gp.sb({ str: 50 }) }),
      targetJob: pathJob({ diffGrow: gp.sb() }),
      joinLevel: 8, internalOffset: 0,
      personGrowth: gp.sb({ hp: 10 }), personOffset: gp.sb(),
      targetInternal: 12,
    });
    // 전직 전 2렙업 rate 50: acc 0→50→100 = +1. 전직 후 2렙업 rate 0: 변화 없음.
    expect(r.stats.str).toBe(1);
    expect(r.acc.str).toBe(0);
    expect(r.promoted).toBe(true);
  });

  it("努力の才(Work=2 x2)가 클래스 몫만 키운다", () => {
    const r = growthPath({
      joinJob: pathJob(), targetJob: pathJob({ diffGrow: gp.sb({ str: 10 }) }),
      joinLevel: 10, internalOffset: 0,
      personGrowth: gp.sb({ str: 10 }), personOffset: gp.sb(),
      targetInternal: 15,
      workSkills: [{ Sid: "SID_努力の才", Work: 2, WorkOperation: "*", WorkValue: 2 }],
    });
    // rate = 10 + 10*2 = 30 → acc 10 + 150 = 160 → +1, 잔여 60 (무스킬이면 잔여 10 — 구분점).
    expect(r.stats.str).toBe(2);
    expect(r.acc.str).toBe(60);
  });
});
