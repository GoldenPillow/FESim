/**
 * 유닛 스탯 산출 — 자동레벨(고정 성장) 모델.
 * 검증: SerenesForest 공개 영입 스탯 36명 × 9스탯 전수 일치(2026-08-16, registers/decisions.md)
 * + IL2CPP 판독(`Unit.AutoGrowCapability` 0x1A0B1B0 · `CalculateAutoGrowCapability` 0x1A0E0A0 ·
 * `Unit.CreateImpl2` 0x1A08B60 · `UnitUtil.GetRoundGrow` 0x1C759D0).
 *
 * ☠**성장률 소스는 택일이다** — `person.Grow`가 전 0이면 `job.BaseGrow`(+난이도 델타), 아니면 `person.Grow`.
 * 합산이 아니다. 일반 적 1379행이 person.Grow 전 0이라 이 갈래가 없으면 **적이 통째로 약해진다**.
 */
import { STAT_KEYS, type SkillRow, type StatBlock, type StatKey } from "@fesim/shared";

export { STAT_KEYS, type StatBlock, type StatKey } from "@fesim/shared";

/**
 * CalcWork 변조(SkillData.CalcWork 0x2489350, 5-way 0x24893D8) — 같은 Work 축 스킬은
 * 순차 체이닝(SkillArray.CalcWork 0x24891D0). 배선된 소비처 = Work 2(JobGrowChange —
 * 레벨업 클래스 성장 몫, 努力の才 x2). ItemHealScale 축은 미배선(장부 actions.staff).
 */
export function calcWork(value: number, work: number, skills?: readonly SkillRow[]): number {
  let v = value;
  for (const row of skills ?? []) {
    if (row.Work !== work) continue;
    const w = row.WorkValue ?? 0;
    if (row.WorkOperation === "=") v = w;
    else if (row.WorkOperation === "+") v = w + v;
    else if (row.WorkOperation === "-") v = v - w;
    else if (row.WorkOperation === "*") v = w * v;
    else if (row.WorkOperation === "/") v = w === 0 ? v : v / w;
  }
  return v;
}

/**
 * 레벨업 성장률 조립 — 정본 = `Unit.LevelUp`(0x1A3A040) 전단 + `Unit.GetCapabilityGrow`(0x1A2FF20),
 * 판독 = `~/fesim_data/extracted/il2cpp/LEVELUP_GROW.md`. **Fixed/Random 공용**이고,
 * 자동레벨(deriveStats)의 "택일"과 **다른 경로·다른 필드**다 — 여기는 개인 + 현재 직업 DiffGrow **합산**.
 * ☠누적기 초기값(person.Grow 원본)과 다른 값이다 — 겸용하면 첫 레벨업이 어긋난다
 * (2026-08-31 수리 전이 정확히 그 상태였다: 개인 단독이라 전 캠페인 레벨업이 클래스 몫만큼 과소).
 * 미배선 = 택일 갈래 job.BaseGrow(발현 = 자군에 person.Grow 전0 유닛, 현행 로스터 전무) ·
 * 무기 GrowRatio(비영 5종 전부 DLC 엠블렘 무기 — 무DLC 정책상 미발현).
 */
export function levelUpGrowthRate(
  personGrowth: StatBlock | undefined,
  jobGrow: StatBlock | undefined,
  workSkills?: readonly SkillRow[],
): StatBlock {
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) {
    const jobDelta = calcWork(jobGrow?.[key] ?? 0, 2, workSkills);
    out[key] = clamp(Math.trunc((personGrowth?.[key] ?? 0) + jobDelta), 0, 255);
  }
  return out;
}

export interface DeriveStatsInput {
  jobBase: StatBlock;
  /**
   * 직업 등급(`JobData.Rank` 0x58) — 0 = 기본직, 그 외 = 상급직(성장 레벨 +19).
   * ☠`InternalLevel` 숫자가 아니다(`JobData.IsHigh` 0x2055D10 = Rank ≠ 0) — 상급직 대부분이 20이라
   * 종전 모델이 자군에선 우연히 맞았지만 InternalLevel 5짜리 상급직(M002 神竜ノ王)에서 어긋났다.
   */
  jobRank: number;
  /** 난이도 선택된 인물 오프셋(OffsetN/H/L). */
  personOffset: StatBlock;
  /** 인물 성장률 %(Grow) — 전 0이면 직업 성장률로 넘어간다. */
  personGrowth: StatBlock;
  /** 직업 기본 성장률(job.BaseGrow) — `person.Grow`가 전 0인 유닛의 성장률 소스. */
  jobBaseGrow?: StatBlock;
  /** 난이도별 직업 성장 델타(job.DiffGrow{Normal|Hard|Lunatic}) — ★직업 성장률 갈래에서만 가산. */
  jobDiffGrow?: StatBlock;
  /** `person.AssetForce == Force.Type.Enemy(1)` — AutoGrowOffset 가산 게이트. */
  enemy?: boolean;
  /** 표시 레벨. */
  level: number;
  /** 난이도 선택된 AutoGrowOffset(N/H/L) — 성장 레벨 수 가산(적 전용). */
  autoGrowOffset?: number;
  /** 스탯 상한(Limit). 지정 시에만 적용. */
  cap?: StatBlock;
}

/**
 * 성장이 적용된 레벨 수 = `level + (상급직 ? 19 : 0) + (적이면 AutoGrowOffset) - 1`.
 * 상급직 Lv1 = 19레벨분 성장(`Unit.CreateImpl2` targetLevel = IsHigh ? level+19 : level).
 */
export function grownLevels(jobRank: number, level: number, autoGrowOffset = 0, enemy = true): number {
  const target = level + (jobRank !== 0 ? 19 : 0) + (enemy ? autoGrowOffset : 0);
  return Math.max(target - 1, 0);
}

/** `UnitUtil.GetRoundGrow` — `max(trunc((rate*n + 50) / 100), 0)` = half-up(피연산자 비음수). */
const roundGrow = (percents: number): number => Math.max(Math.trunc((percents + 50) / 100), 0);

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/**
 * 자동레벨 BaseCapability = Clamp(성장분 + 인물 오프셋, -120, 120) — deriveStats의 "그릇" 부분.
 * 전직(Unit.ClassChange 0x1A3C7B0)은 이 그릇을 **손대지 않고** job(Base/Limit)만 간다 —
 * 그래서 성장 경로(growthPath)와 deriveStats가 같은 소자를 써야 전직 산출이 어긋나지 않는다.
 */
export function autoGrowBaseCapability(input: DeriveStatsInput): StatBlock {
  const levels = grownLevels(input.jobRank, input.level, input.autoGrowOffset, input.enemy ?? true);
  // `Capability.IsZero()` — 전 필드가 0일 때만 직업 성장률로 넘어간다(택일).
  const personIsZero = STAT_KEYS.every((key) => input.personGrowth[key] === 0);
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) {
    // 난이도 델타는 직업 성장률 갈래 전용 — 인물 성장률 갈래는 특정 챕터 게이트(Cid 접두, 미판독)라 미적용.
    const rate = personIsZero
      ? (input.jobBaseGrow?.[key] ?? 0) + (input.jobDiffGrow?.[key] ?? 0)
      : input.personGrowth[key];
    const grow = roundGrow(clamp(rate, 0, 255) * levels);
    out[key] = clamp(grow + input.personOffset[key], -120, 120);
  }
  return out;
}

/** 표시 스탯 하한 = HP만 1, 나머지 0 (Unit.GetCapability RVA 0x1A2DD80 — 인덱스 0에만 `mov w1,#1`). */
const statFloor = (key: string, value: number): number => Math.max(value, key === "hp" ? 1 : 0);

export function deriveStats(input: DeriveStatsInput): StatBlock {
  const baseCap = autoGrowBaseCapability(input);
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) {
    let value = input.jobBase[key] + baseCap[key];
    if (input.cap !== undefined) value = Math.min(value, input.cap[key]);
    // 음수 오프셋 유닛(M002 뤼미에르 실재)이 HP 0으로 떨어지면 살아있는 유닛이 즉사 판정 대상이 된다.
    out[key] = statFloor(key, value);
  }
  return out;
}

/**
 * 스탯 상한 합성 = Clamp(job.Limit + person.Limit, 0, 255) — GetCapabilityLimit 0x1A30B60
 * (person Limit은 s8 음수 가능). 웹 사영(statCap)과 빌더가 같은 답변자를 쓴다(☠복제 금지).
 */
export function mergeStatCap(jobLimit: StatBlock, personLimit: StatBlock): StatBlock {
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) out[key] = clamp(jobLimit[key] + personLimit[key], 0, 255);
  return out;
}

/** 성장 경로의 직업 단면 — base/limit는 표시 합성 입력, diffGrow는 레벨업 rate의 클래스 몫(공용 DiffGrow). */
export interface GrowthPathJob {
  base: StatBlock;
  limit: StatBlock;
  /** ☠자동레벨의 DiffGrowN/H/L(난이도별)과 다른 필드다 — 레벨업은 공용 DiffGrow를 읽는다. */
  diffGrow: StatBlock;
  /** JobData.Rank — 0 기본직(레벨 10부터 전직 가능), 그 외 상급직(합류 즉시 전직 + 자동레벨 +19). */
  rank: number;
}

export interface GrowthPathInput {
  joinJob: GrowthPathJob;
  targetJob: GrowthPathJob;
  /** 합류 표시 레벨(person.Level). */
  joinLevel: number;
  /** person.InternalLevel — 합류 내부 레벨(1기점) = internalOffset + joinLevel. */
  internalOffset: number;
  personGrowth: StatBlock;
  /** 난이도 선택된 인물 오프셋(OffsetN/H/L). */
  personOffset: StatBlock;
  /** 목표 내부 레벨(1기점 = 총 성장 레벨 수). */
  targetInternal: number;
  /** CalcWork 변조 스킬(努力の才 등 Work 비영 행만) — 레벨업 rate의 클래스 몫에 걸린다. */
  workSkills?: readonly SkillRow[];
}

export interface GrowthPathResult {
  /** 정수 스탯(캡·하한 적용). 표시값 = stats + acc/100 (소수점 1자리 표기 — 설계 결정). */
  stats: StatBlock;
  /** 고정 성장 누적기 잔여 — 소수부의 정본(초기값 = person.Grow 원본, CreateImpl1 0x1A08944). */
  acc: StatBlock;
  /** 캡에 막힌 스탯(누적 정지 상태 — UI 캡 색 신호). */
  capped: StatKey[];
  /** 도달 내부 레벨(1기점). 목표 미달이면 합류 상태 그대로다(강등 없음). */
  internal: number;
  /** 전직이 성립했는가 — false면 stats는 합류 직업 기준(목표 직업 미반영). */
  promoted: boolean;
}

/** 마스터 프루프 사용 가능 레벨 — 기본직은 10부터 전직(job.MaxLevel과 무관한 게이트). */
const PROMOTE_LEVEL = 10;

/**
 * 성장 경로 — 캐릭터 빌더 B1: 합류(자동레벨 그릇) → [기본직은 10까지 합류 직업 성장] →
 * 전직(job만 교체 — BaseCapability·누적기 불변) → 목표 내부 레벨까지 고정 성장 누적.
 * 레벨업 rate·누적기는 전투 엔진과 같은 답변자(levelUpGrowthRate·동일 게이트 의미론)를 쓴다.
 */
export function growthPath(input: GrowthPathInput): GrowthPathResult {
  const joinInternal = input.internalOffset + input.joinLevel;
  const baseCap = autoGrowBaseCapability({
    jobBase: input.joinJob.base,
    jobRank: input.joinJob.rank,
    personOffset: input.personOffset,
    personGrowth: input.personGrowth,
    enemy: false,
    level: input.joinLevel,
  });
  const acc = { ...input.personGrowth };
  const levelUps = (n: number, job: GrowthPathJob): void => {
    if (n <= 0) return;
    const rates = levelUpGrowthRate(input.personGrowth, job.diffGrow, input.workSkills);
    for (let i = 0; i < n; i++) {
      for (const key of STAT_KEYS) {
        const rate = rates[key];
        if (rate === 0) continue;
        // 상한 게이트는 루프 진입 전 1회 — 캡에 닿은 스탯은 누적조차 없다(fixedGrowth와 동일 의미론).
        if (job.base[key] + baseCap[key] >= job.limit[key]) continue;
        let carry = Math.min(acc[key] + rate, 255);
        while (carry > 99) {
          carry -= 100;
          baseCap[key] += 1;
        }
        acc[key] = carry;
      }
    }
  };
  let internal = joinInternal;
  let level = input.joinLevel;
  let job = input.joinJob;
  let promoted = false;
  if (joinInternal <= input.targetInternal) {
    if (job.rank === 0 && level < PROMOTE_LEVEL) {
      const n1 = Math.min(PROMOTE_LEVEL - level, input.targetInternal - internal);
      levelUps(n1, job);
      internal += n1;
      level += n1;
    }
    // 전직 게이트 = 표시 레벨 10(기본직) — 목표가 낮아 10에 못 미치면 합류 직업 그대로 정직하게 남는다.
    if (job.rank !== 0 || level >= PROMOTE_LEVEL) {
      job = input.targetJob;
      promoted = true;
      levelUps(input.targetInternal - internal, job);
      internal = input.targetInternal;
    }
  }
  const stats = {} as StatBlock;
  const capped: StatKey[] = [];
  for (const key of STAT_KEYS) {
    const raw = job.base[key] + clamp(baseCap[key], -120, 120);
    if (raw >= job.limit[key]) capped.push(key);
    stats[key] = statFloor(key, Math.min(raw, job.limit[key]));
  }
  return { stats, acc, capped, internal, promoted };
}
