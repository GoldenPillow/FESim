import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  type BattleWeapon,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";
import { createEventedReducer, createEventSession, type EventHost } from "@fesim/engine/events";

/**
 * 이벤트 엔진(MP2) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 발화 시점 = TurnEnd(현 페이즈, 전환 전) → Turn·TurnAfter(새 페이즈, 전환 후) — 순서가 갈리면
 *     증원이 한 페이즈 밀린다(LUA_BINDINGS §7).
 * (2) 조건 문자열 = 1회성 발화 플래그 기계(자동 Entry 0 → 발화 후 1 잠금) — 안 잠그면 매턴 재발화.
 * (3) 와일드카드 -1 = 무제한(IsValue 0x1DE5690) — 놓치면 매턴 이벤트가 전부 침묵.
 * (4) 勝利/敗北 변수 = 스크립트 직접 승패(20개 챕터) — 감시 없으면 승리가 안 뜬다.
 * (5) endPhase 절대 재생 = base 재계산 + 기록 이벤트 오버레이 — 열람 경로가 Lua 없이 증원을 복원한다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const base = createReducer(createCalculator(data));

const noRolls: RandomSource = {
  next: () => {
    throw new Error("이 스텝은 난수를 소비하지 않는다");
  },
};
const rolls = (values: number[]): RandomSource => {
  let i = 0;
  return { next: () => values[i++] ?? 0 };
};

const baseStats = { hp: 20, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword: BattleWeapon = { might: 30, hit: 200, crit: 0, weight: 5, rangeMin: 1, rangeMax: 1, kind: 1 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    pid: `PID_${partial.id}`,
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

function state(units: UnitState[], phase = 0): GameState {
  return {
    turn: 1,
    phase,
    difficulty: "n",
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

const spawnA = (): UnitState => unit({ id: `spawn${Math.random() < 2 ? "" : ""}A`, force: 1, x: 7, y: 7 });
const host = (over?: Partial<EventHost>): EventHost => ({
  spawnGroup: (group) => (group === "Wave" ? [spawnA()] : []),
  ...over,
});

const SCRIPT = `
Include("Common")
function Startup()
  WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
  VariableEntry("카운터", 0)
  EventEntryTurn(wave, 2, 2, FORCE_PLAYER)
  EventEntryTurnEnd(endMark, -1, -1, FORCE_ENEMY, "적턴종료_済")
  EventEntryTurn(everyTurn, -1, -1, FORCE_PLAYER, condition_pos)
  EventEntryDie(onDie, "PID_e", FORCE_ENEMY)
end
function MapOpening()
  Dispos("Opening", 0)
end
function wave()
  Dispos("Wave", 1)
end
function endMark()
  VariableSet("적턴종료턴", MapGetTurn())
end
function condition_pos()
  return UnitGetX("PID_p") == 3
end
function everyTurn()
  VariableSet("카운터", VariableGet("카운터") + 1)
end
function onDie()
  local u = MindGetUnit()
  VariableSet("격파좌표", UnitGetX(u))
  VariableSet("勝利", 1)
end
`;
const COMMON_MIN = `
FORCE_PLAYER = 0
FORCE_ENEMY = 1
FORCE_ALLY = 2
`;

const mkSession = (h = host(), script = SCRIPT) =>
  createEventSession({ sources: { common: COMMON_MIN, test: script }, chapter: "test", host: h });

describe("파괴 트리거(EventEntryDestroy) — 완파 시 발화", () => {
  const SCRIPT_D = `
Include("Common")
function Startup()
  WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
  EventEntryDestroy(onBreak, 1, 0, 1, 0)
end
function onBreak()
  VariableSet("파괴발화", 1)
end
`;
  const mk = () =>
    createEventSession({ sources: { common: COMMON_MIN, test: SCRIPT_D }, chapter: "test", host: host() });

  it("destroy 액션으로 범위 내 구조물이 완파되면 콜백이 돈다 — 부분 파괴는 침묵", () => {
    const session = mk();
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 0, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 7, y: 7 });
    const s0raw = state([p, e]);
    s0raw.structures = [{ x: 1, y: 0, w: 1, h: 1, tid: "TID_壊れる壁", group: 0, hp: 45, costs: { foot: 255 } }];
    let s = session.setup(s0raw).state;
    s = reduce(s, { type: "destroy", unit: "p", x: 1, y: 0 }, noRolls); // 45 − 40 = 5 잔존
    expect(s.variables?.["파괴발화"]).toBeUndefined();
    for (const _ of [1, 2]) s = reduce(s, { type: "endPhase" }, noRolls);
    s = reduce(s, { type: "destroy", unit: "p", x: 1, y: 0 }, noRolls); // 완파
    expect(s.structures?.[0]?.hp).toBe(0);
    expect(s.variables?.["파괴발화"]).toBe(1);
  });
});

describe("이벤트 세션 — 등록·발화·조건", () => {
  it("setup: Startup 규칙·변수 + MapOpening 스폰 + 1턴 Turn 발화(조건 함수 = 상태 질의)", () => {
    const h: EventHost = {
      spawnGroup: (group) => (group === "Opening" ? [unit({ id: "op", force: 1, x: 6, y: 6 })] : []),
    };
    const session = mkSession(h);
    const p = unit({ id: "p", force: 0, x: 3, y: 0 });
    const r = session.setup(state([p]));
    expect(r.state.winRule?.enemyLessThan).toBe(-1);
    expect(r.state.units.some((u) => u.id === "op")).toBe(true); // MapOpening Dispos
    expect(r.state.variables?.["카운터"]).toBe(1); // 조건 함수 UnitGetX == 3 참 → 1턴 발화
    expect(r.events.some((e) => e.type === "spawn")).toBe(true);
  });

  it("조건 함수 거짓이면 침묵 — 좌표를 옮기면 발화하지 않는다", () => {
    const session = mkSession();
    const p = unit({ id: "p", force: 0, x: 5, y: 0 });
    const r = session.setup(state([p]));
    expect(r.state.variables?.["카운터"]).toBe(0);
  });

  it("evented endPhase: TurnEnd(적 페이즈, 전환 전) → Turn(새 페이즈, 전환 후) 순서와 2턴 증원", () => {
    const session = mkSession();
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 3, y: 0 });
    const e = unit({ id: "e", force: 1, x: 7, y: 0, weapon: sword });
    let s = session.setup(state([p, e])).state;
    s = reduce(s, { type: "endPhase" }, noRolls); // 자군 → 적군 (턴 1)
    expect(s.units.some((u) => u.pid === "PID_spawnA")).toBe(false); // 2턴 전 — 증원 없음
    s = reduce(s, { type: "endPhase" }, noRolls); // 적군 → 자군 (턴 2): TurnEnd(적) → Turn(자군 2턴)
    expect(s.variables?.["적턴종료턴"]).toBe(1); // TurnEnd는 전환 전(턴 1)에 발화했다
    expect(s.units.some((u) => u.pid === "PID_spawnA")).toBe(true); // 2턴 자군 개시 증원
    expect(s.variables?.["카운터"]).toBe(2); // 1턴 + 2턴
  });

  it("조건 문자열 = 1회성 잠금 — 두 번째 적 페이즈 종료엔 재발화하지 않는다", () => {
    const session = mkSession();
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 5, y: 0 });
    const e = unit({ id: "e", force: 1, x: 7, y: 0, weapon: sword });
    let s = session.setup(state([p, e])).state;
    for (const _ of [1, 2, 3, 4]) s = reduce(s, { type: "endPhase" }, noRolls); // 2턴 적군 종료까지
    expect(s.variables?.["적턴종료턴"]).toBe(1); // 2턴 종료(값 2)로 덮이지 않았다 — 잠금 확인
    expect(s.variables?.["적턴종료_済"]).toBe(1);
  });

  it("Die 발화 — 전투 격파가 스크립트 트리거(문맥 MindGetUnit 포함)와 勝利 판정을 돌린다", () => {
    const session = mkSession();
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 3, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 4, y: 0, hp: 5 });
    const filler = unit({ id: "f", force: 1, x: 7, y: 7 }); // 전멸 승리 방지(rout는 -1로 꺼짐)
    let s = session.setup(state([p, e, filler])).state;
    s = reduce(s, { type: "attack", unit: "p", target: "e" }, rolls([0]));
    expect(s.variables?.["격파좌표"]).toBe(4);
    expect(s.outcome).toBe("victory"); // 勝利 변수 → settleOutcome
  });

  it("enemyLessThan = -1이면 전멸로도 승리가 나지 않는다(판정 무효화)", () => {
    const session = mkSession(host(), `
Include("Common")
function Startup()
  WinRuleSetEnemyNumberLessThanOrEqualTo(-1)
end`);
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 3, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 4, y: 0, hp: 5 });
    let s = session.setup(state([p, e])).state;
    s = reduce(s, { type: "attack", unit: "p", target: "e" }, rolls([0]));
    expect(s.units[1].dead).toBe(true);
    expect(s.outcome).toBeUndefined();
  });

  it("endPhase 절대 재생 — 기록 이벤트 오버레이로 Lua 세션 없이 증원이 복원된다", () => {
    const session = mkSession();
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 5, y: 0 });
    const e = unit({ id: "e", force: 1, x: 7, y: 0, weapon: sword });
    const s0 = session.setup(state([p, e])).state;
    const s1 = reduce(s0, { type: "endPhase" }, noRolls);
    const s2 = reduce(s1, { type: "endPhase" }, noRolls); // 증원 발생 스텝
    const { applyStep } = createReplayer(base); // ☠열람 경로 상정 — 세션 무반입
    const r1 = applyStep(s0, { action: { type: "endPhase" }, events: s1.events });
    const r2 = applyStep(r1, { action: { type: "endPhase" }, events: s2.events });
    expect(r2.units.some((u) => u.pid === "PID_spawnA")).toBe(true);
    expect(r2.variables?.["적턴종료턴"]).toBe(1);
    expect(r2.phase).toBe(s2.phase);
    expect(r2.turn).toBe(s2.turn);
  });
});

describe("setup = 기보 스텝 0", () => {
  it("evented reduce의 setup 액션이 초기 스폰·규칙을 만들고, 기록 이벤트만으로 절대 복원된다", () => {
    const h: EventHost = {
      spawnGroup: (group) => (group === "Opening" ? [unit({ id: "op", force: 1, x: 6, y: 6 })] : []),
    };
    const session = mkSession(h);
    const reduce = createEventedReducer(base, session);
    const raw = state([unit({ id: "p", force: 0, x: 3, y: 0 })]);
    const done = reduce(raw, { type: "setup" }, noRolls);
    expect(done.units.some((u) => u.id === "op")).toBe(true);
    expect(done.winRule?.enemyLessThan).toBe(-1);
    // 열람 경로 상정 — 세션 없이 base 재생기로 setup 스텝을 절대 복원.
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(raw, { action: { type: "setup" }, events: done.events });
    expect(replayed.units.some((u) => u.id === "op")).toBe(true);
    expect(replayed.winRule?.enemyLessThan).toBe(-1);
    expect(replayed.variables?.["카운터"]).toBe(done.variables?.["카운터"]);
  });
});

describe("이벤트 세션 — 실 스크립트 통합(m003)", () => {
  const sources = {
    common: readFileSync(new URL("../../../data/fe17/scripts/common.lua", import.meta.url), "utf-8"),
    m003: readFileSync(new URL("../../../data/fe17/scripts/m003.lua", import.meta.url), "utf-8"),
  };
  const chapter = JSON.parse(
    readFileSync(new URL("../../../data/fe17/chapters/m003.json", import.meta.url), "utf-8"),
  ) as { groups: { name: string; units: { pid: string; force: number; x: number; y: number }[] }[] };

  const project = (group: string): UnitState[] => {
    const g = chapter.groups.find((x) => x.name === group);
    return (g?.units ?? []).map((u, i) =>
      unit({ id: `${group}#${i}`, pid: u.pid, force: u.force, x: u.x, y: u.y }),
    );
  };
  const h: EventHost = { spawnGroup: project };

  it("setup(OwnArmy·Lueur 배치) → 2턴 자군 개시에 필렌 증원 3기 스폰 + UnitJoin 자군 편입", () => {
    const session = createEventSession({ sources, chapter: "m003", host: h });
    const reduce = createEventedReducer(base, session);
    // 자동 배치(Dispos 없는 그룹) = Enemy — 스크립트가 소환하지 않는 그룹은 호스트가 초기 국면에 싣는다.
    let s = session.setup(state(project("Enemy"))).state;
    expect(s.units.filter((u) => u.force === 0).length).toBe(4); // OwnArmy 3 + Lueur 1 (MapOpening)
    expect(s.variables?.["禁止_輸送隊"]).toBe(2);
    s = reduce(s, { type: "endPhase" }, noRolls); // 자군 → 적군
    s = reduce(s, { type: "endPhase" }, noRolls); // 적군 → 자군 턴 2: 필렌 가세
    const filene = s.units.filter((u) => u.id.startsWith("Filene#"));
    expect(filene.length).toBe(3);
    expect(filene.every((u) => u.force === 0)).toBe(true); // UnitJoin — force 2 → 0
    expect(s.events.filter((e) => e.type === "spawn").length).toBe(3);
    expect(s.events.filter((e) => e.type === "transfer").length).toBe(3);
  });

  it("미지 네이티브·미배선 호출은 기록으로 표면화된다(조용한 소실 금지)", () => {
    const session = createEventSession({ sources, chapter: "m003", host: h });
    session.setup(state(project("Enemy")));
    // m003 경로에서 미지 호출이 있었다면 unknownCalls에 남는다 — 있어도 실패는 아니다(정직성 검사).
    expect(session.unknownCalls()).toEqual([]); // m003 전 경로 = 미지 호출 0(전 표면 커버 실측)
  });
});

describe("이벤트 세션 — 실 스크립트 통합(m002 다국면)", () => {
  const sources = {
    common: readFileSync(new URL("../../../data/fe17/scripts/common.lua", import.meta.url), "utf-8"),
    m002: readFileSync(new URL("../../../data/fe17/scripts/m002.lua", import.meta.url), "utf-8"),
  };
  const chapter = JSON.parse(
    readFileSync(new URL("../../../data/fe17/chapters/m002.json", import.meta.url), "utf-8"),
  ) as { groups: { name: string; units: { pid: string; force: number; x: number; y: number }[] }[] };

  it("루미엘 1차 격파 → 적 페이즈 종료에 1회전 종료·2회전 개시(삭제·재배치·스폰·엠블렘·紋章氣)", () => {
    const spawned = new Set<string>();
    const project = (group: string): UnitState[] => {
      if (spawned.has(group)) return []; // 웹 호스트와 동일 계약 — 같은 그룹 재스폰 미재현
      spawned.add(group);
      const g = chapter.groups.find((x) => x.name === group);
      return (g?.units ?? []).map((u, i) =>
        unit({ id: `${group}#${i}`, pid: u.pid, force: u.force, x: u.x, y: u.y }),
      );
    };
    const h: EventHost = {
      spawnGroup: project,
      skillRow: (sid) => ({ Sid: sid }),
      godUnit: (_u, gid) => ({ engage: { count: 0, limit: 7, turnLimit: 3, turn: 0, engaging: false, ...(gid === "" ? {} : {}) } }),
    };
    const session = createEventSession({ sources, chapter: "m002", host: h });
    const reduce = createEventedReducer(base, session);
    // 자동 배치 = Dispos 없는 그룹(Player·Enemy) — 웹 초기 배치 규칙과 동일.
    let s = session.setup(state([...project("Player"), ...project("Enemy")])).state;
    const rumiere = () => s.units.filter((u) => u.pid === "PID_M002_ルミエル" && !u.dead);
    expect(rumiere()[0]?.force).toBe(1); // MapOpening UnitTransfer(FORCE_ENEMY)
    expect(s.units.filter((u) => u.id.startsWith("EnemyIllusion#")).length).toBe(2); // 환영병 소환
    // 뤼르로 루미엘 공격 — HP 20 vs 위력 30 = 즉사(테스트 스탯). Die 이벤트 → 1차 격파 플래그.
    const lueur = s.units.find((u) => u.pid === "PID_リュール")!;
    const boss = rumiere()[0];
    s = { ...s, units: s.units.map((u) => (u.id === lueur.id ? { ...u, x: boss.x - 1, y: boss.y, weapon: sword } : u)) };
    s = reduce(s, { type: "attack", unit: lueur.id, target: boss.id }, rolls([0]));
    // ★1회전 종료는 같은 행동 안에서 연쇄한다 — Die(1차 격파 플래그) → Fixed(pid="" 와일드카드,
    // "자군이 죽였을 때" 경로) → 一回戦終了(잔적 정리·재배치·Enemy2 소환·스킬 장비).
    expect(s.units.find((u) => u.id === "Enemy#0")!.dead).toBe(true); // 1회전 루미엘 = UnitDelete
    expect(s.units.filter((u) => u.id.startsWith("EnemyIllusion#") && !u.dead).length).toBe(0); // 잔적 전멸
    const boss2 = s.units.find((u) => u.id.startsWith("Enemy2#") && !u.dead);
    expect(boss2).toBeDefined();
    expect(boss2!.statuses?.some((st) => st.sid === "SID_相手の必殺０")).toBe(true); // スキル装備
    // 자군 4명 재배치·전회복(UnitSetPos + UnitResetParam) — 뤼르 (6,3).
    const l2 = s.units.find((u) => u.pid === "PID_リュール")!;
    expect({ x: l2.x, y: l2.y }).toEqual({ x: 6, y: 3 });
    expect(l2.hp).toBe(l2.stats.hp);
    // 二回戦開始 = 다음 자군 턴 개시 발화(EventEntryTurn -1,-1,PLAYER + 조건) — 페이즈를 돌린다.
    s = reduce(s, { type: "endPhase" }, noRolls); // 자군 → 적군
    s = reduce(s, { type: "endPhase" }, noRolls); // 적군 → 자군 턴 2: 二回戦開始
    const boss3 = s.units.find((u) => u.id.startsWith("Enemy2#") && !u.dead)!;
    expect(boss3.engage).toBeDefined(); // UnitCreateGodUnit — 엠블렘 유닛화
    expect(boss3.engage!.count).toBe(7); // UnitSetEngageCount(7)
    expect(s.units.filter((u) => u.id.startsWith("EnemyIllusion2_") && !u.dead).length).toBe(5);
    expect(s.crests).toContainEqual({ x: 8, y: 4 }); // MapOverlapSetOne 紋章氣
    expect(s.outcome).toBeUndefined(); // 전멸 승리는 -1로 꺼져 있다
  });
});

/**
 * 변환 챕터 전수 세션 부트 스모크 — 스크립트가 실린 모든 챕터가 스텝 0(setup)을 오류 0으로 통과해야 한다.
 * ☠미등록 네이티브는 Lua 오류로 터진다(정직 거부) → 보드가 원시판으로 강하한다. 신규 챕터를 변환하면
 * 이 스모크가 먼저 빨개져서 "어느 네이티브가 없나"를 실패 메시지로 뱉는다.
 * 구현 불가로 남긴 결손은 HONEST_GAPS에 박제한다(몰래 스킵 금지 — 목록이 곧 미구현 장부다).
 */
describe("변환 챕터 전수 세션 부트 스모크", () => {
  const scriptDir = fileURLToPath(new URL("../../../data/fe17/scripts/", import.meta.url));
  const chapterDir = fileURLToPath(new URL("../../../data/fe17/chapters/", import.meta.url));
  const scriptNames = readdirSync(scriptDir).filter((f) => f.endsWith(".lua")).map((f) => f.slice(0, -4));
  const commons = scriptNames.filter((n) => n.startsWith("common"));
  // 챕터 = chapters/*.json 존재 기준 — 스크립트 목록엔 Include 부속(g002_gimmick 등)이 섞여 있다.
  const chapterJsons = new Set(
    readdirSync(chapterDir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)),
  );
  const chapters = scriptNames.filter((n) => !n.startsWith("common") && chapterJsons.has(n)).sort();
  const sources = Object.fromEntries(
    scriptNames.map((n) => [n, readFileSync(`${scriptDir}${n}.lua`, "utf-8")]),
  );

  /**
   * 부트를 못 하는 챕터 = 정직 결손. 값 = 실패 메시지에 반드시 나오는 조각(구현되면 이 테스트가 빨개진다).
   * 결손 사유는 세 갈래뿐이다 — (1) 아이템 iid 사영 부재 (2) 미모델 유닛 속성 (3) 원문 스크립트 문법 오류.
   */
  const HONEST_GAPS: Record<string, string[]> = {
    // (1) 아이템 iid 미사영 — BattleWeapon·StaffItem·ConsumableItem에 iid가 없다. 호출 전수 8건 중
    //     6건이 **엠블렘 무기**(EngageItems)라 소지품에도 없다 → 어느 쪽도 해석 불가.
    e005: ["UnitPutOffItem"],
    m010: ["UnitSetItemEquip"],
    m014: ["UnitSetItemEquip"],
    m020: ["UnitSetItemEquip"],
    // (2) 미모델 유닛 속성 — hpStock(dispos에 실재하나 UnitState 미보유) · MPID(인물 이름 ID 미사영).
    e006: ["UnitSetHpStock"],
    m022: ["UnitGetMPID"],
    // (3) ☠원문(romfs 추출본) 자체의 Lua 문법 오류 — `if ... then return x` 뒤에 end 없이 다음 if가 온다.
    //     파이프라인 변환 산물이 아니라 추출 원문 그대로다(extracted/scripts/g001.txt:157 대조).
    g001: ["Lua 문법"],
    g004: ["Lua 문법"],
  };

  // 지형 TID → CostName·회피/수비 — 보드 팔레트(fe17.ts)가 쓰는 것과 같은 표.
  const terrainTable = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/terrain.json", import.meta.url), "utf-8"),
  ) as Record<string, { CostName?: string; Avoid?: number; Defense?: number; Hp_N?: number }>;
  const cellOf = (tid: string) => ({
    tid,
    ...(terrainTable[tid]?.CostName !== undefined ? { costName: terrainTable[tid].CostName } : {}),
    avoid: terrainTable[tid]?.Avoid ?? 0,
    def: terrainTable[tid]?.Defense ?? 0,
  });

  interface ChapterJson {
    map: {
      width: number;
      height: number;
      terrain: string[][];
      overlays?: { x: number; y: number; tid: string }[];
      structures?: { x: number; y: number; w: number; h: number; tid: string; group: number }[];
    };
    groups: { name: string; units: { pid: string; force: number; x: number; y: number }[] }[];
  }

  it(`스크립트가 있는 챕터 전수(${chapters.join(", ")})가 스크립트+데이터 짝을 갖는다`, () => {
    expect(chapters.length).toBeGreaterThanOrEqual(54); // 전량 변환 완료판
    expect(commons).toContain("common");
  });

  for (const cid of chapters) {
    const json = JSON.parse(readFileSync(`${chapterDir}${cid}.json`, "utf-8")) as ChapterJson;
    const src = sources[cid];
    // 자동 배치 = Dispos로 소환되지 않는 그룹(웹 초기 배치 규칙과 동일 — fe17.ts disposGroups).
    const disposed = new Set([...src.matchAll(/Dispos\(\s*"([^"]+)"/g)].map((m) => m[1]));
    const project = (group: string): UnitState[] => {
      const g = json.groups.find((x) => x.name === group);
      return (g?.units ?? []).map((u, i) =>
        unit({ id: `${group}#${i}`, pid: u.pid, force: u.force, x: u.x, y: u.y }),
      );
    };
    const initial = json.groups.filter((g) => !disposed.has(g.name)).flatMap((g) => project(g.name));
    const { width, height } = json.map;
    const s0: GameState = {
      turn: 1,
      phase: 0,
      difficulty: "n",
      map: {
        width,
        height,
        costs: { foot: Array.from({ length: height }, () => Array.from({ length: width }, () => 1)) },
        terrain: json.map.terrain.map((line) => line.map(cellOf)),
        ...(json.map.overlays === undefined
          ? {}
          : { overlays: json.map.overlays.map((o) => ({ x: o.x, y: o.y, tid: o.tid, cell: cellOf(o.tid) })) }),
      },
      ...(json.map.structures === undefined
        ? {}
        : {
            structures: json.map.structures.map((s) => ({
              ...s,
              hp: terrainTable[s.tid]?.Hp_N ?? 0,
              ...(s.tid === "TID_屋根" ? { roof: true } : {}),
            })),
          }),
      units: initial,
      events: [],
    };
    const h: EventHost = {
      spawnGroup: project,
      skillRow: (sid) => ({ Sid: sid }),
      godUnit: () => ({ engage: { count: 0, limit: 7, turnLimit: 3, turn: 0, engaging: false } }),
      gainItem: () => ({}),
    };
    const gap = HONEST_GAPS[cid];

    if (gap !== undefined) {
      it(`${cid}: 정직 결손 — 미구현 네이티브 ${gap.join(", ")}로 부트가 거부된다`, () => {
        const boot = () => createEventSession({ sources, chapter: cid, host: h }).setup(s0);
        expect(boot).toThrow(new RegExp(gap.join("|")));
      });
      continue;
    }

    it(`${cid}: createEventSession + setup(스텝 0)이 오류 0`, () => {
      const session = createEventSession({ sources, chapter: cid, host: h });
      const r = session.setup(s0);
      expect(r.state.units.length).toBeGreaterThan(0);
      // 미지 호출은 실패가 아니라 표면 — 있으면 무엇이 미배선인지 남는다(정직성).
      expect(session.unknownCalls().map(([n]) => n)).toEqual([]);
    });
  }
});

describe("이벤트 타일 질의·문 개방", () => {
  const TILE_SCRIPT = `
Include("Common")
function Startup()
  VariableSet("지형", TerrainGet(1, 0))
  VariableSet("코스트", TerrainGetMoveCost(1, 0))
  VariableSet("구조물지형", TerrainGet(0, 1))
  VariableSet("오버레이", MapOverlapGet(1, 1))
  VariableSet("빈칸", MapOverlapGet(0, 0) == nil and "없음" or "있음")
  VariableSet("맵밖", TerrainGet(99, 99) == nil and "없음" or "있음")
end
`;
  const cell = (tid: string, costName: string) => ({ tid, costName, avoid: 0, def: 0 });
  const tileState = (): GameState => ({
    turn: 1,
    phase: 0,
    map: {
      width: 2,
      height: 2,
      costs: { foot: [[1, 1], [1, 1]] },
      terrain: [
        [cell("TID_道", "COST_平地"), cell("TID_岩", "COST_空")],
        [cell("TID_床", "COST_平地"), cell("TID_道", "COST_平地")],
      ],
      overlays: [{ x: 1, y: 1, tid: "TID_瘴気_永続", cell: { avoid: 0, def: 0 } }],
    },
    structures: [{ x: 0, y: 1, w: 1, h: 1, tid: "TID_扉", group: 7, hp: 50 }],
    units: [unit({ id: "p", force: 0, x: 0, y: 0 })],
    events: [],
  });

  it("TerrainGet·TerrainGetMoveCost·MapOverlapGet은 국면의 실제 타일을 읽는다(맵 밖·빈칸 = nil)", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, tile: TILE_SCRIPT }, chapter: "tile", host: host(),
    });
    const v = session.setup(tileState()).state.variables!;
    expect(v["지형"]).toBe("TID_岩");
    expect(v["코스트"]).toBe("COST_空"); // 비행 전용 칸 — m024 눈사태가 이 문자열로 정지 판정한다
    expect(v["구조물지형"]).toBe("TID_扉"); // 살아있는 구조물이 베이스 지형을 덮는다(ChangeTid 사영)
    expect(v["오버레이"]).toBe("TID_瘴気_永続");
    expect(v["빈칸"]).toBe("없음");
    expect(v["맵밖"]).toBe("없음");
  });

  it("☠타일 데이터가 없으면 nil로 강하하지 않고 거부한다(== 비교 분기 오염 방지)", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, tile: `Include("Common")\nfunction Startup() TerrainGet(0, 0) end` },
      chapter: "tile", host: host(),
    });
    expect(() => session.setup(state([unit({ id: "p", force: 0, x: 0, y: 0 })]))).toThrow(/미배선/);
  });

  it("EventOpenDoor = 구조물 소멸(hp 0) + destroy 이벤트 — 통행 개방·같은 group 지붕 걷힘", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, tile: `Include("Common")\nfunction Startup() EventOpenDoor(0, 1) end` },
      chapter: "tile", host: host(),
    });
    const r = session.setup(tileState());
    expect(r.state.structures![0].hp).toBe(0);
    expect(r.events).toContainEqual({ type: "destroy", unit: "", structure: 0, tid: "TID_扉", hpAfter: 0 });
  });
});

/**
 * 정직 결손 — 정확 구현이 불가능해 **일부러 등록하지 않은** 네이티브. 등록하면 호출이 조용히 no-op가 되어
 * 국면이 틀린 채 진행된다(☠오재현 > 강하). 여기 목록은 구현되면 지운다(그때 이 테스트가 빨개진다).
 */
describe("정직 결손 — 미등록 유지 네이티브", () => {
  const GAPS: [string, string, string][] = [
    ["MapOverlapSet", `MapOverlapSet(1, 1, "TID_瘴気_永続")`, "런타임 오버레이 생성 미모델(장부 turn.map-gimmicks) — 瘴気는 피해가 본질이라 가시성만 맞추면 오재현"],
    ["MapOverlapRemove", `MapOverlapRemove(1, 1)`, "위와 같은 계열(생성·제거 한 쌍)"],
    ["UnitSetItemEquip", `UnitSetItemEquip("PID_p", "IID_鉄の剣")`, "아이템 iid 미사영 + 호출 대부분이 엠블렘 무기(EngageItems)"],
    ["UnitPutOffItem", `UnitPutOffItem("PID_p", "IID_鉄の剣")`, "위와 같은 iid 결손"],
    ["UnitGetHpStock", `UnitGetHpStock("PID_p")`, "HP 스톡 미모델(dispos에는 hpStock이 실재 — UnitState 확장이 선행)"],
    ["UnitSetHpStock", `UnitSetHpStock("PID_p", 1)`, "위와 같음"],
    ["UnitGetJID", `UnitGetJID("PID_p")`, "직업 ID 미사영 — nil이면 == \"JID_...\" 분기가 통째로 뒤집힌다"],
    ["UnitGetMPID", `UnitGetMPID("PID_p")`, "인물 이름 ID 미사영 — PID에서 유추하면 픽션"],
    ["UnitSetHp", `UnitSetHp("PID_p", 1)`, "HP 절대 대입 이벤트 미정의(절대 재생 계약이 선행)"],
    ["RandomGet", `RandomGet(100)`, "☠난수는 항상 주입한다 — 세션에 RandomSource 주입구가 없다(엔진 계약)"],
    ["Battle", `Battle("PID_p", "PID_p")`, "이벤트 전투 실행 — 난수·대미지 파이프라인 주입 필요"],
    ["BattleSetAttack", `BattleSetAttack("PID_p", "IID_鉄の剣")`, "위와 같음"],
    ["BattleAddTarget", `BattleAddTarget("PID_p")`, "위와 같음"],
    ["BattleStart", `BattleStart(1, 1)`, "위와 같음"],
    ["MapDamageAdd", `MapDamageAdd("PID_p", 1)`, "맵 데미지 — 사망 가부(canDie) 미판독"],
    ["TerrainFill", `TerrainFill(1, 1, "TID_床")`, "채움 경계 규칙 미판독(TerrainSet/SetOne은 좌표 지정이라 배선)"],
    ["DisposGetGroupCount", `DisposGetGroupCount("Enemy")`, "dispos 원본 조회 훅 부재(호스트는 스폰만 제공)"],
    ["GodDataGetMGID", `GodDataGetMGID("GID_マルス")`, "엠블렘 데이터 표 미사영"],
    ["AiGetRerewarpPosition", `AiGetRerewarpPosition("PID_p")`, "AI 재워프 좌표 — AI 실행기가 MP4"],
  ];
  for (const [name, call, why] of GAPS) {
    it(`${name}은 등록하지 않는다 — ${why}`, () => {
      const session = createEventSession({
        sources: { common: COMMON_MIN, gap: `Include("Common")\nfunction Startup() ${call} end` },
        chapter: "gap", host: host(),
      });
      expect(() => session.setup(state([unit({ id: "p", force: 0, x: 0, y: 0 })]))).toThrow(
        new RegExp(`nil value \\(global '${name}'\\)`),
      );
    });
  }
});
