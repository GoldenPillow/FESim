import type { BattleAction, BattleEvent, EphemerisStep, StatKey } from "@fesim/shared";
import type { GameState, RandomSource, UnitState } from "./battle.js";

/**
 * 기록·재생 — 공유 링크가 남의 화면에서 같은 국면을 내게 하는 층.
 * 재생 정본은 기록된 events(절대값 적용)다: 공식이 나중에 바뀌어도 남이 만든 기보의 열람 결과는 불변이다.
 * rolls는 검증 전용 — verify가 reduce로 재계산해 대조하고, 어긋나면 "기록 열람 모드"로 표시한다.
 */

/**
 * 기보에 박히는 룰 시퀀스 식별자.
 * ☠bump 조건 = 판정 결과나 난수 소비 순서·개수가 달라지는 커밋에서만(공식 보정·타격 순서 변경·롤 추가).
 * 표시·성능·리팩터링은 bump하지 않는다. bump 후 옛 기보는 events 적용으로 계속 열람되지만
 * verify는 불일치로 뜬다 — 그것이 의도된 신호다.
 */
export const RULE_VERSION = "fe17-3";

/** 기록과 재계산이 어긋난 지점 — 묵살하면 남의 전략이 조용히 다르게 재생된다. */
export class ReplayDesyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplayDesyncError";
  }
}

export interface RecordingSource extends RandomSource {
  /** 직전 drain 이후 소비한 롤을 순서대로 돌려주고 비운다 — 행동 1건 = 기보 1스텝. */
  drain(): number[];
}

export function recordingSource(base: RandomSource): RecordingSource {
  let captured: number[] = [];
  return {
    next(bound) {
      const value = base.next(bound);
      captured.push(value);
      return value;
    },
    drain() {
      const out = captured;
      captured = [];
      return out;
    },
  };
}

/** 기록된 롤을 순서대로 먹인다. 소진 = 재계산이 기록보다 길다는 뜻이라 던진다(묵살 금지). */
export function sequenceSource(rolls: readonly number[]): RandomSource {
  let cursor = 0;
  return {
    next() {
      if (cursor >= rolls.length) throw new ReplayDesyncError(`기록된 난수 ${rolls.length}개 소진`);
      return rolls[cursor++];
    },
  };
}

export type Reduce = (state: GameState, action: BattleAction, rng: RandomSource) => GameState;

export type PhaseName = "player" | "enemy" | "ally";

/** 페이즈 개시점 — start = 이 페이즈 첫 스텝의 인덱스(= 개시 시점의 커서). */
export interface PhaseSpan {
  turn: number;
  force: number;
  start: number;
}

export interface Timeline {
  initial: GameState;
  steps: readonly EphemerisStep[];
  phases: PhaseSpan[];
  /** snapshots[i] = phases[i] 개시 국면. 임의 커서 점프는 여기서 ≤1페이즈만 전진한다. */
  snapshots: GameState[];
}

/** 딥링크 주소: 턴·군·그 페이즈 안의 행동 번호(a=0 = 페이즈 개시). */
export interface StepAddress {
  t: number;
  p: PhaseName;
  a: number;
}

export interface VerifyMismatch {
  index: number;
  reason: string;
}

export interface VerifyResult {
  ok: boolean;
  mismatches: VerifyMismatch[];
}

const PHASE_NAMES = ["player", "enemy", "ally"] as const;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

const phaseIndexAt = (timeline: Timeline, cursor: number): number => {
  for (let i = timeline.phases.length - 1; i > 0; i--) {
    if (timeline.phases[i].start <= cursor) return i;
  }
  return 0;
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

function applyEvents(
  state: GameState,
  action: Extract<BattleAction, { type: "attack" }>,
  events: readonly BattleEvent[],
): GameState {
  const units = state.units.map((u) => ({ ...u }));
  const byId = new Map(units.map((u) => [u.id, u]));
  const require = (id: string): UnitState => {
    const u = byId.get(id);
    if (u === undefined) throw new ReplayDesyncError(`기록의 유닛이 국면에 없다: ${id}`);
    return u;
  };

  let outcome = state.outcome;
  for (const ev of events) {
    switch (ev.type) {
      case "strike":
        require(ev.defender).hp = ev.hpAfter;
        break;
      case "break":
        require(ev.unit).broken = true;
        break;
      case "breakRelease":
        require(ev.unit).broken = false;
        break;
      case "death":
        require(ev.unit).dead = true;
        break;
      case "exp":
        require(ev.unit).exp = ev.total;
        break;
      case "levelUp": {
        const u = require(ev.unit);
        // exp 이벤트의 total은 레벨업 차감 전 값 — 100 차감은 레벨업 이벤트가 소유한다.
        u.exp -= 100;
        u.level = ev.level;
        const stats = { ...u.stats };
        for (const [key, gain] of Object.entries(ev.gains) as [StatKey, number][]) stats[key] += gain;
        u.stats = stats;
        if (ev.gains.hp !== undefined) u.hp += ev.gains.hp;
        break;
      }
      case "outcome":
        outcome = ev.outcome;
        break;
      case "phase":
        break;
    }
  }
  const actor = require(action.unit);
  actor.acted = true;
  actor.moved = false; // reduce와 동일 계약 — 행동이 재이동 창을 연다
  return { ...state, units, events: [...events], outcome };
}

export function createReplayer(reduce: Reduce) {
  /**
   * 재생 1스텝. 공격은 기록 events 절대값 적용 — 단 events가 없으면 rolls로 reduce 재계산(정본 부재 폴백).
   * 그 외 행동은 reduce 재사용(롤 무소비 — 소비하면 던진다). events·rolls 둘 다 없는 공격은
   * ReplayDesyncError로 끝난다(수기·LLM 기보의 정합 검증은 M4 검증기 몫 — 호출측이 잡아서 표시한다).
   */
  function applyStep(state: GameState, step: EphemerisStep): GameState {
    if (step.action.type === "attack" && step.events !== undefined) {
      return applyEvents(state, step.action, step.events);
    }
    return reduce(state, step.action, sequenceSource(step.rolls ?? []));
  }

  function buildTimeline(initial: GameState, steps: readonly EphemerisStep[]): Timeline {
    const phases: PhaseSpan[] = [{ turn: initial.turn, force: initial.phase, start: 0 }];
    const snapshots: GameState[] = [initial];
    let s = initial;
    steps.forEach((step, i) => {
      s = applyStep(s, step);
      if (step.action.type === "endPhase") {
        phases.push({ turn: s.turn, force: s.phase, start: i + 1 });
        snapshots.push(s);
      }
    });
    return { initial, steps, phases, snapshots };
  }

  /** 임의 커서 점프 = 직전 페이즈 스냅숏 + 그 페이즈 안에서만 전진(역스텝도 같은 경로). */
  function stateAt(timeline: Timeline, cursor: number): GameState {
    const target = clamp(cursor, 0, timeline.steps.length);
    const idx = phaseIndexAt(timeline, target);
    let s = timeline.snapshots[idx];
    for (let i = timeline.phases[idx].start; i < target; i++) s = applyStep(s, timeline.steps[i]);
    return s;
  }

  /** 로드 시 1회 — rolls로 reduce를 재계산해 기록 events와 대조한다(스테핑 경로 밖). */
  function verify(initial: GameState, steps: readonly EphemerisStep[]): VerifyResult {
    const mismatches: VerifyMismatch[] = [];
    let s = initial;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        const next = reduce(s, step.action, sequenceSource(step.rolls ?? []));
        if (step.events !== undefined && !deepEqual(next.events, step.events)) {
          mismatches.push({ index: i, reason: "재계산한 이벤트가 기록과 다르다" });
        }
        s = next;
      } catch (e) {
        mismatches.push({ index: i, reason: e instanceof Error ? e.message : String(e) });
        // 재계산이 막혀도 기록 기준으로 밀고 나가 뒤 스텝까지 대조한다. 그것도 막히면 거기서 끝.
        try {
          s = applyStep(s, step);
        } catch {
          break;
        }
      }
    }
    return { ok: mismatches.length === 0, mismatches };
  }

  return { applyStep, buildTimeline, stateAt, verify };
}

export function toAddress(timeline: Timeline, cursor: number): StepAddress {
  const target = clamp(cursor, 0, timeline.steps.length);
  const phase = timeline.phases[phaseIndexAt(timeline, target)];
  return { t: phase.turn, p: PHASE_NAMES[phase.force] ?? "ally", a: target - phase.start };
}

/** 범위 밖 주소는 클램프 — 남이 손으로 고친 URL도 열리는 국면을 가리켜야 한다. */
export function toCursor(timeline: Timeline, address: StepAddress): number {
  const force = PHASE_NAMES.indexOf(address.p);
  const idx = timeline.phases.findIndex((ph) => ph.turn === address.t && ph.force === force);
  if (idx < 0) {
    const first = timeline.phases[0];
    const before = address.t < first.turn || (address.t === first.turn && force < first.force);
    return before ? 0 : timeline.steps.length;
  }
  const start = timeline.phases[idx].start;
  const end = timeline.phases[idx + 1]?.start ?? timeline.steps.length;
  return clamp(start + Math.max(address.a, 0), start, end);
}
