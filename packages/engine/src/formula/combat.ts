import type { Calculator } from "./calculator.js";
import type { FormulaEnv, FormulaValue } from "./evaluate.js";
import {
  BATTLE_TIMINGS,
  makeSkillModifier,
  resolveGives,
  WEAPON_KIND_SYMBOLS,
  type BattleRole,
  type SkillGive,
  type SkillRow,
} from "../skills.js";

/**
 * 전투 예보 파사드 — 유닛 스냅숏을 DSL 변수 환경으로 사상하고
 * 예보 패널이 쓰는 값(위력·명중·필살·공속·추격)을 원문 공식으로 계산한다.
 * 스탯 키는 인게임 순정 스탯의 영문 관례(str/mag/dex/spd/lck/def/res/bld).
 */
export interface CombatantStats {
  maxHp: number;
  hp: number;
  str: number;
  mag: number;
  dex: number;
  spd: number;
  lck: number;
  def: number;
  res: number;
  bld: number;
}

import type { CombatantWeapon, StrikeKind } from "@fesim/shared";
export type { CombatantWeapon } from "@fesim/shared";

export interface Combatant {
  stats: CombatantStats;
  weapon?: CombatantWeapon;
  support?: { hit?: number; avoid?: number; crit?: number; dodge?: number };
  terrain?: { avoid?: number; def?: number };
  /** 전투 시 계산값 보정 스킬(간파 등). 정적 보정(EnhanceValue)은 stats에 이미 반영돼 있어야 한다. */
  skills?: readonly SkillRow[];
  /** 이 전투를 건 쪽인가 — 스킬 Stand 게이트. 전투 내내 고정이다. */
  initiator?: boolean;
  /** 이번 타격에서 때리는 쪽인가 — 스킬 Action 게이트. 공격·반격마다 뒤집힌다. */
  striking?: boolean;
  /** 특효 피격 판정 마스크 — person|job Attrs 합집합(대상 측에서 소비). */
  attrs?: number;
  /**
   * 오더 진행 문맥 — **그 측**의 `手番回数`(BattleInfoSide.BattleTimes +0xB0)와
   * `総手番回数`(TotalOrder +0xB4). battleTimes는 기저값(게이트·追撃条件·장비 내구 min까지)이고
   * 신속(SID_カウンター `+1`)·SID_追撃不可(`= min(手番回数,1)`) 같은 스킬 보정은 lookup이 얹는다.
   * ☠미지정이면 두 이름을 env에 **넣지 않는다**(0을 넣지 않는다). 예보 패널처럼 문맥 없이 부르는 자리에서
   *   0을 흘리면 `手番回数 > 0`은 거짓(과소)인데 `総手番回数 == 手番回数 - 1`은 우연히 참(과대)이 되어
   *   강하 방향이 행마다 갈린다. 키가 없으면 strictIdents가 던져 그 행 전체가 미적용으로 고정된다(항상 과소).
   */
  flow?: { battleTimes?: number; totalOrder?: number };
}

/**
 * 특효 배율 — 공격자 스킬 Efficacy ∩ (대상 attrs ∖ 대상 스킬 EfficacyIgnore 합집합)이 비지 않으면
 * 걸린 스킬 EfficacyValue **최댓값**(합산 아님), 평시 1. BattleDetail.CalcAttack(0x1E744E8~) 정본.
 */
const efficacyOf = (self: Combatant, foe: Combatant | undefined): number => {
  const attrs = foe?.attrs ?? 0;
  if (attrs === 0) return 1;
  let ignore = 0;
  for (const s of foe?.skills ?? []) if (typeof s.EfficacyIgnore === "number") ignore |= s.EfficacyIgnore;
  let best = 1;
  for (const s of self.skills ?? []) {
    if (typeof s.Efficacy !== "number" || typeof s.EfficacyValue !== "number") continue;
    if ((s.Efficacy & attrs & ~ignore) !== 0 && s.EfficacyValue > best) best = s.EfficacyValue;
  }
  return best;
};

/**
 * 보정 훅이 없는 순정 환경 — **`makeSkillModifier`의 `env` 인자가 요구하는 것**이다(훅을 달면 훅이 훅을 부른다).
 * ☠`combatEnv`를 넘기지 마라: 그쪽은 lookup에 modify가 걸려 있어 보정자가 자기 결과를 다시 입력으로 먹는다.
 * 전투 밖에서 `makeSkillModifier`를 쓰는 자리(攻撃回数 등)는 이 진입점을 쓴다.
 */
export function plainCombatEnv(self: Combatant, foe?: Combatant): FormulaEnv {
  const { stats, weapon, support, terrain, flow } = self;
  const vars: Record<string, FormulaValue> = {
    力: stats.str,
    魔力: stats.mag,
    技: stats.dex,
    速さ: stats.spd,
    幸運: stats.lck,
    体格: stats.bld,
    守備: stats.def,
    魔防: stats.res,
    HP: stats.hp,
    MaxHP: stats.maxHp,
    攻撃属性: weapon?.magic ? "魔法属性" : "物理属性",
    武器攻撃力: weapon?.might ?? 0,
    武器命中: weapon?.hit ?? 0,
    武器必殺: weapon?.crit ?? 0,
    武器の重さ: weapon?.weight ?? 0,
    武器回避: weapon?.avoid ?? 0,
    武器必殺回避: weapon?.dodge ?? 0,
    武器特効: weapon?.effective ?? efficacyOf(self, foe),
    支援命中: support?.hit ?? 0,
    支援回避: support?.avoid ?? 0,
    支援必殺: support?.crit ?? 0,
    支援必殺回避: support?.dodge ?? 0,
    地形回避: terrain?.avoid ?? 0,
    地形防御: terrain?.def ?? 0,
  };
  // 아래 셋은 **있을 때만** 넣는다 — 없는 것과 0은 강하 방향이 다르다(Combatant.flow 주석 참조).
  const kind = weapon?.kind === undefined ? undefined : WEAPON_KIND_SYMBOLS[weapon.kind];
  if (kind !== undefined) vars.武器の種類 = kind;
  if (flow?.battleTimes !== undefined) vars.手番回数 = flow.battleTimes;
  if (flow?.totalOrder !== undefined) vars.総手番回数 = flow.totalOrder;

  // スキル所持("追撃不可") — 정본은 전투 로컬 SkillArray의 비트를 본다(UnitSkillCommand.FuncImpl 0x1B4D820).
  // 인자는 접두 없는 별칭이다: StructDictionary.Add가 로드 시 `SID_追撃不可`와 `追撃不可`를 같은 인덱스로
  // 등록하므로(Prefixless 0x35FE6B0) 양쪽 이름을 다 본다. `相手のスキル所持`는 평가기가 상대 env로 넘긴다.
  const sids = new Set<string>();
  for (const skill of self.skills ?? []) sids.add(skill.Sid);
  return {
    lookup: (name) => vars[name],
    call: (name, args) => {
      if (name !== "スキル所持") return undefined;
      const arg = args[0];
      if (typeof arg !== "string") return 0;
      return sids.has(arg) || sids.has(`SID_${arg}`) ? 1 : 0;
    },
    opponent: foe ? () => combatEnv(foe, self) : undefined,
  };
}

export function combatEnv(self: Combatant, foe?: Combatant): FormulaEnv {
  const plain = plainCombatEnv(self, foe);
  const own = self.skills ?? [];
  const opposing = foe?.skills ?? [];
  if (own.length === 0 && opposing.length === 0) return plain;
  const modify = makeSkillModifier(
    own,
    plain,
    { initiator: self.initiator, striking: self.striking, timings: BATTLE_TIMINGS },
    foe === undefined || opposing.length === 0 ?
      undefined
    : {
        skills: opposing,
        env: plainCombatEnv(foe, self),
        role: { initiator: foe.initiator, striking: foe.striking, timings: BATTLE_TIMINGS },
      },
  );
  return {
    ...plain,
    // 원시 스탯·문맥 변수도 훅이다 — 정본은 이름마다 커맨드를 등록한다(GameCalculator).
    // 여기서 걸지 않으면 calculator.ts:44가 base.lookup 결과를 modify 분기 **앞에서** 돌려줘
    // SID_鉄壁(守備 * 1.3)·SID_カウンター(手番回数 + 1) 같은 행이 영원히 죽는다.
    // ☠**재귀는 있다** — 보정자의 env는 plain이지만 그 plain의 `opponent()`는 다시 이 훅 달린 env를 돌려준다
    //   (plainCombatEnv 말미). 양쪽이 `相手の~`를 읽는 조건을 들면 두 보정자가 서로를 부른다.
    //   상한·명시적 오류는 makeSkillModifier가 소유한다(SkillRecursionError).
    lookup: (name) => {
      const value = plain.lookup(name);
      return typeof value === "number" ? modify(name, value) : value;
    },
    modify,
  };
}

export interface SideForecast {
  damage: number;
  /** 표시 명중률·필살률 — 인게임 예보처럼 0..100으로 클램프한 값. */
  hitRate: number;
  critRate: number;
  attackSpeed: number;
  /**
   * 手番回数 — 이 전투에서 그 측이 갖는 오더 수(0 = 반격 없음 · 2 = 추격/신속 · 3 이상도 있다).
   * ☠종전 `followUp: boolean`을 스칼라로 승격한 것이다 — 이름까지 바꾼 이유는 `if (f.followUp)`가
   *   값 1에서도 참이 되어 **조용히** "추격 있음"으로 읽히기 때문이다(타입만 바꾸면 그 함정이 남는다).
   * ☠**"실제로 몇 번 치는가"가 아니다** — 우리 기저값은 항상 1 이상인데 정본은 0을 돌려주는 게이트가 따로 있다
   *   (baseBattleTimes 주석 전수 · 장부 combat.turn-count). 실제 타격 수는 `battlePlan().orders`가 소유한다
   *   (반격 게이트가 슬롯을 닫는다). 잔여 HP를 그리려면 이 수가 아니라 오더 목록을 소비하라.
   */
  battleTimes: number;
}

/**
 * 手番回数 산출 사슬(정본 `CalcBattleTimesImpl` 0x1E88840 → Timing 3 → 4 → 5) 중 **기저값**.
 * `追撃条件`(calculator.xml = 攻撃速度差 >= 5)이 참이면 2, 아니면 1.
 * ☠정본은 여기서 `min(그 값, 장비 잔여 내구)`(0x1E88BBC)를 한 번 더 취한다 — 우리 `BattleWeapon`에는
 *   내구 필드가 없어(uses는 지팡이·소모품 전용) **그 항을 뺐다**. 결손 = combat.followup-durability-cap.
 *   ★제거 조건 = 무기 내구 모델이 서면 이 자리에 `Math.min(base, 잔여 내구)`를 넣는다.
 *
 * ☠**0을 돌려주는 게이트가 통째로 빠져 있다.** 정본 `CalcBattleTimesImpl`(0x1E888E0~0x1E88AE0)은
 * 아래에서 手番回数를 0/1로 떨어뜨리는데 우리 기저값은 **항상 1 이상**이다 — 그래서
 * `SideForecast.battleTimes`는 "이 유닛이 실제로 몇 번 치는가"가 아니다.
 *   장비 무기 없음 · 杖(Status.Rod) 장비 · 사거리 불충족(UnitUtil.IsAttackRange) ·
 *   BattleInfo.Flags.IgnoreRevenge · EngageCharge · 그리고 상태이상(Stun 등) 게이트.
 * 실행 결과가 지금 같은 이유는 **리듀서의 반격 게이트(canCounter)가 슬롯을 대신 닫기 때문**이지
 * 이 값이 맞아서가 아니다 — 그래서 이 수를 그대로 곱해 잔여 HP를 그리면 과대가 된다.
 * ★제거 조건 = 무기·상태 게이트를 이 함수 안으로 옮겨(반격 게이트와 한 자리로) 0을 돌려주게 되면
 *   이 문단과 `SideForecast.battleTimes`의 경고를 함께 지운다. 장부 = combat.turn-count·combat.counter-range-gate.
 */
export function baseBattleTimes(calc: Calculator, self: Combatant, foe: Combatant): number {
  return calc.eval("追撃条件", combatEnv(self, foe)) === 1 ? 2 : 1;
}

/**
 * 手番回数를 고치는 Timing 패스 = 3 BattleDetail(`SID_追撃不可`·`SID_切り返し`) →
 * 4 BattleInvoke(`SID_カウンター` = 신속 `+1`) → 5 BattleStart(인게이지 기술 `= 2`).
 * ☠순서가 값을 정한다 — 오름차순으로만 돌려라(정본 CalcBranch 호출 순서 그대로).
 * ☠**비계** — Timing 4 패스에는 정본에 게이트가 하나 더 있다: `BattleInfo.BattleCount != 0`이면
 *   블록이 통째로 건너뛰어진다(CalcBranch 0x2469884). 즉 연전(MultiBattle)의 2회차 이후 전투에서는
 *   신속의 `+1`이 아예 안 붙는다. 우리에겐 연전 경로가 없어 지금은 미발현이라 게이트를 달지 않았다.
 *   ★제거(추가) 조건 = 연전(같은 행동에서 전투를 두 번 이상 도는 경로)을 구현할 때 이 자리에 그 게이트를 넣는다.
 */
export const BATTLE_TIMES_STAGES: readonly number[] = [3, 4, 5];

/** 오더 실행 상한 = `min(手番回数, 4)`(CalcOrders 게이트 0x246FAEC). 저장되는 手番回数 자체는 4를 넘을 수 있다. */
export const MAX_ORDERS = 4;

/** Timing 6 OrderStart — 오더 하나가 열릴 때 도는 패스(신속의 `威力 * 0.5`가 여기 걸린다). */
export const TIMING_ORDER_START = 6;

/**
 * Timing 패스 한 단계 — `手番回数` 보정 결과와 **그 패스가 부여한 전투 로컬 스킬**을 함께 돌려준다.
 * `self.flow.battleTimes`가 그 단계의 입력값이다(없으면 조건식 `手番回数 > 0`이 던져 전부 미적용).
 * ☠부여를 값 계산과 한 단계로 묶는 이유 = 정본이 스킬 하나를 적용할 때마다 즉시 부여하기 때문이다.
 */
export function battleTimesStage(
  self: Combatant,
  foe: Combatant,
  timing: number,
): { battleTimes: number; gives: SkillGive[] } {
  const timings = new Set([timing]);
  const role: BattleRole = { initiator: self.initiator, striking: self.striking, timings };
  const own = self.skills ?? [];
  const opposing = foe.skills ?? [];
  const input = self.flow?.battleTimes ?? 0;
  const modify = makeSkillModifier(own, plainCombatEnv(self, foe), role, {
    skills: opposing,
    env: plainCombatEnv(foe, self),
    role: { initiator: foe.initiator, striking: foe.striking, timings },
  });
  return {
    battleTimes: Math.max(Math.trunc(modify("手番回数", input)), 0),
    gives: resolveGives(own, plainCombatEnv(self, foe), role),
  };
}

/**
 * 手番回数 전 사슬 — 양측을 **교대로** 돌린 뒤 self 쪽 값만 꺼낸다(예보 패널·AI처럼 오더 문맥 없이 묻는 자리용).
 * ☠종전 구현은 self의 flow만 채우고 상대는 비워 둬 `相手の手番回数`를 고치는 교차 행(SID_剣殺し 계열)이
 *   미지 식별자로 던지고 catch에 삼켜졌다 — 리듀서만 그 행을 보고 예보는 못 보는 조용한 갈림이었다.
 * 개시측 판별 = `initiator`(둘 다 미지정이면 self가 개시측) — 패스 순서가 값을 정하기 때문이다.
 */
export function battleTimesOf(calc: Calculator, self: Combatant, foe: Combatant): number {
  const offense = self.initiator !== false && foe.initiator !== true;
  const sides = runBattleTimes(calc, offense ? self : foe, offense ? foe : self);
  return sides[offense ? 0 : 1].battleTimes;
}

/** 표시 규칙(실측): 소수는 계산 내내 유지, 표시 직전에 내림 후 0..100 클램프. */
const displayClamp = (value: FormulaValue): number =>
  Math.min(Math.max(Math.floor(value as number), 0), 100);

export function forecastSide(calc: Calculator, self: Combatant, foe: Combatant): SideForecast {
  const env = combatEnv(self, foe);
  return {
    // 威力는 [0,999] 클램프 후 **정수 절사**가 정본이다(SimplePowerParam). 필살 3배는 이 정수에 곱해진다 —
    // 소수를 들고 가면 trunc(x)*3 과 trunc(x*3) 이 갈려 보정 스킬이 붙는 순간 대미지가 어긋난다.
    damage: Math.trunc(Math.min(Math.max(calc.eval("威力計算", env) as number, 0), 999)),
    hitRate: displayClamp(calc.eval("命中率計算", env)),
    critRate: displayClamp(calc.eval("必殺率計算", env)),
    attackSpeed: calc.eval("攻撃速度計算", env) as number,
    // 오더 문맥을 들고 온 호출(오더 루프)은 이미 확정된 값을 그대로 쓴다 —
    // ☠다시 돌리면 Timing 4가 오더마다 재발화해 신속이 手番回数를 계속 밀어 올린다(정본은 전투당 1회).
    battleTimes: self.flow?.battleTimes ?? battleTimesOf(calc, self, foe),
  };
}

/**
 * 체인어택 한 명분 수치 — ☠**오더 목록(battlePlan) 밖의 타격**이다.
 * 리듀서·AI·기보 정책이 이것 하나를 공유한다: 갈리면 오더만 세는 쪽이 체인 대미지를 못 보고,
 * 못 보는 대미지는 예보에도 결손 목록에도 안 잡힌 채 유닛을 죽인다.
 */
export function chainNumbers(
  calc: Calculator,
  backup: Combatant,
  defender: Combatant,
): { damage: number; hitRate: number; critRate: number } {
  const env = combatEnv(backup, defender);
  return {
    damage: Math.floor(calc.eval("チェインアタック威力計算", env) as number),
    hitRate: calc.eval("チェインアタック命中率計算", env) as number,
    critRate: calc.eval("チェインアタック必殺率計算", env) as number,
  };
}

/** 이 Timing 패스가 부여하는 전투 로컬 스킬 — 오더 안(Timing 6 OrderStart)에서 쓰는 부여 진입점. */
export function combatGives(self: Combatant, foe: Combatant, timing: number): SkillGive[] {
  return resolveGives(self.skills ?? [], plainCombatEnv(self, foe), {
    initiator: self.initiator,
    striking: self.striking,
    timings: new Set([timing]),
  });
}

/**
 * 오더 큐 슬롯 수 — 정본 `CalcNormalBattle`(0x246B580)이 `TryAdd`를 **무조건 8번** 부른다(필터 없음).
 * 실행 여부는 전적으로 슬롯 게이트 `min(手番回数, 4) > 그 측 総手番回数`가 정한다.
 */
export const ORDER_SLOTS = 8;

/**
 * 오더 인덱스 → 기보 `kind`. 0·1이 옛 5이름과 같은 자리라 **手番回数 <= 2인 판의 기보는 이름이 안 바뀐다**
 * (호환 불변식 — 여기가 흔들리면 기존 기보 5종이 전부 낡는다).
 */
const STRIKE_KINDS: readonly (readonly StrikeKind[])[] = [
  ["attack", "followUp"],
  ["counter", "counterFollowUp"],
];
const strikeKindOf = (offense: boolean, order: number): StrikeKind =>
  STRIKE_KINDS[offense ? 0 : 1][order] ?? (offense ? "extra" : "counterExtra");

/**
 * 전투 사이드 — 정본 `BattleInfoSide`(BattleTimes +0xB0 · TotalOrder +0xB4 · m_MaskSkill +0x88).
 * `skills`가 전투 로컬 사본이라 부여층(Cycle 0)이 여기 push해도 유닛 원본은 불변이다.
 */
interface PlanSide {
  base: Combatant;
  skills: SkillRow[];
  battleTimes: number;
  totalOrder: number;
}

const planView = (s: PlanSide, striking: boolean): Combatant => ({
  ...s.base,
  skills: s.skills,
  striking,
  flow: { battleTimes: s.battleTimes, totalOrder: s.totalOrder },
});

/**
 * 우리 전투층이 **실제로 받아 주는** GiveTarget 전수 — 0 Target(상대) · 1 Self(자기).
 * ☠2 Chain은 데이터 6행이 전부 Timing 5인데 체인 참가자를 전투 사이드로 모델링하지 않아 받을 그릇이 없고(결손),
 * 3 Around·4 Dance는 맵 계층 소관이라 정본 전투 디스패처도 버린다(0x246A708 default).
 * ★룰북 생성기가 "GiveSids가 읽히는가"를 이 집합으로 판정한다 — 하드코딩하면 곧 낡는다.
 */
export const GIVE_TARGETS_APPLIED: ReadonlySet<number> = new Set([0, 1]);

const planGrant = (gives: readonly SkillGive[], self: PlanSide, foe: PlanSide): void => {
  for (const give of gives) {
    if (!GIVE_TARGETS_APPLIED.has(give.target)) continue;
    const to = give.target === 1 ? self : foe;
    if (to.skills.some((row) => row.Sid === give.row.Sid)) continue; // 이미 있으면 무시(0x246E290)
    to.skills.push(give.row);
  }
};

/**
 * 手番回数 = 기저(追撃条件 ? 2 : 1) → Timing 3(追撃不可) → 4(신속 +1) → 5(기술 대입).
 * ☠패스는 **양측 교대**로 돈다 — 한쪽을 끝까지 돌리면 `相手の手番回数`를 고치는 행(SID_不意打ち·
 *   SID_剣殺し 계열)이 낡은 값을 본다. 부여도 패스마다 즉시 반영한다(정본 CalcActiveSkill 0x246D7C0).
 */
function runBattleTimes(
  calc: Calculator,
  attacker: Combatant,
  defender: Combatant,
): readonly [PlanSide, PlanSide] {
  const sides: readonly [PlanSide, PlanSide] = [
    { base: { ...attacker, initiator: true }, skills: [...(attacker.skills ?? [])], battleTimes: 0, totalOrder: 0 },
    { base: { ...defender, initiator: false }, skills: [...(defender.skills ?? [])], battleTimes: 0, totalOrder: 0 },
  ];
  const foeOf = (s: PlanSide): PlanSide => (s === sides[0] ? sides[1] : sides[0]);
  // 오더 밖 패스에서 때리는 쪽 = 개시측이다(정본이 sides[0]에 action=1, Reverse에 2를 넘긴다).
  const preView = (s: PlanSide): Combatant => planView(s, s === sides[0]);
  for (const s of sides) s.battleTimes = baseBattleTimes(calc, preView(s), preView(foeOf(s)));
  for (const timing of BATTLE_TIMES_STAGES) {
    for (const s of sides) {
      const foe = foeOf(s);
      const stage = battleTimesStage(preView(s), preView(foe), timing);
      s.battleTimes = stage.battleTimes;
      planGrant(stage.gives, s, foe);
    }
  }
  return sides;
}

/** 오더 하나 — **그 오더의 배율이 이미 반영된** 숫자다(신속의 `威力 * 0.5`는 마지막 오더에만 걸린다). */
export interface BattleOrder {
  /** 0 = 전투를 건 쪽 · 1 = 받는 쪽. */
  side: 0 | 1;
  /** 그 측에서 몇 번째 오더인가(= 이 오더 안에서 관측되는 `総手番回数`). */
  index: number;
  kind: StrikeKind;
  damage: number;
  hitRate: number;
  critRate: number;
}

export interface BattlePlanOptions {
  /**
   * 받는 쪽이 이 슬롯에서 반격할 수 있는가 — 사거리·브레이크·생존 게이트(CalcOrders 0x246FB6C).
   * ☠**콜백인 이유** = 브레이크가 타격 도중에 서기 때문이다(본공격이 명중하면 그 자리에서 반격 슬롯이 닫힌다).
   *   그래서 슬롯을 열기 직전에 묻는다. 예보·AI처럼 결과가 미리 정해진 자리는 상수를 돌려주면 된다.
   *   미지정 = 항상 열림.
   */
  counter?: () => boolean;
}

export interface BattlePlan {
  /** [개시측, 받는 쪽] `手番回数` — Timing 3·4·5 양측 교대 패스의 결과. */
  battleTimes: readonly [number, number];
  /**
   * 실행 순서 그대로의 오더 목록. ☠**1회용 지연 열거**다 —
   * 오더마다 Timing 6 부여가 누적되므로 두 번 돌 수 없다(두 번째는 빈 목록).
   */
  orders: Generator<BattleOrder>;
}

/**
 * ★"이 전투가 실제로 어떤 타격을 몇 번 내는가"의 **단일 정본**. 리듀서·예보 패널·AI·기보 정책이 전부 이것만 본다.
 * (국면, 공격자, 방어자) → 양측 `手番回数` + 오더별 숫자. 난수도 유닛 상태도 읽지 않는다.
 *
 * ☠**경계는 순수성이 아니라 입력이다** — 여기 있는 것은 (공격자, 방어자) 둘만으로 정해지는 오더 큐와 배율뿐이다.
 *   체인어택·체인가드는 **주변 유닛 목록**을 더 받아야 정해지므로 이 시그니처에 안 들어온다
 *   (`chainAttackers`·`chainNumbers`·`chainGuardFor`는 그 자체로 순수 함수이고 index에서 공개돼 있다 —
 *   종전 주석의 "난수에 의존해 순수하지 않다"는 **사실이 아니었다**: 난수는 리듀서가 굴린다).
 *   ⇒ 목록 밖 타격은 **호출자가 얹는다**. 리듀서(battle.ts)도 예보 패널(combatForecast)도 그렇게 한다.
 * ☠예보에서 빼면 안 된다: 정본 맵 예보도 `CalcSimulation`(0x246D610)이 체인 포함 전투를 통째로 돌린
 *   결과 HP를 읽는다(MapUIGauge.CalcBattleInfoForNormal 0x2025920).
 */
export function battlePlan(
  calc: Calculator,
  attacker: Combatant,
  defender: Combatant,
  options: BattlePlanOptions = {},
): BattlePlan {
  const sides = runBattleTimes(calc, attacker, defender);
  const foeOf = (s: PlanSide): PlanSide => (s === sides[0] ? sides[1] : sides[0]);
  // 오더 큐 = 8슬롯 교대 [0,1,0,1,…]. 슬롯 게이트 = min(手番回数, 4) > 그 측 総手番回数이고,
  // 総手番回数는 **오더가 끝난 뒤** +1 한다(PopOrder Dispose 0x19B6F48) ⇒ 오더 k 안에서 관측값은 k다.
  // 그 한 칸이 신속의 전부다: SID_カウンター_ダメージ５０％ 조건 `総手番回数 == 手番回数 - 1`은
  // **마지막 오더에서만** 참이라 추가타 하나에만 威力 * 0.5가 걸린다.
  function* orders(): Generator<BattleOrder> {
    for (let slot = 0; slot < ORDER_SLOTS; slot++) {
      const s = sides[slot % 2];
      const foe = foeOf(s);
      if (Math.min(s.battleTimes, MAX_ORDERS) <= s.totalOrder) continue;
      if (s === sides[1] && options.counter?.() === false) continue;
      const self = planView(s, true);
      const other = planView(foe, false);
      const numbers = forecastSide(calc, self, other);
      // Timing 6 OrderStart 부여 — ☠숫자를 계산한 **뒤**여야 한다. 먼저 부여하면 SID_神速発動済み
      //   래치가 바로 이 오더의 威力 * 0.5를 죽인다(정본도 ExecuteAct 다음이 AddGivesScene이다).
      planGrant(combatGives(self, other, TIMING_ORDER_START), s, foe);
      const offense = s === sides[0];
      yield {
        side: offense ? 0 : 1,
        index: s.totalOrder,
        kind: strikeKindOf(offense, s.totalOrder),
        damage: numbers.damage,
        hitRate: numbers.hitRate,
        critRate: numbers.critRate,
      };
      s.totalOrder += 1;
    }
  }
  return { battleTimes: [sides[0].battleTimes, sides[1].battleTimes], orders: orders() };
}
