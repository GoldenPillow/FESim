import type { FormulaNode } from "./parser.js";

/**
 * 수식 평가기. 값은 숫자 또는 심볼(문자열) — 심볼은 魔法属性·ルナティック 같은
 * 열거 상수의 등호 비교에만 쓰이고, 산술에 끼면 던진다(오타 식별자를 침묵시키지 않기 위해).
 */
export type FormulaValue = number | string;

export interface FormulaEnv {
  /** 변수 해석. undefined면 평가기가 식별자 이름 자체를 심볼로 쓴다. */
  lookup(name: string): FormulaValue | undefined;
  /** 사용자 함수(경험치 테이블·스킬 술어 등). undefined면 미지 함수로 던진다. */
  call?(name: string, args: FormulaValue[]): FormulaValue | undefined;
  /** 相手の~ 접두 식별자를 풀 상대 시점 환경. */
  opponent?(): FormulaEnv;
  /** 계산값(回避値 등) 사후 보정 훅 — 스킬 엔진이 여기 꽂힌다. 소수는 유지한다(실측 확정). */
  modify?(valueName: string, value: number): number;
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

const BUILTINS: Record<string, (args: FormulaValue[]) => FormulaValue> = {
  int: ([v]) => Math.trunc(v as number),
  max: (args) => Math.max(...(args as number[])),
  min: (args) => Math.min(...(args as number[])),
  clamp: ([v, lo, hi]) => Math.min(Math.max(v as number, lo as number), hi as number),
  cond: (args) => {
    if (args.length !== 3) throw new Error("수식 평가 실패: cond는 인자 3개");
    return truthy(args[0]) ? args[1] : args[2];
  },
};

export function evaluateFormula(node: FormulaNode, env: FormulaEnv): FormulaValue {
  switch (node.kind) {
    case "num":
      return node.value;
    case "str":
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
      const args = node.args.map((a) => evaluateFormula(a, env));
      const builtin = BUILTINS[name];
      if (builtin) {
        // cond만 심볼/문자열 인자를 허용, 수치 내장은 숫자를 강제해 오타 심볼을 침묵시키지 않는다.
        if (name !== "cond") args.forEach((v) => num(v, `함수 ${name} 인자`));
        return builtin(args);
      }
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
