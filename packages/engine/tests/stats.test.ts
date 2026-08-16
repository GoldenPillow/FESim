import { describe, expect, it } from "vitest";
import { deriveStats, grownLevels, type StatBlock } from "@fesim/engine";

/**
 * 스탯 산출 모델 — 검증 근거: SerenesForest 공개 영입 스탯 36명 × 9스탯 전수 일치(2026-08-16 실측).
 * 공식: 스탯 = 직업Base + 인물Offset + floor(인물Grow% × L / 100 + 0.5)
 *       L = max(직업내부레벨 - 1, 0) + (표시레벨 - 1) + AutoGrowOffset(난이도)
 * 반올림은 half-up — 파이썬 banker's rounding으로는 전수 일치가 깨진다(실측으로 배제됨).
 */
const zero: StatBlock = { hp: 0, str: 0, mag: 0, dex: 0, spd: 0, lck: 0, def: 0, res: 0, bld: 0 };

describe("성장 레벨 수", () => {
  it("기본 클래스 = 표시레벨 - 1", () => {
    expect(grownLevels(0, 5)).toBe(4);
  });
  it("상급 클래스(내부 20) Lv1 = 19 + 0", () => {
    expect(grownLevels(20, 1)).toBe(19);
  });
  it("AutoGrowOffset은 레벨 수에 가산(음수 가능), 하한 0", () => {
    expect(grownLevels(0, 5, -3)).toBe(1);
    expect(grownLevels(0, 1, -3)).toBe(0);
  });
});

describe("deriveStats — 공개 실측 앵커", () => {
  it("Alear Lv1 신룡의아이: 성장 0레벨 = 직업Base + 인물Offset 그대로", () => {
    // 앵커: 공개 영입 스탯 22/6/0/5/7/5/5/3/4 (HP/힘/마/기/속/행/수/마방/체)
    const s = deriveStats({
      jobBase: { hp: 22, str: 6, mag: 0, dex: 2, spd: 7, lck: 2, def: 5, res: 3, bld: 4 },
      jobInternalLevel: 0,
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
      jobInternalLevel: 20,
      personOffset: { hp: 4, str: -2, mag: 1, dex: -5, spd: -7, lck: 1, def: -3, res: 1, bld: 0 },
      personGrowth: { hp: 60, str: 25, mag: 10, dex: 25, spd: 35, lck: 10, def: 35, res: 20, bld: 5 },
      level: 1,
    });
    expect(s).toEqual({ hp: 40, str: 11, mag: 5, dex: 10, spd: 8, lck: 6, def: 10, res: 8, bld: 8 });
  });

  it("half-up 경계: 성장 50% × 1레벨 = +1 (banker's면 0)", () => {
    const s = deriveStats({
      jobBase: zero,
      jobInternalLevel: 0,
      personOffset: zero,
      personGrowth: { ...zero, str: 50 },
      level: 2,
    });
    expect(s.str).toBe(1);
  });

  it("상한(cap) 지정 시 스탯을 자른다", () => {
    const s = deriveStats({
      jobBase: { ...zero, hp: 20 },
      jobInternalLevel: 0,
      personOffset: zero,
      personGrowth: { ...zero, hp: 100 },
      level: 50,
      cap: { ...zero, hp: 40 },
    });
    expect(s.hp).toBe(40);
  });
});
