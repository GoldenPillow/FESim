import { describe, expect, it } from "vitest";
import type { UnitState } from "@fesim/engine";
import { COMMAND_ORDER, availableCommands, type CommandGates } from "../src/lib/commands";

/**
 * 커맨드 메뉴 구성 — 인게임 재현층이다(우리 판단이 아니라 실기 정본을 옮기는 자리).
 * 정본 = `MapUnitCommandMenu.CreateBind`(RVA 0x202BD80)의 `List.Add` 호출 순서.
 * 표시 조건 정본 = 각 `*MenuItem.GetMapAttribute` / `Unit.Can*`.
 * ☠순서가 틀리면 "인게임과 같다"는 요구가 깨지는데 화면을 봐도 알기 어렵다 — 배열로 박제한다.
 */

const gates = (over: Partial<CommandGates> = {}): CommandGates => ({
  hasAttackTarget: false,
  hasStaffTarget: false,
  hasDanceTarget: false,
  hasTradePartner: false,
  hasDestroyTarget: false,
  canVisit: false,
  hasItem: false,
  ...over,
});

const unit = (over: Partial<UnitState> = {}): UnitState =>
  ({
    id: "u0",
    force: 0,
    x: 1,
    y: 1,
    hp: 20,
    stats: { hp: 20, str: 5, mag: 0, dex: 5, spd: 5, lck: 5, def: 5, res: 5, bld: 5 },
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...over,
  }) as UnitState;

describe("커맨드 메뉴 구성 — 실기 순서", () => {
  it("대기는 언제나 있고, 유효 커맨드가 없어도 혼자 남는다", () => {
    // 정본 §2 — FixedMenuItem은 CreateBind에서 항상 마지막이고, 축약 분기에서 유일 항목이 된다.
    expect(availableCommands(unit(), gates())).toEqual(["wait"]);
  });

  it("표시 순서는 실기 CreateBind 호출 순서를 따른다", () => {
    const all = availableCommands(
      unit({
        engage: { count: 3, limit: 3, turnLimit: 3, turn: 0, engaging: false },
        skills: [{ Sid: "SID_チェインガード許可" }],
      }),
      gates({
        hasAttackTarget: true,
        hasStaffTarget: true,
        hasDanceTarget: true,
        hasTradePartner: true,
        hasDestroyTarget: true,
        canVisit: true,
        hasItem: true,
      }),
    );
    // 인게이지(#7) → 공격(#14) → 지팡이(#23) → 춤추기(#24) → 체인가드(#25)
    // → 파괴(#26) → 방문(#27) → 소지품(#34) → 소지품교환(#35) → 대기(#39)
    expect(all).toEqual([
      "engage",
      "attack",
      "staff",
      "dance",
      "guard",
      "destroy",
      "visit",
      "item",
      "trade",
      "wait",
    ]);
    // 목록은 언제나 정본 순서의 부분수열이다.
    expect(all).toEqual(COMMAND_ORDER.filter((c) => all.includes(c)));
  });

  it("행동을 마친 유닛에게는 아무 커맨드도 없다", () => {
    expect(availableCommands(unit({ acted: true }), gates({ hasAttackTarget: true }))).toEqual([]);
  });
});

/**
 * ★인게이지 규칙 — 정본 §7-1.
 * 공격은 기술로 **대체되지 않고 병존**하고(`AttackMenuItem.GetMapAttribute`가 Engaging 비트를 안 읽는다),
 * 기술은 `GetEngageAttack()`이 null이면 통째로 사라진다(사용자 실기 스크린샷이 그 상태였다).
 */
describe("인게이지 상태의 메뉴", () => {
  const engaging = (over: Partial<UnitState> = {}) =>
    unit({ engage: { count: 3, limit: 3, turnLimit: 3, turn: 1, engaging: true }, ...over });

  it("인게이지 중에는 인게이지 개시 커맨드가 사라진다", () => {
    const cmds = availableCommands(engaging(), gates({ hasAttackTarget: true }));
    expect(cmds).not.toContain("engage");
  });

  it("게이지가 만충이 아니면 인게이지 개시가 없다", () => {
    const half = unit({ engage: { count: 1, limit: 3, turnLimit: 3, turn: 0, engaging: false } });
    expect(availableCommands(half, gates())).not.toContain("engage");
  });

  it("★기술이 없으면 기술 항목이 통째로 빠진다 — 공격은 그대로 남는다", () => {
    const cmds = availableCommands(engaging(), gates({ hasAttackTarget: true, hasItem: true }));
    expect(cmds).not.toContain("engageArt");
    expect(cmds).toEqual(["attack", "item", "wait"]); // 실기 스크린샷과 같은 구성
  });

  it("★기술이 있으면 공격 앞에 선다 — 병존이지 대체가 아니다", () => {
    const art = { sid: "SID_スターラッシュ", name: "스타 러시", skills: [], cost: 1 };
    const cmds = availableCommands(engaging({ engageArt: art }), gates({ hasAttackTarget: true }));
    expect(cmds).toEqual(["engageArt", "attack", "wait"]);
  });

  it("인게이지 중이 아니면 기술은 뜨지 않는다(엔진 CanEngageAttack 전제)", () => {
    const art = { sid: "SID_スターラッシュ", skills: [], cost: 1 };
    const idle = unit({ engageArt: art, engage: { count: 3, limit: 3, turnLimit: 3, turn: 0, engaging: false } });
    expect(availableCommands(idle, gates({ hasAttackTarget: true }))).not.toContain("engageArt");
  });
});
