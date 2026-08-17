/**
 * 적턴 AI 층 — 타입·옵코드 사전.
 *
 * 정본 = `~/fesim_data/extracted/il2cpp/AI_ENGINE.md`(FE Engage 5.0.0 IL2CPP 판독).
 * ☠판독 문서에 없는 규칙은 여기에 넣지 않는다 — 미판독은 `AiDeficit`으로 노출한다.
 * 게임 좌표계는 (x, z), 엔진은 (x, y)다 — 이 층은 전부 (x, y)로 쓴다(z ↔ y).
 */

/** ai.xml 한 행 = `App.AIData`(dump.cs:566503). 원문 무손실 사영(data/fe17/tables/ai.json). */
export interface AiCommand {
  /** `AIThink.Command`: -1 EveryTime · -2 NonActiive(비활성 전용) · 0 Active · 1,2 서브상태. */
  Active: number;
  /** `AIConst.Code`: 0 End · 1 ActiveCause · 2 ResultCause · 3 Action · 4 Retry · 5 Update · 6 ChangeSeq · 7 ChangeValue. */
  Code: number;
  /** 옵코드 번호. ☠Code 6/7에서는 옵코드가 아니라 **대상 슬롯 번호**다(§4-4). */
  Mind: number;
  StrValue0?: string;
  StrValue1?: string;
  /** 조건 성공 시 `UnitAI.m_Active`에 쓸 새 상태(§4-3). -128은 데이터측 자리표시일 뿐 특수 분기가 아니다. */
  Trans: number;
}

/** dispos AI 사영 + 이 유닛이 참조하는 루틴 스냅숏(SkillRow 슬림 사영 관례). */
export interface AiSnapshot {
  action?: string;
  actionVal?: string;
  mind?: string;
  mindVal?: string;
  attack?: string;
  attackVal?: string;
  move?: string;
  moveVal?: string;
  /** 突撃 / 攻撃 / 慎重 원문. 빈 값은 突撃으로 떨어진다(`ReplaceBattleRate` 0x1CFB8E0). */
  battleRate?: string;
  priority?: number;
  bandNo?: number;
  healRateA?: number;
  healRateB?: number;
  moveLimit?: string;
  /** `DisposData.AIFlags` 원값(dump.cs:592992) — 비트는 `AI_FLAG` 참조. */
  flag?: number;
  /** 유닛이 쓰는 4슬롯 루틴만 담은 표(전체 141루틴을 아일랜드에 반입하지 않는다). */
  routines?: Record<string, AiCommand[]>;
}

/** `AIValue.Order` — 슬롯 번호이자 실행 순서(§4-1 고정 순서). */
export const AI_SLOT = { cause: 0, mind: 1, attack: 2, move: 3 } as const;
export type AiSlot = (typeof AI_SLOT)[keyof typeof AI_SLOT];

/** `AIConst.Code`. */
export const AI_CODE = {
  end: 0,
  activeCause: 1,
  resultCause: 2,
  action: 3,
  retry: 4,
  update: 5,
  changeSeq: 6,
  changeValue: 7,
} as const;

/** `AIThink.Command` — `Active` 열의 게이트 값(§4-2). */
export const AI_ACTIVE = { everyTime: -1, nonActive: -2, active: 0 } as const;

/** `AIValue` 특수값 — V_Default/-1, V_Max/-2, V_Skip/-3, V_0..V_3 = -4..-7. */
export const AI_VALUE = { default: -1, max: -2, skip: -3, arg0: -4 } as const;

/** `AIThink.Think` — 페이즈가 세팅하는 사고 단계. 슬롯 게이트(Mind>1 · Attack>2 · Move>7)의 입력. */
export const AI_THINK = {
  cause: 1,
  mind: 2,
  attack: 3,
  attackLongRange: 4,
  attackHigh: 5,
  attackMiddle: 6,
  attackLow: 7,
  move: 8,
} as const;

/** `DisposData.AIFlags` 비트(dump.cs:592992). */
export const AI_FLAG = {
  notActivateByAttacked: 1,
  dummy: 2,
  zeroAttack: 4,
  heal: 8,
  /** 평가함수의 브레이크 항 게이트(`ThinkBreak`) — 꺼져 있으면 BRK 항이 죽는다(§8-5). */
  break: 16,
  /** 평가함수의 연계공격 기대치 게이트(`ThinkChain`). */
  chain: 32,
  equipShortAfterLongRange: 64,
  moveBreak: 128,
  engageAttackOnce: 256,
} as const;

/** 조건 옵코드 `AC_*`(Code=1) — §3 옵코드 사전. */
export const AC = {
  everyTime: 0,
  attackRange: 1,
  attackRangeExcludePerson: 2,
  bandRange: 3,
  bandRangeEvenTurn: 4,
  bandRangeOddTurn: 5,
  bandRangeExcludePerson: 6,
  bandRangeExcludeFriend: 7,
  healRange: 8,
  areaEnemy: 9,
  turn: 10,
  flagTrue: 11,
  flagFalse: 12,
  doneHeal: 13,
  interferenceRange: 14,
  interferenceRangeExcludePerson: 15,
  bandRangeExcludeSelf: 16,
} as const;

/** 본체 옵코드 `Action`(Code=3) 중 이 층이 다루는 것 — §3. */
export const ACT = {
  attackDefault: 0,
  attackMiddleLow: 1,
  attackLow: 2,
  attackHero: 3,
  attackPerson: 4,
  attackExcludePerson: 5,
  attackExcludeBand: 6,
  attackJob: 7,
  attackJobNearestPosition: 8,
  attackForce: 9,
  attackPriorItem: 10,
  attackExcludePerson2: 14,
  rodHeal: 20,
  healDefault: 40,
  healMiddleLow: 41,
  healNearingHero: 42,
  mindTreasure: 61,
  mindBreakDown: 65,
  mindEscape: 63,
  mindEscapeSlow: 64,
  mindTorch: 70,
  mindGuard: 71,
  mindGuardBattleScore: 72,
  mindGuardPerson: 73,
  mindGuardNoMove: 74,
  moveIdle: 81,
  moveAttackRange: 82,
  moveAttackRangeSide: 83,
  moveAttackRangeExcludePerson: 84,
  moveAttackRangeIgnore: 85,
  moveWeakRange: 86,
  moveWeakRangeSide: 87,
  movePerson: 90,
  movePosition: 91,
  moveTreasure: 94,
  moveEscape: 96,
  moveBreakDown: 100,
  moveAttackRangeExcludePerson2: 109,
} as const;

/** `AIThink.AttackFlag`(dump.cs:567931) — `GetAttackPosition`이 소비하는 16비트(§5-A-7). */
export const ATTACK_FLAG = {
  side: 1,
  nearest: 2,
  aheadIgnore: 4,
  scoreExpectation: 32,
  interferenceHighMagic: 128,
  interferenceLowMagic: 256,
  break: 512,
  chain: 1024,
  magicOnly: 2048,
  chainAttackCount: 4096,
  pierceMultiple: 8192,
  interferenceRange: 16384,
  equipSkillMultiple: 32768,
} as const;

/** `UnitAI.BattleRate` — 스코어 비트 레이아웃을 통째로 고르는 값(§5-1). */
export const BATTLE_RATE = { rush: 0, attack: 1, chariness: 2 } as const;
export type BattleRate = (typeof BATTLE_RATE)[keyof typeof BATTLE_RATE];

/** `AI_BattleRate` 원문 → 레이아웃. 빈 값·미지 문자열은 Rush(`ReplaceBattleRate` 0x1CFB8E0). */
export function battleRateOf(raw: string | undefined): BattleRate {
  if (raw === "攻撃") return BATTLE_RATE.attack;
  if (raw === "慎重") return BATTLE_RATE.chariness;
  return BATTLE_RATE.rush;
}

/**
 * 정직 결손 1건 — 몰래 대기 처리하지 않고 사유를 노출한다.
 * ☠wait 강하도 오재현이다. 결손 유닛은 행동하지 않고 여기에 기록된다.
 */
export interface AiDeficit {
  unit: string;
  /**
   * 결손 종류. `routine` = 루틴 미탑재 · `opcode` = 옵코드 미구현 · `data` = 스냅숏 부재 ·
   * `engine` = AI가 낸 액션을 reduce가 거부(합법성 표류 — 진행 불가라 제외됨).
   */
  kind: "routine" | "opcode" | "data" | "engine";
  /** 사람이 읽을 사유(어느 루틴·옵코드가 없는지). */
  reason: string;
}
