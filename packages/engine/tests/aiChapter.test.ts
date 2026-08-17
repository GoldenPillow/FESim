/**
 * 적턴 자동 헤드리스 실측 — 변환 챕터를 그대로 띄우고 `createAi().next`를 반복 실행한다.
 *
 * 이 게이트가 지키는 것: (1) 적 페이즈가 오류 없이 끝까지 돈다 (2) 결손 유닛이 **몰래 대기**로
 * 흡수되지 않고 사유와 함께 노출된다. ☠수치(대미지·격파율)는 여기서 주장하지 않는다 —
 * 스탯 사영이 웹의 deriveStats 경로가 아니라 고정 스탯이기 때문이다(no-fiction).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createAi,
  createCalculator,
  createReducer,
  emptyAiMemory,
  type BattleAction,
  type BattleWeapon,
  type GameState,
  type RandomSource,
  type TerrainCell,
  type UnitState,
} from "@fesim/engine";

const url = (p: string) => new URL(p, import.meta.url);
const data: CalculatorData = JSON.parse(readFileSync(url("../../../data/fe17/tables/calculator.json"), "utf-8"));
const reduce = createReducer(createCalculator(data));

const terrainTable = JSON.parse(readFileSync(url("../../../data/fe17/tables/terrain.json"), "utf-8")) as Record<
  string,
  { CostName?: string; Avoid?: number; Defense?: number; Hp_N?: number; Heal?: number; MoveFirst?: number; cost?: Record<string, number> }
>;
const itemTable = JSON.parse(readFileSync(url("../../../data/fe17/tables/items.json"), "utf-8")) as Record<
  string,
  { Kind?: number; Power?: number; RangeI?: number; RangeO?: number }
>;
const aiTable = JSON.parse(readFileSync(url("../../../data/fe17/tables/ai.json"), "utf-8")) as Record<
  string,
  { Active: number; Code: number; Mind: number; StrValue0?: string; StrValue1?: string; Trans: number }[]
>;

const WEAPON_KINDS = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
const sword: BattleWeapon = { might: 5, hit: 100, crit: 0, weight: 5, rangeMin: 1, rangeMax: 1, kind: 1 };
const weaponOf = (iid: string): BattleWeapon | undefined => {
  const row = itemTable[iid];
  if (row === undefined || !WEAPON_KINDS.has(row.Kind ?? 0) || (row.RangeO ?? 0) < 1) return undefined;
  return { ...sword, iid, might: row.Power ?? 0, rangeMin: row.RangeI ?? 1, rangeMax: row.RangeO ?? 1, kind: row.Kind ?? 0 };
};
const cellOf = (tid: string): TerrainCell => ({
  tid,
  ...(terrainTable[tid]?.CostName !== undefined ? { costName: terrainTable[tid]!.CostName } : {}),
  avoid: terrainTable[tid]?.Avoid ?? 0,
  def: terrainTable[tid]?.Defense ?? 0,
  ...(terrainTable[tid]?.Heal !== undefined ? { heal: terrainTable[tid]!.Heal } : {}),
});

interface ChapterUnit {
  pid: string;
  force: number;
  x: number;
  y: number;
  items?: { iid: string }[];
  ai?: Record<string, unknown>;
}
interface ChapterJson {
  map: { width: number; height: number; terrain: string[][] };
  groups: { name: string; units: ChapterUnit[] }[];
}

const baseStats = { hp: 24, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };

/** 웹 fe17.ts `unitAiSnapshot`과 같은 계약 — 4슬롯이 가리키는 루틴만 굳힌다. */
function aiSnapshotOf(raw: Record<string, unknown> | undefined) {
  if (raw === undefined) return undefined;
  const routines: Record<string, unknown> = {};
  for (const key of ["action", "mind", "attack", "move"]) {
    const name = raw[key] as string | undefined;
    if (name === undefined || routines[name] !== undefined) continue;
    const rows = aiTable[name];
    if (rows !== undefined) routines[name] = rows;
  }
  return { ...raw, ...(Object.keys(routines).length > 0 ? { routines } : {}) } as UnitState["ai"];
}

function loadChapter(cid: string): GameState {
  const json = JSON.parse(readFileSync(url(`../../../data/fe17/chapters/${cid}.json`), "utf-8")) as ChapterJson;
  const units: UnitState[] = [];
  for (const group of json.groups) {
    for (const [i, u] of group.units.entries()) {
      const weapons = (u.items ?? []).map((it) => weaponOf(it.iid)).filter((w): w is BattleWeapon => w !== undefined);
      units.push({
        id: `${group.name}#${i}`,
        pid: u.pid,
        force: u.force,
        x: u.x,
        y: u.y,
        hp: baseStats.hp,
        stats: baseStats,
        level: 1,
        exp: 0,
        movePoints: 5,
        moveType: "foot",
        ...(weapons.length > 0 ? { weapon: weapons[0], weapons } : {}),
        ...(aiSnapshotOf(u.ai) !== undefined ? { ai: aiSnapshotOf(u.ai) } : {}),
        acted: false,
        dead: false,
        broken: false,
      });
    }
  }
  const { width, height } = json.map;
  const costs = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => terrainTable[json.map.terrain[y]![x]!]?.cost?.["foot"] ?? 1),
  );
  return {
    turn: 1,
    phase: 0,
    difficulty: "n",
    map: { width, height, costs: { foot: costs }, terrain: json.map.terrain.map((line) => line.map(cellOf)) },
    units,
    events: [],
  };
}

/** 결정적 AI 난수 — 동점 코인플립을 항상 "먼저 찾은 후보 유지"로 고정한다(재현성). */
const stubbornRng: RandomSource = { next: () => 1 };
const battleRng: RandomSource = { next: () => 0 }; // 항상 명중 — 페이즈가 실제로 진행되게

interface PhaseReport {
  actions: BattleAction[];
  deficits: { unit: string; reason: string }[];
  acted: number;
  total: number;
}

/** 한 페이즈를 자동으로 돌린다 — BoardIsland의 `runEnemyAuto`와 같은 루프. */
function runPhase(start: GameState): { state: GameState; report: PhaseReport } {
  const ai = createAi(createCalculator(data));
  let state = start;
  let memory = emptyAiMemory();
  const actions: BattleAction[] = [];
  const total = state.units.filter((u) => !u.dead && u.force === state.phase).length;
  for (let guard = 0; guard < 500; guard++) {
    const decision = ai.next(state, stubbornRng, memory);
    memory = decision.memory;
    if (decision.actions.length === 0) {
      return {
        state,
        report: {
          actions,
          deficits: decision.deficits.map((d) => ({ unit: d.unit, reason: d.reason })),
          acted: state.units.filter((u) => u.force === start.phase && (u.acted || u.dead)).length,
          total,
        },
      };
    }
    for (const action of decision.actions) {
      actions.push(action);
      state = reduce(state, action, battleRng);
    }
  }
  throw new Error("적턴 자동이 수렴하지 않았다(500 액션 초과)");
}

describe("적턴 자동 헤드리스 (m002·m003)", () => {
  for (const cid of ["m002", "m003"]) {
    it(`${cid} 적 페이즈가 결손 0으로 끝까지 돈다`, () => {
      const s0 = loadChapter(cid);
      const { report } = runPhase({ ...s0, phase: 1 });
      // 결손이 있으면 사유가 반드시 노출된다 — 몰래 대기(wait 강하)로 흡수되지 않는다.
      for (const d of report.deficits) expect(d.reason).not.toBe("");
      expect(report.deficits).toEqual([]);
      // 오류 없이 액션이 실제로 나왔다(전 유닛 행동이 아니라 — 잠든 유닛과 Idle 유닛은
      // 코드상 **아무것도 하지 않는 것이 정답**이다: ActionMoveIdle 0x194D890은 None을 반환하고,
      // 비활성 유닛은 Active 게이트에서 전 명령이 걸러진다 — H_handlers §3·AI_ENGINE §4-2).
      expect(report.actions.length).toBeGreaterThan(0);
    });
  }

  it("m003 — 잠든 적은 움직이지 않고, 깨어난 적만 행동한다 (AC_TurnAttackRange OR 게이트)", () => {
    const s0 = loadChapter("m003");
    const { report } = runPhase({ ...s0, phase: 1 });
    const movers = new Set(report.actions.map((a) => ("unit" in a ? a.unit : "")));
    // 행동한 유닛은 전부 AI_AC_Everytime(즉시 활성) 유닛이어야 한다.
    for (const id of movers) {
      const u = s0.units.find((v) => v.id === id)!;
      expect(u.ai?.action).toBe("AI_AC_Everytime");
    }
  });

  it("★여러 턴에 걸친 접근 — 먼 적이 턴마다 자군 쪽으로 가까워진다 (MoveTo 0x1948E20)", () => {
    const s0 = loadChapter("m003");
    // 전 적을 즉시 활성으로 바꿔 이동 경로만 본다(개시 조건은 위 테스트가 따로 지킨다).
    // ★루틴명을 바꿀 때는 그 루틴 본문도 같이 실어야 한다 — 안 그러면 "루틴 미탑재" 결손이 된다.
    const awake: GameState = {
      ...s0,
      phase: 1,
      units: s0.units.map((u) =>
        u.force === 1 && u.ai !== undefined
          ? {
              ...u,
              ai: {
                ...u.ai,
                action: "AI_AC_Everytime",
                routines: { ...u.ai.routines, AI_AC_Everytime: aiTable["AI_AC_Everytime"]! },
              },
            }
          : u,
      ),
    };
    const players = awake.units.filter((u) => u.force === 0 && !u.dead);
    const nearest = (u: UnitState): number =>
      Math.min(...players.map((p) => Math.abs(p.x - u.x) + Math.abs(p.y - u.y)));
    const far = awake.units.filter((u) => u.force === 1 && nearest(u) > 8);
    expect(far.length).toBeGreaterThan(0);
    const before = new Map(far.map((u) => [u.id, nearest(u)]));

    const { state } = runPhase(awake);
    let closer = 0;
    for (const u of state.units) {
      const was = before.get(u.id);
      if (was === undefined || u.dead) continue;
      if (nearest(u) < was) closer += 1;
    }
    expect(closer).toBeGreaterThan(0); // 접근이 실제로 일어난다
  });
});
