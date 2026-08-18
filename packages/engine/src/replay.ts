import type { BattleAction, BattleEvent, EphemerisStep, StatKey } from "@fesim/shared";
import { effectiveWeapons, equipCandidates, type GameState, type TerrainPatch, type RandomSource, type UnitState } from "./battle.js";


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
export const RULE_VERSION = "fe17-10";

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

/** 이벤트 목록의 절대 적용(행동 복원 제외) — attack류 재생과 endPhase 훅 오버레이가 공용한다. */
function applyEventList(state: GameState, events: readonly BattleEvent[]): GameState {
  const units = state.units.map((u) => ({ ...u }));
  const byId = new Map(units.map((u) => [u.id, u]));
  const require = (id: string): UnitState => {
    const u = byId.get(id);
    if (u === undefined) throw new ReplayDesyncError(`기록의 유닛이 국면에 없다: ${id}`);
    return u;
  };

  let outcome = state.outcome;
  // ☠페이즈·턴은 **기록이 정본**이다(2026-08-18): endPhase는 baseReduce로 다음 진영을 먼저 고르고
  // 그 뒤에 훅 이벤트를 얹으므로, 훅이 그 페이즈의 유일한 진영을 퇴장시키면 순서가 뒤집혀 갈라진다.
  // m001에서 관측 = 재생이 force 2 유닛이 이미 없는데도 phase 2로 넘어가 다음 자군 행동을 거부했다
  // (기존 주석의 "이론상 표류"가 실제로 났다). 절대값 phase 이벤트를 버리지 않고 그대로 대입한다.
  // ☠단 **turn은 대입하지 않는다** — 이벤트의 `turn`은 전이 **직전** 값이라(battle.ts endPhase가
  // 증가 전에 발화한다) 그대로 쓰면 턴이 되감긴다. 턴은 리듀서 재계산이 정본이다.
  let phase = state.phase;
  let crests = state.crests;
  let visited = state.visited;
  let structures = state.structures;
  let terrainPatches = state.terrainPatches;
  let variables = state.variables;
  let winRule = state.winRule;
  for (const ev of events) {
    switch (ev.type) {
      case "strike":
        require(ev.defender).hp = ev.hpAfter;
        break;
      case "heal":
        require(ev.target).hp = ev.hpAfter;
        break;
      case "terrainHeal":
        require(ev.unit).hp = ev.hpAfter;
        break;
      case "destroy": {
        const s = structures?.[ev.structure];
        if (s === undefined) throw new ReplayDesyncError(`기록의 구조물이 국면에 없다: #${ev.structure}`);
        structures = structures!.map((v, i) => (i === ev.structure ? { ...v, hp: ev.hpAfter } : v));
        break;
      }
      case "status": {
        // reduce와 동일 계약 — 재부여는 치환(age 리셋).
        const u = require(ev.target);
        u.statuses = [
          ...(u.statuses ?? []).filter((s) => s.sid !== ev.sid),
          {
            sid: ev.sid, badState: ev.badState, life: ev.life, age: 0,
            ...(ev.name !== undefined ? { name: ev.name } : {}),
          },
        ];
        break;
      }
      case "staffMiss":
        break; // 상태 무부여 — 횟수·행동 소모는 아래 액션 복원이 소유
      case "warp": {
        const u = require(ev.target);
        u.x = ev.x;
        u.y = ev.y;
        break;
      }
      case "refresh": {
        const u = require(ev.unit);
        u.acted = false;
        u.moved = false;
        break;
      }
      case "guard":
        require(ev.unit).guarding = true;
        break;
      case "guardBlock":
        // 체인가드 치환 — 가드 잔여 HP 절대값. 대상 무피해는 동반 strike(damage 0)가 이미 소유한다.
        require(ev.unit).hp = ev.hpAfter;
        break;
      case "charge": {
        const u = require(ev.unit);
        if (u.engage !== undefined) u.engage = { ...u.engage, count: ev.count };
        break;
      }
      case "engage": {
        const u = require(ev.unit);
        if (u.engage !== undefined) u.engage = { ...u.engage, engaging: true, turn: 0 };
        break;
      }
      case "disengage": {
        const u = require(ev.unit);
        if (u.engage !== undefined) u.engage = { ...u.engage, engaging: false, turn: 0, count: 0 };
        // reduce와 동일 계약 — 엠블렘 무기 장비 중이었으면 소지품 첫 무기로 복귀.
        if (u.weapon !== undefined && u.engageWeapons?.includes(u.weapon) === true) u.weapon = u.weapons?.[0];
        break;
      }
      case "crest": {
        const u = require(ev.unit);
        if (u.engage !== undefined) u.engage = { ...u.engage, count: ev.count };
        crests = crests?.filter((c) => !(c.x === ev.x && c.y === ev.y));
        break;
      }
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
        // exp 절대값이 실려 있으면 그것이 정본(최대 레벨 도달 시 0 강제).
        u.exp = ev.exp ?? u.exp - 100;
        u.level = ev.level;
        // 고정 성장 누적기는 유닛 상태다 — 절대값 스냅숏으로 복원해야 다음 레벨업이 맞는다.
        if (ev.acc !== undefined) u.growthAcc = ev.acc;
        const stats = { ...u.stats };
        for (const [key, gain] of Object.entries(ev.gains) as [StatKey, number][]) stats[key] += gain;
        u.stats = stats;
        if (ev.gains.hp !== undefined) u.hp += ev.gains.hp;
        break;
      }
      case "outcome":
        outcome = ev.outcome;
        break;
      case "spawn": {
        const u = ev.unit as unknown as UnitState;
        // 멱등 — 같은 목록을 두 번 얹어도 유닛이 겹치지 않는다(endPhase 사전 적용 + 오버레이).
        if (byId.has(u.id)) break;
        units.push({ ...u });
        byId.set(u.id, units[units.length - 1]);
        break;
      }
      case "despawn":
        require(ev.unit).dead = true;
        break;
      case "transfer":
        require(ev.unit).force = ev.force;
        break;
      case "setPos": {
        const u = require(ev.unit);
        u.x = ev.x;
        u.y = ev.y;
        break;
      }
      case "variable":
        variables = { ...variables, [ev.key]: ev.value };
        break;
      case "winRule": {
        const { type: _t, ...patch } = ev;
        winRule = { ...winRule, ...patch };
        break;
      }
      case "privateSkill": {
        const u = require(ev.unit);
        const kept = (u.statuses ?? []).filter((s) => s.sid !== ev.sid);
        if (ev.row !== undefined) {
          const row = ev.row as { badState?: number; life?: number };
          kept.push({ sid: ev.sid, badState: row.badState ?? 0, life: row.life ?? 0, age: 0 });
        }
        u.statuses = kept;
        if (kept.length === 0) delete u.statuses;
        break;
      }
      case "godUnit": {
        const u = require(ev.unit);
        // patch null = 필드 삭제(엠블렘 해제 — UnitSetGodUnit nil). undefined는 JSON에서 살아남지 못한다.
        for (const [key, value] of Object.entries(ev.patch ?? {})) {
          if (value === null) delete (u as unknown as Record<string, unknown>)[key];
          else (u as unknown as Record<string, unknown>)[key] = value;
        }
        break;
      }
      case "ai": {
        const u = require(ev.unit);
        u.aiScript = [...(u.aiScript ?? []), ev.params];
        break;
      }
      case "crestAdd":
        crests = [...(crests ?? []), { x: ev.x, y: ev.y }];
        break;
      case "visited":
        visited = [...(visited ?? []), { x: ev.x, y: ev.y }];
        break;
      case "reset": {
        const u = require(ev.unit);
        u.hp = ev.hpAfter;
        u.broken = false;
        delete u.statuses;
        break;
      }
      case "equip": {
        const u = require(ev.unit);
        if (ev.index === undefined) delete u.weapon;
        else {
          const w = equipCandidates(u)[ev.index];
          if (w === undefined) throw new ReplayDesyncError(`기록의 무기 인덱스가 국면에 없다: #${ev.index}`);
          u.weapon = w;
        }
        break;
      }
      case "hpStock": {
        const u = require(ev.unit);
        if (ev.stock === 0) delete u.hpStock;
        else u.hpStock = ev.stock;
        break;
      }
      case "gain": {
        const u = require(ev.unit);
        const item = JSON.parse(JSON.stringify(ev.item)) as never;
        if (ev.kind === "weapon") u.weapons = [...(u.weapons ?? []), item];
        else if (ev.kind === "staff") u.staves = [...(u.staves ?? []), item];
        else u.consumables = [...(u.consumables ?? []), item];
        break;
      }
      case "putOff": {
        const u = require(ev.unit);
        const list = ev.kind === "weapon" ? u.weapons : ev.kind === "staff" ? u.staves : u.consumables;
        if (list === undefined || list[ev.index] === undefined) {
          throw new ReplayDesyncError(`기록의 소지품이 국면에 없다: ${ev.kind}#${ev.index}`);
        }
        const dropped = list[ev.index];
        const rest = list.filter((_, i) => i !== ev.index);
        if (ev.kind === "weapon") {
          u.weapons = rest as typeof u.weapons;
          if (u.weapon === dropped) delete u.weapon;
        } else if (ev.kind === "staff") u.staves = rest as typeof u.staves;
        else u.consumables = rest as typeof u.consumables;
        break;
      }
      case "terrainSet": {
        const patch = {
          x: ev.x, y: ev.y, tid: ev.tid,
          cell: ev.cell as unknown as TerrainPatch["cell"],
          ...(ev.cost === undefined ? {} : { cost: ev.cost as unknown as TerrainPatch["cost"] }),
          ...(ev.display === undefined ? {} : { display: ev.display }),
        };
        terrainPatches = [...(terrainPatches ?? []).filter((p) => p.x !== ev.x || p.y !== ev.y), patch];
        break;
      }
      case "unitFlags": {
        const u = require(ev.unit);
        if (ev.flags === 0) delete u.flags;
        else u.flags = ev.flags;
        break;
      }
      case "phase":
        phase = ev.phase;
        break;
    }
  }
  return {
    ...state,
    units,
    phase,
    ...(crests === undefined ? {} : { crests }),
    ...(visited === undefined ? {} : { visited }),
    ...(structures === undefined ? {} : { structures }),
    ...(terrainPatches === undefined ? {} : { terrainPatches }),
    ...(variables === undefined ? {} : { variables }),
    ...(winRule === undefined ? {} : { winRule }),
    events: [...events],
    outcome,
  };
}

function applyEvents(
  state: GameState,
  action: Extract<BattleAction, { type: "attack" | "engageAttack" | "staff" | "item" | "dance" }>,
  events: readonly BattleEvent[],
): GameState {
  const next = applyEventList(state, events);
  const units = next.units;
  const byId = new Map(units.map((u) => [u.id, u]));
  const require = (id: string): UnitState => {
    const u = byId.get(id);
    if (u === undefined) throw new ReplayDesyncError(`기록의 유닛이 국면에 없다: ${id}`);
    return u;
  };
  const actor = require(action.unit);
  // reduce와 동일 계약 복원 — 장비 전환·지팡이 횟수 소모는 이벤트에 없어 행동에서 되살린다.
  // 안 하면 절대 적용 경로의 국면이 표류한다(이후 스텝의 반격 무기·잔여 횟수가 어긋난다).
  if (action.type === "attack" && action.weapon !== undefined) {
    const chosen = effectiveWeapons(actor)?.[action.weapon];
    if (chosen !== undefined) actor.weapon = chosen;
  }
  if (action.type === "staff") {
    const idx = action.staff ?? 0;
    actor.staves = actor.staves?.map((s, i) => (i === idx ? { ...s, uses: s.uses - 1 } : s));
  }
  if (action.type === "item") {
    const idx = action.item ?? 0;
    actor.consumables = actor.consumables?.map((c, i) => (i === idx ? { ...c, uses: c.uses - 1 } : c));
  }
  actor.acted = true;
  actor.moved = false; // reduce와 동일 계약 — 행동이 재이동 창을 연다
  return next;
}

export function createReplayer(reduce: Reduce, baseReduce: Reduce = reduce) {
  /**
   * 재생 1스텝. 공격은 기록 events 절대값 적용 — 단 events가 없으면 rolls로 reduce 재계산(정본 부재 폴백).
   * 그 외 행동은 reduce 재사용(롤 무소비 — 소비하면 던진다). events·rolls 둘 다 없는 공격은
   * ReplayDesyncError로 끝난다(수기·LLM 기보의 정합 검증은 M4 검증기 몫 — 호출측이 잡아서 표시한다).
   *
   * endPhase에 events가 실려 있으면(이벤트 엔진 = MP2) baseReduce로 결정 전이(에이징·해제)를 재계산한 뒤
   * 훅 전용 이벤트(HOOK_EVENT_TYPES)만 절대 오버레이한다 — 열람(/s/) 경로가 Lua 없이 증원·전이를 복원하는
   * 문법. ⚠훅이 전이 '이전'에 발화한 기록을 '이후'에 얹으므로 이론상 표류 여지가 있다 — verify(재계산)가
   * 정본 대조를 소유한다(절대값 이벤트라 관측 케이스에선 수렴).
   */
  function applyStep(state: GameState, step: EphemerisStep): GameState {
    if (
      (step.action.type === "attack" ||
        step.action.type === "engageAttack" ||
        step.action.type === "staff" ||
        step.action.type === "item" ||
        step.action.type === "dance") &&
      step.events !== undefined
    ) {
      return applyEvents(state, step.action, step.events);
    }
    if (step.action.type === "setup" && step.events !== undefined) {
      // 챕터 초기화 스텝 — 기록 이벤트(스폰·변수·규칙) 절대 적용만으로 초기 국면이 완성된다.
      return applyEventList(state, step.events);
    }
    if (step.action.type === "endPhase" && step.events !== undefined) {
      // ☠**다음 진영은 기록이 정본이다**(2026-08-18). endPhase는 `forces`에서 다음 진영을 고르고
      // 그 진영만 활성화 리셋(acted·moved·인게이지·지형회복)을 받는데, 훅이 진영 구성을 바꾸면
      // 훅이 전이 **앞**에서 났는지 **뒤**에서 났는지에 따라 라이브와 재생이 다른 진영을 고른다
      // — m001은 앞, m022는 뒤라 어느 한쪽 순서로 고정하면 반대쪽이 깨졌다(둘 다 실측).
      // ⇒ 순서를 추측하지 않는다. 평범하게 전이해 보고, 기록된 절대 phase와 어긋날 때만
      //   존재·소속 이벤트를 먼저 얹은 경로를 시도해 **기록과 맞는 쪽**을 채택한다.
      const recorded = step.events.find((e) => e.type === "phase");
      let next = baseReduce(state, step.action, sequenceSource(step.rolls ?? []));
      if (recorded !== undefined && next.phase !== recorded.phase) {
        const structural = step.events.filter(
          (e) => e.type === "spawn" || e.type === "despawn" || e.type === "transfer",
        );
        if (structural.length > 0) {
          const alt = baseReduce(applyEventList(state, structural), step.action, sequenceSource(step.rolls ?? []));
          if (alt.phase === recorded.phase) next = alt;
        }
      }
      return applyEventList(next, step.events);
    }
    if (step.events !== undefined) {
      // ☠**행동 종류를 가리지 않는다** — 종전엔 endPhase만 오버레이해서, 이동·대기에 붙은 훅 이벤트가
      // 타임라인 재생에서 통째로 버려졌다(2026-08-18). m001은 `UnitTransfer`(우군→자군)가 그렇게 사라져
      // 그 유닛의 다음 행동이 "지금 군의 유닛이 아니다"로 거부됐다 — 기보는 정상인데 재생만 깨진 것이다.
      // 기록 이벤트 전체를 오버레이 — 전부 절대값(hpAfter·count·좌표) 또는 멱등이라 base 재계산분과
      // 겹쳐도 수렴한다. 부분집합 필터는 훅의 사망(UnitDie)류를 놓친다.
      const next = baseReduce(state, step.action, sequenceSource(step.rolls ?? []));
      return applyEventList(next, step.events);
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
