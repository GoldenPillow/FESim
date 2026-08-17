import { evaluateFormula, type FormulaEnv, type FormulaValue } from "./formula/evaluate.js";
import { parseFormula, type FormulaNode } from "./formula/parser.js";
import { STAT_KEYS, type StatBlock } from "./stats.js";

/**
 * 스킬 엔진 — skills.json 행을 그대로 실행한다(수기 이식 금지).
 * 층위: (1) EnhanceValue.* 정적 스탯 보정 (2) ActNames/Operations/Values 계산값 보정
 * (3) 전투 흐름 스킬(공격 횟수·부여)은 전투 해결이 소유.
 * 실측 제약: Act 값은 소수를 유지하고 최종 표시에서만 내린다(M003 간파 코퍼스).
 */
export type { SkillRow } from "@fesim/shared";
import type { SkillRow } from "@fesim/shared";

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
 * 전투 파라미터(BattleParam) 훅 — 이 12개만 base·add·scale 3레지스터로 합성되고 결과가 클램프된다.
 * 나머지(원시 스탯·追撃条件)는 즉시 반영·클램프 없음이 정본이다.
 * 값계는 0..999, 율계(命中率·必殺率)는 0..100 — BattleParam .cctor RVA 0x1E8DD60.
 */
const PARAM_LIMIT: Record<string, number> = {
  ユニット攻撃力: 999,
  ユニット防御力: 999,
  攻撃力: 999,
  防御力: 999,
  命中値: 999,
  回避値: 999,
  必殺値: 999,
  必殺回避: 999,
  攻撃速度: 999,
  威力: 999,
  命中率: 100,
  必殺率: 100,
};

/** 스킬이 이 국면에서 발동 자격이 있는지 — 전투 주도권(Stand)과 타격 역할(Action)은 서로 독립인 축이다. */
export interface BattleRole {
  /** 이 전투를 건 쪽인가. 미지정 = 문맥 없음이라 Stand를 검사하지 않는다. */
  initiator?: boolean;
  /** 이번 타격에서 때리는 쪽인가. 미지정 = Action을 검사하지 않는다. */
  striking?: boolean;
}

/** 1 = Offence, 2 = Defence, 0/미지정 = 무관 (SkillData.Stands·Actions 열거 그대로). */
const passesFilter = (skill: SkillRow, role: BattleRole): boolean => {
  if (skill.Stand && role.initiator !== undefined && (skill.Stand === 1) !== role.initiator) return false;
  if (skill.Action && role.striking !== undefined && (skill.Action === 1) !== role.striking) return false;
  return true;
};

/** 조건식이 비교 대상으로 쓰는 열거 상수 — env 변수(攻撃属性)가 실제로 취하는 값이다. */
const ENUM_SYMBOLS = new Set(["物理属性", "魔法属性"]);

/**
 * 조건 평가용 환경 — 미지 식별자를 심볼로 흘리지 않고 던진다.
 * 심볼로 흘리면 비교식은 거짓(과소), 논리 단항은 truthy(과대)로 강하 방향이 갈라진다.
 */
function strictIdents(env: FormulaEnv): FormulaEnv {
  return {
    lookup: (name) => {
      const value = env.lookup(name);
      if (value === undefined && !ENUM_SYMBOLS.has(name)) {
        throw new Error(`스킬 조건 평가 실패: 미지 식별자 "${name}"`);
      }
      return value;
    },
    call: env.call?.bind(env),
    opponent: env.opponent ? () => strictIdents(env.opponent!()) : undefined,
  };
}

/**
 * Act 기반 계산값 보정자. env = 스킬 보유자의 순정 환경(보정 훅 없는 것 — 재귀 방지).
 * 평가 불가 조건(미지원 술어 함수·미지 상태변수)은 스킬 미적용으로 안전 강하한다 —
 * 지원 범위는 테스트가 정본이고, 흐름 스킬은 전투 해결 층이 따로 소유한다.
 */
export function makeSkillModifier(
  skills: readonly SkillRow[],
  env: FormulaEnv,
  role: BattleRole = {},
): (valueName: string, value: number) => number {
  const condEnv = strictIdents(env);
  const active = skills.filter((skill) => passesFilter(skill, role));
  return (valueName, value) => {
    const limit = PARAM_LIMIT[valueName];
    const composed = limit !== undefined;
    // 전투 파라미터는 세 레지스터를 따로 모아 끝에 한 번 합성한다 — 그래서 스킬 순서에 흔들리지 않는다.
    let base = value;
    let add = 0;
    let scale = 1;
    let out = value; // 원시 스탯·追撃条件 = 즉시 반영 경로
    for (const skill of active) {
      const names = skill.ActNames;
      if (names === undefined) continue;
      for (let i = 0; i < names.length; i++) {
        if (names[i] !== valueName) continue;
        try {
          if (skill.Condition !== undefined && !truthy(evaluateFormula(node(skill.Condition), condEnv))) {
            continue;
          }
          const amount = evaluateFormula(node(skill.ActValues?.[i] ?? "0"), env);
          if (typeof amount !== "number") continue;
          const op = skill.ActOperations?.[i] ?? "+";
          if (composed) {
            if (op === "+") add += amount;
            else if (op === "-") add -= amount;
            else if (op === "*") scale *= amount;
            else if (op === "/") scale *= amount === 0 ? 0 : 1 / amount;
            else if (op === "=") base = amount; // 기저만 덮는다 — add·scale은 살아남는다
          } else {
            out =
              op === "+" ? out + amount
              : op === "-" ? out - amount
              : op === "*" ? out * amount
              : op === "/" ? (amount === 0 ? 0 : out / amount)
              : op === "=" ? amount
              : out;
          }
        } catch {
          continue;
        }
      }
    }
    if (!composed) return out;
    return Math.min(Math.max((base + add) * scale, 0), limit);
  };
}
