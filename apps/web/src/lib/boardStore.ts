import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand/react";
import {
  createCalculator,
  createReducer,
  createReplayer,
  recordingSource,
  RULE_VERSION,
  type BattleAction,
  type GameState,
  type Reduce,
  type Timeline,
  type UnitState,
  type VerifyResult,
} from "@fesim/engine";
import type { CalculatorData, Difficulty, EphemerisFile, EphemerisSetup, EphemerisStep } from "@fesim/shared";
import calculatorRaw from "../../../../data/fe17/tables/calculator.json?raw";
import type { BoardProps } from "./fe17";
import { clearSlot, loadSlot, saveSlot, type SaveKey } from "./guestSave";

/**
 * 보드 상태의 정본 — 아일랜드는 이 스토어를 구독만 한다(룰 로직은 엔진, 표시는 BoardView).
 * 플레이 = 실굴림을 recordingSource로 감싸 기보가 자동으로 쌓인다(공유·자동 저장이 같은 기록을 쓴다).
 * 리플레이 = 파일이 난이도·국면을 소유하므로 플레이 조작은 잠근다.
 */
export const calculator = createCalculator(JSON.parse(calculatorRaw) as CalculatorData);
/** 전투 리듀서(이벤트 무관 순수층) — 이벤트 래퍼(BoardIsland 주입)의 base로도 쓰인다. */
export const baseReduce = createReducer(calculator);
const reduce = baseReduce;

/**
 * 이벤트 배선(MP2) — 스토어는 주입만 받는다. ☠fengari(이벤트 모듈)를 여기서 임포트하면
 * 열람(/s/) 번들에 실린다(성능 게이트) — 생성은 BoardIsland(제작 경로)가 소유한다.
 * 새 판마다 create(난이도) 재호출 = 새 세션(Startup 재등록 중복 방지).
 */
export interface EventWiring {
  create(difficulty: Difficulty): Reduce;
}
/** 공유 열람(/s/)의 서버 렌더가 같은 재생기를 쓴다 — 스냅숏 계산이 서버·클라에서 갈라지면 안 된다. */
export const replayer = createReplayer(reduce);
const liveRng = { next: (bound: number) => Math.floor(Math.random() * bound) };

export interface UnitVisual {
  icon?: string;
  abbr: string;
  name: string;
  job: string;
  ring: string;
  chip: string;
}

export interface ReplaySession {
  file: EphemerisFile;
  timeline: Timeline;
  verify: VerifyResult;
}

export interface BoardState {
  mode: "play" | "replay";
  difficulty: Difficulty;
  scenario?: string;
  /** 초기 세팅 diff(M4 편집) — 부재 = dispos 기본. 스냅숏이 초기화 정본(shared/ephemeris.ts). */
  setup?: EphemerisSetup;
  game: GameState;
  visuals: Map<string, UnitVisual>;
  recording: EphemerisStep[];
  replay?: ReplaySession;
  cursor: number;
  setDifficulty: (difficulty: Difficulty) => void;
  setScenario: (scenario: string | undefined) => void;
  reset: () => void;
  restore: () => void;
  /** 플레이 언두 — 마지막 행동을 물린다(이벤트 절대값 재적용 = 결정적, 난수 재소비 없음). */
  undo: () => void;
  /** 세팅 diff 교체 — 새 판을 연다(기보·슬롯 리셋: 이전 로그는 새 초기 국면과 정합이 깨진다). */
  setSetup: (setup: EphemerisSetup | undefined) => void;
  dispatch: (action: BattleAction) => GameState;
  toFile: (meta?: EphemerisFile["meta"]) => EphemerisFile;
  loadReplay: (file: EphemerisFile) => void;
  seek: (cursor: number) => void;
  stepAction: (delta: number) => void;
  stepPhase: (delta: number) => void;
}

export type BoardStore = StoreApi<BoardState>;

/** 뷰 → 엔진 유닛 사영 — 초기 배치와 이벤트 스폰(Dispos 호스트)이 같은 사상을 쓴다(중복 구현 금지). */
export function projectUnit(
  props: BoardProps,
  i: number,
  difficulty: Difficulty,
  setup?: EphemerisSetup,
): UnitState | undefined {
  const u = props.units[i];
  const id = `u${i}`;
  // setup diff(M4 편집): 스냅숏(stats)이 초기화의 정본 — 열람 경로가 원천 테이블 없이 재구성한다.
  const su = setup?.units?.[id];
  if (u === undefined || su?.removed === true) return undefined;
  const stats = su?.stats ?? u.stats?.[difficulty];
  if (stats === undefined) return undefined;
  return {
    id,
    pid: u.pid,
    name: u.name,
    force: u.force,
    x: su?.x ?? u.x,
    y: su?.y ?? u.y,
    hp: stats.hp,
    stats,
    weapon: su?.weapons?.[0] ?? u.weapon,
    weapons: su?.weapons ?? u.weapons,
    staves: su?.staves ?? u.staves,
    consumables: su?.consumables ?? u.consumables,
    engage: su?.engage ?? u.engage,
    engagedSkills: su?.engagedSkills ?? u.engagedSkills,
    engageWeapons: su?.engageWeapons ?? u.engageWeapons,
    engageArt: su?.engageArt ?? u.engageArt,
    skills: su?.skills ?? u.skills,
    growth: u.growth,
    level: su?.level ?? u.levels[difficulty],
    internalLevel: u.internalLevel,
    exp: 0,
    movePoints: u.movePoints,
    moveType: u.moveType,
    style: u.style,
    acted: false,
    dead: false,
    broken: false,
  };
}

export function initGame(
  props: BoardProps,
  difficulty: Difficulty,
  scenario: string | undefined,
  setup?: EphemerisSetup,
): { game: GameState; visuals: Map<string, UnitVisual> } {
  void scenario; // 국면 프리셋 폐지(MP2) — .eph 스키마 호환용으로만 남는다
  const visuals = new Map<string, UnitVisual>();
  const units: UnitState[] = [];
  // 초기 배치 = 스크립트가 Dispos하지 않는 그룹만(이벤트가 소환) · 스크립트 없으면 전 그룹.
  const disposed = new Set(props.script?.disposGroups ?? []);
  props.units.forEach((u, i) => {
    const id = `u${i}`;
    // visuals는 전 유닛 등록 — 이벤트 스폰 유닛도 같은 id(u{i})로 조회된다.
    visuals.set(id, { icon: u.icon, abbr: u.abbr, name: u.name, job: u.job, ring: u.ring, chip: u.chip });
    if (disposed.has(u.group)) return;
    const unit = projectUnit(props, i, difficulty, setup);
    if (unit !== undefined) units.push(unit);
  });
  const game: GameState = {
    turn: 1,
    phase: 0,
    difficulty,
    map: {
      width: props.width,
      height: props.height,
      costs: props.costs,
      terrain: props.tiles.map((line) =>
        line.map((t) => ({
          avoid: t.avoid,
          def: t.def,
          ...(t.playerAvoid !== undefined ? { playerAvoid: t.playerAvoid } : {}),
          ...(t.playerDef !== undefined ? { playerDef: t.playerDef } : {}),
          ...(t.enemyAvoid !== undefined ? { enemyAvoid: t.enemyAvoid } : {}),
          ...(t.enemyDef !== undefined ? { enemyDef: t.enemyDef } : {}),
          ...(t.heal !== undefined ? { heal: t.heal } : {}),
          ...(t.moveFirst !== undefined ? { moveFirst: t.moveFirst } : {}),
          ...(t.notWarp === true ? { notWarp: true } : {}),
        })),
      ),
      ...(props.overlays !== undefined && props.overlays.length > 0
        ? {
            overlays: props.overlays.map((o) => ({
              x: o.x,
              y: o.y,
              cell: {
                avoid: o.avoid,
                def: o.def,
                ...(o.playerAvoid !== undefined ? { playerAvoid: o.playerAvoid } : {}),
                ...(o.playerDef !== undefined ? { playerDef: o.playerDef } : {}),
                ...(o.enemyAvoid !== undefined ? { enemyAvoid: o.enemyAvoid } : {}),
                ...(o.enemyDef !== undefined ? { enemyDef: o.enemyDef } : {}),
                ...(o.heal !== undefined ? { heal: o.heal } : {}),
                ...(o.moveFirst !== undefined ? { moveFirst: o.moveFirst } : {}),
                ...(o.notWarp === true ? { notWarp: true } : {}),
              },
              ...(o.moveCost !== undefined ? { moveCost: o.moveCost } : {}),
              ...(o.flyCost !== undefined ? { flyCost: o.flyCost } : {}),
            })),
          }
        : {}),
    },
    units,
    events: [],
  };
  // 紋章氣 = 소비 가능한 국면 상태 — 렌더는 objects, 잔존 판별은 이 목록이 정본.
  const crests = props.objects.filter((o) => o.crest === true).map((o) => ({ x: o.x, y: o.y }));
  if (crests.length > 0) game.crests = crests;
  // 구조물 = 국면 상태(hp — 파괴로 변한다). 지붕(roof)은 렌더 전용이지만 걷힘 판별을 위해 함께 싣는다.
  if (props.structures !== undefined && props.structures.length > 0) {
    game.structures = props.structures.map((s) => ({
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      tid: s.tid,
      group: s.group,
      hp: s.hp[difficulty] ?? 0,
      ...(s.roof === true ? { roof: true } : {}),
      ...(s.costs !== undefined ? { costs: s.costs } : {}),
      name: s.name,
    }));
  }
  return { game, visuals };
}

const GAME_ID = "fe17";

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

const phaseIndexAt = (timeline: Timeline, cursor: number): number => {
  for (let i = timeline.phases.length - 1; i > 0; i--) {
    if (timeline.phases[i].start <= cursor) return i;
  }
  return 0;
};

/** 표시 국면 = 리플레이면 커서 위치, 아니면 플레이 국면. 커서 1건 메모(스테핑이 매 렌더 재계산되면 안 된다). */
let memo: { timeline: Timeline; cursor: number; state: GameState } | undefined;
export function displayState(s: BoardState): GameState {
  if (s.replay === undefined) return s.game;
  const timeline = s.replay.timeline;
  if (memo !== undefined && memo.timeline === timeline && memo.cursor === s.cursor) return memo.state;
  const state = replayer.stateAt(timeline, s.cursor);
  memo = { timeline, cursor: s.cursor, state };
  return state;
}

/**
 * 리플레이는 **스토어 생성 시점에** 실려야 한다 — zustand의 서버 스냅숏은 `getInitialState()`라서,
 * 만든 뒤 loadReplay로 얹으면 SSR이 초기 국면을 그리고 하이드레이션에서 화면이 튄다(실측으로 확인).
 */
export interface ReplayInit {
  file: EphemerisFile;
  cursor?: number;
}

export function createBoardStore(
  props: BoardProps,
  replayInit?: ReplayInit,
  setup?: EphemerisSetup,
  events?: EventWiring,
): BoardStore {
  const evented = events !== undefined && props.script !== undefined;

  /** 리플레이 검증 — 이벤트 챕터는 새 세션의 이벤트 리듀서로 재계산한다(스텝 재현 = 세션 재구축). */
  const sessionOf = (base: GameState, file: EphemerisFile): ReplaySession => ({
    file,
    timeline: replayer.buildTimeline(base, file.log),
    verify: (evented ? createReplayer(events!.create(file.chapter.difficulty), baseReduce) : replayer)
      .verify(base, file.log),
  });

  /** 새 판 개시 — 이벤트 챕터는 setup을 기보 스텝 0으로 기록한다(열람 경로의 절대 복원 정본). */
  const boot = (
    difficulty: Difficulty,
    scenario: string | undefined,
    bootSetup?: EphemerisSetup,
  ): { game: GameState; visuals: Map<string, UnitVisual>; live?: Reduce; log: EphemerisStep[] } => {
    const raw = initGame(props, difficulty, scenario, bootSetup);
    if (!evented) return { ...raw, log: [] };
    const live = events!.create(difficulty);
    const rng = recordingSource(liveRng);
    const game = live(raw.game, { type: "setup" }, rng);
    const step: EphemerisStep = { action: { type: "setup" } };
    const rolls = rng.drain();
    if (rolls.length > 0) step.rolls = rolls;
    if (game.events.length > 0) step.events = [...game.events];
    return { game, visuals: raw.visuals, live, log: [step] };
  };

  const start = replayInit?.file.chapter;
  const startSetup = replayInit?.file.setup ?? setup;
  // 리플레이 기점 = 원시 초기 국면(기록이 setup 스텝을 소유) · 플레이 기점 = boot(setup 실행+기록).
  const initial =
    replayInit === undefined
      ? boot(start?.difficulty ?? "l", start?.scenario, startSetup)
      : { ...initGame(props, start?.difficulty ?? "l", start?.scenario, startSetup), live: undefined, log: [] as EphemerisStep[] };
  const session = replayInit === undefined ? undefined : sessionOf(initial.game, replayInit.file);
  let live: Reduce | undefined = initial.live;

  return createStore<BoardState>((set, get) => {
    const saveKey = (): SaveKey => ({
      game: GAME_ID,
      mapId: props.mapId,
      difficulty: get().difficulty,
      scenario: get().scenario,
    });

    const fresh = (difficulty: Difficulty, scenario: string | undefined) => {
      const next = boot(difficulty, scenario, get().setup);
      live = next.live;
      set({
        mode: "play",
        difficulty,
        scenario,
        game: next.game,
        visuals: next.visuals,
        recording: next.log,
        replay: undefined,
        cursor: 0,
      });
    };

    return {
      mode: session === undefined ? "play" : "replay",
      difficulty: start?.difficulty ?? "l",
      scenario: start?.scenario,
      setup: startSetup,
      game: initial.game,
      visuals: initial.visuals,
      recording: session === undefined ? initial.log : [...session.file.log],
      replay: session,
      cursor: session === undefined ? 0 : clamp(replayInit?.cursor ?? 0, 0, session.timeline.steps.length),

      setDifficulty(difficulty) {
        if (get().mode === "replay" || get().difficulty === difficulty) return;
        fresh(difficulty, get().scenario);
      },

      setScenario(scenario) {
        if (get().mode === "replay" || get().scenario === scenario) return;
        fresh(get().difficulty, scenario);
      },

      reset() {
        clearSlot(saveKey());
        fresh(get().difficulty, get().scenario);
      },

      /** 슬롯이 있으면 기록을 되감아 이어 플레이 — 실패는 조용히 새 판(진행 중 판을 건드리지 않는다). */
      restore() {
        if (get().mode === "replay") return;
        const key = saveKey();
        const file = loadSlot(key);
        if (file === undefined || file.log.length === 0) return;
        const base = initGame(props, key.difficulty, key.scenario, file.setup ?? get().setup);
        try {
          let state = base.game;
          for (const step of file.log) state = replayer.applyStep(state, step);
          set({ game: state, visuals: base.visuals, recording: [...file.log], setup: file.setup ?? get().setup });
        } catch (e) {
          console.warn("게스트 저장 복원 실패 — 새 판으로 시작한다", e);
          clearSlot(key);
        }
      },

      setSetup(setup) {
        if (get().mode === "replay") return;
        clearSlot(saveKey());
        set({ setup });
        fresh(get().difficulty, get().scenario);
      },

      undo() {
        const { mode, recording, difficulty, scenario, setup: currentSetup } = get();
        if (mode === "replay" || recording.length === 0) return;
        if (recording.length === 1 && recording[0].action.type === "setup") return; // 개시 스텝은 판 그 자체

        const log = recording.slice(0, -1);
        const base = initGame(props, difficulty, scenario, currentSetup);
        let state = base.game;
        for (const step of log) state = replayer.applyStep(state, step);
        set({ game: state, recording: log });
        saveSlot(saveKey(), get().toFile());
      },

      dispatch(action) {
        const { game, mode, recording } = get();
        if (mode === "replay") return game;
        const rng = recordingSource(liveRng);
        let next: GameState;
        try {
          next = (live ?? reduce)(game, action, rng);
        } catch {
          return game; // 불법 행동 = 무시 (엔진이 심판)
        }
        const rolls = rng.drain();
        const step: EphemerisStep = { action };
        if (rolls.length > 0) step.rolls = rolls;
        if (next.events.length > 0) step.events = [...next.events];
        const log = [...recording, step];
        set({ game: next, recording: log });
        saveSlot(saveKey(), get().toFile());
        return next;
      },

      toFile(meta) {
        const { difficulty, scenario, recording, setup: currentSetup } = get();
        return {
          eph: 1,
          game: GAME_ID,
          ruleVersion: RULE_VERSION,
          chapter: { cid: props.mapId, difficulty, scenario },
          ...(currentSetup === undefined ? {} : { setup: currentSetup }),
          log: recording,
          ...(meta === undefined ? {} : { meta }),
        };
      },

      loadReplay(file) {
        const difficulty = file.chapter.difficulty;
        const scenario = file.chapter.scenario;
        const base = initGame(props, difficulty, scenario, file.setup);
        set({
          mode: "replay",
          difficulty,
          scenario,
          setup: file.setup,
          game: base.game,
          visuals: base.visuals,
          recording: [...file.log],
          replay: sessionOf(base.game, file),
          cursor: 0,
        });
      },

      seek(cursor) {
        const replay = get().replay;
        if (replay === undefined) return;
        set({ cursor: clamp(cursor, 0, replay.timeline.steps.length) });
      },

      stepAction(delta) {
        get().seek(get().cursor + delta);
      },

      /** 뒤로 = 현 페이즈 개시점, 이미 개시점이면 앞 페이즈(미디어 플레이어 문법). */
      stepPhase(delta) {
        const { replay, cursor } = get();
        if (replay === undefined) return;
        const { phases, steps } = replay.timeline;
        const idx = phaseIndexAt(replay.timeline, cursor);
        if (delta > 0) {
          get().seek(phases[idx + 1]?.start ?? steps.length);
          return;
        }
        if (cursor > phases[idx].start) {
          get().seek(phases[idx].start);
          return;
        }
        get().seek(phases[idx - 1]?.start ?? 0);
      },
    };
  });
}

export const useBoard = <T>(store: BoardStore, selector: (state: BoardState) => T): T =>
  useStore(store, selector);
