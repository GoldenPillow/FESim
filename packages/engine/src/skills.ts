import { evaluateFormula, type FormulaEnv, type FormulaValue } from "./formula/evaluate.js";
import { parseFormula, type FormulaNode } from "./formula/parser.js";
import { STAT_KEYS, type StatBlock } from "./stats.js";

/**
 * 스킬 엔진 — skills.json 행을 그대로 실행한다(수기 이식 금지).
 * 층위: (1) EnhanceValue.* 정적 스탯 보정 (2) ActNames/Operations/Values 계산값 보정
 * (3) 전투 흐름 스킬(공격 횟수·부여)은 전투 해결이 소유.
 * 실측 제약: Act 값은 소수를 유지하고 최종 표시에서만 내린다(M003 간파 코퍼스).
 */
export interface SkillRow {
  Sid: string;
  Timing?: number;
  Condition?: string;
  ActNames?: string[];
  ActOperations?: string[];
  ActValues?: string[];
  GiveSids?: string[];
  GiveTarget?: number;
  Target?: number;
  RangeI?: number;
  RangeO?: number;
  [key: string]: unknown;
}

/** 데이터 필드 접미(일본어 원본 유래) → 스탯 키. */
const ENHANCE_FIELDS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: "Hp",
  str: "Str",
  mag: "Magic",
  dex: "Tech",
  spd: "Quick",
  lck: "Luck",
  def: "Def",
  res: "Mdef",
  bld: "Phys",
};

/** EnhanceValue.* 정적 보정 합산 — 스탯 화면 표시값에 포함되는 층(실측: 싱크로 +N). */
export function staticEnhances(base: StatBlock, skills: readonly SkillRow[]): StatBlock {
  const out = { ...base };
  for (const skill of skills) {
    for (const key of STAT_KEYS) {
      const value = skill[`EnhanceValue.${ENHANCE_FIELDS[key]}`];
      if (typeof value === "number") out[key] += value;
    }
  }
  return out;
}

const parsed = new Map<string, FormulaNode>();
const node = (source: string): FormulaNode => {
  let cached = parsed.get(source);
  if (cached === undefined) {
    cached = parseFormula(source);
    parsed.set(source, cached);
  }
  return cached;
};

const truthy = (v: FormulaValue): boolean => (typeof v === "number" ? v !== 0 : v !== "");

/**
 * Act 기반 계산값 보정자. env = 스킬 보유자의 순정 환경(보정 훅 없는 것 — 재귀 방지).
 * 평가 불가 조건(전투 흐름 함수 등 현재 미지원 술어)은 스킬 미적용으로 안전 강하한다 —
 * 지원 범위는 테스트가 정본이고, 흐름 스킬은 전투 해결 층이 따로 소유한다.
 */
export function makeSkillModifier(
  skills: readonly SkillRow[],
  env: FormulaEnv,
): (valueName: string, value: number) => number {
  return (valueName, value) => {
    let out = value;
    for (const skill of skills) {
      const names = skill.ActNames;
      if (names === undefined) continue;
      for (let i = 0; i < names.length; i++) {
        if (names[i] !== valueName) continue;
        try {
          if (skill.Condition !== undefined && !truthy(evaluateFormula(node(skill.Condition), env))) {
            continue;
          }
          const amount = evaluateFormula(node(skill.ActValues?.[i] ?? "0"), env);
          if (typeof amount !== "number") continue;
          const op = skill.ActOperations?.[i] ?? "+";
          out =
            op === "+" ? out + amount
            : op === "-" ? out - amount
            : op === "*" ? out * amount
            : op === "=" ? amount
            : out;
        } catch {
          continue;
        }
      }
    }
    return out;
  };
}
