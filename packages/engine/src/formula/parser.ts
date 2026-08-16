/**
 * calculator.xml 계산식 DSL 파서.
 * 문법(원본 전수에서 관찰된 전부): 숫자(소수 포함) · 식별자(일본어 포함) · 함수호출 ·
 * 단항 - · * / · + - · 비교(== != >= <= > <) · && — 이 우선순위 순으로 결합한다.
 */

export type BinaryOp = "+" | "-" | "*" | "/" | "==" | "!=" | ">" | ">=" | "<" | "<=" | "&&" | "||";

export type FormulaNode =
  | { kind: "num"; value: number }
  | { kind: "ident"; name: string }
  | { kind: "call"; name: string; args: FormulaNode[] }
  | { kind: "unary"; operand: FormulaNode }
  | { kind: "binary"; op: BinaryOp; left: FormulaNode; right: FormulaNode };

type Token = { type: "num"; value: number } | { type: "ident"; name: string } | { type: "op"; op: string };

const OPERATORS = ["&&", "||", "==", "!=", ">=", "<=", ">", "<", "+", "-", "*", "/", "(", ")", ","];
const IDENT_START = /[\p{L}_]/u;
const IDENT_PART = /[\p{L}\p{N}_]/u;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  outer: while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    for (const op of OPERATORS) {
      if (source.startsWith(op, i)) {
        tokens.push({ type: "op", op });
        i += op.length;
        continue outer;
      }
    }
    if (/[0-9]/.test(ch)) {
      const match = /^[0-9]+(\.[0-9]+)?/.exec(source.slice(i))!;
      tokens.push({ type: "num", value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (IDENT_START.test(ch)) {
      let j = i + 1;
      while (j < source.length && IDENT_PART.test(source[j])) j++;
      tokens.push({ type: "ident", name: source.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`수식 파스 실패: 위치 ${i}의 "${ch}" — "${source}"`);
  }
  return tokens;
}

/** 우선순위 오름차순 단계. 각 단계는 왼쪽 결합. */
const BINARY_LEVELS: BinaryOp[][] = [
  ["||"],
  ["&&"],
  ["==", "!=", ">=", "<=", ">", "<"],
  ["+", "-"],
  ["*", "/"],
];

export function parseFormula(source: string): FormulaNode {
  const tokens = tokenize(source);
  let pos = 0;

  const peekOp = (): string | undefined => {
    const t = tokens[pos];
    return t?.type === "op" ? t.op : undefined;
  };
  const expectOp = (op: string): void => {
    if (peekOp() !== op) throw new Error(`수식 파스 실패: "${op}" 기대, "${source}"`);
    pos++;
  };

  function parseLevel(level: number): FormulaNode {
    if (level >= BINARY_LEVELS.length) return parseUnary();
    let left = parseLevel(level + 1);
    for (;;) {
      const op = peekOp();
      if (!op || !(BINARY_LEVELS[level] as string[]).includes(op)) return left;
      pos++;
      left = { kind: "binary", op: op as BinaryOp, left, right: parseLevel(level + 1) };
    }
  }

  function parseUnary(): FormulaNode {
    if (peekOp() === "-") {
      pos++;
      return { kind: "unary", operand: parseUnary() };
    }
    return parsePrimary();
  }

  function parsePrimary(): FormulaNode {
    const token = tokens[pos];
    if (!token) throw new Error(`수식 파스 실패: 조기 종료 — "${source}"`);
    if (token.type === "num") {
      pos++;
      return { kind: "num", value: token.value };
    }
    if (token.type === "ident") {
      pos++;
      if (peekOp() !== "(") return { kind: "ident", name: token.name };
      pos++;
      const args: FormulaNode[] = [];
      if (peekOp() !== ")") {
        args.push(parseLevel(0));
        while (peekOp() === ",") {
          pos++;
          args.push(parseLevel(0));
        }
      }
      expectOp(")");
      return { kind: "call", name: token.name, args };
    }
    if (token.op === "(") {
      pos++;
      const inner = parseLevel(0);
      expectOp(")");
      return inner;
    }
    throw new Error(`수식 파스 실패: 예상 밖 토큰 "${token.op}" — "${source}"`);
  }

  const root = parseLevel(0);
  if (pos !== tokens.length) throw new Error(`수식 파스 실패: 잔여 토큰 — "${source}"`);
  return root;
}
