/**
 * 적턴 AI 층 — "다음 행동 1건을 고르는 순수 함수".
 *
 * ☠AI는 `reduce`를 호출해 액션을 만들지 않는다. 여기서는 액션만 고르고, 실행은 호출측이 `reduce`로 한다.
 * 난수는 **전투 RNG와 별도 스트림**(`Random.System`)이다 — AI_ENGINE §7-4·§12.
 * 미판독 옵코드는 몰래 대기 처리하지 않고 `deficits`로 노출한다(☠wait 강하도 오재현이다).
 */
import type { BattleAction, GameState, RandomSource, SupportEffects, UnitState } from "../battle.js";
import type { Calculator } from "../formula/calculator.js";
import { evaluateCause, type CauseContext } from "./cause.js";
import {
  attackTo,
  guardTo,
  healMindTo,
  moveAttackRange,
  mindTorch,
  mindBreakDown,
  mindEscape,
  mindTreasure,
  moveBreakDown,
  moveEscape,
  moveIdle,
  mindVillage,
  moveHero,
  movePerson,
  movePosition,
  rodHealTo,
  rodInterferenceTo,
  type HandlerContext,
} from "./handlers.js";
import { NONE, processing, type ActionResult, type ThinkRuntime } from "./interpreter.js";
import type { AiTraceSink } from "./attack.js";
import type { AiReasoning } from "@fesim/shared";
import { AI_PHASES, aiCanAct, aiPhaseQueue, aiPriorityQueue, attackTierAllowed } from "./order.js";
import { bandMembers, isClever } from "./unit.js";
import { AC, ACT, battleRateOf, BATTLE_RATE, type AiDeficit } from "./types.js";

/** AI 런타임 기억 — 순수 함수 계약을 지키려고 호출측이 들고 다음 호출에 되돌려준다. */
export interface AiMemory {
  /** `UnitAI.m_Active` 래치 — 한 번 기동한 유닛은 조건이 풀려도 활성 상태를 유지한다(§4-3). */
  active: Record<string, number>;
  /** `AIThink[+0x50]` — 표적별 "이미 노린 아군 수"(이동 스코어의 분산 항). */
  targeted: Record<string, number>;
  /**
   * ☠**진행 불가로 제외된 유닛** — id → 사유.
   * 소비측이 "이 결정을 넣었는데 국면이 안 변했다"를 감지하면 여기에 등재하고, 그 뒤로는 건너뛴다.
   * 없으면 같은 국면 → 같은 액션 → 무한 재평가가 되어 **페이즈가 영영 안 닫힌다**(m001 보스 실발현).
   */
  skipped: Record<string, string>;
  /**
   * `UnitAI.m_aSequence` 치환분 — `AI_ChangeSeq`가 갈아끼운 (유닛 → 슬롯 → 루틴명).
   * 맵 전역 상태라 사고 1회로 끝나지 않는다(§4-4).
   */
  sequences: Record<string, Partial<Record<number, string>>>;
}

export const emptyAiMemory = (): AiMemory => ({ active: {}, targeted: {}, skipped: {}, sequences: {} });

export interface AiDecision {
  /** 행동을 확정한 유닛. 없으면 이 페이즈에 더 낼 행동이 없다. */
  unit?: string;
  /** 호출측이 순서대로 `reduce`에 넣을 액션(예: 이동 → 공격). 비면 행동 없음. */
  actions: BattleAction[];
  /** 정직 결손 — 이 유닛들은 건너뛰었고, 사유가 여기 있다. */
  deficits: AiDeficit[];
  /** 갱신된 활성 래치(다음 호출에 그대로 넘긴다). */
  memory: AiMemory;
  /** 결손을 뺀 전 유닛이 행동을 마쳤다 = `endPhase` 시점. */
  done: boolean;
  /** 왜 이 수인가 — 채택 스코어·후보·기각 사유(행동을 확정했을 때만). 소비는 표시층이 한다. */
  reasons?: AiReasoning;
}

/** 후보 덤프 상한 — e004처럼 유닛이 많은 판에서 전량을 실으면 폭발한다(F2 §6-2). */
const TRACE_CANDIDATE_LIMIT = 5;

/** `AttackTo`(0x1945DB0)로 들어가는 공격 옵코드 — 등급 3종 + 표적 필터형. */
const ATTACK_OPCODES = new Set<number>([
  ACT.attackDefault,
  ACT.attackMiddleLow,
  ACT.attackLow,
  ACT.attackHero,
  ACT.attackPerson,
  ACT.attackExcludePerson,
  ACT.attackExcludeBand,
  ACT.attackJob,
  ACT.attackForce,
  ACT.attackPriorItem,
  ACT.attackExcludePerson2,
]);

/** `ActionMoveAttackRange`(0x194E0D0)로 들어가는 이동 옵코드. */
const MOVE_RANGE_OPCODES = new Set<number>([
  ACT.moveAttackRange,
  ACT.moveAttackRangeSide,
  ACT.moveAttackRangeExcludePerson,
  ACT.moveAttackRangeIgnore,
  ACT.moveWeakRange,
  ACT.moveWeakRangeSide,
  ACT.moveAttackRangeExcludePerson2,
]);

const GUARD_OPCODES = new Set<number>([
  ACT.mindGuard,
  ACT.mindGuardBattleScore,
  ACT.mindGuardPerson,
  ACT.mindGuardNoMove,
]);

export function createAi(calc: Calculator, supportEffects?: SupportEffects) {
  function actionFor(opcode: number, ctx: HandlerContext, v0: number | undefined): ActionResult {
    if (ATTACK_OPCODES.has(opcode)) {
      if (!attackTierAllowed(opcode, ctx.think)) return NONE; // 액션 등급 게이트(§7-2)
      return attackTo(ctx, opcode);
    }
    if (MOVE_RANGE_OPCODES.has(opcode)) return moveAttackRange(ctx, opcode, v0);
    if (opcode === ACT.moveIdle) return moveIdle();
    if (opcode === ACT.mindTorch) return mindTorch();
    if (opcode === ACT.mindTreasure || opcode === ACT.moveTreasure) return mindTreasure(ctx);
    if (opcode === ACT.moveEscape) return moveEscape(ctx);
    // ☠MI_EscapeSlow(64)는 movePower가 GetMovePowerSlow로 바뀌는데 그 산식이 미판독이라
    //   MI_Escape와 같이 취급한다(장부 ai.action-handlers에 근사로 명기).
    if (opcode === ACT.mindEscape || opcode === ACT.mindEscapeSlow) return mindEscape(ctx);
    if (opcode === ACT.movePosition) return movePosition(ctx);
    if (opcode === ACT.mindVillage) return mindVillage(ctx);
    if (opcode === ACT.moveHero) return moveHero(ctx);
    if (opcode === ACT.movePerson) return movePerson(ctx);
    if (opcode === ACT.mindBreakDown) return mindBreakDown(ctx);
    if (opcode === ACT.moveBreakDown) return moveBreakDown(ctx);
    if (opcode === ACT.rodHeal) return rodHealTo(ctx);
    if (opcode >= ACT.rodInterference && opcode <= ACT.rodInterferenceFrequency) return rodInterferenceTo(ctx, opcode);
    if (GUARD_OPCODES.has(opcode)) return guardTo(ctx);
    if (opcode === ACT.healMiddleLow || opcode === ACT.healDefault) return healMindTo(ctx, opcode);
    return { kind: "deficit", reason: `행동 옵코드 미구현: ${opcode}` };
  }

  /** 한 유닛의 사고 1회. */
  function think(
    state: GameState,
    actor: UnitState,
    thinkLevel: number,
    allowIdle: boolean,
    rng: RandomSource,
    memory: AiMemory,
    trace: AiTraceSink,
  ) {
    const runtime: ThinkRuntime = {
      active: memory.active[actor.id] ?? 0,
      ...(memory.sequences[actor.id] !== undefined ? { sequences: memory.sequences[actor.id] } : {}),
    };
    const causeCtx: CauseContext = { state, unit: actor, args: [] };
    const out = processing({
      ai: actor.ai,
      runtime,
      think: thinkLevel,
      handlers: {
        cause: (opcode, v0, v1, args) => evaluateCause(opcode, v0, v1, { ...causeCtx, args }),
        action: (opcode, v0, _v1, args) =>
          actionFor(opcode, {
            state,
            calc,
            supportEffects,
            rng,
            think: thinkLevel,
            trace,
            unit: actor,
            args,
            allowIdle,
            targeted: memory.targeted,
          }, v0),
      },
    });
    return { ...out, active: runtime.active, sequences: runtime.sequences };
  }

  return {
    /**
     * 다음 행동 1건. 페이즈 파이프라인(§7-1)을 매번 처음부터 되짚어 위치를 복원하므로
     * 호출측이 진행 상태를 들고 있을 필요가 없다(행동을 못 낸 유닛은 상태를 바꾸지 않는다).
     */
    next(state: GameState, rng: RandomSource, memory: AiMemory = emptyAiMemory()): AiDecision {
      const active = { ...memory.active };
      const targeted = { ...memory.targeted };
      const skipped = { ...memory.skipped };
      const sequences = { ...memory.sequences };
      // ☠결손은 **행동을 못 낸 유닛에만** 기록한다 — 앞 옵코드가 미구현이어도
      //   뒤 후보(AT_Default 등)로 행동을 확정했다면 그 유닛은 결손이 아니다.
      const pending = new Map<string, string[]>();

      for (const step of AI_PHASES) {
        if (step.queue === "none" || step.think === undefined) continue;
        const queue =
          step.queue === "priority" ? aiPriorityQueue(state.units, state.phase) : aiPhaseQueue(state.units, state.phase);
        for (const actor of queue) {
          if (!aiCanAct(actor) || skipped[actor.id] !== undefined) continue;
          const trace: AiTraceSink = { candidates: [], rejected: [] };
          const r = think(state, actor, step.think, step.allowIdle === true, rng, { active, targeted, skipped, sequences }, trace);
          // 밴드 각성 전파 — 같은 AI_BandNo 전원을 Active=1로(§8-4).
          if (r.active !== 0 && (active[actor.id] ?? 0) === 0) {
            for (const m of bandMembers(state.units, actor)) {
              if ((active[m.id] ?? 0) === 0) active[m.id] = 1;
            }
          }
          active[actor.id] = r.active;
          if (r.sequences !== undefined) sequences[actor.id] = r.sequences;
          if (r.result.kind === "decide") {
            return {
              unit: actor.id,
              actions: r.result.actions,
              deficits: [],
              memory: { active, targeted, skipped, sequences },
              done: false,
              reasons: {
                step: step.name,
                think: step.think,
                // 공격이 아닌 결정(이동·지팡이 등)은 레이아웃을 쓰지 않는다 —
                // 그때는 "이 유닛이 지금 쳤다면 무엇이 쓰였을까"를 적는다(false 기본값은 조용히 틀린다).
                battleRate: trace.battleRate ?? (isClever(state) ? BATTLE_RATE.chariness : battleRateOf(actor.ai?.battleRate)),
                battleRateForced: trace.battleRateForced ?? isClever(state),
                ...(trace.chosen !== undefined ? { chosen: trace.chosen } : {}),
                candidates: [...trace.candidates].sort((a, b) => b.battle - a.battle).slice(0, TRACE_CANDIDATE_LIMIT),
                rejected: trace.rejected,
              },
            };
          }
          if (r.deficits.length > 0) {
            const seen = pending.get(actor.id) ?? [];
            for (const d of r.deficits) if (!seen.includes(d)) seen.push(d);
            pending.set(actor.id, seen);
          }
        }
      }
      const deficits: AiDeficit[] = [];
      for (const [unit, reasons] of pending) {
        for (const reason of reasons) {
          deficits.push({ unit, kind: reason.startsWith("루틴") ? "routine" : "opcode", reason });
        }
      }
      // 진행 불가로 제외된 유닛도 결손이다 — 조용히 사라지지 않는다.
      for (const [unit, reason] of Object.entries(skipped)) deficits.push({ unit, kind: "engine", reason });
      return { actions: [], deficits, memory: { active, targeted, skipped, sequences }, done: true };
    },
  };
}

export type Ai = ReturnType<typeof createAi>;

/** 조건 옵코드 사전(디버그·테스트 노출용). */
export { AC };
