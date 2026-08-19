import { evaluateFormula, OPPONENT_PREFIX, type FormulaEnv, type FormulaValue } from "./formula/evaluate.js";
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

/**
 * items.json `Kind` → 조건식이 쓰는 무기 종류 심볼(ItemData.Kinds 순서, items.json 전수 대조).
 * 0(무기 없음)은 대응 심볼이 없어 뺀다 — 조건식이 비교하는 심볼은 이 9종뿐이다(skills.json 전수).
 */
export const WEAPON_KIND_SYMBOLS: Readonly<Record<number, string>> = {
  1: "剣",
  2: "槍",
  3: "斧",
  4: "弓",
  5: "短剣",
  6: "魔道書",
  7: "杖",
  8: "拳",
  9: "特殊",
};

/** 스킬이 이 국면에서 발동 자격이 있는지 — 전투 주도권(Stand)과 타격 역할(Action)은 서로 독립인 축이다. */
export interface BattleRole {
  /** 이 전투를 건 쪽인가. 미지정 = 문맥 없음이라 Stand를 검사하지 않는다. */
  initiator?: boolean;
  /** 이번 타격에서 때리는 쪽인가. 미지정 = Action을 검사하지 않는다. */
  striking?: boolean;
  /**
   * 허용 Timing 집합(SkillData.Timings). 미지정 = 검사하지 않는다 — **기존 호출부의 현행 동작**이다.
   * 행에 Timing이 없어도 검사 대상 밖(Stand·Action과 같은 규약).
   */
  timings?: ReadonlySet<number>;
}

/**
 * 전투 파라미터가 산출되는 Timing 구간 = 1 Always · 2 BattleBefore ~ 16 BattleEnd
 * (SkillData.Timings, dump.cs 608482 — _mp8/G1_giveskill_layer.md §1).
 * 밖(0 None · 17~18 결과·전투후 · 19~24 오라·커맨드 · 25~27 대기·페이즈)은 전투 밖 층이라
 * 전투 계산에 섞이면 과대적용이다 — 예: SID_回復(Timing 0, `HP < MaxHP` → `HP = min(HP+5, MaxHP)`)이
 * 예보를 부를 때마다 발동해 대미지가 조용히 어긋난다.
 */
export const BATTLE_TIMINGS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]);

/** 1 = Offence, 2 = Defence, 0/미지정 = 무관 (SkillData.Stands·Actions 열거 그대로). */
const passesFilter = (skill: SkillRow, role: BattleRole): boolean => {
  if (skill.Stand && role.initiator !== undefined && (skill.Stand === 1) !== role.initiator) return false;
  if (skill.Action && role.striking !== undefined && (skill.Action === 1) !== role.striking) return false;
  if (role.timings !== undefined && skill.Timing !== undefined && !role.timings.has(skill.Timing)) return false;
  return true;
};

/**
 * 조건식이 비교 대상으로 쓰는 열거 상수 — env 변수(攻撃属性·武器の種類)가 실제로 취하는 값이다.
 * ☠여기 없는 이름은 미지 식별자로 던진다(과소 강하) — 그래서 `武器の種類 == 剣`을 살리려면
 * 좌변 변수뿐 아니라 우변 심볼도 같이 등재해야 한다.
 */
const ENUM_SYMBOLS = new Set([
  "物理属性",
  "魔法属性",
  ...Object.values(WEAPON_KIND_SYMBOLS),
]);

/**
 * 조건 평가용 환경 — 미지 식별자를 심볼로 흘리지 않고 던진다.
 * 심볼로 흘리면 비교식은 거짓(과소), 논리 단항은 truthy(과대)로 강하 방향이 갈라진다.
 * ★공개하는 이유 = **결손 산출도 같은 문을 통과해야** 한다(룰북 조건식 프로브). 판정을 밖에서
 * 다시 적으면 ENUM_SYMBOLS가 늘 때마다 산출물이 조용히 갈린다.
 */
export function strictIdents(env: FormulaEnv): FormulaEnv {
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
 * ActValues 평가 env — DSL은 대입식 안에서 자기 값을 이름으로 참조한다(ダメージ% 류: 相手のダメージ = f(相手のダメージ)).
 * 진행 중 값을 그 이름으로 노출해야 원문 식이 그대로 돈다.
 * ☠相手の~ 이름은 평가기가 상대 env의 무접두 이름으로 푼다 — 오버레이도 그쪽에 걸어야 잡힌다.
 */
function valueEnvFor(env: FormulaEnv, valueName: string, current: () => number): FormulaEnv {
  if (!valueName.startsWith(OPPONENT_PREFIX)) {
    return { ...env, lookup: (name) => (name === valueName ? current() : env.lookup(name)) };
  }
  const rest = valueName.slice(OPPONENT_PREFIX.length);
  return {
    ...env,
    opponent: () => {
      const foe = env.opponent?.();
      return {
        lookup: (name) => (name === rest ? current() : foe?.lookup(name)),
        // ☠call을 빠뜨리면 상대 시점 ActValues의 スキル所持()가 미지 함수로 던져 조용히 삼켜진다.
        call: foe?.call?.bind(foe),
        opponent: foe?.opponent,
      };
    },
  };
}

/**
 * 교차측 소환 — 정본은 훅 121종을 정방향/Reverse 두 벌로 등록하고 **같은 레지스터**에 쓴다
 * (GameCalculator.AddCommandWithReverse · Reverse() 0x22791B0 = 대상 전환, 부호 반전 아님).
 * 그래서 상대 스킬 중 ActName이 `相手の`+값이름인 행만 자기 합성에 합류시킨다.
 * ☠상대의 **자기 이름 행**(防御力+10 등)은 여기 넣지 않는다 — 그쪽은 이미 opponent env를 거쳐
 * 공식 유도값에 도달하므로(威力 12 → 2 실측) 다시 넣으면 이중 적용이다.
 */
export interface CrossSkills {
  skills: readonly SkillRow[];
  /** 보유자(상대)의 **순정** env — 보정 훅이 달린 env를 넘기면 훅끼리 서로를 부른다. */
  env: FormulaEnv;
  role?: BattleRole;
}

/** 값 이름 하나에 걸리는 Act 슬롯 — 정렬은 목록을 만들 때 끝난다(호출마다 다시 정렬하지 않는다). */
interface ActHook {
  skill: SkillRow;
  /** ActNames/ActOperations/ActValues 공통 인덱스. */
  slot: number;
  /** 보유자가 자기 자신인가 — 아니면 교차측(`相手の` 접두 행). */
  own: boolean;
}

/**
 * 전투 로컬 부여 한 건 — 정본 `AddGiveScene`(0x246E0C0)이 대상 사이드의 `m_MaskSkill`(전투 사본)에 넣는 행.
 * ☠유닛 영속층(Cycle != 0 = GiveDelay → CommitSkill 0x2478070)은 여기 안 온다 — 수명이 다른 저장소다.
 */
export interface SkillGive {
  /** GiveTarget — 0 상대 · 1 자기 · 2 체인. 3 주변·4 댄스는 전투 디스패처가 버린다(0x246A708 default). */
  target: number;
  row: SkillRow;
}

/**
 * 이 Timing 패스에서 부여되는 전투 로컬 스킬 — 정본은 `CalcActiveSkill`(0x246D7C0) 루프가 스킬 하나를
 * 적용할 때마다 **즉시** `AddGivesScene`(0x246A520)을 부른다(패스가 끝난 뒤가 아니다).
 * 조건 평가·강하 규약은 `makeSkillModifier`와 같다(미지 식별자·함수 = 미적용).
 * ☠호출측이 지켜야 할 순서: 그 패스의 **값 계산이 끝난 뒤** 부여한다 —
 *   먼저 부여하면 `SID_神速発動済み` 같은 래치가 바로 그 오더의 `威力 * 0.5`를 죽인다.
 */
export function resolveGives(
  skills: readonly SkillRow[],
  env: FormulaEnv,
  role: BattleRole = {},
): SkillGive[] {
  const condEnv = strictIdents(env);
  const out: SkillGive[] = [];
  for (const skill of skills) {
    const rows = skill.Gives;
    if (rows === undefined || rows.length === 0) continue;
    if (!passesFilter(skill, role)) continue;
    try {
      if (skill.Condition !== undefined && !truthy(evaluateFormula(node(skill.Condition), condEnv))) continue;
    } catch (error) {
      if (error instanceof SkillRecursionError) throw error; // 조용한 미적용 금지(makeSkillModifier와 같은 규약)
      continue;
    }
    // Cycle != 0 = 전투 후 유닛 영속층. 이번에 여는 것은 전투 로컬 경로뿐이다(skills.give-sids).
    for (const row of rows) if ((row.Cycle ?? 0) === 0) out.push({ target: skill.GiveTarget ?? 0, row });
  }
  return out;
}

/**
 * 스킬 보정 재진입 — `combatEnv`의 훅 달린 env는 `opponent()`가 **다시 훅 달린 env**를 돌려준다.
 * 그래서 `相手の~`를 읽는 조건이 양쪽에 있으면 두 보정자가 서로를 끝없이 부른다.
 * ☠이걸 그냥 두면 RangeError가 아래 `catch { continue }`에 삼켜져 **오류가 아니라 조용한 미적용**이 된다
 * (스킬 하나가 사라진 국면이 경고 없이 계속 돈다). 그래서 전용 오류로 터뜨리고 catch가 되던진다.
 */
export class SkillRecursionError extends Error {
  constructor(valueName: string, depth: number) {
    super(`스킬 보정 재진입 상한 초과: "${valueName}" (깊이 ${depth})`);
    this.name = "SkillRecursionError";
  }
}

/**
 * 재진입 깊이 상한 — 정본에 대응물이 없는 **우리 쪽 안전장치**다(교차측 왕복이 유한임을 강제한다).
 * ☠보정자 인스턴스마다 세면 못 잡는다: 무한 왕복은 `combatEnv`가 매번 **새 보정자**를 만들며 도는 형태라
 * 카운터가 모듈 전역이어야 한다.
 */
const MAX_MODIFY_DEPTH = 16;
let modifyDepth = 0;

/**
 * Act 기반 계산값 보정자. env = 스킬 보유자의 순정 환경(보정 훅 없는 것 — 재귀 방지).
 * 평가 불가 조건(미지원 술어 함수·미지 상태변수)은 스킬 미적용으로 안전 강하한다 —
 * 지원 범위는 테스트가 정본이고, 흐름 스킬은 전투 해결 층이 따로 소유한다.
 */
export function makeSkillModifier(
  skills: readonly SkillRow[],
  env: FormulaEnv,
  role: BattleRole = {},
  cross?: CrossSkills,
): (valueName: string, value: number) => number {
  const condEnv = strictIdents(env);
  const crossCondEnv = cross === undefined ? undefined : strictIdents(cross.env);
  // ★실행 순서 = **Timing 오름차순**. 정본은 타이밍마다 패스를 따로 돌리고(CalcBranch → CalcActiveSkill
  //   0x246D7C0), 한 패스 안에서는 마스크 리스트 **삽입 순서 그대로** 돈다 — 그 함수에 정렬이 없다.
  //   호출부가 여러 Timing을 한 목록으로 접는 자리(combatEnv의 BATTLE_TIMINGS)가 있어서 패스 순서를
  //   정렬로 복원한다. 같은 Timing 안은 삽입 순서 유지(sort는 안정 정렬) · 자기 → 교차측 순도 정본과 같다
  //   (CalcActiveSkill 래퍼 0x2469F60 = Offence 패스 뒤 Reverse Defence 패스).
  // ☠`Order`(0x9C)는 **이 경로의 키가 아니다** — Order를 소비하는 자리는 HitSkillPool(Timing 12 HitAffect,
  //   HitSkill.SortKey 0x19B60F0)뿐이고 우리는 그 훅 자체가 없다(_mp8/G1_giveskill_layer.md §1-1).
  //   종전 Order 정렬은 근거 없는 가정이었고, 그 주석이 들던 예도 데이터가 반증한다:
  //   SID_切り返し(Order -10)와 SID_追撃不可(Order 50)의 상호작용은 Order가 아니라
  //   切り返し의 Condition `スキル所持("追撃不可") == 0`가 막는다(둘 다 Timing 3이라 정렬해도 안 갈린다).
  const ranked: ActHook[] = [
    ...skills.filter((skill) => passesFilter(skill, role)).map((skill) => ({ skill, slot: 0, own: true })),
    ...(cross?.skills ?? [])
      .filter((skill) => passesFilter(skill, cross?.role ?? {}))
      .map((skill) => ({ skill, slot: 0, own: false })),
  ].sort((a, b) => (a.skill.Timing ?? 0) - (b.skill.Timing ?? 0));

  // 값 이름 → 걸리는 슬롯 목록. 교차측 행은 `相手の`를 떼어낸 이름으로 색인한다(그 이름을 계산할 때 소환된다).
  const hooks = new Map<string, ActHook[]>();
  for (const entry of ranked) {
    const names = entry.skill.ActNames ?? [];
    for (let slot = 0; slot < names.length; slot++) {
      const name = names[slot];
      const key =
        entry.own ? name
        : name.startsWith(OPPONENT_PREFIX) ? name.slice(OPPONENT_PREFIX.length)
        : undefined;
      if (key === undefined) continue;
      const list = hooks.get(key);
      if (list === undefined) hooks.set(key, [{ ...entry, slot }]);
      else list.push({ ...entry, slot });
    }
  }

  return (valueName, value) => {
    if (modifyDepth >= MAX_MODIFY_DEPTH) throw new SkillRecursionError(valueName, modifyDepth);
    modifyDepth += 1;
    try {
      const limit = PARAM_LIMIT[valueName];
      const composed = limit !== undefined;
      // 전투 파라미터는 세 레지스터를 따로 모아 끝에 한 번 합성한다 — 그래서 스킬 순서에 흔들리지 않는다.
      let base = value;
      let add = 0;
      let scale = 1;
      let out = value; // 원시 스탯·追撃条件 = 즉시 반영 경로
      const matched = hooks.get(valueName);
      if (matched !== undefined) {
        const current = (): number => (composed ? base : out);
        const ownEnv = valueEnvFor(env, valueName, current);
        const crossEnv =
          cross === undefined ? undefined : valueEnvFor(cross.env, OPPONENT_PREFIX + valueName, current);
        for (const { skill, slot, own } of matched) {
          try {
            const conditions = own ? condEnv : crossCondEnv;
            if (skill.Condition !== undefined && !truthy(evaluateFormula(node(skill.Condition), conditions!))) {
              continue;
            }
            const amount = evaluateFormula(node(skill.ActValues?.[slot] ?? "0"), (own ? ownEnv : crossEnv)!);
            if (typeof amount !== "number") continue;
            const op = skill.ActOperations?.[slot] ?? "+";
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
          } catch (error) {
            // ☠재진입만은 삼키지 않는다 — 삼키면 상한이 "조용한 미적용"을 만드는 장치가 된다.
            if (error instanceof SkillRecursionError) throw error;
            continue;
          }
        }
      }
      if (!composed) return out;
      return Math.min(Math.max((base + add) * scale, 0), limit);
    } finally {
      modifyDepth -= 1;
    }
  };
}
