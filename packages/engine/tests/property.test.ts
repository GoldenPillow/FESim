import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseEphemeris, serializeEphemeris, type CalculatorData, type EphemerisStep } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  movementRange,
  recordingSource,
  type BattleAction,
  type GameState,
  type MoveQuery,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 속성 기반 테스트 — 무작위 국면·수순으로 엔진 불변식을 융단폭격한다(design/verification.md §2-3).
 * 게이트 2단: 기본 = 소케이스(시드 고정, ./dev done 상시) · FESIM_FUZZ=<runs> = 대케이스(./dev fuzz, 무작위 시드).
 * 실패 재현: fast-check가 출력하는 seed/counterexample을 그대로 fc.assert 두 번째 인자에 박는다.
 */
const FUZZ = process.env.FESIM_FUZZ;
const PARAMS: fc.Parameters<unknown> =
  FUZZ === undefined ? { numRuns: 30, seed: 20260816 } : { numRuns: Math.max(Number(FUZZ) || 2000, 100) };

const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));
const replayer = createReplayer(reduce);

const W = 5;
const H = 5;

const WEAPONS = [
  { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 },
  { might: 8, hit: 70, crit: 10, weight: 10, kind: 3, rangeMin: 1, rangeMax: 1 },
  { might: 6, hit: 85, crit: 0, weight: 7, kind: 2, rangeMin: 1, rangeMax: 2 },
  { might: 7, hit: 90, crit: 5, weight: 6, kind: 4, rangeMin: 2, rangeMax: 2 },
];
const CANTER = [{ Sid: "SID_再移動", Power: 2 }];

interface UnitSpec {
  forcePick: number;
  weaponIdx: number | undefined;
  canter: boolean;
  linked: boolean;
  movePoints: number;
  hpMax: number;
  str: number;
  spd: number;
  def: number;
  lck: number;
  grows: boolean;
}

const arbUnitSpec: fc.Arbitrary<UnitSpec> = fc.record({
  forcePick: fc.integer({ min: 0, max: 2 }),
  weaponIdx: fc.option(fc.integer({ min: 0, max: WEAPONS.length - 1 }), { nil: undefined }),
  canter: fc.boolean(),
  linked: fc.boolean(),
  movePoints: fc.integer({ min: 2, max: 5 }),
  hpMax: fc.integer({ min: 8, max: 35 }),
  str: fc.integer({ min: 0, max: 15 }),
  spd: fc.integer({ min: 0, max: 15 }),
  def: fc.integer({ min: 0, max: 10 }),
  lck: fc.integer({ min: 0, max: 15 }),
  grows: fc.boolean(),
});

function makeState(grid: number[][], cells: number[], specs: UnitSpec[]): GameState {
  const units: UnitState[] = cells.map((cell, i) => {
    const spec = specs[i];
    // 유닛 0은 항상 자군(개시 페이즈의 행동 주체 보장), 나머지는 적군 편중(전투 발생 확률).
    const force = i === 0 ? 0 : spec.forcePick === 0 ? 0 : 1;
    const stats = {
      hp: spec.hpMax, str: spec.str, mag: 0, dex: 8, spd: spec.spd,
      lck: spec.lck, def: spec.def, res: 2, bld: 5,
    };
    return {
      id: `u${i}`,
      force,
      x: cell % W,
      y: Math.floor(cell / W),
      hp: spec.hpMax,
      stats,
      weapon: spec.weaponIdx === undefined ? undefined : WEAPONS[spec.weaponIdx],
      skills: spec.canter ? CANTER : undefined,
      growth: spec.grows
        ? { hp: 100, str: 50, mag: 0, dex: 0, spd: 50, lck: 0, def: 0, res: 0, bld: 0 }
        : undefined,
      level: 3,
      exp: 0,
      movePoints: spec.movePoints,
      moveType: "foot" as const,
      style: spec.linked ? "連携スタイル" : undefined,
      acted: false,
      dead: false,
      broken: false,
    };
  });
  return {
    turn: 1,
    phase: 0,
    difficulty: "n",
    map: {
      width: W,
      height: H,
      costs: { foot: grid },
      terrain: grid.map((row) => row.map((c) => ({ avoid: c === 2 ? 20 : 0, def: c === 2 ? 1 : 0 }))),
    },
    units,
    events: [],
  };
}

const arbState: fc.Arbitrary<GameState> = fc
  .record({
    grid: fc.array(fc.array(fc.constantFrom(1, 1, 1, 2, 3, 255), { minLength: W, maxLength: W }), {
      minLength: H,
      maxLength: H,
    }),
    cells: fc.uniqueArray(fc.integer({ min: 0, max: W * H - 1 }), { minLength: 2, maxLength: 5 }),
    specs: fc.array(arbUnitSpec, { minLength: 5, maxLength: 5 }),
  })
  .map(({ grid, cells, specs }) => makeState(grid, cells, specs));

/** reduce의 move 케이스와 동일한 질의 구성 — 쌍대성 검사의 비교 대상. */
function queryFor(state: GameState, u: UnitState, budget: number): MoveQuery {
  const grid = state.map.costs[u.moveType]!;
  return {
    width: state.map.width,
    height: state.map.height,
    movePoints: budget,
    start: { x: u.x, y: u.y },
    costAt: (x, y) => grid[y]?.[x] ?? 255,
    blocked: (x, y) =>
      state.units.some((v) => !v.dead && v.x === x && v.y === y && v.force !== u.force),
    occupied: (x, y) =>
      state.units.some((v) => !v.dead && v.x === x && v.y === y && v.id !== u.id && v.force === u.force),
  };
}

const noRolls: RandomSource = {
  roll() {
    throw new Error("이동·대기는 롤을 소비하지 않는다");
  },
};

/** 결정적 LCG — 시드만 있으면 같은 수순이 재생된다(속성 실패의 재현 조건). */
const lcg = (seed: number): RandomSource => {
  let s = seed >>> 0;
  return {
    roll() {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s % 100;
    },
  };
};

/** 무작위 합법 수순 자동 진행 — 기록(rolls+events)을 기보 스텝으로 남긴다. */
function playout(initial: GameState, seed: number, length: number): EphemerisStep[] {
  const steps: EphemerisStep[] = [];
  const pick = lcg(seed ^ 0x9e3779b9);
  const rec = recordingSource(lcg(seed));
  const rand = (n: number) => pick.roll() % n;
  let state = initial;
  for (let i = 0; i < length; i++) {
    if (state.outcome !== undefined) break;
    const movers = state.units.filter((u) => !u.dead && u.force === state.phase && !u.acted);
    let action: BattleAction = { type: "endPhase" };
    if (movers.length > 0 && rand(10) > 0) {
      const u = movers[rand(movers.length)];
      const choice = rand(3);
      const targets =
        u.weapon === undefined
          ? []
          : state.units.filter((v) => {
              const d = Math.abs(v.x - u.x) + Math.abs(v.y - u.y);
              return !v.dead && v.force !== u.force && d >= u.weapon!.rangeMin && d <= u.weapon!.rangeMax;
            });
      if (choice === 0 && targets.length > 0) {
        action = { type: "attack", unit: u.id, target: targets[rand(targets.length)].id };
      } else if (choice === 1 && u.moved !== true) {
        const tiles = movementRange(queryFor(state, u, u.movePoints));
        const t = tiles[rand(tiles.length)];
        action = { type: "move", unit: u.id, x: t.x, y: t.y };
      } else {
        action = { type: "wait", unit: u.id };
      }
    }
    let next: GameState;
    try {
      next = reduce(state, action, rec);
    } catch {
      rec.drain();
      continue;
    }
    const rolls = rec.drain();
    const step: EphemerisStep = { action };
    if (rolls.length > 0) step.rolls = rolls;
    if (next.events.length > 0) step.events = [...next.events];
    steps.push(step);
    state = next;
  }
  return steps;
}

describe("속성: 합법성 쌍대", () => {
  it("movementRange가 내놓은 전 타일 = reduce가 수락하는 전 타일", () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const u = state.units[0];
        const range = new Set(
          movementRange(queryFor(state, u, u.movePoints)).map((t) => t.y * W + t.x),
        );
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            let accepted = true;
            try {
              reduce(state, { type: "move", unit: u.id, x, y }, noRolls);
            } catch {
              accepted = false;
            }
            expect(accepted, `(${x},${y}) 수락 여부가 이동 범위와 다르다`).toBe(range.has(y * W + x));
          }
        }
      }),
      PARAMS,
    );
  });
});

describe("속성: 기록 → 직렬화 → 재생 라운드트립", () => {
  it("무작위 수순의 기보가 verify 그린 + stateAt 결정성으로 재생된다", () => {
    fc.assert(
      fc.property(arbState, fc.integer({ min: 0, max: 2 ** 31 - 1 }), (initial, seed) => {
        const steps = playout(initial, seed, 14);
        const file = {
          eph: 1 as const,
          game: "fe17",
          ruleVersion: "fe17-2",
          chapter: { cid: "test", difficulty: "n" as const },
          log: steps,
        };
        const parsed = parseEphemeris(serializeEphemeris(file));
        expect(parsed).toEqual(file);

        expect(replayer.verify(initial, parsed.log)).toEqual({ ok: true, mismatches: [] });

        const timeline = replayer.buildTimeline(initial, parsed.log);
        let s = initial;
        for (let i = 0; i <= steps.length; i++) {
          expect(replayer.stateAt(timeline, i)).toEqual(s);
          if (i < steps.length) s = replayer.applyStep(s, steps[i]);
        }
      }),
      PARAMS,
    );
  });
});

describe("속성: 무작위 로그 fuzz", () => {
  const arbId = fc.constantFrom("u0", "u1", "u2", "u3", "u4", "ghost");
  const arbGarbageAction: fc.Arbitrary<BattleAction> = fc.oneof(
    fc.record({
      type: fc.constant("move" as const),
      unit: arbId,
      x: fc.integer({ min: -1, max: W }),
      y: fc.integer({ min: -1, max: H }),
    }),
    fc.record({ type: fc.constant("attack" as const), unit: arbId, target: arbId }),
    fc.record({ type: fc.constant("wait" as const), unit: arbId }),
    fc.record({ type: fc.constant("endPhase" as const) }),
  );
  const arbGarbageLog = fc.array(
    fc.record({
      action: arbGarbageAction,
      rolls: fc.option(fc.array(fc.integer({ min: 0, max: 99 }), { maxLength: 4 }), { nil: undefined }),
    }),
    { maxLength: 12 },
  );

  it("크래시 0: verify는 던지지 않고 자기일관(ok ⇔ 불일치 0)", () => {
    fc.assert(
      fc.property(arbState, arbGarbageLog, (initial, log) => {
        const steps = log.map((s) => (s.rolls === undefined ? { action: s.action } : s)) as EphemerisStep[];
        const result = replayer.verify(initial, steps);
        expect(result.ok).toBe(result.mismatches.length === 0);
      }),
      PARAMS,
    );
  });

  it("도달 가능한 전 국면에서 HP ∈ [0, max]·자군 exp ∈ [0, 100)", () => {
    fc.assert(
      fc.property(arbState, arbGarbageLog, (initial, log) => {
        let s = initial;
        for (const step of log) {
          try {
            s = replayer.applyStep(s, { action: step.action, rolls: step.rolls ?? [] });
          } catch {
            continue; // 불법 스텝은 심판(거부)이 정상 동작 — 다음 스텝을 계속 시도
          }
          for (const u of s.units) {
            expect(u.hp).toBeGreaterThanOrEqual(0);
            expect(u.hp).toBeLessThanOrEqual(u.stats.hp);
            if (u.force === 0) {
              expect(u.exp).toBeGreaterThanOrEqual(0);
              expect(u.exp).toBeLessThan(100);
            }
          }
        }
      }),
      PARAMS,
    );
  });
});
