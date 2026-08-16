import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  combatEnv,
  createCalculator,
  evaluateFormula,
  forecastSide,
  parseFormula,
  type Combatant,
  type FormulaEnv,
} from "@fesim/engine";

/**
 * calculator.xml DSL 파서·평가기 — 전투 공식의 정본은 이 데이터이므로,
 * 공식을 손으로 옮겨 적는 순간(이중화) 원본과 어긋날 길이 열린다.
 * 파서가 원문을 직접 실행해야 "코드가 단일 진실 정본" 불변식이 지켜진다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

function env(vars: Record<string, number | string>, foe?: Record<string, number | string>): FormulaEnv {
  // 실전(combatEnv)과 같은 양방향 참조 — 방어측 공식이 相手の(=공격측) 값을 되짚는다.
  const self: FormulaEnv = {
    lookup: (name) => vars[name],
    opponent: foe ? () => other : undefined,
  };
  const other: FormulaEnv = {
    lookup: (name) => foe?.[name],
    opponent: () => self,
  };
  return self;
}

describe("DSL 파서·평가기", () => {
  it("산술 우선순위: 곱셈이 덧셈보다 먼저", () => {
    expect(evaluateFormula(parseFormula("1 + 2 * 3"), env({}))).toBe(7);
  });

  it("int()는 소수부 절단 — 幸運/2 반내림의 근거", () => {
    expect(evaluateFormula(parseFormula("int(幸運/2)"), env({ 幸運: 9 }))).toBe(4);
  });

  it("max/clamp 내장 함수", () => {
    expect(evaluateFormula(parseFormula("max(3 - 5, 0)"), env({}))).toBe(0);
    expect(evaluateFormula(parseFormula("clamp(120, 0, 100)"), env({}))).toBe(100);
  });

  it("미지 식별자는 심볼로 평가돼 등호 비교에 쓰인다 (魔法属性 같은 상수)", () => {
    expect(evaluateFormula(parseFormula("攻撃属性 == 魔法属性"), env({ 攻撃属性: "魔法属性" }))).toBe(1);
    expect(evaluateFormula(parseFormula("攻撃属性 == 魔法属性"), env({ 攻撃属性: "物理属性" }))).toBe(0);
  });

  it("&&와 비교 연산", () => {
    const node = parseFormula("クリア済み == 0 && 難易度 == ルナティック");
    expect(evaluateFormula(node, env({ クリア済み: 0, 難易度: "ルナティック" }))).toBe(1);
    expect(evaluateFormula(node, env({ クリア済み: 1, 難易度: "ルナティック" }))).toBe(0);
  });

  it("심볼(문자열)에 산술을 시도하면 던진다 — 오타 식별자를 침묵시키지 않는다", () => {
    expect(() => evaluateFormula(parseFormula("없는변수 + 1"), env({}))).toThrow();
  });

  it("잘못된 토큰은 파스 에러", () => {
    expect(() => parseFormula("技 @ 2")).toThrow();
  });
});

describe("계산기 — 공식 레지스트리", () => {
  it("조건 분기: ユニット攻撃力 = 마법이면 魔力, 아니면 力", () => {
    expect(calc.eval("ユニット攻撃力計算", env({ 攻撃属性: "魔法属性", 魔力: 11, 力: 7 }))).toBe(11);
    expect(calc.eval("ユニット攻撃力計算", env({ 攻撃属性: "物理属性", 魔力: 11, 力: 7 }))).toBe(7);
  });

  it("공식 체인: 命中値 = 技*2 + int(幸運/2) + 武器命中 + 支援命中", () => {
    const e = env({ 技: 15, 幸運: 9, 武器命中: 90, 支援命中: 0 });
    expect(calc.eval("命中値計算", e)).toBe(124);
  });

  it("상대 참조: 威力 = max(攻撃力 - 相手の防御力, 0), 방어측 속성 선택은 공격측 속성을 본다", () => {
    const attacker = { 攻撃属性: "魔法属性", 魔力: 12, 力: 3, 武器攻撃力: 6, 武器特効: 1 };
    const defender = { 守備: 9, 魔防: 5, 地形防御: 0, 魔力: 0, 力: 0, 武器攻撃力: 0, 武器特効: 1 };
    // 마법 공격이므로 상대 방어는 魔防(5): (12 + 6*1) - 5 = 13
    expect(calc.eval("威力計算", env(attacker, defender))).toBe(13);
  });

  it("추격 조건: 공속차 5 이상만 1", () => {
    expect(calc.eval("追撃条件", env({ 攻撃速度: 11 }, { 攻撃速度: 6 }))).toBe(1);
    expect(calc.eval("追撃条件", env({ 攻撃速度: 11 }, { 攻撃速度: 7 }))).toBe(0);
  });

  it("경험치 테이블 함수: 戦闘基本値ノーマル(0) = 6 (원본 N00 열)", () => {
    expect(calc.eval("戦闘基本値", env({ 難易度: "ノーマル", レベル差: 0 }))).toBe(6);
  });

  it("테이블 정의역 밖 인자는 경계값으로 클램프 (가정 — 실측 반증 시 갱신)", () => {
    expect(calc.table("戦闘基本値ノーマル", -100)).toBe(data.tables["戦闘基本値ノーマル"].values[0]);
    expect(calc.table("戦闘基本値ノーマル", 100)).toBe(data.tables["戦闘基本値ノーマル"].values.at(-1));
  });

  it("없는 공식 이름은 던진다", () => {
    expect(() => calc.eval("존재하지않는공식", env({}))).toThrow();
  });
});

describe("전투 예보 (combat facade)", () => {
  const attacker: Combatant = {
    stats: { maxHp: 28, hp: 25, str: 10, mag: 3, dex: 15, spd: 12, lck: 9, def: 6, res: 4, bld: 5 },
    weapon: { might: 5, hit: 90, crit: 0, weight: 6 },
  };
  const defender: Combatant = {
    stats: { maxHp: 30, hp: 30, str: 8, mag: 1, dex: 6, spd: 7, lck: 4, def: 5, res: 2, bld: 4 },
    weapon: { might: 4, hit: 70, crit: 0, weight: 8 },
  };

  it("공속 = 速さ - max(武器の重さ - 体格, 0)", () => {
    expect(calc.eval("攻撃速度計算", combatEnv(attacker, defender))).toBe(11); // 12 - max(6-5,0)
    expect(calc.eval("攻撃速度計算", combatEnv(defender, attacker))).toBe(3); // 7 - max(8-4,0)
  });

  it("예보: 데미지·명중률(0..100 클램프)·필살률·추격", () => {
    const f = forecastSide(calc, attacker, defender);
    // 위력: (10 + 5*1) - (5 + 0) = 10
    expect(f.damage).toBe(10);
    // 명중값 124 - 회피값 (3*2 + int(4/2)) = 116 → 표시 100
    expect(f.hitRate).toBe(100);
    // 필살값 int(15/2)=7 - 필살회피 4 = 3
    expect(f.critRate).toBe(3);
    expect(f.attackSpeed).toBe(11);
    expect(f.followUp).toBe(true); // 11 - 3 = 8 >= 5
  });

  it("역방향 예보: 명중률 하한 0 클램프, 추격 없음", () => {
    const f = forecastSide(calc, defender, attacker);
    // 위력: (8 + 4*1) - (6 + 0) = 6
    expect(f.damage).toBe(6);
    // 명중값 6*2 + int(4/2) + 70 = 84 - 회피값 (11*2 + int(9/2) = 26) = 58
    expect(f.hitRate).toBe(58);
    expect(f.followUp).toBe(false);
  });

  it("체인어택: 위력 = max(상대 MaxHP*0.1, 1), 명중 80 고정", () => {
    expect(calc.eval("チェインアタック威力計算", combatEnv(attacker, defender))).toBe(3);
    expect(calc.eval("チェインアタック命中率計算", combatEnv(attacker, defender))).toBe(80);
  });

  it("무기 없는 유닛(지팡이 피격측 등)도 0 기본값으로 평가된다", () => {
    const unarmed: Combatant = { stats: defender.stats };
    expect(calc.eval("攻撃速度計算", combatEnv(unarmed, attacker))).toBe(7); // 무게 0
    const f = forecastSide(calc, attacker, unarmed);
    expect(f.hitRate).toBe(100);
  });

  it("특효 배율: 武器特効 = 2면 무기 위력이 2배", () => {
    const effective: Combatant = { ...attacker, weapon: { ...attacker.weapon!, effective: 2 } };
    const f = forecastSide(calc, effective, defender);
    expect(f.damage).toBe(15); // (10 + 5*2) - 5
  });
});
