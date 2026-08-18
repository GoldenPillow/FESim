import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseEphemeris,
  serializeEphemeris,
  type BattleAction,
  type CalculatorData,
  type EphemerisFile,
  type EphemerisStep,
} from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  recordingSource,
  sequenceSource,
  toAddress,
  toCursor,
  ReplayDesyncError,
  RULE_VERSION,
  type GameState,
  type UnitState,
} from "@fesim/engine";

/**
 * 리플레이 = 공유 링크의 심장이다. 기록(rolls·events) → 직렬화 → 재생이 한 곳이라도 어긋나면
 * 남이 여는 전략이 만든 사람이 본 것과 달라진다 — 그 어긋남을 여기서 전부 잡는다:
 * (1) 롤 캡처 순서 (2) 왕복 결정성 (3) events 적용 == reduce 재계산 (4) 변조 감지
 * (5) 임의 커서 점프 == 순차 재생 (6) 주소 왕복.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));
const replayer = createReplayer(reduce);

const seq = (...rolls: number[]) => ({ next: () => rolls.shift() ?? 0 });

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: partial.stats?.hp ?? baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

function state(units: UnitState[]): GameState {
  const cost = Array.from({ length: 6 }, () => [1, 1, 1, 1, 1, 1]);
  return {
    turn: 1,
    phase: 0,
    difficulty: "n",
    map: { width: 6, height: 6, costs: { foot: cost } },
    units,
    events: [],
  };
}

/** 서로 죽지 않는 대치(동종 무기·동속도) — 어떤 롤이 나와도 뒤 행동이 합법으로 남는다. */
const foeStats = { hp: 30, str: 8, mag: 0, dex: 4, spd: 10, lck: 10, def: 2, res: 0, bld: 5 };
const SCENARIO: BattleAction[] = [
  { type: "move", unit: "a", x: 1, y: 0 },
  { type: "attack", unit: "a", target: "e" },
  { type: "wait", unit: "b" },
  { type: "endPhase" },
  { type: "move", unit: "e", x: 2, y: 1 },
  { type: "endPhase" },
];

function record(): { initial: GameState; steps: EphemerisStep[]; before: GameState[]; final: GameState } {
  const initial = state([
    unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword }),
    unit({ id: "b", force: 0, x: 0, y: 2, weapon: sword }),
    unit({ id: "e", force: 1, x: 2, y: 0, stats: foeStats, hp: 30, weapon: sword }),
  ]);
  const rng = recordingSource(seq(...Array.from({ length: 40 }, (_, i) => (i * 17) % 100)));
  const before: GameState[] = [];
  const steps: EphemerisStep[] = [];
  let s = initial;
  for (const action of SCENARIO) {
    before.push(s);
    s = reduce(s, action, rng);
    const rolls = rng.drain();
    steps.push(rolls.length > 0 ? { action, rolls, events: s.events } : { action, events: s.events });
  }
  return { initial, steps, before, final: s };
}

describe("기록", () => {
  it("롤 캡처 = 소비 순서 그대로 (명중 → 레벨업은 STAT_KEYS 순 1롤씩)", () => {
    // 상대 행운 10 = 필살률 0 → 타격당 롤 1개. 격파라 반격·추격 롤은 없다.
    const foe = { hp: 1, str: 0, mag: 0, dex: 0, spd: 0, lck: 10, def: 0, res: 0, bld: 5 };
    const growth = { hp: 50, str: 50, mag: 50, dex: 50, spd: 50, lck: 50, def: 50, res: 50, bld: 50 };
    // Random 모드 명시 — 성장 롤이 존재하는 계약을 지키는 절이다(서비스 기본 fixed는 롤을 안 쓴다).
    const s = { ...state([
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, exp: 95, growth }),
      unit({ id: "e", force: 1, x: 1, y: 0, stats: foe, hp: 1, weapon: sword }),
    ]), growMode: "random" as const };
    const rng = recordingSource(seq(7, 10, 90, 10, 90, 10, 90, 10, 90, 10, 55, 66));
    const next = reduce(s, { type: "attack", unit: "a", target: "e" }, rng);

    expect(rng.drain()).toEqual([7, 10, 90, 10, 90, 10, 90, 10, 90, 10]);
    expect(rng.drain()).toEqual([]); // drain = 행동 1건 단위 (비운다)
    const levelUp = next.events.find((ev) => ev.type === "levelUp");
    expect(levelUp).toMatchObject({ gains: { hp: 1, mag: 1, spd: 1, def: 1, bld: 1 } });
  });
});

describe("재생", () => {
  it("기록 → 직렬화 → 파싱 → 재생이 완전히 같은 국면을 낸다 (심장)", () => {
    const { initial, steps, final } = record();
    const file: EphemerisFile = {
      eph: 1,
      game: "fe17",
      ruleVersion: RULE_VERSION,
      chapter: { cid: "CID_M002", difficulty: "n" },
      log: steps,
    };
    const parsed = parseEphemeris(serializeEphemeris(file));
    const replayed = parsed.log.reduce((s, step) => replayer.applyStep(s, step), initial);
    expect(replayed).toEqual(final);
  });

  it("events 적용 == rolls로 reduce 재계산 (재생 정본이 절대값이어도 등가)", () => {
    const { steps, before } = record();
    steps.forEach((step, i) => {
      if (step.action.type !== "attack") return;
      expect(replayer.applyStep(before[i], step)).toEqual(
        reduce(before[i], step.action, sequenceSource(step.rolls ?? [])),
      );
      expect(replayer.applyStep(before[i], step).events).toEqual(step.events);
    });
  });

  it("롤 없는 스텝이 롤을 소비하면 던진다 (move/wait/endPhase 무소비 계약)", () => {
    expect(() => sequenceSource([]).next(100)).toThrow(ReplayDesyncError);
    const src = sequenceSource([3]);
    expect(src.next(100)).toBe(3);
    expect(() => src.next(100)).toThrow(ReplayDesyncError);
  });
});

describe("검증", () => {
  it("원본은 검증 통과, 변조된 events·rolls는 불일치로 잡는다", () => {
    const { initial, steps } = record();
    expect(replayer.verify(initial, steps)).toEqual({ ok: true, mismatches: [] });

    const attackAt = steps.findIndex((s) => s.action.type === "attack");
    const tampered = steps.map((s, i) =>
      i === attackAt ? { ...s, events: [{ ...s.events![0], damage: 999 } as never] } : s,
    );
    const bad = replayer.verify(initial, tampered);
    expect(bad.ok).toBe(false);
    expect(bad.mismatches[0].index).toBe(attackAt);

    const starved = steps.map((s, i) => (i === attackAt ? { ...s, rolls: [] } : s));
    expect(replayer.verify(initial, starved).ok).toBe(false);
  });
});

describe("스냅숏·커서", () => {
  it("모든 커서에서 stateAt == 순차 재생, 타임라인은 불변", () => {
    const { initial, steps } = record();
    const timeline = replayer.buildTimeline(initial, steps);
    const frozen = JSON.stringify(timeline);

    let folded = initial;
    expect(replayer.stateAt(timeline, 0)).toEqual(initial);
    for (let cursor = 1; cursor <= steps.length; cursor++) {
      folded = replayer.applyStep(folded, steps[cursor - 1]);
      expect(replayer.stateAt(timeline, cursor)).toEqual(folded);
    }
    expect(replayer.stateAt(timeline, -5)).toEqual(initial);
    expect(replayer.stateAt(timeline, 999)).toEqual(folded);
    expect(JSON.stringify(timeline)).toBe(frozen);
  });

  it("스냅숏은 페이즈 개시 국면이다", () => {
    const { initial, steps } = record();
    const timeline = replayer.buildTimeline(initial, steps);
    expect(timeline.phases[0]).toEqual({ turn: 1, force: 0, start: 0 });
    expect(timeline.phases[1]).toEqual({ turn: 1, force: 1, start: 4 });
    expect(timeline.phases[2]).toEqual({ turn: 2, force: 0, start: 6 });
    timeline.phases.forEach((ph, i) => {
      expect(timeline.snapshots[i]).toEqual(replayer.stateAt(timeline, ph.start));
    });
  });

  it("주소 ↔ 커서 왕복, 범위 밖은 클램프", () => {
    const { initial, steps } = record();
    const timeline = replayer.buildTimeline(initial, steps);
    for (let cursor = 0; cursor <= steps.length; cursor++) {
      expect(toCursor(timeline, toAddress(timeline, cursor))).toBe(cursor);
    }
    expect(toAddress(timeline, 0)).toEqual({ t: 1, p: "player", a: 0 });
    expect(toAddress(timeline, 4)).toEqual({ t: 1, p: "enemy", a: 0 });
    expect(toCursor(timeline, { t: 1, p: "enemy", a: 1 })).toBe(5);
    expect(toCursor(timeline, { t: 1, p: "player", a: 999 })).toBe(4); // 페이즈 경계까지
    expect(toCursor(timeline, { t: 9, p: "player", a: 0 })).toBe(steps.length); // 타임라인 뒤
    expect(toCursor(timeline, { t: 1, p: "ally", a: 0 })).toBe(steps.length); // 없는 군
    expect(toCursor(timeline, { t: 0, p: "player", a: 3 })).toBe(0); // 타임라인 앞
  });
});

describe("절대 적용의 국면 복원", () => {
  /**
   * 결함 박제(2026-08-18): attack.weapon 장비 전환이 이벤트에 없어 절대 적용 경로가
   * 전환을 건너뛰었다 — 이후 스텝의 반격 무기·예보가 기록 당시와 어긋나는 표류였다.
   */
  it("attack.weapon 장비 전환을 events 경로에서도 복원한다", () => {
    const lance = { might: 6, hit: 90, crit: 0, weight: 7, kind: 2, rangeMin: 1, rangeMax: 1 };
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword, lance] });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, stats: foeStats, weapon: sword });
    const initial = state([a, e]);
    const action: BattleAction = { type: "attack", unit: "a", target: "e", weapon: 1 };
    const recorded = reduce(initial, action, seq(0, 0, 0, 0));
    const replayed = replayer.applyStep(initial, { action, events: recorded.events });
    expect(replayed.units[0].weapon).toEqual(lance);
  });
});

/**
 * ★스크립트가 행동 도중 페이즈를 닫는 경우 — 라이브와 재생이 갈리던 자리 (MP8 A7).
 *
 * 왜 위험했나: m002는 `行動後フェイズ終了` 변수로 **그 행동에서 페이즈를 끝낸다**
 * (events/index.ts — 안 지키면 재배치된 유닛이 한 번 더 움직인다). 라이브는 거기서 진짜 endPhase를
 * 돌려 활성화 리셋(acted·moved·broken·인게이지 턴·지형회복·상태 에이징)을 하는데,
 * 재생의 `case "phase"`는 **필드 하나만 바꿨다**. 그래서 재생 국면에는 전 유닛의 `acted`가 남고
 * 다음 자군 행동이 "행동 완료 유닛"으로 거부된다 — **생성한 기보가 재생되지 않는다**.
 * 궤적 의존이라 시드를 바꾸면 사라져서 "나쁜 시드"로 오인되기 쉬웠다(`./dev replay m002 --seed 3` 재현).
 *
 * 층별 테스트로는 안 잡힌다: reduce도 맞고 applyEventList도 맞는데 **사이**가 끊겨 있었다.
 */
describe("★행동 중 페이즈 종료 — 라이브 == 재생 (관통)", () => {
  const build = () => {
    const initial = state([
      unit({ id: "a", force: 0, x: 1, y: 0, weapon: sword }),
      unit({ id: "b", force: 0, x: 0, y: 2, weapon: sword }),
      unit({ id: "e", force: 1, x: 2, y: 0, stats: foeStats, hp: 30, weapon: sword }),
    ]);
    const action: BattleAction = { type: "attack", unit: "a", target: "e" };
    const rec = recordingSource(seq(...Array.from({ length: 20 }, (_, i) => (i * 13) % 100)));
    const attacked = reduce(initial, action, rec);
    // 스크립트가 행동 뒤 페이즈를 닫는다 — 라이브는 진짜 endPhase를 이어 돌리고 이벤트를 합친다.
    const closed = reduce(attacked, { type: "endPhase" }, seq());
    const step: EphemerisStep = {
      action,
      rolls: rec.drain(),
      events: [...attacked.events, ...closed.events],
    };
    return { initial, step, live: closed };
  };

  it("재생 국면이 라이브 국면과 같다(phase·turn·활성화 플래그)", () => {
    const { initial, step, live } = build();
    const replayed = replayer.applyStep(initial, step);

    expect(replayed.phase).toBe(live.phase);
    expect(replayed.turn).toBe(live.turn);
    for (const u of live.units) {
      const r = replayed.units.find((x) => x.id === u.id)!;
      expect({ id: r.id, acted: r.acted, moved: r.moved, broken: r.broken }).toEqual({
        id: u.id, acted: u.acted, moved: u.moved, broken: u.broken,
      });
    }
  });

  it("재생 뒤 새 진영의 유닛이 실제로 행동할 수 있다(거부되지 않는다)", () => {
    const { initial, step } = build();
    const replayed = replayer.applyStep(initial, step);
    const mover = replayed.units.find((u) => u.force === replayed.phase && !u.dead)!;
    expect(() => reduce(replayed, { type: "wait", unit: mover.id }, seq())).not.toThrow();
  });
});
