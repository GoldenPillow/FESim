/**
 * 옵코드 인터프리터 — `AIThink$$Processing`(0x1925420) · `ProcessingActive`(0x193AAD0).
 *
 * 슬롯 순서는 `O_Cause → O_Mind → O_Attack → O_Move` **고정**이고, 어느 패스든
 * `Decide`가 나오면 나머지 패스를 전부 건너뛴다. 루틴은 프롤로그/에필로그가 아니라
 * **우선순위순 후보 행동 목록**이다(§1-2).
 */
import type { BattleAction } from "../battle.js";
import { argsOf, resolveValue } from "./cause.js";
import { slotGateOpen } from "./order.js";
import { AI_ACTIVE, AI_CODE, AI_SLOT, AI_VALUE, type AiCommand, type AiSnapshot } from "./types.js";

/** `AIThink.Result` — None = 다음 명령으로, Decide = 행동 확정(나머지 패스 스킵). */
export type ActionResult =
  | { kind: "none" }
  | { kind: "decide"; actions: BattleAction[] }
  | { kind: "deficit"; reason: string };

export const NONE: ActionResult = { kind: "none" };

/** 유닛 1건의 사고 런타임 상태 — `UnitAI.m_Active` 등. */
export interface ThinkRuntime {
  /** `UnitAI.m_Active` — 0 = 비활성. `Trans`가 스테이징하고 `Update`가 반영한다(§4-3). */
  active: number;
  /**
   * `UnitAI.m_aSequence` 치환분 — `AI_ChangeSeq`가 갈아끼운 슬롯별 루틴명(슬롯 번호 → 루틴명).
   * ☠맵 전역 상태다(사고 1회로 끝나지 않는다) — 호출측이 `AiMemory`에 보관해 다음 호출로 넘긴다.
   */
  sequences?: Partial<Record<number, string>>;
}

export interface SlotSource {
  /** 슬롯별 루틴명(`UnitAI.m_aSequence`). */
  name: string | undefined;
  /** dispos CSV 인자 토큰(`UnitAI.m_aValue` 4개). */
  args: readonly string[];
}

/** dispos 사영 → 4슬롯 루틴명·인자. `swapped`가 있으면 그 슬롯의 루틴명을 덮는다(AI_ChangeSeq). */
export function slotsOf(ai: AiSnapshot | undefined, swapped?: Partial<Record<number, string>>): SlotSource[] {
  const base: SlotSource[] = [
    { name: ai?.action, args: argsOf(ai?.actionVal) },
    { name: ai?.mind, args: argsOf(ai?.mindVal) },
    { name: ai?.attack, args: argsOf(ai?.attackVal) },
    { name: ai?.move, args: argsOf(ai?.moveVal) },
  ];
  if (swapped === undefined) return base;
  return base.map((slot, i) => (swapped[i] === undefined ? slot : { ...slot, name: swapped[i] }));
}

export interface OpcodeHandlers {
  /** `AI_ActiveCause`(Code=1) — true면 `Trans`를 스테이징한다. undefined = 미판독(정직 결손). */
  cause(opcode: number, v0: number | undefined, v1: number | undefined, args: readonly string[]): boolean | undefined;
  /** `AI_ResultCause`(Code=2) — 이 패스에선 무동작이지만 미구현 여부는 알려야 한다. */
  resultCause?(opcode: number): boolean | undefined;
  /** `AI_Action`(Code=3). */
  action(opcode: number, v0: number | undefined, v1: number | undefined, args: readonly string[]): ActionResult;
}

/** 무한 재시작 방지 — 원 코드에는 안전장치가 없다(§4-1)지만 이식에서는 순수성을 위해 상한을 둔다. */
const RETRY_LIMIT = 8;

export interface ProcessingInput {
  ai: AiSnapshot | undefined;
  runtime: ThinkRuntime;
  think: number;
  handlers: OpcodeHandlers;
}

export interface ProcessingOutput {
  result: ActionResult;
  /** 미판독 옵코드 사유(있으면 이 유닛은 정직 결손). */
  deficits: string[];
}

/**
 * 한 슬롯의 실행 — `ProcessingActive(order)`.
 * ★직전에 실행된 명령과 `(Code, Mind, v0, v1)`이 전부 같으면 스킵한다(연속 중복 억제).
 */
function processingActive(slot: number, input: ProcessingInput, deficits: string[]): { result: ActionResult; retry: boolean } {
  const source = slotsOf(input.ai, input.runtime.sequences)[slot]!;
  const list: AiCommand[] | undefined =
    source.name === undefined ? undefined : input.ai?.routines?.[source.name];
  if (source.name === undefined || source.name === "") return { result: NONE, retry: false };
  if (list === undefined) {
    deficits.push(`루틴 미탑재: ${source.name}`);
    return { result: NONE, retry: false };
  }
  if (list.length < 1) return { result: NONE, retry: false };

  let retry = false;
  let prev: { code: number; mind: number; v0: number | undefined; v1: number | undefined } | undefined;
  // ActiveCause가 성공하면 여기에 새 Active 상태를 스테이징하고, 루프 끝의 Update가 한 번만 반영한다.
  let staged: number | undefined;

  for (const cmd of list) {
    if (cmd.Code === AI_CODE.end) break;

    // ★Active 게이트(0x193AC38~0x193AC94)
    const a = cmd.Active;
    if (a === AI_ACTIVE.everyTime) {
      /* 무조건 실행 */
    } else if (a === AI_ACTIVE.active) {
      if (input.runtime.active === 0) continue;
    } else if (a === AI_ACTIVE.nonActive) {
      if (input.runtime.active !== 0) continue;
    } else if (input.runtime.active !== a) {
      continue;
    }

    const v0 = resolveValue(cmd.StrValue0, source.args);
    const v1 = resolveValue(cmd.StrValue1, source.args);
    if (v0 === AI_VALUE.skip || v1 === AI_VALUE.skip) continue;
    if (prev !== undefined && prev.code === cmd.Code && prev.mind === cmd.Mind && prev.v0 === v0 && prev.v1 === v1) {
      continue;
    }
    prev = { code: cmd.Code, mind: cmd.Mind, v0, v1 };

    switch (cmd.Code) {
      case AI_CODE.activeCause: {
        const ok = input.handlers.cause(cmd.Mind, v0, v1, source.args);
        if (ok === undefined) {
          deficits.push(`조건 옵코드 미구현: AC ${cmd.Mind} (${source.name})`);
          break;
        }
        // ★판정이 true일 때만 스테이징한다 — false인 행은 덮지 않는다. 그래서 다행 조건이 OR가 된다(§8-2).
        if (ok) staged = cmd.Trans;
        break;
      }
      case AI_CODE.resultCause: {
        const ok = input.handlers.resultCause?.(cmd.Mind);
        if (ok === undefined) deficits.push(`결과조건 옵코드 미구현: RC ${cmd.Mind} (${source.name})`);
        else if (ok) staged = cmd.Trans;
        break;
      }
      case AI_CODE.action: {
        const r = input.handlers.action(cmd.Mind, v0, v1, source.args);
        if (r.kind === "deficit") {
          deficits.push(`${r.reason} (${source.name})`);
          break;
        }
        // ★Decide면 Update를 건너뛰고 즉시 반환한다.
        if (r.kind !== "none") return { result: r, retry: false };
        break;
      }
      case AI_CODE.retry:
        retry = true;
        break;
      case AI_CODE.update:
        if (staged !== undefined) input.runtime.active = staged;
        staged = undefined;
        break;
      case AI_CODE.changeSeq: {
        // ★`cmd.Mind`가 **대상 슬롯 번호**이고 `StrValue0`이 새 루틴명이다(§4-4 — 자기 슬롯이 아니어도 된다).
        //   ProcessingActive에 인라인돼 있어 즉시 반영되며, UpdateFlag.Active만 세운다
        //   ⇒ Update가 **현재 스테이징된 Trans**(없으면 0)를 그대로 써넣는다(B_interp §8).
        const next = cmd.StrValue0;
        if (next === undefined || next === "") break;
        input.runtime.sequences = { ...(input.runtime.sequences ?? {}), [cmd.Mind]: next };
        if (staged === undefined) staged = input.runtime.active;
        break;
      }
      case AI_CODE.changeValue:
        // ☠`cmd.Mind == order`일 때만 동작한다(§4-4). 실데이터(AI_MV_TreasureToEscape)는
        //   Move 슬롯(3)에서 Mind=1을 쓰므로 **무동작이 판독대로의 정답**이다 — 인자 결선은 일어나지 않는다.
        break;
      default:
        break;
    }
  }
  if (staged !== undefined) input.runtime.active = staged;
  return { result: NONE, retry };
}

/**
 * 한 유닛의 사고 — `AIThink$$Processing()`.
 * 각 패스는 `m_Think` 게이트를 통과해야 실행된다(Mind는 >1, Attack은 >2, Move는 >7).
 */
export function processing(input: ProcessingInput): ProcessingOutput {
  const deficits: string[] = [];
  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
    let retry = false;
    for (const slot of [AI_SLOT.cause, AI_SLOT.mind, AI_SLOT.attack, AI_SLOT.move]) {
      if (!slotGateOpen(slot, input.think)) continue;
      const pass = processingActive(slot, input, deficits);
      if (pass.result.kind !== "none") return { result: pass.result, deficits };
      if (pass.retry) {
        retry = true;
        break; // ★AI_Retry는 항상 O_Cause부터 재시작한다.
      }
    }
    if (!retry) break;
  }
  return { result: NONE, deficits };
}
