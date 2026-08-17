/**
 * 전투 어휘 — 엔진이 아니라 shared가 소유한다: .eph 기보 스키마가 행동·이벤트를 담으므로
 * 여기 두지 않으면 shared → engine 역방향 의존이 생긴다(의존은 단방향으로 유지).
 * 엔진(packages/engine)은 이 타입들을 재수출하므로 소비자 import 경로는 바뀌지 않는다.
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

export type Difficulty = "n" | "h" | "l";

export type StrikeKind = "attack" | "counter" | "followUp" | "counterFollowUp" | "chain";

/** 전투 계산용 무기 수치 — 원 소유는 engine/formula/combat이었으나 setup 스냅숏이 담게 되며 이사. */
export interface CombatantWeapon {
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid?: number;
  dodge?: number;
  magic?: boolean;
  /**
   * 특효 배율(武器特効) — 평시 1. ☠발동 시 값은 2가 아니라 **3**이다(`SID_邪竜特効`만 2).
   * 정본(BattleDetail.CalcAttack 0x1E744E8~): 공격자 스킬의 `Efficacy` 마스크 ∩ (대상 person|job `Attrs`)
   * ∖ 대상 `EfficacyIgnore`가 비지 않으면, 걸린 스킬들의 `EfficacyValue` **최댓값**(합산 아님).
   * 곱해지는 곳은 `攻撃力計算 = ユニット攻撃力 + 武器攻撃力 * 武器特効` 한 곳뿐 — **무기 위력에만** 곱한다.
   * 판정 배선은 아직 없다(선행 = Attrs·Efficacy 마스크를 유닛 데이터에 싣기) — 지금은 주입값을 그대로 쓴다.
   */
  effective?: number;
}

export interface BattleWeapon extends CombatantWeapon {
  rangeMin: number;
  rangeMax: number;
  /** items.json Kind — 상성 판정의 입력. */
  kind: number;
  name?: string;
}

/** skills.json 행 원형 — setup 스냅숏(장착 스킬 diff)이 행 그대로를 싣는다. */
export interface SkillRow {
  Sid: string;
  Timing?: number;
  /** 발동 필터 — 이 전투를 건 쪽에서만(1) / 걸린 쪽에서만(2) / 무관(0). */
  Stand?: number;
  /** 발동 필터 — 이번 타격에서 때리는 쪽만(1) / 맞는 쪽만(2) / 무관(0). */
  Action?: number;
  Condition?: string;
  ActNames?: string[];
  ActOperations?: string[];
  ActValues?: string[];
  GiveSids?: string[];
  GiveTarget?: number;
  /** 재이동(SID_再移動*)에서는 이동 칸수 — 공식 도움말 "행동 후 N칸"과 일치(실측). */
  Power?: number;
  Target?: number;
  RangeI?: number;
  RangeO?: number;
  [key: string]: unknown;
}

export type BattleEvent =
  | { type: "strike"; attacker: string; defender: string; kind: StrikeKind; hit: boolean; crit: boolean; damage: number; hpAfter: number }
  | { type: "break"; unit: string }
  | { type: "breakRelease"; unit: string }
  | { type: "death"; unit: string }
  | { type: "exp"; unit: string; amount: number; total: number }
  | { type: "levelUp"; unit: string; level: number; gains: Partial<StatBlock> }
  | { type: "phase"; phase: number; turn: number }
  | { type: "outcome"; outcome: "victory" | "defeat" };

export type BattleAction =
  | { type: "move"; unit: string; x: number; y: number }
  /** weapon = 유닛 weapons 목록 인덱스 — 지정 시 그 무기로 장비 전환 후 판정(부재 = 현 장비). 기보 재현 계약의 일부. */
  | { type: "attack"; unit: string; target: string; weapon?: number }
  | { type: "wait"; unit: string }
  | { type: "endPhase" };
