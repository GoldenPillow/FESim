import type { CalculatorData } from "@fesim/shared";
import { evaluateFormula, type FormulaEnv, type FormulaValue } from "./evaluate.js";
import { parseFormula, type FormulaNode } from "./parser.js";

/**
 * calculator.json(원문 DSL) → 이름으로 평가 가능한 공식 레지스트리.
 * 식별자 해석 순서: 호출측 환경 변수 → 공식 이름 그대로(割込み威力計算 → 威力計算) →
 * "X計算" 파생(命中値 → 命中値計算) → 경험치 테이블 함수 → 심볼.
 * 분기 계약: conditions[i]가 참이면 functions[i], 전부 거짓이면 마지막 함수.
 */
export interface Calculator {
  eval(name: string, env: FormulaEnv): FormulaValue;
  has(name: string): boolean;
  /** 경험치 테이블 직접 조회. 정의역 밖은 경계값 클램프(가정 — 실측 반증 시 갱신). */
  table(name: string, arg: number): number;
}

const MAX_DEPTH = 64;

export function createCalculator(data: CalculatorData): Calculator {
  const parsed = new Map<string, FormulaNode>();
  const node = (source: string): FormulaNode => {
    let cached = parsed.get(source);
    if (!cached) {
      cached = parseFormula(source);
      parsed.set(source, cached);
    }
    return cached;
  };

  const table = (name: string, arg: number): number => {
    const t = data.tables[name];
    if (!t) throw new Error(`계산기: 미지 테이블 "${name}"`);
    const index = Math.min(Math.max(Math.round(arg) - t.base, 0), t.values.length - 1);
    return t.values[index];
  };

  function resolving(base: FormulaEnv, depth: number): FormulaEnv {
    if (depth > MAX_DEPTH) throw new Error("계산기: 공식 참조 깊이 초과 (순환 의심)");
    const env: FormulaEnv = {
      lookup(name) {
        const value = base.lookup(name);
        if (value !== undefined) return value;
        const formula = data.formulas[name] ?? data.formulas[`${name}計算`];
        if (formula) return evalFormula(formula, base, depth + 1);
        return undefined;
      },
      call(name, args) {
        const value = base.call?.(name, args);
        if (value !== undefined) return value;
        return data.tables[name] ? table(name, args[0]) : undefined;
      },
      opponent: base.opponent ? () => resolving(base.opponent!(), depth + 1) : undefined,
    };
    return env;
  }

  function evalFormula(formula: { conditions: string[]; functions: string[] }, base: FormulaEnv, depth: number): FormulaValue {
    const env = resolving(base, depth);
    let branch = formula.conditions.length;
    for (let i = 0; i < formula.conditions.length; i++) {
      const cond = evaluateFormula(node(formula.conditions[i]), env);
      if (typeof cond === "number" ? cond !== 0 : cond !== "") {
        branch = i;
        break;
      }
    }
    return evaluateFormula(node(formula.functions[branch]), env);
  }

  return {
    eval(name, env) {
      const formula = data.formulas[name];
      if (!formula) throw new Error(`계산기: 미지 공식 "${name}"`);
      return evalFormula(formula, env, 0);
    },
    has: (name) => name in data.formulas,
    table,
  };
}
