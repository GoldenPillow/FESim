import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import { combatEnv, createCalculator, forecastSide, type Combatant } from "@fesim/engine";

/**
 * 실기 스크린샷 회귀 코퍼스 — 정본 기록: ~/fesim_data/reference/screens/NOTES.md (2026-08-16 M003 3종 세트).
 * 스탯 화면의 전투 능력(물공·명중·회피·필살·필살회피)과 전투 예보 수치를 엔진이 재현해야 한다.
 * 실기가 반증하면 엔진을 고치고 이 테스트를 갱신한다 — 값의 출처는 항상 실기 촬영본.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

/** 수수께끼의 집단(소드 파이터 Lv4, M003) — 스탯 화면 실측 그대로. 스킬 보정 없는 순정 유닛. */
const swordFighter: Combatant = {
  stats: { maxHp: 23, hp: 8, str: 7, mag: 1, dex: 9, spd: 10, lck: 0, def: 4, res: 4, bld: 5 },
  weapon: { might: 5, hit: 90, crit: 0, weight: 5, avoid: 0 }, // 철의 검
};

/**
 * 뤼에르&마르스(신룡의 아이 Lv3, 인연 3, 엔게이지 중) — 기본 능력 표시값은 싱크로 칩(+N)을
 * 이미 포함한 최종값(실측 확정: 물공 15 = 힘8 + 레이피어7, 힘9였다면 16). 레이피어 = 회피+20.
 */
const alear: Combatant = {
  stats: { maxHp: 24, hp: 21, str: 8, mag: 0, dex: 8, spd: 9, lck: 5, def: 6, res: 3, bld: 4 },
  weapon: { might: 7, hit: 95, crit: 0, weight: 3, avoid: 20 }, // 레이피어
};

describe("코퍼스 — 스탯 화면 전투 능력 (M003)", () => {
  it("소드 파이터: 물공 12 · 명중 108 · 회피 20 · 필살 4 · 필살회피 0 (5/5 실측)", () => {
    const env = combatEnv(swordFighter);
    expect(calc.eval("攻撃力計算", env)).toBe(12);
    expect(calc.eval("命中値計算", env)).toBe(108);
    expect(calc.eval("回避値計算", env)).toBe(20);
    expect(calc.eval("必殺値計算", env)).toBe(4);
    expect(calc.eval("必殺回避計算", env)).toBe(0);
  });

  it("뤼에르: 물공 15 · 명중 113 · 회피 40(무기회피 20 포함) · 필살회피 5", () => {
    const env = combatEnv(alear);
    expect(calc.eval("攻撃力計算", env)).toBe(15);
    expect(calc.eval("命中値計算", env)).toBe(113);
    expect(calc.eval("回避値計算", env)).toBe(40); // 공속9*2 + int(5/2) + 20
    expect(calc.eval("必殺回避計算", env)).toBe(5);
    // 표시 필살 9 vs 공식 4 — 잔차 +5는 스킬(스타 러시 추정) 몫. 스킬 엔진 구현 시 이관.
    expect(calc.eval("必殺値計算", env)).toBe(4);
  });
});

describe("코퍼스 — 전투 예보 (M003 뤼에르 vs 소드 파이터)", () => {
  it("뤼에르 공격측: 데미지 11 (물공15 - 수비4) · 명중 93 (113-20) · 필살(공식분) 4-0", () => {
    const f = forecastSide(calc, alear, swordFighter);
    expect(f.damage).toBe(11);
    expect(f.hitRate).toBe(93);
    // 실기 표시 필살 9 = 공식 4 + 스킬 5(미구현) — 공식분만 검증
    expect(f.critRate).toBe(4);
    expect(f.followUp).toBe(false); // 공속 9 vs 10
  });

  it("소드 파이터 반격측: 데미지 6 (물공12 - 수비6) · 필살 0", () => {
    const f = forecastSide(calc, swordFighter, alear);
    expect(f.damage).toBe(6);
    expect(f.critRate).toBe(0);
    // 실기 명중 50 = 108 - (회피40 + 간파 15+속도*0.25=17.25) 후 내림 — 간파는 스킬 엔진 몫.
    // 스킬 미반영 공식분: 108 - 40 = 68. 소수 유지·최종 내림이 스킬 엔진 요구사항으로 박제됨.
    expect(f.hitRate).toBe(68);
  });
});
