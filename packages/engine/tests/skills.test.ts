import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  combatEnv,
  createCalculator,
  evaluateFormula,
  forecastSide,
  parseFormula,
  staticEnhances,
  type Combatant,
  type SkillRow,
} from "@fesim/engine";

/**
 * 스킬 엔진 — skills.json DSL 직접 실행 (수기 이식 금지 원칙은 calculator와 동일).
 * 실기 검증 근거: M003 코퍼스 — 간파(15+速さ*0.25)가 소수를 유지한 채 회피값에 더해지고
 * 최종 명중률 표시에서 내림된다 (108 - 57.25 → 50). corpus NOTES.md 참조.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

const MIGIRI: SkillRow = {
  Sid: "SID_見切り",
  Timing: 5,
  ActNames: ["回避値"],
  ActOperations: ["+"],
  ActValues: ["15 + 速さ * 0.25"],
};

const alear: Combatant = {
  stats: { maxHp: 24, hp: 21, str: 8, mag: 0, dex: 8, spd: 9, lck: 5, def: 6, res: 3, bld: 4 },
  weapon: { might: 7, hit: 95, crit: 0, weight: 3, avoid: 20 },
  skills: [MIGIRI],
};

const swordFighter: Combatant = {
  stats: { maxHp: 23, hp: 8, str: 7, mag: 1, dex: 9, spd: 10, lck: 0, def: 4, res: 4, bld: 5 },
  weapon: { might: 5, hit: 90, crit: 0, weight: 5, avoid: 0 },
};

describe("파서 확장", () => {
  it("문자열 리터럴과 심볼 인자 호출을 파스한다", () => {
    const node = parseFormula('スキル所持("追撃不可") == 0');
    const value = evaluateFormula(node, {
      lookup: () => undefined,
      call: (name, args) => (name === "スキル所持" && args[0] === "追撃不可" ? 0 : undefined),
    });
    expect(value).toBe(1);
  });

  it("cond(조건, 참, 거짓) 내장 함수", () => {
    expect(evaluateFormula(parseFormula("cond(3 > 2, 10, 20)"), { lookup: () => undefined })).toBe(10);
  });
});

describe("정적 보정 (EnhanceValue.*)", () => {
  it("싱크로 힘+1·기+2를 스탯에 합산한다", () => {
    const base = { hp: 22, str: 6, mag: 0, dex: 5, spd: 7, lck: 5, def: 5, res: 3, bld: 4 };
    const out = staticEnhances(base, [
      { Sid: "a", "EnhanceValue.Str": 1 } as SkillRow,
      { Sid: "b", "EnhanceValue.Tech": 2 } as SkillRow,
    ]);
    expect(out.str).toBe(7);
    expect(out.dex).toBe(7);
    expect(out.hp).toBe(22);
  });
});

describe("값 보정 Acts — 실기 코퍼스 재현", () => {
  it("간파: 회피값 +15+속도*0.25 소수 유지 (40 + 17.25 = 57.25)", () => {
    expect(calc.eval("回避値計算", combatEnv(alear))).toBe(57.25);
  });

  it("적 명중률 표시 = floor(108 - 57.25) = 50 (실기 일치)", () => {
    const f = forecastSide(calc, swordFighter, alear);
    expect(f.hitRate).toBe(50);
  });

  it("조건 불성립이면 미적용, 지원 불가 조건은 안전하게 무시된다", () => {
    const conditional: Combatant = {
      ...alear,
      skills: [
        { ...MIGIRI, Condition: "HP < 10" }, // 21 < 10 거짓
        { Sid: "x", Condition: '攻撃結果(ブレイク) && スキル所持("追撃不可") == 0',
          ActNames: ["回避値"], ActOperations: ["+"], ActValues: ["99"] } as SkillRow,
      ],
    };
    expect(calc.eval("回避値計算", combatEnv(conditional))).toBe(40);
  });
});
