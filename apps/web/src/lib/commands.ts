import { canChainGuard, hasChainGuardSkill, type UnitState } from "@fesim/engine";

/**
 * 유닛 커맨드 메뉴의 구성 — ★재현층이다(우리 판단이 아니라 인게임 정본을 옮긴다).
 *
 * 정본 = `MapUnitCommandMenu.CreateBind`(RVA 0x202BD80) 본문의 `List.Add` 호출 순서.
 * 그 39항목 중 **우리 엔진에 대응 액션이 있는 것만** 남긴 것이 COMMAND_ORDER다.
 * 라벨·설명문 정본 = `residentmenu.msbt`의 `MID_MENU_*` / `MID_MENU_HELP_*`.
 *
 * ☠엔진에 없는 커맨드(제압·포격·문 열쇠·인게이지+·이탈·대화·화톳불·수송대·보물 상자)는
 * 목록에 넣지 않는다(2026-08-19 사용자 결정 = 숨긴다).
 * ☠`move`·`setup`·`endPhase`는 인게임 유닛 커맨드가 아니다 — 메뉴에 올리면 안 된다.
 */
export type CommandId =
  | "engage"
  | "engageArt"
  | "attack"
  | "staff"
  | "dance"
  | "guard"
  | "destroy"
  | "visit"
  | "item"
  | "trade"
  | "wait";

/** 실기 표시 순서(괄호 = CreateBind에서의 항목 번호). 목록은 언제나 이 배열의 부분수열이다. */
export const COMMAND_ORDER: readonly CommandId[] = [
  "engage", // #7  EngageStartMenuItem
  "engageArt", // #8~13 Engage*MenuItem (Mind 일치로 정확히 하나)
  "attack", // #14 AttackMenuItem
  "staff", // #23 RodMenuItem
  "dance", // #24 DanceMenuItem
  "guard", // #25 GuardMenuItem
  "destroy", // #26 DestroyMenuItem
  "visit", // #27 VisitMenuItem
  "item", // #34 ItemMenuItem
  "trade", // #35 TradeMenuItem
  "wait", // #39 FixedMenuItem — 항상 마지막
];

/**
 * 대상 열거가 필요한 게이트 — BoardIsland가 이미 계산해 둔 결과를 받는다.
 * ☠여기서 다시 열거하지 않는다: 사거리·대상 판정의 정본은 엔진이고, UI에 복제하면 두 벌이 갈라진다.
 */
export interface CommandGates {
  hasAttackTarget: boolean;
  hasStaffTarget: boolean;
  hasDanceTarget: boolean;
  hasTradePartner: boolean;
  hasDestroyTarget: boolean;
  canVisit: boolean;
  hasItem: boolean;
}

/** 인게이지 개시 = 게이지 만충 + 미인게이지. 정본 `Unit.CanEngageStart`(0x1A273E0) → `CanEngageImpl`. */
const canEngageStart = (u: UnitState): boolean =>
  u.engage !== undefined &&
  !u.engage.engaging &&
  u.engage.limit > 0 &&
  u.engage.count >= u.engage.limit &&
  u.traded !== true; // 교환 후 발동 불가(엔진 게이트와 동건)

/**
 * 인게이지 기술 = **인게이지 중 + 기술 보유**.
 * 정본 사슬(§7-1-1) = `GetEngageAttack()`이 null이면 `CanEngageAttack` false → `GetEngageMind` 0 →
 * 6종 어느 `Mind`와도 안 맞아 **전부 메뉴에서 빠진다**. 사용자 실기 스크린샷이 정확히 그 상태였다.
 * ☠게이지 비용은 여기서 안 본다 — 실기도 `CanEngageAttack`만 보고, 부족분은 실행이 거부한다.
 */
const canEngageArt = (u: UnitState): boolean =>
  u.engage?.engaging === true && u.engageArt !== undefined;

export function availableCommands(unit: UnitState, gates: CommandGates): CommandId[] {
  // 행동을 마쳤으면 커맨드가 없다(공통 선행 게이트 assertActable — battle.ts:1009).
  // ☠대기조차 없다: 이미 행동이 끝난 유닛에게 "행동을 마친다"는 뜻이 없다.
  if (unit.acted || unit.dead) return [];

  const on: Record<CommandId, boolean> = {
    engage: canEngageStart(unit),
    engageArt: canEngageArt(unit),
    // ★공격은 인게이지 기술로 **대체되지 않는다**(§7-1: AttackMenuItem이 Engaging 비트를 읽지 않는다).
    attack: gates.hasAttackTarget,
    staff: gates.hasStaffTarget,
    dance: gates.hasDanceTarget,
    guard: hasChainGuardSkill(unit) && canChainGuard(unit),
    destroy: gates.hasDestroyTarget,
    visit: gates.canVisit,
    item: gates.hasItem,
    trade: gates.hasTradePartner,
    wait: true, // 언제나 가능 — 다른 항목이 하나도 없어도 혼자 남는다(§2)
  };
  return COMMAND_ORDER.filter((id) => on[id]);
}
