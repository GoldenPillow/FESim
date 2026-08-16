import type { FormulaNode } from "./parser.js";

/**
 * 수식 평가기. 값은 숫자 또는 심볼(문자열) — 심볼은 魔法属性·ルナティック 같은
 * 열거 상수의 등호 비교에만 쓰이고, 산술에 끼면 던진다(오타 식별자를 침묵시키지 않기 위해).
 */
export type FormulaValue = number | string;

export interface FormulaEnv {
  /** 변수 해석. undefined면 평가기가 식별자 이름 자체를 심볼로 쓴다. */
  lookup(name: string): FormulaValue | undefined;
  /** 사용자 함수(경험치 테이블 등). undefined면 미지 함수로 던진다. */
  call?(name: string, args: number[]): number | undefined;
  /** 相手の~ 접두 식별자를 풀 상대 시점 환경. */
  opponent?(): FormulaEnv;
}

const OPPONENT_PREFIX = "相手の";

function truthy(value: FormulaValue): boolean {
  return typeof value === "number" ? value !== 0 : value !== "";
}

function num(value: FormulaValue, context: string): number {
  if (typeof value !== "number") {
    throw new Error(`수식 평가 실패: "${value}"는 심볼이라 ${context}에 쓸 수 없다 (미정의 변수일 가능성)`);
  }
  return value;
}

const BUILTINS: Record<string, (args: number[]) => number> = {
  int: ([v]) => Math.trunc(v),
  max: (args) => Math.max(...args),
  min: (args) => Math.min(...args),
  clamp: ([v, lo, hi]) => Math.min(Math.max(v, lo), hi),
};

export function evaluateFormula(node: FormulaNode, env: FormulaEnv): FormulaValue {
  switch (node.kind) {
    case "num":
      return node.value;
    case "ident": {
      if (node.name.startsWith(OPPONENT_PREFIX) && env.opponent) {
        const rest: FormulaNode = { kind: "ident", name: node.name.slice(OPPONENT_PREFIX.length) };
        return evaluateFormula(rest, env.opponent());
      }
      return env.lookup(node.name) ?? node.name;
    }
    case "call": {
      const target = node.name.startsWith(OPPONENT_PREFIX) && env.opponent ? env.opponent() : env;
      const name = node.name.startsWith(OPPONENT_PREFIX) && env.opponent
        ? node.name.slice(OPPONENT_PREFIX.length)
        : node.name;
      const args = node.args.map((a) => num(evaluateFormula(a, env), `함수 ${name} 인자`));
      const builtin = BUILTINS[name];
      if (builtin) return builtin(args);
      const result = target.call?.(name, args);
      if (result === undefined) throw new Error(`수식 평가 실패: 미지 함수 "${name}"`);
      return result;
    }
    case "unary":
      return -num(evaluateFormula(node.operand, env), "단항 -");
    case "binary": {
      const { op } = node;
      const left = evaluateFormula(node.left, env);
      const right = evaluateFormula(node.right, env);
      switch (op) {
        case "==":
          return left === right ? 1 : 0;
        case "!=":
          return left !== right ? 1 : 0;
        case "&&":
          return truthy(left) && truthy(right) ? 1 : 0;
        case "||":
          return truthy(left) || truthy(right) ? 1 : 0;
      }
      const l = num(left, `연산 ${op}`);
      const r = num(right, `연산 ${op}`);
      switch (op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case ">":
          return l > r ? 1 : 0;
        case ">=":
          return l >= r ? 1 : 0;
        case "<":
          return l < r ? 1 : 0;
        case "<=":
          return l <= r ? 1 : 0;
      }
    }
  }
}
