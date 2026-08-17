/**
 * 적턴 진행 순서 — `AIOrder`(AI_ENGINE §7).
 *
 * ★행동 순서 결정 경로에는 **난수가 하나도 없다**(EnumeratePriority → SortDescend → GetUnit).
 * 동점은 맵 열거 순서로 갈린다(안정 정렬).
 */
import { hasBadState, BAD_STATE, type UnitState } from "../battle.js";
import { AI_THINK } from "./types.js";

/**
 * `<EnumeratePriority>b__62_0` 정렬 키(0x1937EDC~0x1937F50).
 * `512*AI_Priority + 256*enchant + 16 - clamp(max(Removable), 0, 99)`.
 * 1점 = 512, 인챈트 가능 = 256, Removable 1당 -1 → **하위항이 상위 티어를 절대 역전하지 못한다**.
 */
export function aiPriorityKey(priority: number, enchant: boolean, removable: number): number {
  return 512 * priority + (enchant ? 256 : 0) + 16 - Math.min(Math.max(removable, 0), 99);
}

/** 이 유닛이 지금 행동 가능한가 — `Unit.CanAct` 대응(기절·행동완료·사망 제외). */
export function aiCanAct(u: UnitState): boolean {
  return !u.dead && !u.acted && !hasBadState(u, BAD_STATE.stun);
}

/**
 * Priority 페이즈(순번 0) 큐 — `EnumeratePriority` + `SortDescend`.
 * ☠**`AI_Priority < 100`인 유닛은 아예 등록되지 않는다**(0x1937BA8 `cmp w24,#0x64 ; b.lo`).
 * 관측 분포의 0·20·50·80·90은 "최하위"가 아니라 **제외**이고, 110 이상만 선행 행동권을 갖는다.
 */
export function aiPriorityQueue(units: readonly UnitState[], force: number): UnitState[] {
  const listed = units
    .filter((u) => u.force === force && aiCanAct(u) && (u.ai?.priority ?? 0) >= 100)
    .map((u, i) => ({ u, i, key: aiPriorityKey(u.ai?.priority ?? 0, false, 0) }));
  // 안정 내림차순 — 동점은 열거 순서(맵 순서) 유지. ☠난수 개입 없음.
  listed.sort((a, b) => b.key - a.key || a.i - b.i);
  return listed.map((e) => e.u);
}

/** 그 외 페이즈의 유닛 큐 — `>= 100` 게이트 없이 전 행동가능 유닛(§7-3 말미). */
export function aiPhaseQueue(units: readonly UnitState[], force: number): UnitState[] {
  return units.filter((u) => u.force === force && aiCanAct(u));
}

/** `AIOrder` 통상 적턴 페이즈 테이블 13단(`aFunc`, .cctor 0x1936C70). */
export interface AiPhaseStep {
  name: string;
  /** 이 단계의 `AIThink.m_Think` — 슬롯 게이트(Mind>1 · Attack>2 · Move>7)의 입력. */
  think?: number;
  /** 유닛 큐 종류. `none` = 유닛을 돌지 않는 단계. */
  queue: "priority" | "all" | "none";
  /** 이 단계부터 제자리 대기(Idle)를 허용한다(`StaticAllowIdle`). */
  allowIdle?: boolean;
}

export const AI_PHASES: readonly AiPhaseStep[] = [
  { name: "StaticPriority", think: AI_THINK.move, queue: "priority" },
  { name: "StaticCause", think: AI_THINK.cause, queue: "all" },
  { name: "StaticMind", think: AI_THINK.mind, queue: "all" },
  // StaticUpdateTarget = AICannon.Update(유닛 큐 없음) · StaticAttackCrossfire = 본문이 ret 단독 = 무동작
  { name: "StaticUpdateTarget", queue: "none" },
  { name: "StaticAttackCrossfire", queue: "none" },
  { name: "StaticAttackLongRange", think: AI_THINK.attackLongRange, queue: "all" },
  { name: "StaticAttackHigh", think: AI_THINK.attackHigh, queue: "all" },
  { name: "StaticAttackMiddle", think: AI_THINK.attackMiddle, queue: "all" },
  { name: "StaticAttackLow", think: AI_THINK.attackLow, queue: "all" },
  { name: "StaticMove", think: AI_THINK.move, queue: "all" },
  { name: "StaticAllowIdle", queue: "none", allowIdle: true },
  { name: "StaticMove2", think: AI_THINK.move, queue: "all", allowIdle: true },
  { name: "StaticTurnEnd", queue: "none" },
] as const;

/**
 * 액션 등급 게이트 — 걸러지는 것은 유닛이 아니라 **액션**이다(§7-2).
 * `AT_MiddleLow`(1)는 AttackHigh(5)에서 차단, `AT_Low`(2)는 High·Middle에서 차단.
 * Think 3(Attack)·4(AttackLongRange)에서는 세 등급 모두 통과한다(`sub w8,#5`가 언더플로).
 */
export function attackTierAllowed(opcode: number, think: number): boolean {
  if (opcode === 1) return think !== AI_THINK.attackHigh;
  if (opcode === 2) return !(think - AI_THINK.attackHigh >= 0 && think - AI_THINK.attackHigh < 2);
  return true;
}

/**
 * 슬롯 게이트(§4-1) — Mind는 `m_Think > 1`, Attack은 `> 2`, Move는 `> 7`.
 * `AI.Instance.m_Order.m_MoveOver != 0`이면 게이트를 우회한다(엔진은 항상 0 = 미배선).
 */
export function slotGateOpen(slot: number, think: number): boolean {
  if (slot === 0) return true;
  if (slot === 1) return think > 1;
  if (slot === 2) return think > 2;
  return think > 7;
}
