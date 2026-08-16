/**
 * 유닛 스탯 산출 — 자동레벨(고정 성장) 모델.
 * 검증: SerenesForest 공개 영입 스탯 36명 × 9스탯 전수 일치(2026-08-16, registers/decisions.md).
 * 적 유닛의 난이도 선택(Offset·레벨·AutoGrowOffset)은 같은 공식의 입력 선택 문제 —
 * 호출측이 난이도에 맞는 값을 골라 넣는다. AutoGrowOffset 가산은 가정(실기 코퍼스로 검증 예정).
 */
export interface StatBlock {
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

export const STAT_KEYS = ["hp", "str", "mag", "dex", "spd", "lck", "def", "res", "bld"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export interface DeriveStatsInput {
  jobBase: StatBlock;
  /** 직업 내부레벨(상급 = 20) — 인물 InternalLevel이 아니라 이 값이 성장 레벨 수의 정본(전수 실측). */
  jobInternalLevel: number;
  /** 난이도 선택된 인물 오프셋(OffsetN/H/L). */
  personOffset: StatBlock;
  /** 인물 성장률 % (Grow). */
  personGrowth: StatBlock;
  /** 표시 레벨. */
  level: number;
  /** 난이도 선택된 AutoGrowOffset(N/H/L) — 성장 레벨 수 가산. */
  autoGrowOffset?: number;
  /** 스탯 상한(Limit). 지정 시에만 적용. */
  cap?: StatBlock;
}

/** 성장이 적용된 레벨 수. 내부레벨 20 = "20레벨짜리 기본 유닛과 등가" → 19레벨 성장분. */
export function grownLevels(jobInternalLevel: number, level: number, autoGrowOffset = 0): number {
  return Math.max(Math.max(jobInternalLevel - 1, 0) + (level - 1) + autoGrowOffset, 0);
}

/** half-up 반올림 — banker's rounding이면 공개 스탯 전수 일치가 깨진다(실측으로 배제). */
const halfUp = (x: number): number => Math.floor(x + 0.5);

export function deriveStats(input: DeriveStatsInput): StatBlock {
  const levels = grownLevels(input.jobInternalLevel, input.level, input.autoGrowOffset);
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) {
    let value =
      input.jobBase[key] + input.personOffset[key] + halfUp((input.personGrowth[key] * levels) / 100);
    if (input.cap !== undefined) value = Math.min(value, input.cap[key]);
    // 하한 0 — 음수 오프셋 유닛(M002 뤼미에르 실재)의 표시 스탯은 음수일 수 없다(가정, 코퍼스 검증 대상).
    out[key] = Math.max(value, 0);
  }
  return out;
}
