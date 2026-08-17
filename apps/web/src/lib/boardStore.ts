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
const reduce = createReducer(calculator);
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
  phase?: string;
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

export function initGame(
  props: BoardProps,
  difficulty: Difficulty,
  scenario: string | undefined,
  setup?: EphemerisSetup,
): { game: GameState; visuals: Map<string, UnitVisual> } {
  const visuals = new Map<string, UnitVisual>();
  const units: UnitState[] = [];
  props.units.forEach((u, i) => {
    if (u.phase !== undefined && scenario !== undefined && u.phase !== scenario) return;
    const id = `u${i}`;
    // setup diff(M4 편집): 스냅숏(stats)이 초기화의 정본 — 열람 경로가 원천 테이블 없이 재구성한다.
    const su = setup?.units?.[id];
    if (su?.removed === true) return;
    const stats = su?.stats ?? u.stats?.[difficulty];
    if (stats === undefined) return;
    visuals.set(id, {
      icon: u.icon, abbr: u.abbr, name: u.name, job: u.job, ring: u.ring, chip: u.chip, phase: u.phase,
    });
    units.push({
      id,
      name: u.name,
      force: u.force,
      x: su?.x ?? u.x,
      y: su?.y ?? u.y,
      hp: stats.hp,
      stats,
      weapon: su?.weapons?.[0] ?? u.weapon,
      weapons: su?.weapons ?? u.weapons,
      staves: su?.staves ?? u.staves,
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
    });
  });
  const game: GameState = {
    turn: 1,
    phase: 0,
    difficulty,
    map: {
      width: props.width,
      height: props.height,
      costs: props.costs,
      terrain: props.tiles.map((line) => line.map((t) => ({ avoid: t.avoid, def: t.def }))),
    },
    units,
    events: [],
  };
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

const sessionOf = (base: GameState, file: EphemerisFile): ReplaySession => ({
  file,
  timeline: replayer.buildTimeline(base, file.log),
  verify: replayer.verify(base, file.log),
});

export function createBoardStore(
  props: BoardProps,
  replayInit?: ReplayInit,
  setup?: EphemerisSetup,
): BoardStore {
  const start = replayInit?.file.chapter;
  const startSetup = replayInit?.file.setup ?? setup;
  const initial = initGame(props, start?.difficulty ?? "l", start?.scenario, startSetup);
  const session = replayInit === undefined ? undefined : sessionOf(initial.game, replayInit.file);

  return createStore<BoardState>((set, get) => {
    const saveKey = (): SaveKey => ({
      game: GAME_ID,
      mapId: props.mapId,
      difficulty: get().difficulty,
      scenario: get().scenario,
    });

    const fresh = (difficulty: Difficulty, scenario: string | undefined) => {
      const next = initGame(props, difficulty, scenario, get().setup);
      set({
        mode: "play",
        difficulty,
        scenario,
        game: next.game,
        visuals: next.visuals,
        recording: [],
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
      recording: session === undefined ? [] : [...session.file.log],
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
          next = reduce(game, action, rng);
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
