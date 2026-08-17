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

/**
 * 지팡이 소지 항목 — items.json Kind=7의 전투 소비분 스냅숏.
 * power는 연성·각인·신기연성 합산 후 값(CalcRodHit 0x2473E10이 이 순서로 합성 — il2cpp/EXP_CHAIN_ENGAGE §7).
 */
export interface StaffItem {
  power: number;
  rangeMin: number;
  rangeMax: number;
  /** 잔여 사용 횟수(items.json Endurance 출발) — 사용마다 1 감소, 0이면 사용 불가. */
  uses: number;
  /** items.json RodType — 2 = 회복(현행 배선 범위 — 그 외는 reduce가 정직하게 거부한다). */
  rodType: number;
  /** items.json RodExp — 杖経験計算의 杖経験値 입력. */
  rodExp: number;
  name?: string;
}

/**
 * 사용형 아이템(Kind=10, AddTarget != 0) 소지 항목 — 傷薬류의 전투 소비분 스냅숏.
 * ☠목록엔 사용형 전부를 싣는다(미배선 포함) — 필터를 넓힐 때 item 인덱스 계약이 흔들리면 기보가 깨진다.
 */
export interface ConsumableItem {
  /** items.json AddType — 2 = 범위 회복(배선 범위). 그 외는 reduce가 정직하게 거부한다. */
  addType: number;
  /** items.json AddPower — 회복량 등 효과 수치(고정값 — 능력치 무관). */
  power: number;
  /** items.json AddRange — 자신 중심 효과 반경(맨해튼). */
  range: number;
  /** 잔여 사용 횟수(items.json Endurance 출발) — 사용마다 1 감소. */
  uses: number;
  name?: string;
}

/**
 * 인게이지 게이지 상태 — 정본 = il2cpp/EMBLEM_ENGAGE §3(전부 코드 확정).
 * limit·turnLimit 산출은 데이터층 소관: limit = god.EngageCount - 성장표 Flag4(絆20) - 스킬 Flag bit42,
 * turnLimit = 3 + 성장표 Flag2(絆11, リュール만 20). 초기 count = min(7, limit).
 */
export interface EngageState {
  count: number;
  limit: number;
  /** 인게이지 지속 페이즈 수(자기 페이즈 시작마다 1 소비). */
  turnLimit: number;
  /** 인게이지 경과 턴 — engaging일 때만 의미. */
  turn: number;
  engaging: boolean;
}

export type BattleEvent =
  | { type: "strike"; attacker: string; defender: string; kind: StrikeKind; hit: boolean; crit: boolean; damage: number; hpAfter: number }
  | { type: "heal"; unit: string; target: string; amount: number; hpAfter: number }
  /** 재행동 부여(춤) — 대상의 행동·이동 창이 새로 열린다. */
  | { type: "refresh"; unit: string }
  /** 인게이지 게이지 변화 — count = 변화 후 절대값(절대 재생이 이 값을 그대로 쓴다). */
  | { type: "charge"; unit: string; count: number }
  | { type: "engage"; unit: string }
  | { type: "disengage"; unit: string }
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
  /** staff = 유닛 staves 목록 인덱스(부재 = 0). 대상은 같은 군 — 회복·보조는 교전이 아니다. */
  | { type: "staff"; unit: string; target: string; staff?: number }
  /** item = 유닛 consumables 목록 인덱스(부재 = 0). 대상 지정 없음 — 효과 범위는 아이템이 소유(자신 중심). */
  | { type: "item"; unit: string; item?: number }
  /** 춤(재행동 부여) — 대상 = 행동 완료한 인접 아군. 시전 자격 = SID_踊り 계열 보유(엔진 canDance). */
  | { type: "dance"; unit: string; target: string }
  /** 인게이지 발동 — 만충 필요, 행동 소모 없음(발동 후 이동·공격 가능). ☠교환 후에는 불가(실기 판별). */
  | { type: "engage"; unit: string }
  /**
   * 교환 — 인접 아군과 소지품 1점 이동(행동 무소모라 연속 액션 = 인게임 다중 이동).
   * kind·index = 주는 쪽 목록 채널·인덱스, back = 상대 → 자신 방향. 이동 창 소진 + 인게이지 발동 봉쇄.
   */
  | { type: "trade"; unit: string; target: string; kind: "weapon" | "staff" | "consumable"; index: number; back?: boolean }
  | { type: "wait"; unit: string }
  | { type: "endPhase" };
