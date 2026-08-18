import { lua, lauxlib, lualib, to_luastring, to_jsstring, type LuaState } from "fengari-web";
import type { BattleEvent, BattleWeapon, ConsumableItem, SkillRow, StaffItem, StatusGive } from "@fesim/shared";
import { equipCandidates, makeCostAt, overlayAt, structureAt, terrainPatchAt, type GameState, type RandomSource, type StructureState, type TerrainCell, type TerrainPatch, type UnitState, type WinRule } from "../battle.js";

/**
 * 이벤트 세션 — 챕터 Lua 스크립트(정본 그대로, 파이프라인 가공본)를 fengari로 실행한다.
 * 원기 대응: EventEntry* = MapInspector 사영(와일드카드 -1 · 조건 3형 · 1회성 발화 플래그 기계 —
 * il2cpp/LUA_BINDINGS §3~§4), 연출 API = no-op, 게임플레이 API = 아래 프리미티브.
 * ☠세션은 리듀서 밖의 상태(Lua 전역·인스펙터)를 가진다 — 지속 상태는 전부 GameState.variables와
 * 이벤트(BattleEvent 절대값)로 사영되고, 재구축 = 초기 국면에서 스텝 재실행(리플레이 문법과 동형).
 */

export interface EventHost {
  /** 그룹명 → 신규 유닛 스냅숏(id 유일성 = 호스트 책임 — 중복 스폰도 새 id). 데이터층 소관. */
  spawnGroup(group: string, state: Readonly<GameState>): UnitState[];
  /** SID → skills.json 행(PrivateSkill 부여용). 부재 시 부여는 기록 없이 무시된다(unknown에 남김). */
  skillRow?(sid: string): SkillRow | undefined;
  /** 엠블렘 유닛화(UnitSetGodUnit) — 유닛 필드 패치 산출(engage·engagedSkills 등). */
  godUnit?(unit: Readonly<UnitState>, gid: string): Partial<UnitState> | undefined;
  /**
   * IID → 소지품 채널·스냅숏(ItemGain). 데이터층이 챕터 폐포의 "IID_..." 전수를 굳혀 넘긴다(script.items).
   * kind "none" = 맵 국면에 효과가 없는 종별(귀중품·도구·금전) — 지급해도 국면이 안 변한다.
   * 부재(표에 아예 없음) = 정직 거부.
   */
  gainItem?(iid: string):
    | { kind: "weapon"; item: BattleWeapon }
    | { kind: "staff"; item: StaffItem }
    | { kind: "consumable"; item: ConsumableItem }
    | { kind: "none" }
    | undefined;
  /** PersonGetIndex — person.xml 행 인덱스(AI 예약 변수에 저장됨, 소비 = MP4). 부재 = 0. */
  personIndex?(pid: string): number;
  /** UnitGetMPID — 인물 이름 ID(person.xml Name = "MPID_..."). 부재 = 정직 거부(nil이면 SubPrefix가 침묵 오류). */
  mpid?(pid: string): string | undefined;
  /**
   * TID → 지형 1칸 사영(TerrainSet·TerrainSetOne). 클라이언트엔 terrain 표가 없어 데이터층이
   * 챕터 Lua 폐포의 "TID_..." 전수를 미리 굳혀 넘긴다(보드 script.terrains).
   * 부재·미상이면 정직 거부한다 — 효과 없는 지형 교체는 오재현이다.
   */
  terrainCell?(tid: string): { cell: TerrainCell; cost?: TerrainPatch["cost"]; display?: { color?: string; name?: string } } | undefined;
}

export interface HookResult {
  state: GameState;
  events: BattleEvent[];
}

/** 발화 문맥(MindGet* 사영) — 이 이벤트를 일으킨 유닛·상대. */
interface Mind {
  unit?: number;
  target?: number;
  force?: number;
}

interface Draft {
  units: UnitState[];
  variables: Record<string, number | string>;
  winRule: WinRule;
  crests: { x: number; y: number }[] | undefined;
  structures: StructureState[] | undefined;
  terrainPatches: TerrainPatch[] | undefined;
  events: BattleEvent[];
  base: Readonly<GameState>;
  mind: Mind;
}

type Condition =
  | { kind: "none" }
  | { kind: "bool"; value: boolean }
  | { kind: "flag"; key: string }
  | { kind: "fn"; ref: number };

interface Inspector {
  kind: string;
  fnRef: number;
  min: number;
  max: number;
  force: number;
  pid: string;
  pid2: string;
  force2: number;
  both: boolean;
  rect?: { x1: number; y1: number; x2: number; y2: number };
  condition: Condition;
  argRefs: number[];
}

/** 인스펙터 인자 슬롯 수(콜백 뒤) — LUA_BINDINGS §3-2 기반 클래스 규약. */
const ENTRY_SHAPES: Record<string, { kind: string; slots: string[] }> = {
  EventEntryTurn: { kind: "turn", slots: ["min", "max", "force", "cond"] },
  EventEntryTurnAfter: { kind: "turnAfter", slots: ["min", "max", "force", "cond"] },
  EventEntryTurnEnd: { kind: "turnEnd", slots: ["min", "max", "force", "cond"] },
  EventEntryArea: { kind: "area", slots: ["x1", "y1", "x2", "y2", "force", "cond"] },
  EventEntryDie: { kind: "die", slots: ["pid", "force", "cond"] },
  EventEntryReviveBefore: { kind: "reviveBefore", slots: ["pid", "force", "cond"] },
  EventEntryReviveAfter: { kind: "reviveAfter", slots: ["pid", "force", "cond"] },
  EventEntryFixed: { kind: "fixed", slots: ["pid", "force", "cond"] },
  EventEntryTalk: { kind: "talk", slots: ["pid", "force", "pid2", "force2", "both", "cond"] },
  EventEntryBattleBefore: { kind: "battleBefore", slots: ["pid", "force", "pid2", "force2", "both", "cond"] },
  EventEntryBattleTalk: { kind: "battleTalk", slots: ["pid", "force", "pid2", "force2", "both", "cond"] },
  EventEntryBattleAfter: { kind: "battleAfter", slots: ["pid", "force", "pid2", "force2", "both", "cond"] },
  EventEntryPickup: { kind: "pickup", slots: ["pid", "cond"] },
  EventEntryTargetSelect: { kind: "targetSelect", slots: ["pid", "cond"] },
  EventEntryUnitCommandPrepare: { kind: "unitCommandPrepare", slots: ["pid", "cond"] },
  EventEntryEngageBefore: { kind: "engageBefore", slots: ["pid", "cond"] },
  EventEntryEngageAfter: { kind: "engageAfter", slots: ["pid", "cond"] },
  EventEntryUnitCommandInterrupt: { kind: "unitCommandInterrupt", slots: ["pid", "hash", "cond"] },
  EventEntryBreakdown: { kind: "breakdown", slots: ["x1", "y1", "cond"] },
  EventEntryBreakdownEnemy: { kind: "breakdownEnemy", slots: ["x1", "y1", "cond"] },
  EventEntryWaypoint: { kind: "waypoint", slots: ["x1", "y1", "cond"] },
  EventEntryEscape: { kind: "escape", slots: ["x1", "y1", "pid", "cond"] },
  // 좌표 사각형형 4종 — 원기는 지형이 만든 인스펙터에 콜백만 얹고 조건 슬롯이 없다(§3-2).
  EventEntryTbox: { kind: "tbox", slots: ["x1", "y1"] },
  EventEntryVisit: { kind: "visit", slots: ["x1", "y1"] },
  EventEntryDoor: { kind: "door", slots: ["x1", "y1", "x2", "y2"] },
  EventEntryDestroy: { kind: "destroy", slots: ["x1", "y1", "x2", "y2"] },
};

/**
 * 연출 전용 네이티브 — no-op. 술어형은 "끝났다/없다"를 돌려 common.lua 폴링 루프를 즉시 탈출시킨다
 * (LUA_USAGE §4 상위 빈도 + common.lua while 술어 전수). ☠여기 없는 미지 호출은 기록 후 no-op.
 */
const PRESENTATION: Record<string, (() => number | boolean | string | null) | null> = {
  Log: null, Talk: null, Movie: null, Tutorial: null, PuppetDemo: null, SkipEscape: null,
  Yield: null, FadeIn: null, FadeOut: null, SoundPostEvent: null, ModeSelect: null,
  CursorSetPos: null, CursorSetDistanceMode: null, CursorAnimeDelete: null, TalkEndContinue: null,
  TalkBeginContinue: null, CameraSetMain: null, AroundCameraSetPos: null, UnitRotation: null,
  SkipPushStateAndDisable: null, SkipPopState: null, DebugCreateMenu: null, EffectCreate: null,
  EffectPlay: null, WhiteOut: null, VisitCameraGo: null, VisitCameraBack: null,
  EventActionObject: null, EventActionMoveObject: null, EventOpenObject: null, EventStateObject: null,
  ObjectCreate: null, ObjectDelete: null, TerrainSetBegin: null, TerrainSetEnd: null,
  MenuCreate: null, MenuItemCreate: null, MenuItemSetMid: null, MenuItemSetFunc: null,
  MenuItemSetSelectFunc: null, MenuItemSetCondition: null, MenuAddLabel: null, MenuShow: null,
  MenuCancelJump: null, GodUnitSetEscape: null,
  // 사운드(ScriptSound)·안내 대사(ScriptSystem) — 표시 계층.
  PlayFieldBgm: null, PauseFieldBgm: null, ResumeFieldBgm: null, SetFieldPhaseBgm: null, Dialog: null,
  // 이펙트·오브젝트 연출(ScriptMap) — EffectCreate/Play와 짝. EventBrokenObject는 MapEnding 파괴 연출.
  EffectDelete: null, EventBrokenObject: null,
  // 범위 하이라이트 표시(MapRange*) — 경고 연출용 격자, 통행·판정 무관.
  MapRangeAddBegin: null, MapRangeAdd: null, MapRangeAddEnd: null, MapRangeClear: null,
  // 시간수정(되감기) 허용 토글 — 시뮬의 되감기 정본은 기보라 국면에 남길 것이 없다.
  MapHistoryRewindEnable: null, MapHistoryRewindDisable: null, MapHistoryRewindReset: null,
  // 맵 밖 엠블렘 장비 보관(회상 맵 진입·복귀 전용) — 챕터 국면 밖의 세이브 계층.
  GodSaveEquip: null, GodLoadEquip: null,
  // 오버레이 일괄 배치 트랜잭션 경계 — TerrainSetBegin/End와 동형(내용은 MapOverlapSet이 소유).
  MapOverlapSetBegin: null, MapOverlapSetEnd: null,
  // 맵 데미지 일괄 처리 경계 — 내용은 MapDamageAdd가 소유.
  MapDamageBegin: null, MapDamageEnd: null,
  // 표시·사운드·머티리얼(ScriptGame·ScriptSound·ScriptSystem·ScriptMap 연출군).
  PlayChapterTitle: null, SetFieldBgmWarSituation: null, BackgroundColorSet: null, Warning: null,
  MessSetArgument: null, MessLoad: null, MessFree: null, Telop: null, CutScene: null,
  MapMaterialSetFloat: null, MapMaterialSetColor: null, CursorSetDistanceScale: null, CursorSetVisible: null,
  // 설정 토글(전투·지원 애니) — 시뮬은 전투 씬을 그리지 않는다. Get은 아래 술어에서 OFF를 돌린다.
  ConfigSetBattleScene: null, ConfigSetSupportScene: null,
  // 유닛 연출(ScriptUnit) — 실좌표는 UnitSetPos가 소유한다(s013 워프 = WarpOut → SetPos → WarpIn 실측).
  UnitShine: null, UnitPlayAnim: null, UnitWarpIn: null, UnitWarpOut: null, UnitUpdate: null,
  // g003 유일 사용처가 좌표 -1(제자리 점프) — 좌표를 옮기는 호출이 아니다.
  UnitJumpPos: null, UnitSyncSkyCastle: null,
  // 엠블렘 연출·소환 컷신 — 결합 상태는 UnitSetGodUnit·UnitSetEngaging이 소유.
  GodUnitSetDarkness: null, EventEngageSummon: null,
  // 되감기(시간수정) 기록 계층 — 시뮬 되감기 정본은 기보.
  MapHistoryMindDone: null, MapHistoryEngageBreak: null,
  MapHistoryPositionListBegin: null, MapHistoryPositionList: null, MapHistoryPositionListEnd: null,
  // 지지 A+ 허용 — 맵 밖(거점) 계층.
  UnitReliancePermitAPlus: null,
  // 폴링 술어 — 값이 루프 탈출을 소유한다.
  SkipIsBlackOut: () => false, IsFading: () => false, IsLoading: () => false,
  EffectIsPlaying: () => false, UnitIsAction: () => false, MapCameraIsScroll: () => false,
  EventIsPlayingObject: () => false, ObjectIsExist: () => false, VisitCameraIsAction: () => false,
  MessIsExist: () => false, DebugIsButton: () => false, DebugIsTrigger: () => false,
  TimeGetDelta: () => 1000, CursorGetX: () => 0, CursorGetZ: () => 0, CursorGetDistanceMode: () => 0,
  MenuGetResult: () => 0, MapGetHeight: () => 0, MapGetPosition: () => 0, UnitGetMoveCost: () => 1,
  // 회상(외전 회상 맵) 여부 — 파이프라인은 본편 챕터만 변환한다(회상 맵 데이터 부재).
  MapIsRecollection: () => false,
  EventIsPlayingSkyCastle: () => false,
  // 전투·지원 애니 설정 = CONFIG_ANIM_OFF(0) — 시뮬은 전투 씬이 없다(common.lua 상수).
  ConfigGetBattleScene: () => 0, ConfigGetSupportScene: () => 0,
};

const REG = () => lua.LUA_REGISTRYINDEX;
const MAX_RESUMES = 10000;

export interface EventSession {
  /** Startup(+Opening·MapOpening) 실행 — 초기 스폰·변수·승리규칙 확정 후 1턴 개시(Turn·TurnAfter) 발화. */
  setup(state: GameState): HookResult;
  /** 페이즈 종료 직전(TurnEnd) — endPhase reduce 앞에서 부른다. */
  turnEnd(state: GameState): HookResult;
  /** 페이즈 개시(Turn → TurnAfter) — endPhase reduce 뒤에서 부른다. */
  turnBegin(state: GameState): HookResult;
  /** 사망 발화(Die) — 전투 해결 뒤 death 이벤트의 유닛마다. */
  died(state: GameState, unitIds: string[]): HookResult;
  /** 전투 전/후(BattleBefore·BattleTalk·BattleAfter) — attacker/defender 쌍. */
  battle(state: GameState, kinds: ("battleBefore" | "battleTalk" | "battleAfter")[], attackerId: string, defenderId: string): HookResult;
  /** 유닛 행동 종료 폴링(Fixed, terminal일 때만) + 영역 진입(Area) — ⚠발화 시점 근사(장부 참조). */
  acted(state: GameState, unitId: string, terminal: boolean): HookResult;
  /** 파괴 완파 발화(Destroy) — 완파된 구조물 사각과 교차하는 EventEntryDestroy 트리거. */
  destroyed(state: GameState, rects: { x1: number; y1: number; x2: number; y2: number }[]): HookResult;
  /**
   * 스텝 난수원 주입 — ☠이벤트 콜백의 굴림(RandomGet)도 기보 난수다. 리듀서가 매 스텝 넘긴다.
   * 미주입 상태에서 RandomGet이 불리면 정직 거부한다(0 강하 = 기보 재현 파괴).
   */
  setRng(rng: RandomSource | undefined): void;
  /** 미배선·미지 네이티브 호출 기록(정직성 표면) — [함수명, 호출 수]. */
  unknownCalls(): [string, number][];
}

export function createEventSession(opts: {
  sources: Record<string, string>;
  chapter: string;
  host: EventHost;
}): EventSession {
  const { sources, host } = opts;
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  // 활성 Lua 상태 — 네이티브는 '호출한' 상태(코루틴 스레드일 수 있음)의 스택을 읽어야 한다.
  // 기본값 = 메인 상태(훅 밖 JS 경로). register 래퍼가 진입/복귀를 소유한다.
  let A: LuaState = L;

  const inspectors: Inspector[] = [];
  /** 생성된 GodUnit(엠블렘 실체) — GodUnitCreate/Delete가 소유, GodUnitExists가 읽는다. */
  const gods = new Set<string>();
  const unknown = new Map<string, number>();
  const loaded = new Set<string>();
  let ctx: Draft | undefined;
  let rng: RandomSource | undefined;

  const draft = (): Draft => {
    if (ctx === undefined) throw new Error("이벤트 프리미티브가 훅 밖에서 불렸다");
    return ctx;
  };
  const str = (idx: number): string => to_jsstring(lua.lua_tostring(A, idx));
  const optInt = (idx: number, fallback: number): number =>
    lua.lua_type(A, idx) === lua.LUA_TNUMBER ? lua.lua_tointeger(A, idx) : fallback;

  /** 유닛 핸들 = draft.units 1기반 인덱스. 스크립트는 pid 문자열과 핸들을 혼용한다. */
  const unitAt = (idx: number): UnitState | undefined => {
    const d = draft();
    const t = lua.lua_type(A, idx);
    if (t === lua.LUA_TSTRING) {
      const pid = str(idx);
      return d.units.find((u) => !u.dead && u.pid === pid);
    }
    if (t === lua.LUA_TNUMBER) return d.units[lua.lua_tointeger(A, idx) - 1];
    return undefined;
  };
  const emit = (ev: BattleEvent): void => {
    draft().events.push(ev);
  };
  const setVariable = (key: string, value: number | string): void => {
    const d = draft();
    d.variables[key] = value;
    emit({ type: "variable", key, value });
  };

  const register = (name: string, fn: () => number): void => {
    lua.lua_pushjsfunction(L, (invoker: LuaState) => {
      const prev = A;
      A = invoker;
      try {
        return fn();
      } finally {
        A = prev;
      }
    });
    lua.lua_setglobal(L, to_luastring(name));
  };

  // ---- 이벤트 등록(EventEntry*) — MapInspector 사영 ----
  for (const [name, shape] of Object.entries(ENTRY_SHAPES)) {
    register(name, () => {
      const top = lua.lua_gettop(A);
      lua.lua_pushvalue(A, 1);
      const fnRef = lauxlib.luaL_ref(A, REG());
      const insp: Inspector = {
        kind: shape.kind, fnRef, min: -1, max: -1, force: -1, pid: "", pid2: "", force2: -1,
        both: false, condition: { kind: "none" }, argRefs: [],
      };
      let slot = 2;
      const rect = { x1: -1, y1: -1, x2: -1, y2: -1 };
      for (const key of shape.slots) {
        if (slot > top) break;
        if (key === "cond") {
          const t = lua.lua_type(A, slot);
          if (t === lua.LUA_TBOOLEAN) insp.condition = { kind: "bool", value: lua.lua_toboolean(A, slot) };
          else if (t === lua.LUA_TSTRING) {
            // 조건 문자열 = 1회성 발화 플래그(SetCondition 0x1DE5E70 — 자동 Entry(0), 발화 후 1 잠금).
            const key2 = str(slot);
            insp.condition = { kind: "flag", key: key2 };
            if (!(key2 in draft().variables)) setVariable(key2, 0);
          } else if (t === lua.LUA_TFUNCTION) {
            lua.lua_pushvalue(A, slot);
            insp.condition = { kind: "fn", ref: lauxlib.luaL_ref(A, REG()) };
          }
        } else if (key === "min") insp.min = optInt(slot, -1);
        else if (key === "max") insp.max = optInt(slot, -1);
        else if (key === "force") insp.force = optInt(slot, -1);
        else if (key === "force2") insp.force2 = optInt(slot, -1);
        else if (key === "both") insp.both = lua.lua_toboolean(A, slot);
        else if (key === "pid") insp.pid = lua.lua_type(A, slot) === lua.LUA_TSTRING ? str(slot) : "";
        else if (key === "pid2") insp.pid2 = lua.lua_type(A, slot) === lua.LUA_TSTRING ? str(slot) : "";
        else if (key === "x1") rect.x1 = optInt(slot, -1);
        else if (key === "y1") rect.y1 = optInt(slot, -1);
        else if (key === "x2") rect.x2 = optInt(slot, -1);
        else if (key === "y2") rect.y2 = optInt(slot, -1);
        else if (key === "hash") void 0; // UnitCommandInterrupt 커맨드 해시 — 기록 불요(발화 이월)
        slot += 1;
      }
      if (rect.x1 >= 0) insp.rect = { ...rect, x2: rect.x2 < 0 ? rect.x1 : rect.x2, y2: rect.y2 < 0 ? rect.y1 : rect.y2 };
      for (; slot <= top; slot++) {
        lua.lua_pushvalue(A, slot);
        insp.argRefs.push(lauxlib.luaL_ref(A, REG()));
      }
      inspectors.push(insp);
      return 0;
    });
  }

  // ---- 게임플레이 프리미티브 ----
  register("Include", () => {
    const name = str(1).toLowerCase();
    if (loaded.has(name)) return 0;
    loaded.add(name);
    const src = sources[name];
    if (src === undefined) throw new Error(`Include 소스 없음: ${name}`);
    if (lauxlib.luaL_loadstring(L, to_luastring(src)) !== lua.LUA_OK) throw new Error(`Lua 문법: ${str(-1)}`);
    if (lua.lua_pcall(A, 0, 0, 0) !== lua.LUA_OK) throw new Error(`Include 실행: ${str(-1)}`);
    return 0;
  });

  register("Dispos", () => {
    const d = draft();
    const group = str(1);
    // 중복 스폰 방지 없음(MapDispos.CreateProcess — 원기 그대로). 플래그(연출)는 무시한다.
    for (const u of host.spawnGroup(group, { ...d.base, units: d.units })) {
      d.units.push(u);
      emit({ type: "spawn", unit: JSON.parse(JSON.stringify(u)) as Record<string, unknown> });
    }
    return 0;
  });

  const transfer = (u: UnitState, force: number): void => {
    u.force = force;
    emit({ type: "transfer", unit: u.id, force });
  };
  register("UnitTransfer", () => {
    const u = unitAt(1);
    if (u !== undefined) transfer(u, lua.lua_tointeger(A, 2));
    return 0;
  });
  register("UnitJoin", () => {
    for (let i = 1; i <= lua.lua_gettop(A); i++) {
      const u = unitAt(i);
      if (u !== undefined && u.force !== 0) transfer(u, 0);
    }
    return 0;
  });
  register("UnitDelete", () => {
    const u = unitAt(1);
    if (u !== undefined && !u.dead) {
      u.dead = true;
      emit({ type: "despawn", unit: u.id });
    }
    return 0;
  });
  register("UnitDie", () => {
    const u = unitAt(1);
    if (u !== undefined && !u.dead) {
      u.hp = 0;
      u.dead = true;
      emit({ type: "death", unit: u.id });
    }
    return 0;
  });
  register("UnitSetPos", () => {
    const u = unitAt(1);
    if (u !== undefined) {
      u.x = lua.lua_tointeger(A, 2);
      u.y = lua.lua_tointeger(A, 3);
      emit({ type: "setPos", unit: u.id, x: u.x, y: u.y });
    }
    return 0;
  });
  register("UnitMovePos", () => {
    // 이동 연출 포함판 — 시뮬 사상은 SetPos와 동일(⚠통행 검증 없음 = 원기도 이벤트는 강제 배치).
    const u = unitAt(1);
    if (u !== undefined) {
      u.x = lua.lua_tointeger(A, 2);
      u.y = lua.lua_tointeger(A, 3);
      emit({ type: "setPos", unit: u.id, x: u.x, y: u.y });
    }
    return 0;
  });
  register("UnitResetParam", () => {
    const u = unitAt(1);
    if (u !== undefined) {
      u.hp = u.stats.hp;
      u.broken = false;
      delete u.statuses;
      emit({ type: "reset", unit: u.id, hpAfter: u.hp });
    }
    return 0;
  });
  /**
   * UNIT_STATUS_* 비트(common.lua 96~104) — ☠상태이상(badState)이 아니다. 전 호출부가 UNIT_STATUS_*
   * 상수를 넘긴다(전 챕터 전수 확인). ENGAGING(0x800000)만 국면(engage.engaging)에서 파생한다.
   */
  const UNIT_STATUS_ENGAGING = 0x800000;
  const flagsOf = (u: UnitState): number =>
    (u.flags ?? 0) | (u.engage?.engaging === true ? UNIT_STATUS_ENGAGING : 0);
  const setFlags = (u: UnitState, next: number): void => {
    if (next === 0) delete u.flags;
    else u.flags = next;
    emit({ type: "unitFlags", unit: u.id, flags: next });
  };
  register("UnitSetStatus", () => {
    const u = unitAt(1);
    if (u !== undefined) setFlags(u, (u.flags ?? 0) | lua.lua_tointeger(A, 2));
    return 0;
  });
  register("UnitClearStatus", () => {
    const u = unitAt(1);
    if (u !== undefined) setFlags(u, (u.flags ?? 0) & ~lua.lua_tointeger(A, 2));
    return 0;
  });
  register("UnitIsStatus", () => {
    const u = unitAt(1);
    const bit = lua.lua_tointeger(A, 2);
    lua.lua_pushboolean(A, u !== undefined && (flagsOf(u) & bit) !== 0);
    return 1;
  });
  register("UnitSetPrivateSkill", () => {
    const u = unitAt(1);
    const sid = str(2);
    const row = host.skillRow?.(sid);
    if (u !== undefined && row !== undefined) {
      // PrivateSkill = 상태 스킬 배열(m_PrivateSkill) — 엔진 사상은 statuses(BadState 소비 비트).
      const give: StatusGive = { sid, badState: (row.BadState as number | undefined) ?? 0, life: (row.Life as number | undefined) ?? 0 };
      u.statuses = [...(u.statuses ?? []).filter((s) => s.sid !== sid), { ...give, age: 0 }];
      emit({ type: "privateSkill", unit: u.id, sid, row: give as unknown as Record<string, unknown> });
    } else if (u !== undefined) {
      unknown.set(`UnitSetPrivateSkill:${sid}`, (unknown.get(`UnitSetPrivateSkill:${sid}`) ?? 0) + 1);
    }
    return 0;
  });
  register("UnitClearPrivateSkill", () => {
    const u = unitAt(1);
    const sid = str(2);
    if (u?.statuses !== undefined) {
      u.statuses = u.statuses.filter((s) => s.sid !== sid);
      if (u.statuses.length === 0) delete u.statuses;
      emit({ type: "privateSkill", unit: u.id, sid });
    }
    return 0;
  });
  register("UnitHasPrivateSkill", () => {
    const u = unitAt(1);
    const sid = str(2);
    lua.lua_pushboolean(A, u?.statuses?.some((s) => s.sid === sid) === true);
    return 1;
  });
  // 엠블렘 클러스터 — UnitGetGodUnit 핸들이 통째로 떼었다 붙이는 필드 묶음(m026 오프닝 브래킷).
  const GOD_FIELDS = ["gid", "engage", "engagedSkills", "engageWeapons", "engageArt"] as const;
  /** UnitGetGodUnit이 발급한 핸들(1-based) → 그 시점의 엠블렘 클러스터 스냅숏. */
  const godStash: Partial<Pick<UnitState, (typeof GOD_FIELDS)[number]>>[] = [];
  /** 클러스터 대입 — patch null = 삭제(재생 replay.ts와 같은 계약). draft에는 delete로 반영한다. */
  const applyGodPatch = (u: UnitState, next: Partial<Pick<UnitState, (typeof GOD_FIELDS)[number]>>): void => {
    const patch: Record<string, unknown> = {};
    for (const f of GOD_FIELDS) {
      if (next[f] === undefined) {
        if (u[f] !== undefined) {
          patch[f] = null;
          delete (u as unknown as Record<string, unknown>)[f];
        }
      } else {
        patch[f] = next[f];
        (u as unknown as Record<string, unknown>)[f] = next[f];
      }
    }
    emit({ type: "godUnit", unit: u.id, gid: "", patch });
  };
  register("UnitSetGodUnit", () => {
    const u = unitAt(1);
    if (u === undefined) return 0;
    // nil = 해제(m026 오프닝 외す) — ☠str(2)가 nil을 타면 JS TypeError가 경계에서 오류 값을 부순다.
    if (lua.lua_type(A, 2) <= lua.LUA_TNIL) {
      applyGodPatch(u, {});
      return 0;
    }
    // 숫자 = UnitGetGodUnit 핸들 재장착(원상 복구).
    if (lua.lua_type(A, 2) === lua.LUA_TNUMBER) {
      const snap = godStash[lua.lua_tointeger(A, 2) - 1];
      if (snap === undefined) return lauxlib.luaL_error(A, to_luastring("UnitSetGodUnit: 미지 핸들"));
      applyGodPatch(u, snap);
      return 0;
    }
    const gid = str(2);
    const patch = host.godUnit?.(u, gid);
    if (patch !== undefined) Object.assign(u, patch);
    emit({ type: "godUnit", unit: u.id, gid, ...(patch !== undefined ? { patch: patch as Record<string, unknown> } : {}) });
    return 0;
  });
  register("UnitGetGodUnit", () => {
    const u = unitAt(1);
    if (u?.engage === undefined) {
      lua.lua_pushnil(A);
      return 1;
    }
    godStash.push({ gid: u.gid, engage: u.engage, engagedSkills: u.engagedSkills, engageWeapons: u.engageWeapons, engageArt: u.engageArt });
    lua.lua_pushinteger(A, godStash.length);
    return 1;
  });
  register("UnitSetEngageCount", () => {
    const u = unitAt(1);
    const count = lua.lua_tointeger(A, 2);
    if (u?.engage !== undefined) {
      u.engage = { ...u.engage, count: Math.min(count, u.engage.limit) };
      emit({ type: "charge", unit: u.id, count: u.engage.count });
    }
    return 0;
  });
  register("UnitSetEngaging", () => {
    const u = unitAt(1);
    const on = lua.lua_toboolean(A, 2);
    if (u?.engage !== undefined && u.engage.engaging !== on) {
      u.engage = { ...u.engage, engaging: on, turn: 0, ...(on ? {} : { count: 0 }) };
      emit(on ? { type: "engage", unit: u.id } : { type: "disengage", unit: u.id });
    }
    return 0;
  });
  for (const name of ["ItemGain", "ItemGainSilent"]) {
    register(name, () => {
      // 1번 인자 nil = 수송대(맵 밖 창고) 지급 — 국면(맵)에 실체가 없다. GodSaveEquip과 같은 층.
      if (lua.lua_type(A, 1) === lua.LUA_TNIL) return 0;
      const u = unitAt(1);
      const iid = str(2);
      if (u === undefined) return 0;
      const row = host.gainItem?.(iid);
      if (row === undefined) return lauxlib.luaL_error(A, to_luastring(`${name}: 아이템 사영 없음 ${iid}`));
      if (row.kind === "none") return 0; // 데이터가 "맵 효과 없음"을 명시한 종별 — 조용한 no-op이 아니다
      const item = JSON.parse(JSON.stringify(row.item)) as never;
      if (row.kind === "weapon") u.weapons = [...(u.weapons ?? []), item];
      else if (row.kind === "staff") u.staves = [...(u.staves ?? []), item];
      else u.consumables = [...(u.consumables ?? []), item];
      emit({ type: "gain", unit: u.id, kind: row.kind, item: row.item as unknown as Record<string, unknown> });
      return 0;
    });
  }
  register("EventOpenDoor", () => {
    // 문 개방 = 구조물 소멸(통행 개방·같은 group 지붕 걷힘) — 파괴 타격과 같은 국면 변이라 destroy로 사영한다.
    const d = draft();
    const x = lua.lua_tointeger(A, 1);
    const y = lua.lua_tointeger(A, 2);
    const idx = (d.structures ?? []).findIndex(
      (s) => !s.roof && s.hp > 0 && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h,
    );
    if (idx < 0) {
      unknown.set(`EventOpenDoor:${x},${y}`, (unknown.get(`EventOpenDoor:${x},${y}`) ?? 0) + 1);
      return 0;
    }
    const target = d.structures![idx];
    target.hp = 0;
    const opener = d.mind.unit === undefined ? undefined : d.units[d.mind.unit];
    emit({ type: "destroy", unit: opener?.id ?? "", structure: idx, tid: target.tid, hpAfter: 0 });
    return 0;
  });

  register("UnitSetItemEquip", () => {
    // 장비 전환 — 인덱스 공간 = effectiveWeapons(attack.weapon과 동일 계약). ☠못 찾으면 정직 거부다:
    // 조용히 넘기면 보스가 틀린 무기로 싸운다(위력·상성·사거리가 통째로 어긋난다).
    const u = unitAt(1);
    const iid = str(2);
    if (u === undefined) return 0;
    const list = equipCandidates(u);
    const idx = list.findIndex((w) => w.iid === iid);
    if (idx < 0) return lauxlib.luaL_error(A, to_luastring(`UnitSetItemEquip: 소지 무기 아님 ${iid}`));
    u.weapon = list[idx];
    emit({ type: "equip", unit: u.id, index: idx });
    return 0;
  });
  register("UnitPutOffItem", () => {
    // 소지품 회수 — e006이 `UnitPutOffItem(리베라시온) → ItemGain(리베라시온改)`로 **교체**에 쓴다
    // (장비 해제만이 아니다). e005는 소모품 IID_特効薬까지 회수한다 → 세 채널 전부를 훑는다.
    const u = unitAt(1);
    const iid = str(2);
    if (u === undefined) return 0;
    for (const kind of ["weapon", "staff", "consumable"] as const) {
      const list: { iid?: string }[] | undefined =
        kind === "weapon" ? u.weapons : kind === "staff" ? u.staves : u.consumables;
      const idx = list?.findIndex((it) => it.iid === iid) ?? -1;
      if (idx < 0) continue;
      const dropped = list![idx];
      const rest = list!.filter((_, i) => i !== idx);
      if (kind === "weapon") {
        u.weapons = rest as UnitState["weapons"];
        if (u.weapon === dropped) delete u.weapon;
      } else if (kind === "staff") u.staves = rest as UnitState["staves"];
      else u.consumables = rest as UnitState["consumables"];
      emit({ type: "putOff", unit: u.id, kind, index: idx });
      return 0;
    }
    return lauxlib.luaL_error(A, to_luastring(`UnitPutOffItem: 소지품 아님 ${iid}`));
  });

  register("MapOverlapSetOne", () => {
    const d = draft();
    const x = lua.lua_tointeger(A, 1);
    const y = lua.lua_tointeger(A, 2);
    const tid = str(3);
    if (tid === "TID_紋章氣") {
      d.crests = [...(d.crests ?? []), { x, y }];
      emit({ type: "crestAdd", x, y });
    } else {
      unknown.set(`MapOverlapSetOne:${tid}`, (unknown.get(`MapOverlapSetOne:${tid}`) ?? 0) + 1);
    }
    return 0;
  });

  // ---- 변수(GameVariable 사영) ----
  register("VariableEntry", () => {
    const key = str(1);
    if (!(key in draft().variables)) {
      setVariable(key, lua.lua_type(A, 2) === lua.LUA_TSTRING ? str(2) : optInt(2, 0));
    }
    return 0;
  });
  register("VariableSet", () => {
    // Set = 기존 갱신 전용 — 미등록 키는 조용히 무시(GameVariable.Set 골격 그대로)…이지만 스크립트가
    // Entry 없이 쓰는 로컬 키가 실재해(勝利 등) 원기의 사전 등록층(엔진측 Entry)을 대신해 자동 등록한다.
    const key = str(1);
    setVariable(key, lua.lua_type(A, 2) === lua.LUA_TSTRING ? str(2) : optInt(2, 0));
    return 0;
  });
  register("VariableGet", () => {
    const v = draft().variables[str(1)];
    if (typeof v === "string") lua.lua_pushstring(A, to_luastring(v));
    else lua.lua_pushinteger(A, v ?? 0);
    return 1;
  });
  register("VariableIsExist", () => {
    lua.lua_pushboolean(A, str(1) in draft().variables);
    return 1;
  });

  // ---- 승패 규칙 ----
  const setRule = (patch: WinRule): void => {
    const d = draft();
    d.winRule = { ...d.winRule, ...patch };
    emit({ type: "winRule", ...patch });
  };
  register("WinRuleSetEnemyNumberLessThanOrEqualTo", () => {
    setRule({ enemyLessThan: lua.lua_tointeger(A, 1) });
    return 0;
  });
  register("WinRuleSetDestroyBoss", () => {
    setRule({ destroyBoss: lua.lua_type(A, 1) === lua.LUA_TBOOLEAN ? lua.lua_toboolean(A, 1) : true });
    return 0;
  });
  register("WinRuleSetLimitTurn", () => {
    setRule({ limitTurn: lua.lua_tointeger(A, 1) });
    return 0;
  });
  register("WinRule", () => 0); // 표시 재평가 전용(ScriptSystem 0x1ED90F0) — 판정 무관
  register("WinRuleSetMID", () => 0); // 표시 텍스트 — MID 사상은 UX 과제(연출 no-op과 동급)
  register("LoseRuleSetMID", () => 0);

  // ---- AI 재설정(기록만 — 소비 = MP4) ----
  for (const name of [
    "AiSetSequence", "AiSetActive", "AiSetRejectPower0Attack", "AiClearMoveLimit",
    "AiSetPriority", "AiSetBandNo", "AiSetRerewarp",
  ]) {
    register(name, () => {
      const u = unitAt(1);
      if (u !== undefined) {
        const params: (string | number | boolean)[] = [name];
        for (let i = 2; i <= lua.lua_gettop(A); i++) {
          const t = lua.lua_type(A, i);
          params.push(t === lua.LUA_TSTRING ? str(i) : t === lua.LUA_TBOOLEAN ? lua.lua_toboolean(A, i) : lua.lua_tonumber(A, i));
        }
        u.aiScript = [...(u.aiScript ?? []), params];
        emit({ type: "ai", unit: u.id, params });
      }
      return 0;
    });
  }
  register("AiGetActive", () => {
    // 기록만 배선(미소비)이라 "행동 개시 전"으로 강하 — ⚠MP4에서 실상태로 교체(장부 events.ai).
    lua.lua_pushboolean(A, false);
    return 1;
  });
  register("AiGetRerewarpPosition", () => {
    // AI 재워프 예약 좌표 — AI 실행기가 MP4라 예약이 없다(nil). 스크립트가 nil 분기를 갖고 있다
    // (m020: `if pos ~= nil then ... else Warning(...) end`) — AiGetActive와 같은 ⚠강하다.
    lua.lua_pushnil(A);
    return 1;
  });
  register("AiGetBandNo", () => {
    lua.lua_pushinteger(A, 0);
    return 1;
  });

  // ---- 상태 질의 ----
  register("DifficultyGet", () => {
    const d = draft().base.difficulty ?? "n";
    lua.lua_pushinteger(A, d === "l" ? 2 : d === "h" ? 1 : 0);
    return 1;
  });
  register("MapGetTurn", () => {
    lua.lua_pushinteger(A, draft().base.turn);
    return 1;
  });
  register("MapGetPhase", () => {
    lua.lua_pushinteger(A, draft().base.phase);
    return 1;
  });
  register("ForceUnitGetFirst", () => {
    const force = lua.lua_tointeger(A, 1);
    const idx = draft().units.findIndex((u) => !u.dead && (force < 0 || u.force === force));
    if (idx < 0) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, idx + 1);
    return 1;
  });
  register("ForceUnitGetNext", () => {
    const d = draft();
    const prev = lua.lua_tointeger(A, 1) - 1;
    const cur = d.units[prev];
    if (cur === undefined) {
      lua.lua_pushnil(A);
      return 1;
    }
    for (let i = prev + 1; i < d.units.length; i++) {
      if (!d.units[i].dead && d.units[i].force === cur.force) {
        lua.lua_pushinteger(A, i + 1);
        return 1;
      }
    }
    lua.lua_pushnil(A);
    return 1;
  });
  register("UnitGetX", () => {
    const u = unitAt(1);
    if (u === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.x);
    return 1;
  });
  register("UnitGetZ", () => {
    const u = unitAt(1);
    if (u === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.y);
    return 1;
  });
  register("UnitGetForce", () => {
    const u = unitAt(1);
    if (u === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.force);
    return 1;
  });
  register("UnitGetPID", () => {
    const u = unitAt(1);
    if (u?.pid === undefined) lua.lua_pushnil(A);
    else lua.lua_pushstring(A, to_luastring(u.pid));
    return 1;
  });
  register("UnitGetMPID", () => {
    const u = unitAt(1);
    if (u?.pid === undefined) {
      lua.lua_pushnil(A);
      return 1;
    }
    const name = host.mpid?.(u.pid);
    // ☠JS throw는 fengari 경계에서 오류 값이 깨진다(스택 잔재가 오류로 둔갑) — 정직 거부는 luaL_error로.
    if (name === undefined) return lauxlib.luaL_error(A, to_luastring(`UnitGetMPID: MPID 사영 부재 (${u.pid})`));
    lua.lua_pushstring(A, to_luastring(name));
    return 1;
  });
  register("UnitGetByPos", () => {
    const d = draft();
    const x = lua.lua_tointeger(A, 1);
    const y = lua.lua_tointeger(A, 2);
    const idx = d.units.findIndex((u) => !u.dead && u.x === x && u.y === y);
    if (idx < 0) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, idx + 1);
    return 1;
  });
  register("UnitIsExist", () => {
    lua.lua_pushboolean(A, unitAt(1) !== undefined);
    return 1;
  });
  register("UnitGetItemCount", () => {
    const u = unitAt(1);
    lua.lua_pushinteger(A, (u?.weapons?.length ?? 0) + (u?.staves?.length ?? 0) + (u?.consumables?.length ?? 0));
    return 1;
  });
  register("UnitGetItemRangeI", () => {
    const u = unitAt(1);
    lua.lua_pushinteger(A, u?.weapon?.rangeMin ?? 0);
    return 1;
  });
  register("UnitGetItemRangeO", () => {
    const u = unitAt(1);
    lua.lua_pushinteger(A, u?.weapon?.rangeMax ?? 0);
    return 1;
  });
  /**
   * 타일 질의 공통 — 맵 밖은 nil(원기도 MapCell 부재), 맵 안인데 데이터가 없으면 정직 오류.
   * ☠nil 강하 금지: 스크립트가 == "TID_..." 비교로 분기하므로 미배선 nil은 분기를 조용히 뒤집는다.
   */
  const tileField = (name: string, pick: (map: GameState["map"], x: number, y: number) => string | undefined) =>
    register(name, () => {
      const d = draft();
      const x = lua.lua_tointeger(A, 1);
      const y = lua.lua_tointeger(A, 2);
      if (x < 0 || y < 0 || x >= d.base.map.width || y >= d.base.map.height) {
        lua.lua_pushnil(A);
        return 1;
      }
      const v = pick(d.base.map, x, y);
      // ☠Lua 오류로 올린다(JS throw는 코루틴 경계에서 메시지가 소실된다) — 원인이 보여야 정직 강하다.
      if (v === undefined) return lauxlib.luaL_error(A, to_luastring(`${name}: 타일 데이터 미배선 (${x}, ${y})`));
      lua.lua_pushstring(A, to_luastring(v));
      return 1;
    });
  // 파괴 시 ChangeTid로 지형이 교체되는 원기 사상(MOVE_TERRAIN §2-13) → 살아있는 구조물 TID가 베이스를 덮는다.
  tileField("TerrainGet", (map, x, y) =>
    structureAt(draft().structures, x, y)?.tid
    ?? terrainPatchAt(draft().terrainPatches, x, y)?.tid
    ?? map.terrain?.[y]?.[x]?.tid);
  for (const name of ["TerrainSet", "TerrainSetOne"]) {
    register(name, () => {
      const d = draft();
      const x = lua.lua_tointeger(A, 1);
      const y = lua.lua_tointeger(A, 2);
      const tid = str(3);
      const row = host.terrainCell?.(tid);
      // ☠효과 없는 교체는 오재현이다(코스트·회피·회복이 그대로 남는다) — 표에 없으면 거부한다.
      if (row === undefined) return lauxlib.luaL_error(A, to_luastring(`${name}: 지형 사영 없음 ${tid}`));
      const patch: TerrainPatch = {
        x, y, tid, cell: row.cell,
        ...(row.cost === undefined ? {} : { cost: row.cost }),
        ...(row.display === undefined ? {} : { display: row.display }),
      };
      d.terrainPatches = [...(d.terrainPatches ?? []).filter((p) => p.x !== x || p.y !== y), patch];
      emit({ type: "terrainSet", ...patch, cell: patch.cell as unknown as Record<string, unknown>,
        ...(patch.cost === undefined ? {} : { cost: patch.cost as Record<string, number> }) });
      return 0;
    });
  }
  tileField("TerrainGetMoveCost", (map, x, y) => map.terrain?.[y]?.[x]?.costName);
  register("MapOverlapGet", () => {
    // 오버레이는 없는 칸이 정상(nil) — 있는데 TID가 없을 때만 미배선으로 거부한다.
    const d = draft();
    const spot = overlayAt(d.base.map, lua.lua_tointeger(A, 1), lua.lua_tointeger(A, 2));
    if (spot === undefined) lua.lua_pushnil(A);
    else if (spot.tid === undefined) return lauxlib.luaL_error(A, to_luastring("MapOverlapGet: 오버레이 TID 미배선"));
    else lua.lua_pushstring(A, to_luastring(spot.tid));
    return 1;
  });
  register("UnitGetByPID", () => {
    const d = draft();
    const pid = str(1);
    const idx = d.units.findIndex((u) => !u.dead && u.pid === pid);
    if (idx < 0) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, idx + 1);
    return 1;
  });
  register("UnitGetHp", () => {
    const u = unitAt(1);
    if (u === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.hp);
    return 1;
  });
  register("UnitGetHpStock", () => {
    lua.lua_pushinteger(A, unitAt(1)?.hpStock ?? 0);
    return 1;
  });
  register("UnitGetHpStockMax", () => {
    // 최대 스톡 = 초기 배치 원값 — 국면은 잔여만 든다. ⚠현재값으로 강하(장부 combat.hp-stock).
    lua.lua_pushinteger(A, unitAt(1)?.hpStock ?? 0);
    return 1;
  });
  /**
   * `UnitSetHp(pid, hp)` — 유닛 HP 절대 설정.
   * ☠**미배선이던 네이티브**: m001 쌍자이탈(턴3)이 `UnitSetHp(리ュール, maxHp)`를 부르는데 없어서
   * `endPhase`가 통째로 거부됐고, 그 결과 적턴 자동이 페이즈를 영영 못 닫았다(2026-08-18 실측).
   * 재생은 `heal` 이벤트의 `hpAfter`가 절대값을 들고 있어 그대로 복원된다.
   * ⚠HP 0으로 내리는 경우의 사망 처리는 근거가 없어 배선하지 않았다(실사용은 전부 양수 — m001·e006).
   */
  register("UnitSetHp", () => {
    const u = unitAt(1);
    const hp = lua.lua_tointeger(A, 2);
    if (u !== undefined) {
      const next = Math.max(Math.min(hp, u.stats.hp), 0);
      const amount = next - u.hp;
      u.hp = next;
      emit({ type: "heal", unit: u.id, target: u.id, amount, hpAfter: next });
    }
    return 0;
  });
  register("UnitSetHpStock", () => {
    const u = unitAt(1);
    const stock = lua.lua_tointeger(A, 2);
    if (u !== undefined) {
      if (stock === 0) delete u.hpStock;
      else u.hpStock = stock;
      emit({ type: "hpStock", unit: u.id, stock });
    }
    return 0;
  });
  register("UnitGetLevel", () => {
    const u = unitAt(1);
    if (u === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.level);
    return 1;
  });
  register("UnitGetEngageCount", () => {
    const u = unitAt(1);
    if (u?.engage === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, u.engage.count);
    return 1;
  });
  register("UnitGetEngaging", () => {
    lua.lua_pushboolean(A, unitAt(1)?.engage?.engaging === true);
    return 1;
  });
  register("UnitHasWholeSkill", () => {
    // Whole = 개인·싱크로·부여를 합친 보유 판정 — 국면이 아는 세 출처를 모두 본다.
    const u = unitAt(1);
    const sid = str(2);
    const has = [...(u?.skills ?? []), ...(u?.engagedSkills ?? [])].some((r) => r.Sid === sid)
      || u?.statuses?.some((st) => st.sid === sid) === true;
    lua.lua_pushboolean(A, has);
    return 1;
  });
  register("UnitCanEnter", () => {
    const d = draft();
    const u = unitAt(1);
    const x = lua.lua_tointeger(A, 2);
    const y = lua.lua_tointeger(A, 3);
    const inMap = x >= 0 && y >= 0 && x < d.base.map.width && y < d.base.map.height;
    const cost = u === undefined || !inMap ? 255 : makeCostAt(d.base.map, d.structures, u.moveType)(x, y);
    lua.lua_pushboolean(A, cost < 255);
    return 1;
  });
  /** CAPABILITY_* (common.lua 33~43) → 스탯 슬롯. ⚠3번째 인자(보정 포함 플래그)는 미분해 — 기본 스탯을 돌린다. */
  const CAPABILITY: (keyof UnitState["stats"] | "move")[] =
    ["hp", "str", "dex", "spd", "lck", "def", "mag", "res", "bld", "bld", "move"];
  register("UnitGetCapability", () => {
    const u = unitAt(1);
    const key = CAPABILITY[lua.lua_tointeger(A, 2)];
    if (u === undefined || key === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, key === "move" ? u.movePoints : u.stats[key]);
    return 1;
  });
  register("GodUnitExists", () => {
    lua.lua_pushboolean(A, gods.has(str(1)));
    return 1;
  });
  for (const name of ["GodUnitCreate", "GodUnitDelete"]) {
    register(name, () => {
      // 엠블렘 실체 풀 — GodUnitExists가 읽는 유일한 상태(연출은 없다). 세션 재실행으로 재구축된다.
      const gid = str(1);
      if (name === "GodUnitCreate") gods.add(gid);
      else gods.delete(gid);
      return 0;
    });
  }
  register("RandomGet", () => {
    // RandomGet(n) = App.Random.GetValue(n) = [0, n) 정수(HIT_RANDOM §1-3·§2-6) — RandomSource와 동일 계약.
    const bound = lua.lua_tointeger(A, 1);
    if (rng === undefined) return lauxlib.luaL_error(A, to_luastring("RandomGet: 난수원 미주입"));
    lua.lua_pushinteger(A, bound <= 0 ? 0 : rng.next(bound));
    return 1;
  });
  register("StringContains", () => {
    lua.lua_pushboolean(A, str(1).includes(str(2)));
    return 1;
  });
  register("SubPrefix", () => {
    // "GID_アイク" → "アイク" — 접두(XXX_) 제거. MID 조립·이펙트 이름 결합이 소비한다.
    const v = str(1);
    const i = v.indexOf("_");
    lua.lua_pushstring(A, to_luastring(i < 0 ? v : v.slice(i + 1)));
    return 1;
  });
  register("UnitTranslation", () => {
    // 좌표 평행이동 연출 — 시뮬 사상은 SetPos와 동일(e006 보스 돌진이 실제로 자리를 옮긴다).
    const u = unitAt(1);
    if (u !== undefined) {
      u.x = lua.lua_tointeger(A, 2);
      u.y = lua.lua_tointeger(A, 3);
      emit({ type: "setPos", unit: u.id, x: u.x, y: u.y });
    }
    return 0;
  });
  register("UnitDieWithoutEvent", () => {
    // UnitDie와 같은 국면 변이 — Die 발화 연쇄는 어차피 리듀서(base events)가 소유한다.
    const u = unitAt(1);
    if (u !== undefined && !u.dead) {
      u.hp = 0;
      u.dead = true;
      emit({ type: "death", unit: u.id });
    }
    return 0;
  });
  register("PersonGetIndex", () => {
    lua.lua_pushinteger(A, host.personIndex?.(str(1)) ?? 0);
    return 1;
  });
  register("MindGetUnit", () => {
    const m = draft().mind;
    if (m.unit === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, m.unit + 1);
    return 1;
  });
  register("MindGetTargetUnit", () => {
    const m = draft().mind;
    if (m.target === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, m.target + 1);
    return 1;
  });
  register("MindGetEventUnit", () => {
    const m = draft().mind;
    if (m.unit === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, m.unit + 1);
    return 1;
  });
  register("MindGetForce", () => {
    const m = draft().mind;
    if (m.force === undefined) lua.lua_pushnil(A);
    else lua.lua_pushinteger(A, m.force);
    return 1;
  });

  // ---- 연출 no-op + 미지 호출 기록 ----
  for (const [name, value] of Object.entries(PRESENTATION)) {
    register(name, () => {
      if (value === null) return 0;
      const v = value();
      if (typeof v === "boolean") lua.lua_pushboolean(A, v);
      else if (typeof v === "number") lua.lua_pushnumber(A, v);
      else lua.lua_pushnil(A);
      return 1;
    });
  }
  // ☠미등록 네이티브 호출 = Lua 오류 그대로 던진다(정직 거부) — 조용한 no-op 강하는 nil 비교 의미를
  // 오염시킨다(미지 전역이 함수가 되면 == nil 분기가 뒤집힌다). 새 챕터에서 터지면 그때 배선한다.

  // ---- 스크립트 로드(챕터 → Include가 common을 당긴다). 최상위는 상수 대입뿐(엔진 호출 없음). ----
  {
    const src = sources[opts.chapter];
    if (src === undefined) throw new Error(`챕터 스크립트 없음: ${opts.chapter}`);
    // 최상위에 Include·전역 대입이 있으므로 로딩도 훅 문맥이 필요할 수 있다 — 휘발 드래프트로 감싼다.
    const boot: Draft = {
      units: [], variables: {}, winRule: {}, crests: undefined, events: [],
      structures: undefined,
      terrainPatches: undefined,
      base: { turn: 0, phase: 0, map: { width: 0, height: 0, costs: {} }, units: [], events: [] },
      mind: {},
    };
    ctx = boot;
    try {
      if (lauxlib.luaL_loadstring(L, to_luastring(src)) !== lua.LUA_OK) throw new Error(`Lua 문법: ${str(-1)}`);
      if (lua.lua_pcall(L, 0, 0, 0) !== lua.LUA_OK) throw new Error(`스크립트 로드: ${str(-1)}`);
    } finally {
      ctx = undefined;
    }
  }

  // ---- 실행 기계 ----

  /** 콜백 실행 — 원기가 코루틴으로 돌리므로(WaitTime가 실제 yield) 코루틴 resume 루프로 완주시킨다. */
  const runCallback = (fnRef: number, argRefs: number[]): void => {
    const co = lua.lua_newthread(L);
    lua.lua_rawgeti(L, REG(), fnRef);
    lua.lua_xmove(L, co, 1);
    for (const ref of argRefs) {
      lua.lua_rawgeti(L, REG(), ref);
      lua.lua_xmove(L, co, 1);
    }
    let status = lua.lua_resume(co, null, argRefs.length);
    let spins = 0;
    while (status === lua.LUA_YIELD) {
      if (++spins > MAX_RESUMES) throw new Error("이벤트 콜백이 수렴하지 않는다(yield 폭주)");
      lua.lua_settop(co, 0);
      status = lua.lua_resume(co, null, 0);
    }
    if (status !== lua.LUA_OK) {
      // ☠오류 값이 문자열이 아니면(error(테이블) 등) lua_tostring이 null이라 to_jsstring이
      // TypeError로 죽어 진짜 원인이 가려진다 — 비문자 값은 타입명으로라도 표면화한다.
      const raw = lua.lua_tostring(co, -1);
      const msg =
        raw === null || raw === undefined
          ? `(비문자 오류 값: ${to_jsstring(lua.lua_typename(co, lua.lua_type(co, -1)))})`
          : to_jsstring(raw);
      throw new Error(`이벤트 콜백 오류: ${msg}`);
    }
    lua.lua_pop(L, 1); // thread
  };

  const isCondition = (c: Condition): boolean => {
    // IsCondition 0x1DE5280 사영: 없음 = 참 · bool 그대로 · 플래그 = 값 != 1 · 함수 = 호출 결과.
    if (c.kind === "none") return true;
    if (c.kind === "bool") return c.value;
    if (c.kind === "flag") return draft().variables[c.key] !== 1;
    lua.lua_rawgeti(L, REG(), c.ref);
    if (lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
      throw new Error(`이벤트 조건 오류: ${str(-1)}`);
    }
    const ok = lua.lua_toboolean(L, -1);
    lua.lua_pop(L, 1);
    return ok;
  };

  const complete = (insp: Inspector): void => {
    // Completed 0x1DE5490 — 조건 문자열형만 1로 잠근다(그 밖은 매번 재발화 가능 = 원기 그대로).
    if (insp.condition.kind === "flag") setVariable(insp.condition.key, 1);
  };

  const isValue = (self: number, other: number): boolean => self < 0 || self === other;
  const pidMatch = (want: string, unit: UnitState | undefined): boolean =>
    want === "" || unit?.pid === want;

  const fire = (kind: string, matches: (i: Inspector) => boolean): void => {
    // 콜백이 새 인스펙터를 등록해도 이번 발화 배치에는 안 낀다(GetEnableInspectors 스냅숏과 동형).
    for (const insp of [...inspectors]) {
      if (insp.kind !== kind || !matches(insp) || !isCondition(insp.condition)) continue;
      runCallback(insp.fnRef, insp.argRefs);
      complete(insp);
    }
  };

  const mkDraft = (state: GameState, mind: Mind = {}): Draft => ({
    units: state.units.map((u) => ({ ...u })),
    variables: { ...state.variables },
    winRule: { ...state.winRule },
    crests: state.crests === undefined ? undefined : [...state.crests],
    structures: state.structures === undefined ? undefined : state.structures.map((v) => ({ ...v })),
    terrainPatches: state.terrainPatches === undefined ? undefined : [...state.terrainPatches],
    events: [],
    base: state,
    mind,
  });

  const commit = (d: Draft): HookResult => {
    const state: GameState = {
      ...d.base,
      units: d.units,
      variables: d.variables,
      winRule: d.winRule,
      ...(d.crests === undefined ? {} : { crests: d.crests }),
      ...(d.structures === undefined ? {} : { structures: d.structures }),
      ...(d.terrainPatches === undefined ? {} : { terrainPatches: d.terrainPatches }),
      events: d.events,
    };
    return { state, events: d.events };
  };

  const withDraft = (state: GameState, mind: Mind, body: () => void): HookResult => {
    if (ctx !== undefined) throw new Error("이벤트 훅 재진입");
    const d = mkDraft(state, mind);
    ctx = d;
    try {
      body();
    } finally {
      ctx = undefined;
    }
    return commit(d);
  };

  const callGlobal = (name: string): void => {
    const t = lua.lua_getglobal(L, to_luastring(name));
    if (t !== lua.LUA_TFUNCTION) {
      lua.lua_pop(L, 1);
      return;
    }
    lua.lua_pushvalue(L, -1);
    const ref = lauxlib.luaL_ref(L, REG());
    lua.lua_pop(L, 1);
    try {
      runCallback(ref, []);
    } finally {
      lauxlib.luaL_unref(L, REG(), ref);
    }
  };

  const turnFilter = (state: GameState) => (i: Inspector): boolean => {
    if (i.min >= 0 && i.min > state.turn) return false;
    if (i.max >= 0 && i.max < state.turn) return false;
    return isValue(i.force, state.phase);
  };

  return {
    setup(state) {
      return withDraft(state, {}, () => {
        callGlobal("Startup");
        callGlobal("Opening");
        callGlobal("MapOpening");
        // 1턴 개시 발화 — MapSequence TurnBegin 이후 Turn → TurnAfter (LUA_BINDINGS §7).
        fire("turn", turnFilter(state));
        fire("turnAfter", turnFilter(state));
      });
    },
    turnEnd(state) {
      return withDraft(state, { force: state.phase }, () => {
        fire("turnEnd", turnFilter(state));
      });
    },
    turnBegin(state) {
      return withDraft(state, { force: state.phase }, () => {
        fire("turn", turnFilter(state));
        fire("turnAfter", turnFilter(state));
      });
    },
    died(state, unitIds) {
      let cur: HookResult = { state, events: [] };
      for (const id of unitIds) {
        const idx = cur.state.units.findIndex((u) => u.id === id);
        if (idx < 0) continue;
        const unit = cur.state.units[idx];
        const r = withDraft(cur.state, { unit: idx, force: unit.force }, () => {
          fire("die", (i) => pidMatch(i.pid, unit) && isValue(i.force, unit.force));
        });
        cur = { state: r.state, events: [...cur.events, ...r.events] };
      }
      return cur;
    },
    battle(state, kinds, attackerId, defenderId) {
      let cur: HookResult = { state, events: [] };
      for (const kind of kinds) {
        const aIdx = cur.state.units.findIndex((u) => u.id === attackerId);
        const bIdx = cur.state.units.findIndex((u) => u.id === defenderId);
        if (aIdx < 0 || bIdx < 0) continue;
        const a = cur.state.units[aIdx];
        const b = cur.state.units[bIdx];
        const r = withDraft(cur.state, { unit: aIdx, target: bIdx, force: a.force }, () => {
          fire(kind, (i) => {
            const fwd = pidMatch(i.pid, a) && isValue(i.force, a.force) && pidMatch(i.pid2, b) && isValue(i.force2, b.force);
            const rev = i.both && pidMatch(i.pid, b) && isValue(i.force, b.force) && pidMatch(i.pid2, a) && isValue(i.force2, a.force);
            return fwd || rev;
          });
        });
        cur = { state: r.state, events: [...cur.events, ...r.events] };
      }
      return cur;
    },
    acted(state, unitId, terminal) {
      const idx = state.units.findIndex((u) => u.id === unitId);
      if (idx < 0) return { state, events: [] };
      const unit = state.units[idx];
      return withDraft(state, { unit: idx, force: unit.force }, () => {
        // ⚠발화 시점 근사: Fixed = 행동 종료 폴링(MapSequenceMind.Label Fixed=26 — 행동 소모 액션만) ·
        // Area = 좌표 사각형 진입(MapSequenceMind.AreaEvent — 이동 포함) — 정확 시퀀스는 미판독(장부).
        if (terminal) fire("fixed", (i) => pidMatch(i.pid, unit) && isValue(i.force, unit.force));
        fire("area", (i) =>
          i.rect !== undefined &&
          isValue(i.force, unit.force) &&
          unit.x >= i.rect.x1 && unit.x <= i.rect.x2 && unit.y >= i.rect.y1 && unit.y <= i.rect.y2,
        );
      });
    },
    destroyed(state, rects) {
      return withDraft(state, {}, () => {
        fire("destroy", (i) =>
          i.rect !== undefined &&
          rects.some((r) => r.x1 <= i.rect!.x2 && i.rect!.x1 <= r.x2 && r.y1 <= i.rect!.y2 && i.rect!.y1 <= r.y2),
        );
      });
    },
    setRng(next) {
      rng = next;
    },
    unknownCalls() {
      return [...unknown.entries()];
    },
  };
}
