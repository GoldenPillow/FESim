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
  type BattleMap,
  type BattleWeapon,
  type GameState,
  type RandomSource,
  type StaffItem,
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
  {
    Kind?: number; Power?: number; RangeI?: number; RangeO?: number; RodType?: number;
    Endurance?: number; Hit?: number; RodExp?: number; UseType?: number; GiveSids?: string[];
  }
>;
const skillTable = JSON.parse(readFileSync(url("../../../data/fe17/tables/skills.json"), "utf-8")) as Record<
  string,
  { BadState?: number; Life?: number }
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
/** 지팡이 사영 — 회복 AI(RD_Heal)가 실제로 쓸 수 있어야 커버리지 측정이 정직해진다. */
const staffOf = (iid: string): StaffItem | undefined => {
  const row = itemTable[iid];
  if (row === undefined || row.Kind !== 7) return undefined;
  return {
    iid,
    power: row.Power ?? 0,
    rangeMin: row.RangeI ?? 1,
    rangeMax: row.RangeO ?? 1,
    uses: row.Endurance ?? 0,
    rodType: row.RodType ?? 0,
    rodExp: row.RodExp ?? 0,
    ...(row.UseType !== undefined ? { useType: row.UseType } : {}),
    // 방해 지팡이 GiveSids → 상태 사영(웹 staffItemFor와 같은 계약). 없으면 reduce가 정직 거부한다.
    ...(() => {
      const gives = (row.GiveSids ?? []).flatMap((sid) => {
        const sk = skillTable[sid];
        return sk === undefined ? [] : [{ sid, badState: Number(sk.BadState ?? 0), life: Number(sk.Life ?? 0) }];
      });
      return gives.length > 0 ? { gives } : {};
    })(),
    ...(row.Hit !== undefined ? { hit: row.Hit } : {}),
  };
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
  jid?: string;
  force: number;
  x: number;
  y: number;
  items?: { iid: string }[];
  ai?: Record<string, unknown>;
}
interface ChapterJson {
  map: {
    width: number;
    height: number;
    terrain: string[][];
    interactions?: { kind: string; x: number; y: number; iid?: string; pid?: string }[];
  };
  groups: { name: string; units: ChapterUnit[] }[];
}

const baseStats = { hp: 24, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };

/** 웹 fe17.ts `unitAiSnapshot`과 같은 계약 — 4슬롯이 가리키는 루틴만 굳힌다. */
function aiSnapshotOf(raw: Record<string, unknown> | undefined) {
  if (raw === undefined) return undefined;
  const routines: Record<string, unknown> = {};
  // 웹 chapterAiRoutines와 같은 계약 — ChangeSeq(Code 6)가 가리키는 루틴까지 전이 수집한다.
  const queue = ["action", "mind", "attack", "move"]
    .map((k) => raw[k] as string | undefined)
    .filter((n): n is string => n !== undefined && n !== "");
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (routines[name] !== undefined) continue;
    const rows = aiTable[name];
    if (rows === undefined) continue;
    routines[name] = rows;
    for (const row of rows) {
      if (row.Code === 6 && typeof row.StrValue0 === "string" && row.StrValue0 !== "") queue.push(row.StrValue0);
    }
  }
  return { ...raw, ...(Object.keys(routines).length > 0 ? { routines } : {}) } as UnitState["ai"];
}

function loadChapter(cid: string): GameState {
  const json = JSON.parse(readFileSync(url(`../../../data/fe17/chapters/${cid}.json`), "utf-8")) as ChapterJson;
  const units: UnitState[] = [];
  for (const group of json.groups) {
    for (const [i, u] of group.units.entries()) {
      const weapons = (u.items ?? []).map((it) => weaponOf(it.iid)).filter((w): w is BattleWeapon => w !== undefined);
      const staves = (u.items ?? []).map((it) => staffOf(it.iid)).filter((w): w is StaffItem => w !== undefined);
      units.push({
        id: `${group.name}#${i}`,
        pid: u.pid,
        ...(u.jid !== undefined ? { jid: u.jid } : {}),
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
        ...(staves.length > 0 ? { staves } : {}),
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
    map: {
      width,
      height,
      costs: { foot: costs },
      terrain: json.map.terrain.map((line) => line.map(cellOf)),
      // 조사 지점 — MI_Treasure·MV_Escape의 이동 목적지 입력(웹 initGame과 같은 계약).
      ...(json.map.interactions !== undefined && json.map.interactions.length > 0
        ? { interactions: json.map.interactions as BattleMap["interactions"] }
        : {}),
    },
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
    const before = state;
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
    // ☠진행 감시 — 웹의 runEnemyAuto와 **같은 계약**. 국면이 안 변한 결정은 그 유닛을 제외한다.
    // (헤드리스는 reduce가 던지므로 여기 도달하면 이미 레드지만, 계약 동형성을 위해 같이 둔다.)
    if (state === before && decision.unit !== undefined) {
      memory = { ...memory, skipped: { ...memory.skipped, [decision.unit]: "국면 무변화" } };
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
  /**
   * ★다턴 소크 — 단일 페이즈 프로브가 못 잡는 결함류를 잡는다.
   * 왜 위험했나 = m001에서 **미등록 Lua 네이티브 1건이 endPhase를 영구 거부**해 적턴 자동이
   * 페이즈를 영영 못 닫았는데, 화면·콘솔·결손 패널이 전부 침묵했다(2026-08-18).
   * 이 게이트가 지키는 것 = (1) AI가 낸 액션을 reduce가 거부하지 않는다(합법성 표류 0)
   * (2) 같은 국면 → 같은 결정으로 도는 무진행 루프가 없다 (3) endPhase가 항상 진행한다.
   * 대표 챕터만 돈다(전 54챕터 소크는 45초 — 상시 게이트로는 과하다).
   */
  it("다턴 소크 — 액션 거부 0·무진행 루프 0·페이즈 진행 보장", () => {
    const problems: string[] = [];
    let acts = 0;
    for (const cid of ["m001", "m006", "m020", "s015"]) {
      let state: GameState = { ...loadChapter(cid), phase: 0 };
      let memory = emptyAiMemory();
      const ai = createAi(createCalculator(data));
      for (let p = 0; p < 8 && state.outcome === undefined; p++) {
        if (state.phase === 0) {
          state = reduce(state, { type: "endPhase" }, battleRng);
          continue;
        }
        for (let guard = 0; ; guard++) {
          if (guard > 400) {
            problems.push(`${cid} p${p} 무진행 루프`);
            break;
          }
          const before = state;
          const d = ai.next(state, stubbornRng, memory);
          memory = d.memory;
          if (d.actions.length === 0) break;
          try {
            for (const a of d.actions) {
              state = reduce(state, a, battleRng);
              acts += 1;
            }
          } catch (e) {
            problems.push(`${cid} p${p} AI 액션 거부: ${String(e).slice(0, 80)}`);
            break;
          }
          if (state === before && d.unit !== undefined) {
            memory = { ...memory, skipped: { ...memory.skipped, [d.unit]: "무진행" } };
          }
        }
        state = reduce(state, { type: "endPhase" }, battleRng);
      }
    }
    expect(problems).toEqual([]);
    expect(acts).toBeGreaterThan(50); // 실제로 돌았다는 증거
  }, 60000);
});
