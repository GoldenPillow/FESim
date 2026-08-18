import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  createReducer,
  createReplayer,
  makeCostAt,
  moveBudgetOn,
  terrainBonusAt,
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

describe("UnitGetMPID — 인물 이름 ID(호스트 mpid 사영)", () => {
  const SCRIPT_MPID = `
Include("Common")
function Startup()
  VariableSet("이름", UnitGetMPID("PID_p"))
end
`;
  /** m026 오프닝이 자군 전원을 돌며 MPID로 대사 MID를 만든다 — 미배선이면 로스터 확장 즉시 부트가 죽는다. */
  it("호스트 mpid 사영을 그대로 돌려준다(person.xml Name이 정본)", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, test: SCRIPT_MPID },
      chapter: "test",
      host: host({ mpid: (pid) => (pid === "PID_p" ? "MPID_P" : undefined) }),
    });
    session.setRng(rolls([0]));
    const r = session.setup(state([unit({ id: "p", force: 0, x: 1, y: 1 })]));
    expect(r.state.variables?.["이름"]).toBe("MPID_P");
  });

  it("☠사영 부재는 nil로 강하하지 않고 거부한다(SubPrefix(nil) 침묵 오류 방지)", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, test: SCRIPT_MPID },
      chapter: "test",
      host: host(),
    });
    session.setRng(rolls([0]));
    expect(() => session.setup(state([unit({ id: "p", force: 0, x: 1, y: 1 })]))).toThrow(/MPID 사영 부재/);
  });
});

describe("UnitSetGodUnit — 엠블렘 해제·핸들 재장착(m026 오프닝 브래킷)", () => {
  const engaged = () =>
    unit({
      id: "p", force: 0, x: 1, y: 1,
      engage: { count: 1, limit: 7, turnLimit: 3, turn: 0, engaging: false },
    });

  /** m026 오프닝: 외す(UnitSetGodUnit nil) → 연출 → 되돌림(핸들 재장착). nil 인자가 str()를 타면
   *  JS TypeError가 경계에서 nil 오류로 둔갑해 부트 전체가 침묵 사망한다(실발현). */
  it("nil = 해제(engage 제거) · 핸들 = 원상 복구, 절대 재생도 동형", () => {
    const SCRIPT_GOD = `
Include("Common")
function Startup()
  local u = "PID_p"
  local god = UnitGetGodUnit(u)
  UnitSetGodUnit(u, nil)
  VariableSet("해제중", UnitGetGodUnit(u) == nil and 1 or 0)
  UnitSetGodUnit(u, god)
end
`;
    const session = createEventSession({
      sources: { common: COMMON_MIN, test: SCRIPT_GOD },
      chapter: "test",
      host: host(),
    });
    session.setRng(rolls([0]));
    const r = session.setup(state([engaged()]));
    expect(r.state.variables?.["해제중"]).toBe(1);
    const after = r.state.units.find((u) => u.id === "p")!;
    expect(after.engage).toEqual({ count: 1, limit: 7, turnLimit: 3, turn: 0, engaging: false });
    // 절대 재생 — 기록 이벤트(godUnit patch)만으로 같은 국면(해제→복구 상쇄)이 복원된다.
    const { applyStep } = createReplayer(base); // ☠열람 경로 상정 — 세션 무반입
    const replayed = applyStep(state([engaged()]), {
      action: { type: "setup" },
      events: r.state.events,
    });
    expect(replayed.units.find((u) => u.id === "p")!.engage).toEqual(after.engage);
  });
});

describe("이벤트 콜백 오류 표면화", () => {
  /** 왜 위험한가: error(테이블)·경계를 넘은 JS 예외는 lua_tostring이 null을 줘 to_jsstring이
   *  TypeError로 죽는다 — 진짜 원인이 통째로 가려진다(m026 로스터 확장에서 실발현). */
  it("비문자 오류 객체(테이블)도 콜백 오류 메시지로 던진다 — TypeError로 가리지 않는다", () => {
    const SCRIPT_ERR = `
Include("Common")
function Startup()
  error({ code = 7 })
end
`;
    const session = mkSession(host(), SCRIPT_ERR);
    session.setRng(rolls([0]));
    expect(() => session.setup(state([unit({ id: "p", force: 0, x: 1, y: 1 })]))).toThrow(/이벤트 콜백 오류/);
  });
});

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
    // (1) 대상 아이템이 국면 어디에도 없다 — iid 사영은 끝났지만(weapons·engageWeapons 전부 iid 보유)
    //     이 둘은 스크립트가 **미소지 아이템**을 물리거나 뺏는다. 원기가 어떻게 조달하는지 미판독.
    //     e005·e006 = リュール의 IID_銀の剣·IID_リベラシオン(dispos 소지품에 없음 — 진행 인벤토리는 시뮬 모델 밖).
    //     m014 = IID_ベレト_ルーン(dispos = IID_コラプス_M014 · GID_M014_敵ベレト 絆1 = IID_ベレト_ルーン_M010).
    e005: ["UnitPutOffItem"],
    e006: ["UnitPutOffItem"],
    m014: ["UnitSetItemEquip"],
    // (2) [해소 2026-08-18] m022 UnitGetMPID — person.xml Name 사영을 호스트 mpid 훅으로 배선.
    // (3) ☠원문 Lua 문법 오류(추출 산물 아님 — 게임의 실행 형태 미확인). g001.txt:157이 `if A then
    //     return a` 뒤에 end 없이 다음 if를 연다(elseif 오타 — 메인 실검 확정). fengari는 로드를 거부한다.
    //     ☠손대지 않는다: data/는 파이프라인 산출물이라 손수정이 곧 표류다.
    g001: ["Lua 문법"],
    g004: ["Lua 문법"],
  };

  // 지형 TID → CostName·회피/수비 — 보드 팔레트(fe17.ts)가 쓰는 것과 같은 표.
  // 인물 이름 ID(MPID) — UnitGetMPID 호스트 사영의 정본(person.xml Name).
  const personsTable = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/persons.json", import.meta.url), "utf-8"),
  ) as Record<string, { Name?: string }>;
  const terrainTable = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/terrain.json", import.meta.url), "utf-8"),
  ) as Record<string, {
    CostName?: string; Avoid?: number; Defense?: number; Hp_N?: number;
    PlayerAvoid?: number; PlayerDefense?: number; EnemyAvoid?: number; EnemyDefense?: number;
    Heal?: number; MoveFirst?: number; Flag?: number; cost?: Record<string, number>;
  }>;
  // TID → 지형 1칸 사영 — 보드 script.terrains(fe17.ts)가 굳혀 넘기는 것과 같은 모양.
  const opt = (k: string, v: number | undefined) => (typeof v === "number" && v !== 0 ? { [k]: v } : {});
  const terrainCellOf = (tid: string) => {
    const row = terrainTable[tid];
    if (row === undefined) return undefined;
    return {
      cell: {
        tid,
        ...(row.CostName !== undefined ? { costName: row.CostName } : {}),
        avoid: row.Avoid ?? 0,
        def: row.Defense ?? 0,
        ...opt("playerAvoid", row.PlayerAvoid), ...opt("playerDef", row.PlayerDefense),
        ...opt("enemyAvoid", row.EnemyAvoid), ...opt("enemyDef", row.EnemyDefense),
        ...opt("heal", row.Heal), ...opt("moveFirst", row.MoveFirst),
        ...((Number(row.Flag ?? 0) & (1 << 17)) !== 0 ? { notWarp: true } : {}),
      },
      ...(row.cost === undefined ? {} : { cost: row.cost }),
    };
  };
  const cellOf = (tid: string) => ({
    tid,
    ...(terrainTable[tid]?.CostName !== undefined ? { costName: terrainTable[tid].CostName } : {}),
    avoid: terrainTable[tid]?.Avoid ?? 0,
    def: terrainTable[tid]?.Defense ?? 0,
  });

  // IID → 소지품 채널·스냅숏 — 보드 script.items(fe17.ts)가 굳혀 넘기는 것과 같은 계약.
  const gainItemOf = (iid: string): ReturnType<NonNullable<EventHost["gainItem"]>> => {
    const row = itemTable[iid];
    if (row === undefined) return undefined;
    const w = weaponOf(iid);
    if (w !== undefined) return { kind: "weapon", item: w };
    if (row.Kind === 7) {
      return { kind: "staff", item: { iid, power: row.Power ?? 0, rangeMin: row.RangeI ?? 1, rangeMax: row.RangeO ?? 1, uses: row.Endurance ?? 0, rodType: row.RodType ?? 0, rodExp: 0 } };
    }
    if (row.Kind === 10 && (row.AddTarget ?? 0) !== 0) {
      return { kind: "consumable", item: { iid, addType: row.AddType ?? 0, power: row.AddPower ?? 0, range: row.AddRange ?? 0, uses: row.Endurance ?? 0 } };
    }
    return { kind: "none" }; // 귀중품·도구·금전 — 맵 국면 효과 없음
  };

  // 무기 종별(items.json Kind) — 공격 무기만 weapons에 실린다(fe17.ts WEAPON_KINDS와 같은 기준).
  const itemTable = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/items.json", import.meta.url), "utf-8"),
  ) as Record<string, {
    Kind?: number; Power?: number; RangeI?: number; RangeO?: number; RodType?: number;
    Endurance?: number; AddType?: number; AddPower?: number; AddRange?: number; AddTarget?: number;
  }>;
  const godsTable = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/gods.json", import.meta.url), "utf-8"),
  ) as {
    gods: Record<string, { GrowTable?: string; Level?: number }>;
    growth: Record<string, Record<string, { EngageItems?: string[] }>>;
  };
  const WEAPON_KINDS = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
  const weaponOf = (iid: string): BattleWeapon | undefined => {
    const row = itemTable[iid];
    if (row === undefined || !WEAPON_KINDS.has(row.Kind ?? 0) || (row.RangeO ?? 0) < 1) return undefined;
    return { ...sword, iid, might: row.Power ?? 0, rangeMin: row.RangeI ?? 1, rangeMax: row.RangeO ?? 1, kind: row.Kind ?? 0 };
  };
  // fe17.ts godGrowthRows와 같은 경로 — gods[gid].GrowTable → growth[GGID][絆레벨].EngageItems 누적.
  const engageWeaponsOf = (gid: string): BattleWeapon[] => {
    const god = godsTable.gods[gid];
    const table = god === undefined ? undefined : godsTable.growth[String(god.GrowTable ?? "")];
    if (table === undefined) return [];
    const iids: string[] = [];
    for (let level = 1; level <= Number(god?.Level ?? 1); level++) {
      for (const iid of table[String(level)]?.EngageItems ?? []) if (!iids.includes(iid)) iids.push(iid);
    }
    return iids.map(weaponOf).filter((w): w is BattleWeapon => w !== undefined);
  };

  interface ChapterUnit {
    pid: string;
    force: number;
    x: number;
    y: number;
    gid?: string;
    hpStock?: number;
    items?: { iid: string }[];
  }
  interface ChapterJson {
    map: {
      width: number;
      height: number;
      terrain: string[][];
      overlays?: { x: number; y: number; tid: string }[];
      structures?: { x: number; y: number; w: number; h: number; tid: string; group: number }[];
    };
    groups: { name: string; units: ChapterUnit[] }[];
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
    // 웹 projectUnit과 같은 계약 — 소지 무기(iid 포함)·엠블렘 무기까지 실어야 이벤트가 장비를 찾는다.
    const project = (group: string): UnitState[] => {
      const g = json.groups.find((x) => x.name === group);
      return (g?.units ?? []).map((u, i) => {
        const weapons = (u.items ?? []).map((it) => weaponOf(it.iid)).filter((w): w is BattleWeapon => w !== undefined);
        const engageWeapons = u.gid === undefined ? [] : engageWeaponsOf(u.gid);
        return unit({
          id: `${group}#${i}`, pid: u.pid, force: u.force, x: u.x, y: u.y,
          ...(weapons.length > 0 ? { weapons, weapon: weapons[0] } : {}),
          ...(u.gid === undefined ? {} : { engage: { count: 0, limit: 7, turnLimit: 3, turn: 0, engaging: false } }),
          ...(u.hpStock !== undefined && u.hpStock > 0 ? { hpStock: u.hpStock } : {}),
          ...(engageWeapons.length > 0 ? { engageWeapons } : {}),
        });
      });
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
      gainItem: (iid) => gainItemOf(iid),
      terrainCell: terrainCellOf,
      mpid: (pid) => personsTable[pid]?.Name,
    };
    const gap = HONEST_GAPS[cid];

    if (gap !== undefined) {
      it(`${cid}: 정직 결손 — 미구현 네이티브 ${gap.join(", ")}로 부트가 거부된다`, () => {
        const boot = () => {
          const se = createEventSession({ sources, chapter: cid, host: h });
          se.setRng(rolls([0]));
          return se.setup(s0);
        };
        expect(boot).toThrow(new RegExp(gap.join("|")));
      });
      continue;
    }

    it(`${cid}: createEventSession + setup(스텝 0)이 오류 0`, () => {
      const session = createEventSession({ sources, chapter: cid, host: h });
      session.setRng(rolls([0])); // 리듀서가 매 스텝 넘기는 것과 같은 계약(이벤트 콜백 굴림도 기보 난수다)
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
/**
 * `UnitSetHp` — 종전에는 "절대 재생 계약이 선행"을 이유로 **미등록 결손**이었다.
 * ☠그 전제는 이미 충족돼 있었다 — `heal` 이벤트가 `hpAfter`(절대값)를 싣고
 * `replay.ts`가 그것을 그대로 대입한다. 반면 미등록인 채로 두니 **m001 턴3 쌍자이탈이
 * `endPhase`를 통째로 거부**했고, 그 결과 적턴 자동이 페이즈를 영영 못 닫았다(2026-08-18 실측).
 * 왜 위험했나 = 하나의 미등록 네이티브가 "AI 무한루프"로 오진될 만큼 먼 곳에서 발현한다.
 */
describe("UnitSetHp — HP 절대 대입", () => {
  const hurt = (hp: number): UnitState => ({ ...unit({ id: "p", force: 0, x: 0, y: 0 }), hp });
  const run = (body: string, u: UnitState) =>
    createEventSession({
      sources: { common: COMMON_MIN, hp: `Include("Common")\nfunction Startup() ${body} end` },
      chapter: "hp", host: host(),
    }).setup(state([u]));

  it("HP를 절대값으로 세우고 최대치로 클램프한다", () => {
    const r = run(`UnitSetHp("PID_p", 999)`, hurt(5));
    expect(r.state.units[0].hp).toBe(r.state.units[0].stats.hp);
  });

  it("절대 재생 — 기록 이벤트만으로 HP가 복원된다(세션 무반입)", () => {
    const r = run(`UnitSetHp("PID_p", 12)`, hurt(5));
    expect(r.state.units[0].hp).toBe(12);
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(state([hurt(5)]), { action: { type: "setup" }, events: r.events });
    expect(replayed.units[0].hp).toBe(12);
  });
});

describe("정직 결손 — 미등록 유지 네이티브", () => {
  const GAPS: [string, string, string][] = [
    ["MapOverlapSet", `MapOverlapSet(1, 1, "TID_瘴気_永続")`, "런타임 오버레이 생성 미모델(장부 turn.map-gimmicks) — 瘴気는 피해가 본질이라 가시성만 맞추면 오재현"],
    ["MapOverlapRemove", `MapOverlapRemove(1, 1)`, "위와 같은 계열(생성·제거 한 쌍)"],
    ["UnitGetJID", `UnitGetJID("PID_p")`, "직업 ID 미사영 — nil이면 == \"JID_...\" 분기가 통째로 뒤집힌다"],
    ["Battle", `Battle("PID_p", "PID_p")`, "이벤트 전투 실행 — 난수·대미지 파이프라인 주입 필요"],
    ["BattleSetAttack", `BattleSetAttack("PID_p", "IID_鉄の剣")`, "위와 같음"],
    ["BattleAddTarget", `BattleAddTarget("PID_p")`, "위와 같음"],
    ["BattleStart", `BattleStart(1, 1)`, "위와 같음"],
    ["MapDamageAdd", `MapDamageAdd("PID_p", 1)`, "맵 데미지 — 사망 가부(canDie) 미판독"],
    ["TerrainFill", `TerrainFill(1, 1, "TID_床")`, "채움 경계 규칙 미판독(TerrainSet/SetOne은 좌표 지정이라 배선)"],
    ["DisposGetGroupCount", `DisposGetGroupCount("Enemy")`, "dispos 원본 조회 훅 부재(호스트는 스폰만 제공)"],
    ["GodDataGetMGID", `GodDataGetMGID("GID_マルス")`, "엠블렘 데이터 표 미사영"],
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

/**
 * 이벤트 난수 — ☠엔진 계약(난수는 항상 주입)을 이벤트 콜백까지 관통시킨다. Math.random을 쓰면
 * 기보 재현이 깨진다(같은 기보가 다른 국면을 만든다). RandomGet(n) = Random.GetValue(n) = [0, n)
 * (HIT_RANDOM §1-3·§2-6 — RandomSource.next 규약과 동일 상한 계약).
 */
describe("이벤트 난수 — 주입 소스 소비", () => {
  const RNG_SCRIPT = `
Include("Common")
function Startup()
  VariableSet("굴림1", RandomGet(100))
  VariableSet("굴림2", RandomGet(6))
end`;
  const mk = () =>
    createEventSession({ sources: { common: COMMON_MIN, r: RNG_SCRIPT }, chapter: "r", host: host() });
  const p = () => unit({ id: "p", force: 0, x: 0, y: 0 });

  it("RandomGet(n)은 주입 소스를 [0, n) 상한 계약으로 소비한다", () => {
    const session = mk();
    const bounds: number[] = [];
    session.setRng({ next: (b) => { bounds.push(b); return b - 1; } });
    const v = session.setup(state([p()])).state.variables!;
    expect(bounds).toEqual([100, 6]); // 상한이 그대로 넘어간다(해상도 = 호출부 소유)
    expect(v["굴림1"]).toBe(99);
    expect(v["굴림2"]).toBe(5);
  });

  it("☠난수원 미주입이면 0으로 강하하지 않고 거부한다", () => {
    expect(() => mk().setup(state([p()]))).toThrow(/난수원/);
  });

  it("evented reduce가 스텝 난수원을 세션에 관통시킨다 — 콜백 굴림이 기보 난수 순서에 든다", () => {
    const script = `
Include("Common")
function Startup()
  EventEntryTurn(roll, -1, -1, FORCE_PLAYER)
end
function roll()
  VariableSet("턴굴림", RandomGet(10))
end`;
    const session = createEventSession({ sources: { common: COMMON_MIN, r: script }, chapter: "r", host: host() });
    const reduce = createEventedReducer(base, session);
    const drawn: number[] = [];
    const rng: RandomSource = { next: (b) => { drawn.push(b); return 3; } };
    session.setRng(rng);
    let s = session.setup(state([p(), unit({ id: "e", force: 1, x: 7, y: 7 })])).state;
    expect(s.variables?.["턴굴림"]).toBe(3);
    s = reduce(s, { type: "endPhase" }, rng); // 자군 → 적군
    s = reduce(s, { type: "endPhase" }, rng); // 적군 → 자군: Turn 발화가 다시 굴린다
    expect(drawn).toEqual([10, 10]); // 세션이 스텝 난수원을 소비했다 = 기보에 기록되는 굴림이다
  });
});

/**
 * 아이템 iid 사영 — 이벤트가 장비를 바꾸고(UnitSetItemEquip) 소지품을 뺏는다(UnitPutOffItem).
 * 인덱스 계약 = effectiveWeapons(weapons ++ 인게이지 중 engageWeapons) — attack.weapon과 같은 공간이라
 * 기보 계약을 새로 만들지 않는다. ☠목록에 없는 iid는 정직 거부(조용한 no-op = 위력이 틀린 채 진행).
 */
describe("이벤트 장비 전환·소지품 회수", () => {
  const iron: BattleWeapon = { ...sword, iid: "IID_鉄の剣", might: 5 };
  const silver: BattleWeapon = { ...sword, iid: "IID_銀の剣", might: 12 };
  const emblem: BattleWeapon = { ...sword, iid: "IID_ロイ_封印の剣", might: 20 };
  const potion = { iid: "IID_特効薬", addType: 2, power: 10, range: 0, uses: 1 };
  const armed = (over: Partial<UnitState> = {}): UnitState =>
    unit({ id: "p", force: 0, x: 0, y: 0, weapon: iron, weapons: [iron, silver], consumables: [potion], ...over });
  const run = (body: string, u: UnitState) => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, eq: `Include("Common")\nfunction Startup() ${body} end` },
      chapter: "eq", host: host(),
    });
    return session.setup(state([u]));
  };

  it("UnitSetItemEquip = 소지 무기 iid로 장비 전환 + 절대 인덱스 이벤트", () => {
    const r = run(`UnitSetItemEquip("PID_p", "IID_銀の剣")`, armed());
    expect(r.state.units[0].weapon?.iid).toBe("IID_銀の剣");
    expect(r.events).toContainEqual({ type: "equip", unit: "p", index: 1 });
  });

  it("엠블렘 무기(EngageItems)는 **인게이지 전에도** 잡힌다 — 인덱스 = weapons.length + n", () => {
    // ☠전투용 effectiveWeapons와 다른 공간이다: m014·m020의 MapOpening이 비인게이지 보스에게 물린다.
    const off = armed({ engage: { count: 0, limit: 7, turnLimit: 3, turn: 0, engaging: false }, engageWeapons: [emblem] });
    const r = run(`UnitSetItemEquip("PID_p", "IID_ロイ_封印の剣")`, off);
    expect(r.state.units[0].weapon?.might).toBe(20);
    expect(r.events).toContainEqual({ type: "equip", unit: "p", index: 2 });
    // 인게이지 중에도 같은 인덱스 — 기록이 인게이지 상태에 흔들리지 않는다.
    const on = armed({ engage: { count: 7, limit: 7, turnLimit: 3, turn: 0, engaging: true }, engageWeapons: [emblem] });
    expect(run(`UnitSetItemEquip("PID_p", "IID_ロイ_封印の剣")`, on).events)
      .toContainEqual({ type: "equip", unit: "p", index: 2 });
  });

  it("☠목록에 없는 iid는 조용히 넘기지 않고 거부한다(장비가 틀린 채 진행 금지)", () => {
    expect(() => run(`UnitSetItemEquip("PID_p", "IID_ロイ_封印の剣")`, armed())).toThrow(/IID_ロイ_封印の剣/);
  });

  it("UnitPutOffItem = 소지품에서 제거(장비 중이면 해제까지) — e006의 회수→ItemGain 교체 패턴", () => {
    const r = run(`UnitPutOffItem("PID_p", "IID_鉄の剣")\nUnitPutOffItem("PID_p", "IID_特効薬")`, armed());
    const u = r.state.units[0];
    expect(u.weapons?.map((w) => w.iid)).toEqual(["IID_銀の剣"]);
    expect(u.consumables).toEqual([]);
    expect(u.weapon).toBeUndefined(); // 장비 중이던 철검을 뺏겼다
    expect(r.events).toContainEqual({ type: "putOff", unit: "p", kind: "weapon", index: 0 });
    expect(r.events).toContainEqual({ type: "putOff", unit: "p", kind: "consumable", index: 0 });
  });

  it("절대 재생 — 기록 이벤트만으로 장비 전환·회수가 복원된다(세션 무반입)", () => {
    const r = run(`UnitSetItemEquip("PID_p", "IID_銀の剣")\nUnitPutOffItem("PID_p", "IID_鉄の剣")`, armed());
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(state([armed()]), { action: { type: "setup" }, events: r.events });
    expect(replayed.units[0].weapon?.iid).toBe("IID_銀の剣");
    expect(replayed.units[0].weapons?.map((w) => w.iid)).toEqual(["IID_銀の剣"]);
  });
});

/**
 * 런타임 지형 교체(TerrainSet·TerrainSetOne) — 가시성이 아니라 **효과까지** 바꾼다.
 * 국면 표현 = terrainPatches(패치 리스트 — 2D 격자 변이 금지: 직렬화·절대 재생에 맞다).
 * 우선순위 = 살아있는 구조물 > 패치 > 베이스(구조물은 m_Layers 별도 층 — 파괴 시 ChangeTid로
 * 지형이 바뀌는 원기 사상 MOVE_TERRAIN §2-13에서 패치가 곧 "바뀐 지형"이다).
 */
describe("런타임 지형 교체 — terrainPatches", () => {
  const floor = { tid: "TID_床", costName: "COST_平地", avoid: 0, def: 0 };
  const rock = { tid: "TID_岩", costName: "COST_空", avoid: 0, def: 0 };
  const bridgeCell = { avoid: 10, def: 5, heal: -3, moveFirst: -1, notWarp: true };
  const terrainHost = (over?: Partial<EventHost>): EventHost => ({
    ...host(over),
    // 데이터층 훅 — 보드 script.terrains 사영(fe17.ts)이 클라이언트에 굳혀 넘기는 것과 같은 모양.
    terrainCell: (tid) =>
      tid === "TID_橋"
        ? { cell: bridgeCell, cost: { foot: 2, fly: 1 }, display: { color: "#888", name: "다리" } }
        : undefined,
  });
  const s0 = (): GameState => ({
    turn: 1,
    phase: 0,
    map: {
      width: 2,
      height: 2,
      costs: { foot: [[1, 1], [1, 255]], fly: [[1, 1], [1, 1]] },
      terrain: [[floor, floor], [floor, rock]],
    },
    units: [unit({ id: "p", force: 0, x: 0, y: 0 })],
    events: [],
  });
  const run = (body: string, h = terrainHost()) => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, t: `Include("Common")\nfunction Startup() ${body} end` },
      chapter: "t", host: h,
    });
    return session.setup(s0());
  };

  it("TerrainSet은 패치를 세우고 TerrainGet이 그 값을 되읽는다 + 절대 이벤트가 실린다", () => {
    const r = run(`TerrainSet(1, 1, "TID_橋")\nVariableSet("되읽기", TerrainGet(1, 1))`);
    expect(r.state.variables?.["되읽기"]).toBe("TID_橋");
    expect(r.state.terrainPatches).toEqual([
      { x: 1, y: 1, tid: "TID_橋", cell: bridgeCell, cost: { foot: 2, fly: 1 }, display: { color: "#888", name: "다리" } },
    ]);
    expect(r.events).toContainEqual({
      type: "terrainSet", x: 1, y: 1, tid: "TID_橋",
      cell: bridgeCell, cost: { foot: 2, fly: 1 }, display: { color: "#888", name: "다리" },
    });
  });

  it("효과가 실제로 바뀐다 — 코스트·전투 보정·MoveFirst·워프 금지", () => {
    const s = run(`TerrainSet(1, 1, "TID_橋")`).state;
    // 통행 불가(255)였던 칸이 다리 코스트 2로 열린다.
    expect(makeCostAt(s.map, s.structures, "foot", s.terrainPatches)(1, 1)).toBe(2);
    expect(terrainBonusAt(s.map, 1, 1, 0, s.terrainPatches)).toEqual({ avoid: 10, def: 5 });
    const on = { ...s.units[0], x: 1, y: 1 };
    expect(moveBudgetOn(s.map, on, s.terrainPatches)).toBe(3); // movePoints 4 + moveFirst −1
  });

  it("살아있는 구조물이 패치보다 우선 — 파괴되면 패치가 드러난다(ChangeTid 사영)", () => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, t: `Include("Common")\nfunction Startup()\n TerrainSet(1, 1, "TID_橋")\n VariableSet("문", TerrainGet(1, 1))\n EventOpenDoor(1, 1)\n VariableSet("연", TerrainGet(1, 1))\nend` },
      chapter: "t", host: terrainHost(),
    });
    const withDoor: GameState = {
      ...s0(),
      structures: [{ x: 1, y: 1, w: 1, h: 1, tid: "TID_扉", group: 0, hp: 50 }],
    };
    const v = session.setup(withDoor).state.variables!;
    expect(v["문"]).toBe("TID_扉"); // 구조물이 살아 있는 동안은 구조물 TID
    expect(v["연"]).toBe("TID_橋"); // 파괴 뒤 패치가 드러난다
  });

  it("☠데이터층이 TID를 모르면 조용히 넘기지 않고 거부한다(효과 없는 교체 = 오재현)", () => {
    expect(() => run(`TerrainSet(1, 1, "TID_未知")`)).toThrow(/TID_未知/);
  });

  it("같은 칸 재교체는 덮어쓴다(패치 누적 금지) + 절대 재생이 세션 없이 복원한다", () => {
    const r = run(`TerrainSet(1, 1, "TID_橋")\nTerrainSetOne(1, 1, "TID_橋")`);
    expect(r.state.terrainPatches?.length).toBe(1);
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(s0(), { action: { type: "setup" }, events: r.events });
    expect(replayed.terrainPatches?.[0]?.tid).toBe("TID_橋");
    expect(makeCostAt(replayed.map, undefined, "foot", replayed.terrainPatches)(1, 1)).toBe(2);
  });
});

/**
 * 아이템 지급(ItemGain) — UnitPutOffItem의 역. 데이터층이 IID → 채널·스냅숏을 굳혀 넘긴다(script.items).
 * ☠맵 국면에 효과가 없는 종별(귀중품·도구·금전 Kind 10/AddTarget 0·13·18)은 "none"으로 **명시 사영**한다 —
 * 조용한 no-op이 아니라 "효과 없음"이 데이터에 선언된 것이다. 표에 아예 없는 IID만 정직 거부한다.
 */
describe("이벤트 아이템 지급 — ItemGain", () => {
  const spear: BattleWeapon = { ...sword, iid: "IID_手槍", might: 7, rangeMax: 2, kind: 2 };
  const rescue = { iid: "IID_レスキュー", power: 0, rangeMin: 1, rangeMax: 8, uses: 5, rodType: 0, useType: 5, rodExp: 0 };
  const potion = { iid: "IID_特効薬", addType: 7, power: 2, range: 1, uses: 3 };
  const ITEMS: Record<string, { kind: "weapon" | "staff" | "consumable" | "none"; item?: unknown }> = {
    IID_手槍: { kind: "weapon", item: spear },
    IID_レスキュー: { kind: "staff", item: rescue },
    IID_特効薬: { kind: "consumable", item: potion },
    // 여신상 = Kind 10 · AddTarget 0 · AddType/AddPower 0 — 매각 귀중품(전투 효과 필드가 전무하다).
    IID_女神の像: { kind: "none" },
  };
  const h = (): EventHost => ({ ...host(), gainItem: (iid) => ITEMS[iid] as never });
  const bare = () => unit({ id: "p", force: 0, x: 0, y: 0 });
  const run = (body: string) => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, gi: `Include("Common")\nfunction Startup() ${body} end` },
      chapter: "gi", host: h(),
    });
    return session.setup(state([bare()]));
  };

  it("채널별로 소지품에 들어간다 + gain 이벤트(putOff의 역)", () => {
    const r = run(`ItemGain("PID_p", "IID_手槍")\nItemGain("PID_p", "IID_レスキュー")\nItemGain("PID_p", "IID_特効薬")`);
    const u = r.state.units[0];
    expect(u.weapons?.map((w) => w.iid)).toEqual(["IID_手槍"]);
    expect(u.staves?.map((s) => s.iid)).toEqual(["IID_レスキュー"]);
    expect(u.consumables?.map((c) => c.iid)).toEqual(["IID_特効薬"]);
    expect(r.events).toContainEqual({ type: "gain", unit: "p", kind: "weapon", item: spear });
  });

  it("맵 효과 없는 종별(none)·수송대 지급(unit = nil)은 국면을 바꾸지 않고 오류도 아니다", () => {
    const r = run(`ItemGain("PID_p", "IID_女神の像")\nItemGain(nil, "IID_手槍")`);
    expect(r.state.units[0].weapons).toBeUndefined();
    expect(r.events.filter((e) => e.type === "gain")).toEqual([]);
  });

  it("☠사영에 없는 IID는 조용히 넘기지 않고 거부한다", () => {
    expect(() => run(`ItemGain("PID_p", "IID_未知")`)).toThrow(/IID_未知/);
  });

  it("절대 재생 — 기록 이벤트만으로 지급이 복원된다(세션 무반입)", () => {
    const r = run(`ItemGain("PID_p", "IID_手槍")\nItemGain("PID_p", "IID_特効薬")`);
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(state([bare()]), { action: { type: "setup" }, events: r.events });
    expect(replayed.units[0].weapons?.map((w) => w.iid)).toEqual(["IID_手槍"]);
    expect(replayed.units[0].consumables?.map((c) => c.iid)).toEqual(["IID_特効薬"]);
  });
});

/**
 * s009 여신상 — EventEntryArea 진입 획득의 실 스크립트 실측(ItemGain 배선의 발현 지점).
 * `EventEntryArea(アイテム入手, 25,26, 25,26, FORCE_PLAYER, "アイテム_済")` — 자군이 그 칸에 서면 발화.
 */
describe("이벤트 세션 — 실 스크립트 통합(s009 여신상 획득)", () => {
  const dir = fileURLToPath(new URL("../../../data/fe17/scripts/", import.meta.url));
  const sources = Object.fromEntries(
    readdirSync(dir).filter((f) => f.endsWith(".lua")).map((n) => [n.slice(0, -4), readFileSync(`${dir}${n}`, "utf-8")]),
  );
  const chapter = JSON.parse(
    readFileSync(new URL("../../../data/fe17/chapters/s009.json", import.meta.url), "utf-8"),
  ) as { map: { width: number; height: number }; groups: { name: string; units: { pid: string; force: number; x: number; y: number }[] }[] };
  const terrainRows = JSON.parse(
    readFileSync(new URL("../../../data/fe17/tables/terrain.json", import.meta.url), "utf-8"),
  ) as Record<string, { Avoid?: number; Defense?: number }>;

  it("자군이 (25,26)에 서면 여신상이 지급된다 — 국면 효과 없는 종별이라 소지품은 그대로, 발화 플래그는 잠긴다", () => {
    const gains: string[] = [];
    const h: EventHost = {
      spawnGroup: (group) =>
        (chapter.groups.find((x) => x.name === group)?.units ?? []).map((u, i) =>
          unit({ id: `${group}#${i}`, pid: u.pid, force: u.force, x: u.x, y: u.y }),
        ),
      gainItem: (iid) => {
        gains.push(iid);
        return { kind: "none" }; // 여신상 = Kind 10 · AddTarget 0(매각 귀중품) — 데이터가 효과 없음을 명시
      },
      terrainCell: (tid) => {
        const row = terrainRows[tid];
        return row === undefined ? undefined : { cell: { tid, avoid: row.Avoid ?? 0, def: row.Defense ?? 0 } };
      },
    };
    const session = createEventSession({ sources, chapter: "s009", host: h });
    session.setRng(rolls([0]));
    const { width, height } = chapter.map;
    const s0: GameState = {
      turn: 1,
      phase: 0,
      difficulty: "n",
      map: { width, height, costs: { foot: Array.from({ length: height }, () => Array.from({ length: width }, () => 1)) } },
      units: [unit({ id: "hero", force: 0, x: 0, y: 0 })],
      events: [],
    };
    let s = session.setup(s0).state;
    expect(s.variables?.["アイテム_済"]).toBe(0); // 조건 문자열 = 1회성 발화 플래그(미발화)
    // 진입 = 그 칸에 선 뒤 행동 종료 폴링(acted) — Area 인스펙터가 좌표 사각형으로 잡는다.
    s = { ...s, units: s.units.map((u) => (u.id === "hero" ? { ...u, x: 25, y: 26 } : u)) };
    const r = session.acted(s, "hero", true);
    expect(gains).toEqual(["IID_女神の像"]);
    expect(r.state.variables?.["アイテム_済"]).toBe(1); // 발화 후 잠금 — 두 번 안 준다
    expect(r.events.filter((e) => e.type === "gain")).toEqual([]); // none = 국면 무변화
  });
});

/**
 * HP 스톡(다단 보스) — ☠**사영과 이벤트만** 배선한다. 부활 거동(HP 0 → 스톡 소모 부활)은 미배선이다:
 * 소비 경로는 확정됐지만(TryAddDeadScene 0x2472D20 → Unit.CanRevive 0x1A4F860 → Unit.Revive 0x1A4F8B0)
 * **부활 후 HP·상태 규칙이 미판독**이라 굴리면 픽션이 된다(장부 combat.hp-stock).
 */
describe("이벤트 HP 스톡 — 사영·질의·대입", () => {
  const boss = () => unit({ id: "b", force: 1, x: 1, y: 1, hpStock: 3 });
  const run = (body: string, u = boss()) => {
    const session = createEventSession({
      sources: { common: COMMON_MIN, hs: `Include("Common")\nfunction Startup() ${body} end` },
      chapter: "hs", host: host(),
    });
    return session.setup(state([unit({ id: "p", force: 0, x: 0, y: 0 }), u]));
  };

  it("UnitGetHpStock은 국면의 실값을 읽는다(부재 = 0)", () => {
    const r = run(`VariableSet("보스", UnitGetHpStock("PID_b"))\nVariableSet("자군", UnitGetHpStock("PID_p"))`);
    expect(r.state.variables?.["보스"]).toBe(3);
    expect(r.state.variables?.["자군"]).toBe(0);
  });

  it("UnitSetHpStock = 절대 대입 + hpStock 이벤트(0 대입 = 필드 제거)", () => {
    const r = run(`UnitSetHpStock("PID_b", 1)`);
    expect(r.state.units[1].hpStock).toBe(1);
    expect(r.events).toContainEqual({ type: "hpStock", unit: "b", stock: 1 });
    const zero = run(`UnitSetHpStock("PID_b", 0)`);
    expect(zero.state.units[1].hpStock).toBeUndefined();
    expect(zero.events).toContainEqual({ type: "hpStock", unit: "b", stock: 0 });
  });

  it("절대 재생 — 기록 이벤트만으로 스톡이 복원된다(세션 무반입)", () => {
    const r = run(`UnitSetHpStock("PID_b", 1)`);
    const { applyStep } = createReplayer(base);
    const replayed = applyStep(state([unit({ id: "p", force: 0, x: 0, y: 0 }), boss()]), {
      action: { type: "setup" }, events: r.events,
    });
    expect(replayed.units[1].hpStock).toBe(1);
  });

  it("☠부활 거동은 배선하지 않는다 — 스톡이 있어도 HP 0 격파는 그대로 사망이다", () => {
    const session = createEventSession({ sources: { common: COMMON_MIN, hs: `Include("Common")\nfunction Startup() end` }, chapter: "hs", host: host() });
    const reduce = createEventedReducer(base, session);
    const p = unit({ id: "p", force: 0, x: 0, y: 0, weapon: sword });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, hp: 5, hpStock: 3 });
    const filler = unit({ id: "f", force: 1, x: 7, y: 7 });
    let s = session.setup(state([p, e, filler])).state;
    s = reduce(s, { type: "attack", unit: "p", target: "e" }, rolls([0]));
    const dead = s.units.find((u) => u.id === "e")!;
    expect(dead.dead).toBe(true); // 부활 없음(장부 combat.hp-stock = absent 유지)
    expect(dead.hpStock).toBe(3); // 스톡은 소모되지 않는다 — 사영만 살아 있다
  });
});
