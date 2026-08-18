/**
 * 유닛 스탯 산출 — 자동레벨(고정 성장) 모델.
 * 검증: SerenesForest 공개 영입 스탯 36명 × 9스탯 전수 일치(2026-08-16, registers/decisions.md)
 * + IL2CPP 판독(`Unit.AutoGrowCapability` 0x1A0B1B0 · `CalculateAutoGrowCapability` 0x1A0E0A0 ·
 * `Unit.CreateImpl2` 0x1A08B60 · `UnitUtil.GetRoundGrow` 0x1C759D0).
 *
 * ☠**성장률 소스는 택일이다** — `person.Grow`가 전 0이면 `job.BaseGrow`(+난이도 델타), 아니면 `person.Grow`.
 * 합산이 아니다. 일반 적 1379행이 person.Grow 전 0이라 이 갈래가 없으면 **적이 통째로 약해진다**.
 */
import { STAT_KEYS, type StatBlock } from "@fesim/shared";

export { STAT_KEYS, type StatBlock, type StatKey } from "@fesim/shared";

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

export function deriveStats(input: DeriveStatsInput): StatBlock {
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
    // BaseCapability = Clamp(성장분 + 오프셋, -120, 120) — 그 뒤에 직업 Base와 합쳐진다.
    let value = input.jobBase[key] + clamp(grow + input.personOffset[key], -120, 120);
    if (input.cap !== undefined) value = Math.min(value, input.cap[key]);
    // 하한 = HP만 1, 나머지 0 (Unit.GetCapability RVA 0x1A2DD80 — 인덱스 0에만 `mov w1,#1`).
    // 음수 오프셋 유닛(M002 뤼미에르 실재)이 HP 0으로 떨어지면 살아있는 유닛이 즉사 판정 대상이 된다.
    out[key] = Math.max(value, key === "hp" ? 1 : 0);
  }
  return out;
}
