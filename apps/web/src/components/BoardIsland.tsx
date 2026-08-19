import { useEffect, useMemo, useRef, useState } from "react";
import {
  attackRange,
  BAD_STATE,
  baseBattleTimes,
  battlePlan,
  canBreak,
  createAi,
  emptyAiMemory,
  canChainGuard,
  canDance,
  canterPower,
  chainAttackers,
  chainGuardFor,
  chainNumbers,
  destroyTargets,
  hasChainGuardSkill,
  effectiveWeapons,
  hasBadState,
  itemTargets,
  makeCostAt,
  moveBudget,
  moveBudgetOn,
  movePredicates,
  movementPath,
  movementRange,
  staffHealAmount,
  staffHitRate,
  toCombatant,
  combatEnv,
  warpDestinations,
  type AiDeficit,
  type BattleAction,
  type BattleOrder,
  type BattleEvent,
  type BattleWeapon,
  type GameState,
  type MoveQuery,
  type SideForecast,
  type StrikeKind,
  type Tile,
  type UnitState,
} from "@fesim/engine";
import { parseEphemeris, serializeEphemeris, type EphemerisFile } from "@fesim/shared";
import { coordLabel, rawCoord, tileKey } from "../lib/grid";
import type { BoardProps, Difficulty } from "../lib/fe17";
import { defaultReplayPath, scriptPath, visibleObjects, visibleStructures } from "../lib/boards";
import {
  calculator,
  createBoardStore,
  displayState,
  replayer,
  useBoard,
  type BoardStore,
  type UnitVisual,
} from "../lib/boardStore";
import { eventWiringFor } from "../lib/eventWiring";
import {
  clampZoom,
  dropSave,
  hasGuestSave,
  listSaves,
  loadZoom,
  readSave,
  saveZoom,
  type SaveSummary,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from "../lib/guestSave";
import { readMapQuery, writeMapQuery } from "../lib/replayQuery";
import CommandMenu from "./CommandMenu";
import ItemPanel, { type ItemRow, type StatDelta } from "./ItemPanel";
import { availableCommands, type CommandId } from "../lib/commands";
import BoardView, { type BoardFx, type StrikeRow, type StrikeSummary } from "./BoardView";
import "./board.css";
// REPLAY 표지 전용 서체(사용자 지정) — 제작 경로에만 싣는다(열람 /s/ 번들에 폰트를 얹지 않는다).
import "@fontsource/jetbrains-mono/latin-700.css";

/**
 * 그 행동이 지정한 무기 — ☠`before` 유닛의 장비는 **전투 직전 것**이라 못 믿는다.
 * `attack` 액션은 무기 인덱스를 들고 오고(기보 재생·라이브 dispatch 둘 다) 리듀서는 그것을
 * 장비 전환으로 처리한다(battle.ts `attacker.weapon = chosen`). 표시층도 같은 무기를 봐야 한다.
 */
export function actionWeapon(
  before: GameState,
  action: BattleAction,
): { unit: string; weapon: BattleWeapon } | undefined {
  if (action.type !== "attack" || action.weapon === undefined) return undefined;
  const u = before.units.find((x) => x.id === action.unit);
  const weapon = u === undefined ? undefined : effectiveWeapons(u)?.[action.weapon];
  return weapon === undefined ? undefined : { unit: action.unit, weapon };
}

/**
 * ★표시용 kind — 기보 `kind`는 **호환 불변식**이라 오더 인덱스 1을 무조건 `followUp`으로 적는다.
 * 그 오더가 追撃条件(기저 `手番回数` = 2)에서 왔는지 신속(Timing 4에서 `+1`)에서 왔는지는 기보가
 * 구분하지 않으므로 **화면에 쓸 때만** 기저 `手番回数`를 다시 물어 가른다 — 기저가 1이면 추격이 아니라 추가타다.
 * ☠기저를 안 물으면 실기 앵커(뤼에르 8 + 4, 追撃条件 거짓)의 두 번째 타격이 "(추격)"으로 나간다.
 * ☠거친 부분 = 기저 판정만 본다. `SID_切り返し`(Timing 3에서 `手番回数 = 2`)도 추가타로 적히는데,
 *   현행 챕터 데이터에 그 스킬이 없어 미발현이다(있으면 Timing 3까지 돌린 값으로 기준을 올려야 한다).
 * ☠`equipped` = 그 전투에서 실제로 쓴 무기(actionWeapon). 追撃条件은 `攻撃速度 = 速さ - max(武器の重さ - 体格, 0)`
 *   위에 서 있어서 **무기가 바뀌면 기저 手番回数가 뒤집힌다** — 안 넘기면 m001 step34(철의 검 → 레이피어
 *   전환 판)의 진짜 추격이 화면에 "(추가타)"로 나간다. 그 기보는 맵 진입 시 자동 재생된다.
 */
export function displayKindOf(
  before: GameState,
  ev: Extract<BattleEvent, { type: "strike" }>,
  equipped?: { unit: string; weapon: BattleWeapon },
): StrikeKind {
  if (ev.kind !== "followUp" && ev.kind !== "counterFollowUp") return ev.kind;
  const self = before.units.find((u) => u.id === ev.attacker);
  const foe = before.units.find((u) => u.id === ev.defender);
  if (self === undefined || foe === undefined) return ev.kind;
  // 개시측 = 본공격을 낸 쪽. 반격 오더(counterFollowUp)의 주체는 전투를 걸지 않은 쪽이다.
  const offense = ev.kind === "followUp";
  const armed = (u: UnitState): UnitState =>
    equipped !== undefined && u.id === equipped.unit ? { ...u, weapon: equipped.weapon } : u;
  const view = (u: UnitState, initiator: boolean) => ({
    ...toCombatant(armed(u), before.map, before.units, undefined, before.terrainPatches),
    initiator,
    striking: initiator === offense,
  });
  return baseBattleTimes(calculator, view(self, offense), view(foe, !offense)) >= 2 ? ev.kind
    : offense ? "extra"
    : "counterExtra";
}

/**
 * 보드 아일랜드 — 인터랙션 셸: 선택·호버·명령 배선만 하고 국면은 스토어(boardStore)가 소유한다.
 * 그림은 BoardView, 룰은 엔진. 이벤트 챕터(script 팩)는 여기서 세션을 만들어 스토어에 주입한다 —
 * ☠fengari가 이 아일랜드 청크에만 실린다(제작 경로 — 열람 /s/는 절대 이벤트 복원).
 */

export default function BoardIsland(props: BoardProps) {
  const { width, height, tiles, objects, labels } = props;
  // 이벤트 챕터는 스토어를 두 단계로 연다 — SSR·초기 렌더 = 무이벤트 원시판, 모듈 로드 후 이벤트판으로 교체.
  const [store, setStore] = useState<BoardStore>(() => createBoardStore(props));
  const game = useBoard(store, displayState);
  const difficulty = useBoard(store, (s) => s.difficulty);
  const scenario = useBoard(store, (s) => s.scenario);
  const mode = useBoard(store, (s) => s.mode);
  const visuals = useBoard(store, (s) => s.visuals);
  const recorded = useBoard(store, (s) => s.recording.length);
  const cursor = useBoard(store, (s) => s.cursor);
  const replaySteps = useBoard(store, (s) => s.replay?.timeline.steps.length ?? 0);
  const [ready, setReady] = useState(false);
  const urlWritten = useRef(false);
  /** 이 챕터의 기본 기보 — 자동 재생을 건너뛴 경우에도 REPLAY 버튼이 이걸로 열린다. */
  const defaultFile = useRef<EphemerisFile | undefined>(undefined);
  // 연출 상태 — seq는 같은 유닛이 연속 피격될 때 CSS 애니메이션을 다시 트는 용도(클래스만으론 재시작 안 된다).
  const fxRef = useRef(0);
  const [fx, setFx] = useState<BoardFx | undefined>(undefined);
  /**
   * 이동 잔상(출발 칸) — ☠fx와 **수명이 다르다**: fx는 1~2초 뒤 자동으로 걷히지만 잔상은
   * 그 유닛의 **턴 마무리까지** 남는다(2026-08-18 사용자 지정). 그래서 별도 상태다.
   */
  const [moveOrigin, setMoveOrigin] = useState<{ unit: string; x: number; y: number } | undefined>(undefined);
  const [strikes, setStrikes] = useState<readonly StrikeSummary[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [targetId, setTargetId] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<Tile | undefined>(undefined);
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  /**
   * 넘버링 세이브 표면 — ☠**비계**: 지금은 관리자만 쓴다(2026-08-19 사용자 지시, 게스트 정책은 추후 논의).
   * 제거 조건 = 게스트 세이브 정책 확정. 그때 이 게이트를 걷고 전면 노출한다.
   * 켜기 = ?admin=1 (localStorage에 남는다) · 끄기 = ?admin=0.
   */
  const [admin, setAdmin] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [saves, setSaves] = useState<SaveSummary[]>([]);
  useEffect(() => {
    try {
      const flag = new URLSearchParams(window.location.search).get("admin");
      if (flag === "1") localStorage.setItem("fesim:admin", "1");
      if (flag === "0") localStorage.removeItem("fesim:admin");
      setAdmin(localStorage.getItem("fesim:admin") === "1");
    } catch {
      // 프라이빗 모드 = 관리자 표면 숨김. 판은 그대로 돌아간다.
    }
  }, []);
  // 맵 줌 — SSR·하이드레이션은 디폴트로 그리고 마운트 후 저장값 반영(마크업 불일치 회피).
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  useEffect(() => setZoom(loadZoom()), []);
  const changeZoom = (delta: number) => {
    const next = clampZoom(zoom + delta);
    setZoom(next);
    saveZoom(next);
  };
  /** 적턴 자동이 건너뛴 유닛(정직 결손) — 몰래 대기시키지 않고 여기에 남긴다. */
  const [aiGaps, setAiGaps] = useState<AiDeficit[]>([]);
  // ★AI 난수 = `Random.System` — 전투 RNG(기보 스트림)와 **별도**다(AI_ENGINE §7-4).
  //   AI가 고른 행동 자체가 기보에 액션으로 남으므로 재생에는 이 스트림이 필요 없다.
  const aiRng = useRef({ next: (bound: number) => Math.floor(Math.random() * bound) }).current;

  // 세팅층 편집(M4): 배치 이동·제거·복원 — diff는 스토어 setup이 소유(setSetup = 새 판).
  const setup = useBoard(store, (s) => s.setup);
  const [editing, setEditing] = useState(false);
  const [editSel, setEditSel] = useState<string | undefined>(undefined);
  const unitName = (id: string): string =>
    visuals.get(id)?.name ?? props.units[Number(id.slice(1))]?.name ?? id;
  const patchUnit = (id: string, patch: Partial<NonNullable<NonNullable<typeof setup>["units"]>[string]>) => {
    const units = { ...setup?.units, [id]: { ...setup?.units?.[id], ...patch } };
    store.getState().setSetup({ ...setup, units });
  };
  const removedIds = Object.entries(setup?.units ?? {})
    .filter(([, su]) => su.removed === true)
    .map(([id]) => id);

  /**
   * ★1스텝 취소 — 인게임 B 버튼(2026-08-19 사용자 지시: "바깥쪽 클릭이 1스탭 이전으로 가는 방식").
   * ☠한 번에 한 단계만 물러난다. 통째로 취소하면 이동부터 다시 잡아야 해서 조작이 배로 든다 —
   * 그래서 `pending`(잠정 이동)을 마지막에서 두 번째로 둔다: 명령을 무르면 **같은 자리에서 다시 고르고**,
   * 한 번 더 무르면 **원위치로 돌아가 다시 이동**할 수 있다.
   */
  const stepBack = () => {
    if (tradeWith !== undefined) return setTradeWith(undefined);
    if (targetId !== undefined) {
      setTargetId(undefined);
      setWeaponPick(undefined);
      return;
    }
    if (staffPick !== undefined) return setStaffPick(undefined);
    if (cmd !== undefined) return setCmd(undefined);
    if (pending !== undefined) return setPending(undefined);
    /**
     * ★인게이지 해제 — 실기는 커서 단계의 **버튼 10**이 담당한다(메뉴 항목이 아니다:
     * keyhelpdata.xml이 `인게이지` ↔ `인게이지 해제` 라벨을 같은 버튼에 매단다).
     * 웹에는 그 버튼이 없어 **메뉴 밖 클릭(B)으로 대체**한다(2026-08-19 사용자 결정).
     * ☠되돌릴 단계를 전부 소진한 뒤에 놓는다 — 취소하려다 인게이지가 풀리면 손해가 크다.
     */
    if (selected?.engage?.engaging === true && !selected.acted && selected.force === game.phase) {
      tryDispatch({ type: "engage", unit: selected.id });
      return;
    }
    if (selectedId !== undefined) return setSelectedId(undefined);
  };

  const clearLocal = () => {
    setSelectedId(undefined);
    setTargetId(undefined);
    setLog([]);
    setBanner(undefined);
  };

  useEffect(() => {
    // 국면 프리셋 폐지(MP2) — 국면 전이는 이벤트 엔진이 소유한다. URL의 d(난이도)만 읽는다.
    const boot = (target: BoardStore, file?: EphemerisFile) => {
      const query = readMapQuery(window.location.search);
      if (file === undefined && query.d !== undefined) target.getState().setDifficulty(query.d);
      // ★명시 지시(?load=n)가 자동 복원을 이긴다 — 번호로 부른 판이 이어하던 판보다 우선이다.
      //   실패(다른 챕터·슬롯 없음)면 평소대로 이어하기로 떨어진다.
      const loaded = file === undefined && query.load !== undefined && target.getState().loadSave(query.load);
      if (file === undefined && !loaded) target.getState().restore();
      setReady(true);
    };
    let dead = false;
    // 첫 프레임 = 챕터의 진짜 개막 배치. 이벤트 챕터는 스텝 0이 setup(스폰·변수)이라 그 뒤에서 시작한다.
    const openingCursor = (file: EphemerisFile): number => (file.log[0]?.action.type === "setup" ? 1 : 0);
    /**
     * ★맵 진입 = 리플레이 시작(2026-08-18 사용자 확정) — 신규 사용자가 첫 화면에서 바로 턴을 넘긴다.
     * 단 **이어하던 판이 있으면 그쪽이 이긴다**(남의 시연이 내 진행을 덮으면 안 된다).
     * 기본 기보가 없는 챕터는 조용히 플레이 모드로 시작한다(404 = 정상).
     *
     * ☠자동 재생을 건너뛰더라도 파일은 **반드시 손에 쥔다**(defaultFile) — 그래야 REPLAY 버튼이
     * 살아 있다. 안 그러면 이어하던 사용자에겐 버튼이 흐린 채로 남아 "없는 것처럼" 보인다.
     */
    const fetchDefault = async (): Promise<EphemerisFile | undefined> => {
      try {
        const res = await fetch(defaultReplayPath(props.mapId));
        if (!res.ok) return undefined;
        return parseEphemeris(await res.text());
      } catch (err) {
        console.warn("기본 기보 로드 실패 — 플레이 모드로 시작", err);
        return undefined;
      }
    };
    const defaultReplay = async (): Promise<EphemerisFile | undefined> => {
      const file = await fetchDefault();
      defaultFile.current = file;
      // 이어하던 판·번호로 부른 세이브가 있으면 시연을 자동 재생하지 않는다(남의 기보가 내 진행을 덮으면 안 된다).
      const called = readMapQuery(window.location.search).load !== undefined;
      return hasGuestSave(props.mapId) || called ? undefined : file;
    };
    if (props.script === undefined) {
      void defaultReplay().then((file) => {
        if (dead) return;
        if (file === undefined) {
          boot(store);
          return;
        }
        // 리플레이는 스토어 생성 시점에 실려야 한다(boardStore ReplayInit 주석 — 하이드레이션 튐 방지).
        const next = createBoardStore(props, { file, cursor: openingCursor(file) });
        setStore(next);
        boot(next, file);
      });
      return () => {
        dead = true;
      };
    }
    // 공용 Lua(common*)는 보드 JSON에 인라인하지 않는다 — 이벤트 모듈과 병렬 fetch 후 세션에 병합(3-6).
    const commonFetches = (props.script.commons ?? []).map(async (name) => {
      const res = await fetch(scriptPath(name));
      if (!res.ok) throw new Error(`공용 스크립트 로드 실패: ${name} (${res.status})`);
      return [name, await res.text()] as const;
    });
    void Promise.all([import("@fesim/engine/events"), Promise.all(commonFetches), defaultReplay()])
      .then(([mod, pairs, file]) => {
        if (dead) return;
        const commons = Object.fromEntries(pairs);
        const wiring = eventWiringFor(props, mod, commons);
        const next = createBoardStore(props, file === undefined ? undefined : { file, cursor: openingCursor(file) }, undefined, wiring);
        setStore(next);
        boot(next, file);
      })
      .catch((err) => {
        // 이벤트판 구성 실패 = 원시판 유지(정직 강하) — 콘솔에 원인을 남긴다(조용한 오재현 금지).
        console.error("이벤트 세션 구성 실패 — 원시판으로 동작", err);
        if (!dead) boot(store);
      });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로드 시엔 URL을 읽기만 한다 — 변경이 일어난 뒤부터 역기입(주소창을 멋대로 채우지 않는다).
  useEffect(() => {
    if (!ready) return;
    if (!urlWritten.current) {
      urlWritten.current = true;
      return;
    }
    const search = writeMapQuery(window.location.search, { p: scenario, d: difficulty });
    window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
  }, [ready, difficulty, scenario]);

  useEffect(() => {
    if (banner === undefined || game.outcome !== undefined) return;
    const t = setTimeout(() => setBanner(undefined), 1300);
    return () => clearTimeout(t);
  }, [banner, game.outcome]);

  /**
   * 좌측 로스터 되쏘기 — 레벨업·경험치·위치·전사를 SSR 카드에 반영한다.
   * ☠로스터는 Astro 정적 컴포넌트(아일랜드 밖)라 그대로 두면 **개막 수치에 얼어붙는다**.
   * 리액트로 옮기지 않는 이유 = 로스터는 초상화·스킬 표까지 들고 있어 아일랜드로 올리면
   * 그 데이터가 통째로 클라이언트 번들에 실린다(열람 경로 예산). 카드 id 계약(`u{순번}`)만
   * 공유하고 텍스트 노드 3개만 갱신한다.
   */
  useEffect(() => {
    const root = document.querySelector("[data-roster]");
    if (root === null) return;
    for (const u of game.units) {
      const card = root.querySelector(`[data-uid="${u.id}"]`);
      if (card === null) continue;
      card.classList.toggle("gone", u.dead);
      const lv = card.querySelector(".ru-lv");
      if (lv !== null) lv.textContent = String(u.level);
      const exp = card.querySelector(".ru-exp");
      // 경험치는 자군만 쌓인다 — 0이면 빈 칸으로 둬서 카드가 조용하다.
      if (exp !== null) exp.textContent = u.force === 0 && u.exp > 0 ? `+${u.exp}` : "";
      const pos = card.querySelector(".ru-pos");
      if (pos !== null) {
        pos.textContent = u.dead ? "—" : coordLabel(u.x, u.y);
        if (!u.dead) pos.setAttribute("title", rawCoord(u.x, u.y));
      }
    }
  }, [game]);

  // 연출 수명 = 피격 펄스 1초 · 전사 잔상 2초(사용자 지정). 궤적도 같이 걷는다 —
  // 다음 수의 궤적과 겹치면 어느 수의 이동인지 못 읽는다.
  useEffect(() => {
    if (fx === undefined) return;
    const t = setTimeout(() => setFx(undefined), fx.ghosts === undefined ? 1000 : 2000);
    return () => clearTimeout(t);
  }, [fx]);

  /**
   * 리플레이 스테핑 연출 — 커서가 앞으로 갈 때만 그 스텝을 재생한다(되감기는 연출 없음:
   * 시간을 거꾸로 가는데 공격 모션이 나오면 무엇이 방금 일어난 건지 거짓말이 된다).
   */
  const lastCursor = useRef(cursor);
  useEffect(() => {
    const from = lastCursor.current;
    lastCursor.current = cursor;
    if (mode !== "replay") return;
    const session = store.getState().replay;
    if (session === undefined || cursor !== from + 1) {
      if (cursor !== from) setFx(undefined);
      return;
    }
    const step = session.file.log[cursor - 1];
    if (step === undefined) return;
    playEffects(step.action, step.events ?? [], replayer.stateAt(session.timeline, from), displayState(store.getState()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, mode]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1300);
    return () => clearTimeout(t);
  }, [copied]);

  // 리플레이 키보드 — ←→ = 행동 1스텝 · PageUp/Down = 페이즈(전체턴) 스텝(2026-08-18 사용자 확정).
  useEffect(() => {
    if (mode !== "replay") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        store.getState().stepAction(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        store.getState().stepPhase(e.key === "PageDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, store]);

  /**
   * 바깥 클릭 = 1스텝 취소. ☠종전에는 `targetId`가 있을 때만 돌고 그것만 지웠다 —
   * 유닛만 고른 상태에서는 바깥을 눌러도 아무 일이 없었다.
   * ☠판정 기준이 `.plate`인 것이 중요하다: 커맨드 메뉴·예보가 전부 그 안에 있어야
   * 메뉴를 누르는 행위가 "바깥 클릭"으로 오인돼 자기를 닫지 않는다.
   */
  useEffect(() => {
    if (selectedId === undefined) return;
    const cancel = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || e.target.closest(".plate") === null) stepBack();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stepBack();
    };
    document.addEventListener("pointerdown", cancel);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", onKey);
    };
  });

  const alive = useMemo(() => game.units.filter((u) => !u.dead), [game]);
  const byTile = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of alive) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [alive]);
  const selected = selectedId === undefined ? undefined : alive.find((u) => u.id === selectedId);
  const target = targetId === undefined ? undefined : alive.find((u) => u.id === targetId);
  // 유닛 턴 축 — 현 페이즈의 세력이 소유한다(적 페이즈면 적 유닛이 세는 대상).
  const mine = useMemo(() => alive.filter((u) => u.force === game.phase), [alive, game.phase]);
  const actedCount = mine.filter((u) => u.acted).length;
  const readyUnits = mine.filter((u) => !u.acted);
  /** ‹ › = 아직 안 움직인 유닛 순회(인게임 L/R 문법) — 선택만 바꾼다(행동 소모 없음). */
  const cycleUnit = (delta: number): void => {
    if (readyUnits.length === 0) return;
    const at = readyUnits.findIndex((u) => u.id === selectedId);
    const next = readyUnits[(((at < 0 ? (delta > 0 ? -1 : 0) : at) + delta) % readyUnits.length + readyUnits.length) % readyUnits.length];
    setSelectedId(next.id);
    setTargetId(undefined);
  };
  // 클릭 확정 타겟은 targetId 하나 — 세력으로 교전(적)과 지팡이(아군)를 가른다(해제·취소 경로 공유).
  const foeTarget = target !== undefined && selected !== undefined && target.force !== selected.force ? target : undefined;
  const allyTarget = target !== undefined && selected !== undefined && target.force === selected.force ? target : undefined;

  // 잠정 이동(인게임 문법): 행동(공격·대기) 확정 전까지 이동은 커밋되지 않는다 — 원점 범위 안 자유 재배치.
  // 엔진·기보에는 행동 확정 시점에 move 1회 + 행동으로 기록된다(활성화당 이동 1회 룰과 정합).
  const [pending, setPending] = useState<{ x: number; y: number } | undefined>(undefined);
  useEffect(() => setPending(undefined), [selectedId, game]);
  const selectedAt = selected === undefined ? undefined : pending ?? { x: selected.x, y: selected.y };

  // 무기 선택: 클릭 = 확정(사거리·공격에 반영, attack 액션에 기록) · 호버 = 예보 수치만 바꾸는 프리뷰.
  const [weaponPick, setWeaponPick] = useState<number | undefined>(undefined);
  const [weaponHover, setWeaponHover] = useState<number | undefined>(undefined);
  /**
   * 고른 커맨드(인게임 우측 메뉴) — 대상을 고르는 중이면 여기 남아 있다.
   * ☠기존 클릭 문맥(적 칸 = 공격 등)은 그대로 둔다: 메뉴는 **길을 하나 더 여는 것**이지
   * 있던 조작을 막는 장치가 아니다. 다만 "자기 재클릭 = 대기"만은 메뉴 항목과 충돌해 걷어냈다.
   */
  const [cmd, setCmd] = useState<CommandId | undefined>(undefined);
  const [cmdHover, setCmdHover] = useState<CommandId | undefined>(undefined);
  useEffect(() => {
    setCmd(undefined);
    setCmdHover(undefined);
  }, [selectedId, game]);
  useEffect(() => {
    setWeaponPick(undefined);
    setWeaponHover(undefined);
  }, [selectedId, game]);
  // 유효 무기 = 엔진 effectiveWeapons(인게이지 중엔 엠블렘 무기 증설) — 인덱스가 attack.weapon 계약.
  const weapons: BattleWeapon[] = useMemo(
    () =>
      (selected === undefined ? undefined : effectiveWeapons(selected)) ??
      (selected?.weapon !== undefined ? [selected.weapon] : []),
    [selected],
  );
  const equippedIdx = Math.max(0, weapons.findIndex((w) => w === selected?.weapon));
  const weaponIdx = weaponPick ?? equippedIdx;
  const chosenWeapon = weapons[weaponIdx] ?? selected?.weapon;
  const activeWeapon = weapons[weaponHover ?? weaponIdx] ?? chosenWeapon;

  // 지팡이 선택 — 기본 = 첫 사용 가능 회복 지팡이(호버 문법 유지). 방해·워프는 커맨드 바에서 명시 선택.
  const [staffPick, setStaffPick] = useState<number | undefined>(undefined);
  useEffect(() => setStaffPick(undefined), [selectedId, game]);
  // 침묵 상태 = 지팡이 봉인 — 엔진 게이트와 같은 판정(hasBadState)이라 UI가 헛클릭을 만들지 않는다.
  const silenced = selected !== undefined && hasBadState(selected, BAD_STATE.silence);
  const usableStaves = useMemo(
    () =>
      silenced
        ? []
        : (selected?.staves ?? [])
            .map((s, i) => ({ s, i }))
            .filter(
              ({ s }) =>
                s.uses > 0 &&
                (s.rodType === 2 || (s.rodType === 3 && (s.gives?.length ?? 0) > 0) || s.useType === 5),
            ),
    [selected, silenced],
  );
  const staffIdx = staffPick ?? usableStaves.find(({ s }) => s.rodType === 2)?.i;
  const staff = staffIdx === undefined ? undefined : selected?.staves?.[staffIdx];
  // 방해·워프 모드는 명시 선택으로만 진입한다(기본 staffIdx는 회복만 고르므로).
  const staffMode =
    staff === undefined ? undefined
    : staff.rodType === 2 ? "heal"
    : staff.rodType === 3 ? "interfere"
    : staff.useType === 5 ? "warp"
    : undefined;

  // 표시·클릭 판정용 국면(잠정 위치 반영) — 룰 판정(range)은 엔진 진실(byTile)을 쓴다.
  const viewUnits = useMemo(
    () =>
      pending === undefined || selectedId === undefined
        ? alive
        : alive.map((u) => (u.id === selectedId ? { ...u, x: pending.x, y: pending.y } : u)),
    [alive, pending, selectedId],
  );
  const byTileView = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of viewUnits) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [viewUnits]);

  const range = useMemo(() => {
    if (selected === undefined) return undefined;
    // 이동 예산의 정본은 엔진 moveBudgetOn(MoveFirst 출발 보정 포함) — UI 중복 구현 금지(C4, §2-3).
    const budget = moveBudgetOn(game.map, selected);
    if (budget === undefined) return undefined;
    if (game.map.costs[selected.moveType] === undefined) return undefined;
    const query: MoveQuery = {
      width,
      height,
      movePoints: budget,
      start: { x: selected.x, y: selected.y },
      // 코스트·통과·정지 전부 엔진 단일 정본(구조물 치환·오버레이 가산·진영 동맹표 — C4 중복 금지).
      costAt: makeCostAt(game.map, game.structures, selected.moveType),
      ...movePredicates(game.map, viewUnits, selected),
    };
    const move = movementRange(query);
    const moveSet = new Set(move.map((t) => tileKey(t.x, t.y)));
    const rangeMax = selected.acted ? 0 : chosenWeapon?.rangeMax ?? 0; // 재이동 창엔 공격 없음
    // 잠정 이동 중엔 그 지점 기준 사거리만(인게임 표시 문법), 선택 직후엔 전 범위 합집합.
    const ringFrom = pending === undefined ? move : [{ x: pending.x, y: pending.y }];
    const ring = rangeMax > 0 ? attackRange(ringFrom, chosenWeapon!.rangeMin, rangeMax, width, height) : [];
    const attackAll = new Set(ring.map((t) => tileKey(t.x, t.y)));
    const attack = ring.filter((t) => !moveSet.has(tileKey(t.x, t.y)));
    const staffRing =
      !selected.acted && staff !== undefined
        ? attackRange(ringFrom, staff.rangeMin, staff.rangeMax, width, height)
        : [];
    const staffAll = new Set(staffRing.map((t) => tileKey(t.x, t.y)));
    const staffTiles = staffRing.filter((t) => !moveSet.has(tileKey(t.x, t.y)) && !attackAll.has(tileKey(t.x, t.y)));
    return { query, move, moveSet, attack, attackAll, staff: staffTiles, staffAll };
  }, [selected, viewUnits, game, width, height, pending, chosenWeapon, staff]);

  // 호버 예보(인게임 문법): 사거리 안 적에 커서만 올려도 공격 발판이 정해지고 즉시 예보가 뜬다.
  // 발판 우선순위 = 유저가 그린 마지막 경로 끝점 → 제자리 → 최소 이동비용 지점.
  // 파괴 가능 인접 대상 — 잠정 이동(pending) 위치 기준. 열거의 정본 = 엔진 destroyTargets(C4 중복 금지).
  const breakables = useMemo(() => {
    if (selected === undefined || selectedAt === undefined) return [];
    return destroyTargets(game.structures, selectedAt.x, selectedAt.y, selected.force);
  }, [selected, selectedAt, game]);

  const hoverEnemy = useMemo(() => {
    if (staffMode === "interfere") return undefined; // 방해 지팡이 선택 중엔 적 호버가 지팡이 문법을 탄다
    if (selected === undefined || selected.acted || hover === undefined || target !== undefined) return undefined;
    const u = byTileView.get(tileKey(hover.x, hover.y));
    if (u === undefined || u.force === selected.force) return undefined;
    if (range?.attackAll.has(tileKey(hover.x, hover.y)) === true) return u;
    // 편의(인게임과 다름): 원거리(사거리 2+)는 잠정 이동 후 사거리 밖 적 호버에도 근사 예보를 띄운다.
    return pending !== undefined && (chosenWeapon?.rangeMax ?? 0) >= 2 ? u : undefined;
  }, [selected, hover, byTileView, range, target, pending, chosenWeapon, staffMode]);

  // 아군 호버 지팡이 예보 — 회복 = 손상 아군만, 워프 = 아군 전부(교전 문법과 동일한 발판 결정).
  const hoverAlly = useMemo(() => {
    if (selected === undefined || selected.acted || hover === undefined || target !== undefined || staff === undefined)
      return undefined;
    if (staffMode !== "heal" && staffMode !== "warp") return undefined;
    const u = byTileView.get(tileKey(hover.x, hover.y));
    if (u === undefined || u.force !== selected.force || u.id === selected.id) return undefined;
    if (staffMode === "heal" && u.hp >= u.stats.hp) return undefined;
    return range?.staffAll.has(tileKey(hover.x, hover.y)) === true ? u : undefined;
  }, [selected, hover, byTileView, range, target, staff, staffMode]);

  // 방해 지팡이 적 호버 — 명시 선택 중에만(공격 문법 대체). 사거리 = 지팡이 링.
  const hoverStaffFoe = useMemo(() => {
    if (staffMode !== "interfere") return undefined;
    if (selected === undefined || selected.acted || hover === undefined || target !== undefined) return undefined;
    const u = byTileView.get(tileKey(hover.x, hover.y));
    if (u === undefined || u.force === selected.force) return undefined;
    return range?.staffAll.has(tileKey(hover.x, hover.y)) === true ? u : undefined;
  }, [staffMode, selected, hover, byTileView, range, target]);

  const lastPathEnd = useRef<Tile | undefined>(undefined);
  useEffect(() => {
    lastPathEnd.current = undefined;
  }, [selectedId, game]);

  /** 발판 결정(공용) — 잠정 이동 → 확정 타겟이면 현 위치 → 마지막 경로 끝점 → 제자리 → 최소 비용 지점. */
  const foothold = (foe: UnitState, rangeMin: number, rangeMax: number, confirmed: boolean): Tile | undefined => {
    if (selected === undefined) return undefined;
    if (pending !== undefined) return pending; // 잠정 이동은 유저 확정 — 항상 그 기준
    const origin = { x: selected.x, y: selected.y };
    if (confirmed) return origin;
    const dist = (p: Tile) => Math.abs(p.x - foe.x) + Math.abs(p.y - foe.y);
    const standable = (p: Tile) =>
      range?.moveSet.has(tileKey(p.x, p.y)) === true &&
      (!byTile.has(tileKey(p.x, p.y)) || (p.x === origin.x && p.y === origin.y));
    const ok = (p: Tile) => dist(p) >= rangeMin && dist(p) <= rangeMax && standable(p);
    const end = lastPathEnd.current;
    if (end !== undefined && ok(end)) return end;
    if (ok(origin)) return origin;
    const spots = (range?.move ?? []).filter(ok).sort((a, b) => a.cost - b.cost);
    return spots[0];
  };

  const engageAt = useMemo(() => {
    const w = chosenWeapon;
    const foe = foeTarget ?? hoverEnemy;
    if (selected === undefined || w === undefined || foe === undefined) return undefined;
    return foothold(foe, w.rangeMin, w.rangeMax, foeTarget !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, foeTarget, hoverEnemy, pending, range, byTile, chosenWeapon]);

  const staffAt = useMemo(() => {
    const confirmed = staffMode === "interfere" ? foeTarget : allyTarget;
    const tgt = confirmed ?? (staffMode === "interfere" ? hoverStaffFoe : hoverAlly);
    if (selected === undefined || staff === undefined || tgt === undefined) return undefined;
    return foothold(tgt, staff.rangeMin, staff.rangeMax, confirmed !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, allyTarget, foeTarget, hoverAlly, hoverStaffFoe, pending, range, byTile, staff, staffMode]);

  const path = useMemo(() => {
    if (range === undefined || hover === undefined || selected === undefined || pending !== undefined) return undefined;
    // 적(교전)·아군(지팡이) 호버 중엔 발판까지의 경로를 유지한다(경로가 사라지지 않는 인게임 문법).
    const goal =
      hoverEnemy !== undefined ? engageAt : hoverAlly !== undefined || hoverStaffFoe !== undefined ? staffAt : hover;
    if (goal === undefined || !range.moveSet.has(tileKey(goal.x, goal.y))) return undefined;
    if (byTile.has(tileKey(goal.x, goal.y))) return undefined;
    const tiles = movementPath(range.query, goal);
    return tiles !== null && tiles.length > 1 ? tiles : undefined;
  }, [range, hover, byTile, selected, pending, hoverEnemy, engageAt, hoverAlly, hoverStaffFoe, staffAt]);

  // 일반 이동 호버의 경로 끝점을 기억 — 적·아군 호버로 넘어갈 때 이 지점이 발판이 된다.
  useEffect(() => {
    if (path !== undefined && hoverEnemy === undefined && hoverAlly === undefined && hoverStaffFoe === undefined)
      lastPathEnd.current = path[path.length - 1];
  }, [path, hoverEnemy, hoverAlly, hoverStaffFoe]);

  const distance =
    selectedAt !== undefined && foeTarget !== undefined
      ? Math.abs(selectedAt.x - foeTarget.x) + Math.abs(selectedAt.y - foeTarget.y)
      : undefined;
  const inRangeOf = (w: BattleWeapon | undefined): boolean =>
    selected !== undefined &&
    !selected.acted &&
    w !== undefined &&
    distance !== undefined &&
    distance >= w.rangeMin &&
    distance <= w.rangeMax;
  const canAttack = foeTarget !== undefined && inRangeOf(chosenWeapon);

  // 예보 대상: 클릭 확정 타겟이 우선, 없으면 호버 타겟(즉시 예보). 기준 위치 = 공격 발판.
  const fcTarget = foeTarget ?? hoverEnemy;
  const fcAt = (foeTarget !== undefined ? selectedAt : engageAt) ?? selectedAt;

  // 교환 — 인접 아군 선택 → 2열 패널에서 아이템 클릭 = 1점 이동(행동 무소모, 엔진 trade 액션 연속 커밋).
  const [tradeWith, setTradeWith] = useState<string | undefined>(undefined);
  useEffect(() => setTradeWith(undefined), [selectedId, game.phase, game.turn]);
  const tradePartners = useMemo(() => {
    if (selected === undefined || selected.acted || selectedAt === undefined || selected.force !== game.phase) return [];
    return viewUnits.filter(
      (u) =>
        u.force === selected.force &&
        u.id !== selected.id &&
        Math.abs(u.x - selectedAt.x) + Math.abs(u.y - selectedAt.y) === 1,
    );
  }, [selected, selectedAt, viewUnits, game.phase]);

  // 아이템 사용 버튼 — 대상 판정의 정본은 엔진 itemTargets(중복 구현 금지). 기준 위치 = 잠정 이동 반영.
  const itemButtons = useMemo(() => {
    if (selected === undefined || selected.acted || selected.force !== game.phase || selectedAt === undefined) return [];
    const userAt = { ...selected, x: selectedAt.x, y: selectedAt.y };
    return (selected.consumables ?? [])
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.addType === 2 && c.uses > 0 && itemTargets(userAt, viewUnits, c).length > 0);
  }, [selected, selectedAt, viewUnits, game.phase]);

  /** 춤 대상 — 인접 1칸의 **행동을 마친** 같은 군(엔진 dance 게이트와 같은 조건). */
  const danceTargets = useMemo(() => {
    if (selected === undefined || selected.acted || selectedAt === undefined || !canDance(selected)) return [];
    return viewUnits.filter(
      (u) =>
        u.force === selected.force &&
        u.id !== selected.id &&
        u.acted &&
        Math.abs(u.x - selectedAt.x) + Math.abs(u.y - selectedAt.y) === 1,
    );
  }, [selected, selectedAt, viewUnits]);

  /** 방문 = 서 있는 칸이 민가이고 아직 안 들른 곳(엔진 visit 게이트와 같은 조건). */
  const canVisitHere = useMemo(() => {
    if (selected === undefined || selected.acted || selectedAt === undefined || selected.force !== game.phase) return false;
    const spot = (game.map.interactions ?? []).find(
      (i) => i.kind === "visit" && (i.stand?.x ?? i.x) === selectedAt.x && (i.stand?.y ?? i.y) === selectedAt.y,
    );
    if (spot === undefined) return false;
    return !(game.visited ?? []).some((v) => v.x === spot.x && v.y === spot.y);
  }, [selected, selectedAt, game]);

  /** 사거리 안에 실제로 칠 적이 있나 — 공격 항목의 게이트(실기 GetMapAttribute도 대상 열거를 본다). */
  const hasAttackTarget = useMemo(() => {
    if (selected === undefined || selected.acted || selected.force !== game.phase || range === undefined) return false;
    if ((weapons.length === 0) && selected.weapon === undefined) return false;
    return viewUnits.some((u) => u.force !== selected.force && range.attackAll.has(tileKey(u.x, u.y)));
  }, [selected, range, viewUnits, game.phase, weapons]);

  /** 우측 메뉴에 세울 커맨드 — 순서·규칙의 정본은 lib/commands.ts(인게임 CreateBind 사영). */
  const commands = useMemo(() => {
    if (selected === undefined || mode === "replay" || editing || selected.force !== game.phase) return [];
    return availableCommands(selected, {
      hasAttackTarget,
      hasStaffTarget: usableStaves.length > 0,
      hasDanceTarget: danceTargets.length > 0,
      hasTradePartner: tradePartners.length > 0,
      hasDestroyTarget: breakables.length > 0,
      canVisit: canVisitHere,
    });
  }, [selected, mode, editing, game.phase, hasAttackTarget, usableStaves, danceTargets, tradePartners, breakables, canVisitHere, itemButtons]);

  /** 소지품 커서(호버) — 능력표는 이 항목 기준이다(실기: 커서 초기 위치 = 현재 장비). */
  const [itemCursor, setItemCursor] = useState<string | undefined>(undefined);
  useEffect(() => setItemCursor(undefined), [selectedId, cmd]);

  /**
   * 소지품 목록 = 무기 ++ 지팡이 ++ 사용형. ☠무기·지팡이는 **정보 표시 전용**이다:
   * 장비 변경 액션이 엔진에 없다(BattleAction 14종에 equip이 없다) — 없는 것을 있는 척하지 않는다.
   */
  const itemRows = useMemo<ItemRow[]>(() => {
    if (selected === undefined) return [];
    const rows: ItemRow[] = [];
    weapons.forEach((w, i) =>
      rows.push({ key: `w${i}`, name: w.name ?? "—", ...(w.engage === true ? { engage: true } : {}) }),
    );
    (selected.staves ?? []).forEach((s, i) =>
      rows.push({ key: `s${i}`, name: s.name ?? labels.staffCmd, uses: s.uses, dim: s.uses === 0 }),
    );
    (selected.consumables ?? []).forEach((c, i) => {
      const usable = itemButtons.some((b) => b.i === i);
      rows.push({
        key: `c${i}`,
        name: c.name ?? labels.itemCmd,
        uses: c.uses,
        dim: !usable,
        ...(usable
          ? {
              onUse: () => {
                if (commitMove() && tryDispatch({ type: "item", unit: selected.id, item: i })) {
                  if (canterPower(selected) === undefined) setSelectedId(undefined);
                  setTargetId(undefined);
                  setCmd(undefined);
                }
              },
            }
          : {}),
      });
    });
    return rows;
  }, [selected, weapons, itemButtons, labels]);

  /**
   * "사용 시 능력" — 커서가 놓인 무기를 들었을 때의 수치와 **현 장비 대비 차분**.
   * 전부 self-only 공식이라 상대 없이 계산된다(calculator.json). 정본을 두 번 돌려 빼는 것이
   * 우리가 수치를 다시 짜지 않는 유일한 방법이다.
   */
  const itemStats = useMemo<{ stats: StatDelta[]; reach: string } | undefined>(() => {
    if (selected === undefined || itemCursor === undefined || !itemCursor.startsWith("w")) return undefined;
    const pick = weapons[Number(itemCursor.slice(1))];
    if (pick === undefined) return undefined;
    // ☠예보와 같은 인자로 부른다: `game.units`가 빠지면 지원(絆) 보정이 사라지고,
    //   좌표가 원위치면 잠정 이동한 자리의 지형 회피가 안 들어간다 — 능력표만 조용히 다른 수를 말한다.
    //   문장사 보정(싱크로 패시브·EnhanceValue)은 effectiveSkills가 이미 합류시킨다.
    const envOf = (w: typeof pick) =>
      combatEnv(
        toCombatant({ ...selected, ...(selectedAt ?? {}), weapon: w }, game.map, game.units, undefined, game.terrainPatches),
      );
    const now = envOf(pick);
    const base = chosenWeapon === undefined ? undefined : envOf(chosenWeapon);
    const val = (env: ReturnType<typeof envOf>, formula: string) => Math.trunc(Number(calculator.eval(formula, env)));
    const row = (label: string, formula: string): StatDelta => ({
      label,
      now: val(now, formula),
      diff: base === undefined ? 0 : val(now, formula) - val(base, formula),
    });
    const t = labels.itemStats;
    return {
      stats: [
        row(t.atk, "攻撃力計算"),
        row(t.hit, "命中値計算"),
        row(t.crit, "必殺値計算"),
        row(t.spd, "攻撃速度計算"),
        row(t.avo, "回避値計算"),
        row(t.dodge, "必殺回避計算"),
      ],
      reach: pick.rangeMin === pick.rangeMax ? String(pick.rangeMax) : `${pick.rangeMin}-${pick.rangeMax}`,
    };
  }, [selected, selectedAt, itemCursor, weapons, chosenWeapon, game, labels]);

  // 회복 예보 — 수치의 정본은 엔진 staffHealAmount(중복 구현 금지). 기준 위치 = 지팡이 발판.
  const healFc = useMemo(() => {
    if (staffMode !== "heal" || selected === undefined || staff === undefined || staffIdx === undefined)
      return undefined;
    const tgt = allyTarget ?? hoverAlly;
    const at = (allyTarget !== undefined ? selectedAt : staffAt) ?? selectedAt;
    if (tgt === undefined || at === undefined) return undefined;
    const dist = Math.abs(at.x - tgt.x) + Math.abs(at.y - tgt.y);
    const inRange = !selected.acted && dist >= staff.rangeMin && dist <= staff.rangeMax;
    const amount = staffHealAmount(selected, tgt, staff);
    return { target: tgt, amount, hpAfter: Math.min(tgt.hp + amount, tgt.stats.hp), inRange };
  }, [staffMode, selected, staff, staffIdx, allyTarget, hoverAlly, staffAt, selectedAt]);

  // 방해 예보 — 명중률의 정본은 엔진 staffHitRate(중복 구현 금지). 기준 위치 = 지팡이 발판.
  const interfereFc = useMemo(() => {
    if (staffMode !== "interfere" || selected === undefined || staff === undefined || staffIdx === undefined)
      return undefined;
    const tgt = foeTarget ?? hoverStaffFoe;
    const at = (foeTarget !== undefined ? selectedAt : staffAt) ?? selectedAt;
    if (tgt === undefined || at === undefined) return undefined;
    const dist = Math.abs(at.x - tgt.x) + Math.abs(at.y - tgt.y);
    const inRange = !selected.acted && dist >= staff.rangeMin && dist <= staff.rangeMax;
    const rate = staffHitRate(calculator, { ...selected, x: at.x, y: at.y }, tgt, staff, game.map);
    return { target: tgt, rate, inRange };
  }, [staffMode, selected, staff, staffIdx, foeTarget, hoverStaffFoe, staffAt, selectedAt, game]);

  // 워프 목적지 오버레이 — 열거의 정본은 엔진 warpDestinations(중복 구현 금지). 대상 확정 후 표시.
  const warpTiles = useMemo(() => {
    if (staffMode !== "warp" || staff === undefined || allyTarget === undefined) return undefined;
    // 술자의 잠정 발판은 제외 — 커밋 시 그 칸으로 이동하므로 점유 충돌이 된다.
    return warpDestinations(allyTarget, staff, game.map, game.units, game.structures).filter(
      (t) => selectedAt === undefined || t.x !== selectedAt.x || t.y !== selectedAt.y,
    );
  }, [staffMode, staff, allyTarget, game, selectedAt]);
  const boardRange = useMemo(() => {
    if (range === undefined || warpTiles === undefined) return range;
    return { ...range, staff: warpTiles };
  }, [range, warpTiles]);

  const forecast = useMemo(() => {
    if (staffMode === "interfere") return undefined; // 방해 지팡이 선택 중엔 교전 예보 대신 지팡이 예보
    if (selected === undefined || fcAt === undefined || fcTarget === undefined) return undefined;
    // 예보는 발판 위치·활성 무기(호버 프리뷰 우선) 기준 — 확정 시 엔진이 같은 입력으로 판정한다.
    const aU: UnitState = { ...selected, x: fcAt.x, y: fcAt.y, weapon: activeWeapon };
    const dist = Math.abs(fcAt.x - fcTarget.x) + Math.abs(fcAt.y - fcTarget.y);
    const inRange =
      !selected.acted &&
      activeWeapon !== undefined &&
      dist >= activeWeapon.rangeMin &&
      dist <= activeWeapon.rangeMax;
    // 사거리 밖 호버는 "그 무기로 붙었다면"으로 읽는다 — 반격 판정 거리는 무기 최대 사거리로 본다.
    return { ...combatForecast(game, aU, fcTarget, inRange ? dist : activeWeapon?.rangeMax ?? 1), inRange };
  }, [selected, fcAt, fcTarget, game, activeWeapon, staffMode]);

  /**
   * ★재생 예보 — **다음 스텝이 전투면 돌입 전에 예보를 띄운다**(2026-08-18 사용자 지정: 실기와 같은 순서).
   * 커서는 "적용된 스텝 수"라 `log[cursor]`가 곧 다음 수다. 인게이지 기술(engageAttack)은 기술 배율·
   * 착지가 판정에 끼어 `forecastSide` 하나로는 못 세우므로 **싣지 않는다**(틀린 수를 보이느니 안 보인다).
   */
  const replayForecast = useMemo(() => {
    if (mode !== "replay") return undefined;
    const step = store.getState().replay?.file.log[cursor];
    const act = step?.action;
    if (act === undefined || act.type !== "attack") return undefined;
    const attacker = game.units.find((u) => u.id === act.unit);
    const target = game.units.find((u) => u.id === act.target);
    if (attacker === undefined || target === undefined || attacker.dead || target.dead) return undefined;
    // 무기 = 기보가 실은 인덱스(부재 = 현 장비) — 재생 계약 그대로다.
    const weapon = act.weapon === undefined ? attacker.weapon : effectiveWeapons(attacker)?.[act.weapon] ?? attacker.weapon;
    if (weapon === undefined) return undefined;
    const aU: UnitState = { ...attacker, weapon };
    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    return { attacker: aU, target, ...combatForecast(game, aU, target, dist) };
  }, [mode, cursor, game]);

  const describe = (events: BattleEvent[], before: GameState, action: BattleAction): string[] => {
    const t = labels.logTags;
    const equipped = actionWeapon(before, action);
    return events
      .map((ev) => {
        const name = (id: string) => visuals.get(id)?.name ?? id;
        switch (ev.type) {
          case "strike": {
            // ☠StrikeKind 전수 사상 — 삼항으로 두면 새 kind가 **컴파일 에러 없이** 무라벨로 강하한다.
            //   Record로 두면 kind가 늘 때 타입 검사가 여기를 가리킨다.
            const tags: Record<StrikeKind, string> = {
              attack: "",
              counter: ` (${t.counter})`,
              followUp: ` (${t.follow})`,
              counterFollowUp: ` (${t.follow})`,
              extra: ` (${t.extra})`,
              counterExtra: ` (${t.counter}·${t.extra})`,
              chain: ` (${t.chain})`,
            };
            const tag = tags[displayKindOf(before, ev, equipped)];
            return ev.hit
              ? `${name(ev.attacker)} → ${name(ev.defender)} ${ev.damage}${ev.crit ? ` ${t.crit}` : ""}${tag}`
              : `${name(ev.attacker)} ${t.miss}${tag}`;
          }
          case "heal":
            return `${name(ev.unit)} → ${name(ev.target)} +${ev.amount} HP`;
          case "status":
            return `${name(ev.target)}: ${ev.name ?? ev.sid}`;
          case "staffMiss":
            return `${name(ev.unit)} ${t.miss}`;
          case "warp":
            return `${name(ev.target)} ${t.warp}`;
          case "refresh":
            return `${name(ev.unit)} ${t.refresh}`;
          case "guard":
            return `${name(ev.unit)} ${t.guard}`;
          case "guardBlock":
            return `${name(ev.unit)} ${t.guard} −${ev.damage}`;
          case "destroy":
            return `${name(ev.unit)} ${labels.destroyCmd} → ${ev.hpAfter}`;
          case "terrainHeal":
            return `${name(ev.unit)} ${ev.amount > 0 ? "+" : ""}${ev.amount}`;
          case "engage":
            return `${name(ev.unit)} ${t.engage}`;
          case "disengage":
            return `${name(ev.unit)} ${t.disengage}`;
          case "charge":
          case "crest": // 紋章氣 소비 = 게이지 만충 — 커맨드 바 게이지·타일 소멸이 보여준다
            return ""; // 게이지 변화는 로그 소음 — 커맨드 바 게이지가 보여준다
          case "break":
            return `${name(ev.unit)} ${t.brk}`;
          case "death":
            return `${name(ev.unit)} ${t.kill}`;
          case "exp":
            return `${name(ev.unit)} +${ev.amount} EXP`;
          case "levelUp": {
            const gains = Object.entries(ev.gains).map(([k, v]) => `${k}+${v}`).join(" ");
            return `${name(ev.unit)} Lv ${ev.level}! ${gains}`;
          }
          case "spawn":
            return `${(ev.unit as { name?: string }).name ?? String((ev.unit as { id?: string }).id)} ${t.spawn}`;
          case "transfer":
            return ev.force === 0 ? `${name(ev.unit)} ${t.join}` : "";
          case "despawn":
            return `${name(ev.unit)} ${t.despawn}`;
          case "breakRelease":
          case "phase":
          case "outcome":
          case "setPos":
          case "variable":
          case "winRule":
          case "privateSkill":
          case "godUnit":
          case "ai":
          case "crestAdd":
          case "visited":
          case "reset":
          case "unitFlags":
          case "equip":
          case "terrainSet":
          case "gain":
          case "hpStock":
          case "putOff":
            return ""; // 이벤트 내부 상태 — 로그 소음(연출 no-op 결정과 동급)
        }
      })
      .filter((s) => s !== "");
  };

  /**
   * 전투 타격 요약 — ★표는 **맞은 쪽에만** 선다(2026-08-18 사용자 지정).
   * 자군이 때린 것 = 적 오른편(무기 파랑 · 대미지 빨강) · 자군이 맞은 것 = 자군 왼편(무기·대미지 빨강).
   * 색은 **누가 때렸나**, 자리는 **누가 맞았나**로 갈린다 — 우군(force 2)이 끼어도 규칙이 서 있다.
   * 다단 히트는 합치지 않고 한 줄씩, 필살은 노란 CRIT 카드를 덧붙이고, 빗나감(MISS)도 맞을 뻔한 쪽에만 선다.
   * ☠무기는 strike 이벤트에 없다 — 개시측은 **액션이 지정한 무기**(actionWeapon)를, 반격측은 전투 직전
   *   장비를 쓴다(인게이지 강제 무기는 미반영). 개시측을 장비로 근사하면 무기 전환 판에서 이름과 kind가
   *   둘 다 바뀐 무기를 못 따라간다(m001 step34 = 철의 검 → 레이피어).
   */
  const strikeSummaries = (
    events: readonly BattleEvent[],
    before: GameState,
    after: GameState,
    action: BattleAction,
  ): readonly StrikeSummary[] | undefined => {
    const t = labels.logTags;
    const hits = events.filter((e): e is Extract<BattleEvent, { type: "strike" }> => e.type === "strike");
    if (hits.length === 0) return undefined;
    const equipped = actionWeapon(before, action);
    const weaponOf = (id: string): string | undefined => {
      if (equipped !== undefined && id === equipped.unit) return equipped.weapon.name;
      const u = before.units.find((x) => x.id === id) ?? after.units.find((x) => x.id === id);
      return u?.weapon?.name;
    };
    // ☠전수 사상(위 로그 태그와 같은 이유) — 새 kind에서 조용히 라벨이 사라지는 것을 타입이 막는다.
    const KIND_LABELS: Record<StrikeKind, string | undefined> = {
      attack: undefined,
      counter: t.counter,
      followUp: t.follow,
      counterFollowUp: `${t.counter}·${t.follow}`,
      extra: t.extra,
      counterExtra: `${t.counter}·${t.extra}`,
      chain: t.chain,
    };
    // 표시 kind로 한 번 걸러 읽는다 — 신속 추가타가 "추격"으로 적히던 자리(displayKindOf).
    const kindOf = (e: Extract<BattleEvent, { type: "strike" }>): string | undefined =>
      KIND_LABELS[displayKindOf(before, e, equipped)];
    const posOf = (id: string): UnitState | undefined =>
      after.units.find((u) => u.id === id) ?? before.units.find((u) => u.id === id);
    const rows = new Map<string, StrikeRow[]>();
    for (const e of hits) {
      const row: StrikeRow = {
        ...(weaponOf(e.attacker) !== undefined ? { weapon: weaponOf(e.attacker) } : {}),
        ...(kindOf(e) !== undefined ? { kind: kindOf(e) } : {}),
        // 자군의 타격인가 — 무기 글자 색이 여기서 갈린다(파랑 = 우리 손, 빨강 = 상대 손).
        byPlayer: posOf(e.attacker)?.force === 0,
        miss: !e.hit,
        crit: e.crit,
        damage: e.damage,
      };
      const list = rows.get(e.defender);
      if (list === undefined) rows.set(e.defender, [row]);
      else list.push(row);
    }
    return [...rows].map(([id, list]) => {
      const at = posOf(id);
      return {
        id,
        // 자리 = 맞은 쪽 기준. 자군은 왼편, 그 밖(적·우군)은 오른편.
        anchor: at?.force === 0 ? ("left" as const) : ("right" as const),
        // ☠죽은 유닛은 다음 프레임에 사라진다 — 좌표를 지금 붙잡아야 **마지막 일격**이 보인다.
        x: at?.x ?? 0,
        y: at?.y ?? 0,
        rows: list,
      };
    });
  };

  /**
   * 행동 연출 — 이동 궤적 화살표 · 공격자 1픽셀 돌진 · 피격자 붉은 펄스(1초).
   * ★기보 작성(플레이)과 리플레이가 **같은 함수**를 쓴다(사용자 확정): 입력이 둘 다
   * "스텝 하나 = 액션 + 절대 이벤트"라 갈릴 이유가 없다 — 갈리면 같은 수가 다르게 보인다.
   */
  const playEffects = (
    action: BattleAction,
    events: readonly BattleEvent[],
    before: GameState,
    after: GameState,
  ): void => {
    const at = (state: GameState, id: string): UnitState | undefined => state.units.find((u) => u.id === id);
    const next: BoardFx = { seq: (fxRef.current += 1) };

    // 잔상 수명 관리 — 이동이면 출발 칸을 새로 세우고, 그 유닛이 턴을 마쳤거나 남이 움직이면 걷는다.
    if (action.type === "move") {
      const from = at(before, action.unit);
      if (from !== undefined) setMoveOrigin({ unit: action.unit, x: from.x, y: from.y });
    } else if (action.type === "endPhase") {
      setMoveOrigin(undefined);
    } else if ("unit" in action) {
      // 이동 무소모 액션(발동·교환)은 아직 턴 중이라 잔상을 유지한다. 그 밖은 마무리로 본다.
      const keep = action.type === "engage" || action.type === "trade";
      if (!keep || action.unit !== moveOrigin?.unit) setMoveOrigin(undefined);
    }

    if (action.type === "move") {
      const mover = at(before, action.unit);
      if (mover !== undefined) {
        const budget = moveBudgetOn(before.map, mover);
        const costs = before.map.costs[mover.moveType];
        if (budget !== undefined && costs !== undefined) {
          const tiles = movementPath(
            {
              width,
              height,
              movePoints: budget,
              start: { x: mover.x, y: mover.y },
              costAt: makeCostAt(before.map, before.structures, mover.moveType),
              ...movePredicates(before.map, before.units, mover),
            },
            { x: action.x, y: action.y },
          );
          if (tiles !== null && tiles.length > 1) {
            next.trail = tiles;
            next.trailUnit = mover.id;
          }
        }
      }
    }

    // 피격 = 명중해서 피해가 난 쪽 전부(반격 맞은 공격자도 포함 — 실제로 맞았으니 표시한다).
    const pulse = [...new Set(events.filter((e) => e.type === "strike" && e.hit && e.damage > 0).map((e) => (e as Extract<BattleEvent, { type: "strike" }>).defender))];
    if (pulse.length > 0) next.pulse = pulse;

    // 돌진 방향 = 공격자 → 대상. 대상이 좌표인 파괴도 같은 문법.
    const actor = "unit" in action ? at(after, action.unit) : undefined;
    const goal =
      action.type === "destroy" ? { x: action.x, y: action.y }
      : "target" in action ? at(after, action.target) ?? at(before, action.target)
      : undefined;
    if (actor !== undefined && goal !== undefined && pulse.length > 0) {
      next.nudge = { id: actor.id, dx: Math.sign(goal.x - actor.x), dy: Math.sign(goal.y - actor.y) };
    }

    // 전사 잔상 — 죽은 유닛은 다음 프레임에 사라지므로 좌표를 지금 붙잡아 둔다.
    const ghosts = events
      .filter((e) => e.type === "death")
      .map((e) => {
        const id = (e as Extract<BattleEvent, { type: "death" }>).unit;
        const u = at(after, id) ?? at(before, id);
        return u === undefined ? undefined : { id, x: u.x, y: u.y };
      })
      .filter((g): g is { id: string; x: number; y: number } => g !== undefined);
    if (ghosts.length > 0) next.ghosts = ghosts;

    // ☠타격 요약은 fx와 수명이 다르다 — **행동마다** 갈아끼운다(연출 없는 수여도 지운다:
    //   안 지우면 남의 전투 표가 계속 붙어 있다). fx 쪽 1~2초 타이머와 섞지 않는 이유다.
    setStrikes(strikeSummaries(events, before, after, action));

    if (next.trail === undefined && next.pulse === undefined && next.ghosts === undefined) return;
    setFx(next);
  };

  const dispatch = (action: BattleAction): GameState => {
    // 한 클릭에 move+행동이 연달아 커밋되므로 비교 기준은 렌더 시점 game이 아니라 스토어 최신이어야 한다.
    const prev = store.getState().game;
    const next = store.getState().dispatch(action);
    if (next === prev) return prev;
    playEffects(action, next.events, prev, next);
    const lines = describe(next.events, prev, action);
    if (lines.length > 0) setLog(lines);
    for (const ev of next.events) {
      if (ev.type === "phase") {
        setBanner(`${labels.forceNames[ev.phase] ?? ""} ${labels.turnPhase}`);
        setLog([]);
      }
      if (ev.type === "outcome") setBanner(ev.outcome === "victory" ? labels.victory : labels.defeat);
    }
    return next;
  };

  const tryDispatch = (action: BattleAction): boolean => {
    const prev = store.getState().game;
    return dispatch(action) !== prev;
  };

  /**
   * 적턴 자동 — `aiNextAction`을 반복 실행하고 액션마다 dispatch한다(기보에 그대로 기록된다).
   * ☠결손 유닛만 남으면 **정지하고 표시**한다 — 몰래 wait을 먹이면 그것도 오재현이다.
   * AI 난수는 전투 RNG와 **별도 스트림**이다(Random.System — AI_ENGINE §7-4).
   */
  const runEnemyAuto = (): void => {
    const ai = createAi(calculator);
    let memory = emptyAiMemory();
    setAiGaps([]);
    for (let guard = 0; guard < 1000; guard++) {
      const before = store.getState().game;
      if (before.outcome !== undefined || before.phase === 0) return;
      const decision = ai.next(before, aiRng, memory);
      memory = decision.memory;
      if (decision.actions.length === 0) {
        if (decision.deficits.length > 0) {
          setAiGaps(decision.deficits);
          return; // 결손 유닛이 남았다 — 페이즈를 자동으로 닫지 않는다.
        }
        // ☠endPhase도 거부될 수 있다(이벤트 콜백 오류 등) — 조용히 반환하면 화면이 멈춘 채 침묵한다.
        if (dispatch({ type: "endPhase" }) === before) {
          setAiGaps([
            { unit: "-", kind: "engine", reason: "페이즈 종료가 엔진에 거부됐다 — 콘솔의 [FESim] 거부된 행동 참조" },
          ]);
        }
        return;
      }
      for (const action of decision.actions) dispatch(action);
      // ☠**진행 감시**: 스토어 dispatch는 불법 행동을 무시하고 이전 국면을 그대로 돌려준다.
      // 그대로 두면 같은 국면 → 같은 결정 → 무한 재평가가 되어 페이지가 조용히 멈춘다(m001 보스 실발현).
      // 국면이 하나도 안 변했으면 그 유닛을 **정직 결손으로 등재하고 제외**한다.
      if (store.getState().game === before && decision.unit !== undefined) {
        memory = {
          ...memory,
          skipped: {
            ...memory.skipped,
            [decision.unit]: `엔진이 거부한 액션: ${decision.actions.map((a) => a.type).join(" + ")}`,
          },
        };
      }
    }
    // 1000회를 소진했다 = 위 감시가 못 잡은 진행 불가. 침묵 금지 — 있는 그대로 알린다.
    setAiGaps([{ unit: "-", kind: "engine", reason: "적턴 자동이 수렴하지 않았다(1000 액션 초과)" }]);
  };

  /** 공격 액션 — 무기 목록이 있으면 선택 인덱스를 기보에 싣는다(장비 전환 포함 재현 계약). */
  /**
   * 교전 액션 — 메뉴에서 **인게이지 기술**을 골랐으면 그쪽으로 나간다.
   * ☠리워프형(세리카)·관통형(시구르드)은 착지 좌표를 더 물어야 해서 아직 못 쏜다 —
   * 엔진이 정직하게 거부하고 콘솔에 사유가 남는다(조용히 일반 공격으로 흘리지 않는다).
   */
  const attackAction = (unit: string, target: string): BattleAction =>
    cmd === "engageArt"
      ? { type: "engageAttack", unit, target }
      : weapons.length > 0
        ? { type: "attack", unit, target, weapon: weaponIdx }
        : { type: "attack", unit, target };

  /** 잠정 이동 확정 — 행동 직전에만 호출된다. 이동 없음/제자리 = 성공으로 친다. */
  const commitMove = (): boolean => {
    if (selected === undefined || pending === undefined) return true;
    if (pending.x === selected.x && pending.y === selected.y) return true;
    return tryDispatch({ type: "move", unit: selected.id, x: pending.x, y: pending.y });
  };

  const onTileClick = (x: number, y: number) => {
    if (mode === "replay") return; // 열람 전용 — 조작은 스테퍼(포커스 모드 문법)
    if (editing) {
      // 편집 모드: 유닛 클릭 = 선택, 빈 칸 클릭 = 선택 유닛 배치 이동(전 세력 대상).
      const clicked = byTile.get(tileKey(x, y));
      if (clicked !== undefined) {
        setEditSel(clicked.id);
        return;
      }
      if (editSel !== undefined) patchUnit(editSel, { x, y });
      return;
    }
    if (game.outcome !== undefined) return;
    const key = tileKey(x, y);
    const clicked = byTileView.get(key);

    if (clicked !== undefined) {
      // 방해 지팡이(명시 선택) — 교전과 같은 문법: 첫 클릭 = 대상 확정+발판, 재클릭 = 시전 커밋.
      if (
        selected !== undefined &&
        staffMode === "interfere" &&
        !selected.acted &&
        staffIdx !== undefined &&
        clicked.force !== selected.force &&
        range?.staffAll.has(key) === true
      ) {
        if (clicked.id === targetId && interfereFc?.inRange === true) {
          if (commitMove() && tryDispatch({ type: "staff", unit: selected.id, target: clicked.id, staff: staffIdx })) {
            if (canterPower(selected) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
        setTargetId(clicked.id);
        if (pending === undefined && staffAt !== undefined && !(staffAt.x === selected.x && staffAt.y === selected.y)) {
          setPending({ x: staffAt.x, y: staffAt.y });
        }
        return;
      }
      if (
        selected !== undefined &&
        staffMode !== "interfere" &&
        clicked.force !== selected.force &&
        range?.attackAll.has(key) === true
      ) {
        if (clicked.id === targetId && canAttack) {
          if (commitMove() && tryDispatch(attackAction(selected.id, clicked.id))) {
            // 재이동(시구르드) 보유면 선택을 유지해 행동 후 이동 창을 이어준다.
            if (canterPower(selected) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
        setTargetId(clicked.id);
        // 호버로 정해진 공격 발판을 잠정 이동으로 굳힌다(인게임: 경로 결정 → 교전 확정).
        if (
          pending === undefined &&
          engageAt !== undefined &&
          !(engageAt.x === selected.x && engageAt.y === selected.y)
        ) {
          setPending({ x: engageAt.x, y: engageAt.y });
        }
        return;
      }
      // 춤(재행동) — 무희 + 인접(잠정 위치 기준 1칸) 행동 완료 아군: 클릭 = 대상 지정, 재클릭 = 커밋.
      if (
        selected !== undefined &&
        !selected.acted &&
        canDance(selected) &&
        clicked.force === selected.force &&
        clicked.id !== selected.id &&
        clicked.acted &&
        selectedAt !== undefined &&
        Math.abs(selectedAt.x - clicked.x) + Math.abs(selectedAt.y - clicked.y) === 1
      ) {
        if (clicked.id === targetId) {
          if (commitMove() && tryDispatch({ type: "dance", unit: selected.id, target: clicked.id })) {
            if (canterPower(selected) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
        setTargetId(clicked.id);
        return;
      }
      // 지팡이 아군 대상 — 회복 = 손상 아군(재클릭 = 커밋), 워프 = 아군 전부(확정 후 목적지 클릭).
      if (
        selected !== undefined &&
        !selected.acted &&
        staffIdx !== undefined &&
        clicked.force === selected.force &&
        clicked.id !== selected.id &&
        ((staffMode === "heal" && clicked.hp < clicked.stats.hp) || staffMode === "warp") &&
        range?.staffAll.has(key) === true
      ) {
        if (staffMode === "heal" && clicked.id === targetId && healFc?.inRange === true) {
          if (commitMove() && tryDispatch({ type: "staff", unit: selected.id, target: clicked.id, staff: staffIdx })) {
            if (canterPower(selected) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
        setTargetId(clicked.id);
        if (pending === undefined && staffAt !== undefined && !(staffAt.x === selected.x && staffAt.y === selected.y)) {
          setPending({ x: staffAt.x, y: staffAt.y });
        }
        return;
      }
      // ☠"자기 재클릭 = 대기"는 걷어냈다(2026-08-19) — 커맨드 메뉴에 대기 항목이 생긴 이상
      //   암묵 조작을 남기면 이동을 무르려다 턴을 끝내는 오폭이 된다. 취소는 stepBack이 맡는다.
      // 행동 완료 유닛도 재이동 창이 남아 있으면 선택 가능(예산 판정 = 엔진 moveBudget).
      const canterReady = clicked.acted && moveBudget(clicked) !== undefined;
      setSelectedId(clicked.force === game.phase && (!clicked.acted || canterReady) ? clicked.id : undefined);
      setTargetId(undefined);
      return;
    }

    // 워프 목적지 클릭 — 대상 확정 후 초록 오버레이(warpTiles) 안의 빈 칸 = 시전 커밋.
    if (
      selected !== undefined &&
      staffMode === "warp" &&
      staffIdx !== undefined &&
      allyTarget !== undefined &&
      warpTiles?.some((t) => t.x === x && t.y === y) === true
    ) {
      if (
        commitMove() &&
        tryDispatch({ type: "staff", unit: selected.id, target: allyTarget.id, staff: staffIdx, x, y })
      ) {
        if (canterPower(selected) === undefined) setSelectedId(undefined);
        setTargetId(undefined);
      }
      return;
    }

    if (selected !== undefined && range?.moveSet.has(key) === true) {
      if (selected.acted) {
        // 재이동(행동 후)은 클릭 즉시 확정 — 이후 행동이 없어 잠정 단계가 무의미하다.
        const ok = tryDispatch({ type: "move", unit: selected.id, x, y });
        if (ok) setSelectedId(undefined);
      } else {
        // 행동 전 이동은 잠정 — 원점 범위 안에서 자유 재배치, 원점 클릭 = 이동 취소.
        setPending(x === selected.x && y === selected.y ? undefined : { x, y });
      }
      setTargetId(undefined);
      return;
    }
    setSelectedId(undefined);
    setTargetId(undefined);
  };

  /**
   * 커맨드 실행 — 즉시 끝나는 것과 대상을 더 고르는 것으로 갈린다.
   * ☠`visit`은 다른 액션과 달리 재이동 창을 열지 않는다(엔진 battle.ts가 moved=false를 세우지 않는다) —
   * 여기서 특별 취급하지 않아도 `canterPower`가 없으면 선택이 풀리므로 결과가 같다.
   * ☠`engage`는 행동을 소모하지 않는다 — 실행 후에도 선택을 유지해야 이어서 공격할 수 있다.
   */
  const runCommand = (id: CommandId) => {
    if (selected === undefined) return;
    const finish = () => {
      if (canterPower(selected) === undefined) setSelectedId(undefined);
      setTargetId(undefined);
      setCmd(undefined);
      clearLocal();
    };
    switch (id) {
      case "wait":
        if (commitMove() && tryDispatch({ type: "wait", unit: selected.id })) finish();
        return;
      case "engage":
        tryDispatch({ type: "engage", unit: selected.id });
        setCmd(undefined);
        return;
      case "guard":
        if (commitMove() && tryDispatch({ type: "guard", unit: selected.id })) finish();
        return;
      case "visit":
        if (commitMove() && tryDispatch({ type: "visit", unit: selected.id })) finish();
        return;
      case "destroy": {
        const t = breakables[0];
        if (t !== undefined && commitMove() && tryDispatch({ type: "destroy", unit: selected.id, x: t.x, y: t.y })) finish();
        return;
      }
      default:
        // 대상·목록을 더 고르는 커맨드 — 재선택은 해제(토글)로 둔다.
        setCmd(cmd === id ? undefined : id);
        setTargetId(undefined);
    }
  };

  const copyRecord = () => {
    const file = store.getState().toFile({ created: new Date().toISOString() });
    void navigator.clipboard
      .writeText(serializeEphemeris(file))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  /* ── 넘버링 세이브 — 사용자가 찍은 지점을 번호로 박제한다.
     ★번호의 쓸모 = 대화 앵커: 로컬 dev로 플레이하면 같은 세이브가 data/fe17/saves/{NNN}.eph.json에
     미러돼(astro.config의 saveMirror) "세이브 7"이 그대로 국면 조회가 된다. */

  const padNo = (n: number): string => String(n).padStart(3, "0");

  const doSave = () => {
    const saved = store.getState().saveNamed();
    if (saved === undefined) return;
    setBanner(`${labels.saves.saved} ${padNo(saved.n)}`);
    setSaves(listSaves());
  };

  const openSave = (s: SaveSummary) => {
    // 다른 챕터 = 그 페이지가 열어야 한다(보드 props가 챕터를 고정한다 — 유닛 주소부터 다르다).
    if (s.cid !== props.mapId) {
      window.location.href = `${window.location.pathname.replace(/[^/]+$/, s.cid)}${writeMapQuery("", { load: s.n })}`;
      return;
    }
    if (!store.getState().loadSave(s.n)) return;
    clearLocal();
    setSavesOpen(false);
    setBanner(`${labels.saves.saved} ${padNo(s.n)}`);
  };

  /** 베타(워커)에는 파일 미러가 없다 — 그쪽 세이브는 이 버튼으로 대화에 옮긴다. */
  const copySave = (s: SaveSummary) => {
    const file = readSave(s.n);
    if (file === undefined) {
      setSaves(listSaves()); // 슬롯이 사라진 항목은 읽는 순간 걷힌다
      return;
    }
    void navigator.clipboard
      .writeText(serializeEphemeris(file))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const removeSave = (s: SaveSummary) => {
    dropSave(s.n);
    setSaves(listSaves());
  };

  return (
    <figure
      className="plate"
      style={{ "--cols": width, "--rows": height, "--zoom": zoom } as React.CSSProperties}
      aria-label={labels.board}
    >
      <nav className="diff-switch" aria-label={labels.difficulty}>
        {(["n", "h", "l"] as Difficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            className={d === difficulty ? "on" : undefined}
            disabled={mode === "replay"}
            onClick={() => {
              store.getState().setDifficulty(d);
              store.getState().restore();
              clearLocal();
            }}
          >
            {labels.diffNames[d]}
          </button>
        ))}
      </nav>

      {/* 턴·페이즈 종료·물리기·리플레이는 아래 턴 바가 소유한다 — 여기는 나머지 명령만. */}
      <div className="turn-strip">
        <button
          type="button"
          onClick={runEnemyAuto}
          disabled={game.outcome !== undefined || mode === "replay" || game.phase === 0}
        >
          {labels.enemyAuto}
        </button>
        <button
          type="button"
          onClick={() => {
            store.getState().reset();
            clearLocal();
          }}
        >
          {labels.reset}
        </button>
        <button type="button" onClick={copyRecord}>
          {copied ? labels.copied : labels.copyRecord}
        </button>
        {admin && (
          <>
            <button type="button" disabled={mode === "replay"} title={labels.saves.hint} onClick={doSave}>
              {labels.saves.save}
            </button>
            <button
              type="button"
              className={savesOpen ? "on" : undefined}
              onClick={() => {
                setSaves(listSaves());
                setSavesOpen((v) => !v);
              }}
            >
              {labels.saves.list}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={mode === "replay"}
          className={editing ? "on" : undefined}
          onClick={() => {
            setEditing(!editing);
            setEditSel(undefined);
            clearLocal();
          }}
        >
          {editing ? labels.editExit : labels.editCmd}
        </button>
      </div>

      <BoardView
        width={width}
        height={height}
        tiles={tiles}
        palette={props.palette}
        objects={visibleObjects(objects, game.crests, props.crestName)}
        structures={visibleStructures(props.structures, game.structures)}
        overlays={props.overlays}
        patches={game.terrainPatches}
        interactions={props.interactions}
        units={viewUnits}
        byTile={byTileView}
        visuals={visuals}
        range={boardRange}
        path={path ?? fx?.trail}
        godFaces={props.godFaces}
        strikes={strikes}
        fx={fx}
        moveOrigin={moveOrigin}
        selectedId={editing ? editSel : selectedId}
        targetId={targetId}
        banner={banner}
        bannerStay={game.outcome !== undefined}
        onTileClick={onTileClick}
        onTileHover={setHover}
      />

      {/*
        턴 바 — ★**항상 보인다**(무한 천각 = 되돌리기에 제한이 없는 서비스라 시간 이동이 상시 조작이다).
        같은 화살표가 두 모드를 겸한다: 좌 = 과거 / 우 = 미래.
          play   « 되돌리기 · ‹ 이전 유닛 · › 다음 유닛 · » 턴 종료
          replay « 이전 페이즈 · ‹ 이전 행동 · › 다음 행동 · » 다음 페이즈
        중앙 = 리플레이 토글. 리플레이 해제 = 보던 커서 국면부터 이어 두기(닫기 버튼 없음).
      */}
      <div className={mode === "replay" ? "turn-bar on" : "turn-bar"} role="toolbar" aria-label={labels.replayCmd}>
        <div className="tb-row">
          <button
            type="button"
            className="tb-arrow"
            aria-label={mode === "replay" ? labels.replayPrevPhase : labels.undoCmd}
            title={mode === "replay" ? labels.replayPrevPhase : labels.undoCmd}
            disabled={mode === "replay" ? cursor <= 0 : recorded <= 1}
            onClick={() => {
              if (mode === "replay") store.getState().stepPhase(-1);
              else store.getState().undo();
              clearLocal();
            }}
          >
            «
          </button>
          <button
            type="button"
            className="tb-arrow"
            aria-label={mode === "replay" ? labels.replayPrev : labels.prevUnit}
            title={mode === "replay" ? labels.replayPrev : labels.prevUnit}
            disabled={mode === "replay" ? cursor <= 0 : readyUnits.length === 0}
            onClick={() => (mode === "replay" ? store.getState().stepAction(-1) : cycleUnit(-1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="tb-replay"
            aria-pressed={mode === "replay"}
            title={mode === "replay" ? labels.replayOn : labels.replayOff}
            disabled={mode !== "replay" && recorded <= 1 && defaultFile.current === undefined}
            onClick={() => {
              if (mode === "replay") {
                store.getState().exitReplay();
              } else if (defaultFile.current !== undefined) {
                // 라벨이 "이 챕터의 기보"라고 말한다 — 있으면 그걸 연다(신규 사용자가 기대하는 것).
                store.getState().loadReplay(defaultFile.current);
              } else {
                store.getState().loadReplay(store.getState().toFile()); // 기보 없는 챕터 = 내가 둔 수
              }
              clearLocal();
            }}
          >
            {mode === "replay" ? "REPLAY" : labels.replayCmd}
          </button>
          <button
            type="button"
            className="tb-arrow"
            aria-label={mode === "replay" ? labels.replayNext : labels.nextUnit}
            title={mode === "replay" ? labels.replayNext : labels.nextUnit}
            disabled={mode === "replay" ? cursor >= replaySteps : readyUnits.length === 0}
            onClick={() => (mode === "replay" ? store.getState().stepAction(1) : cycleUnit(1))}
          >
            ›
          </button>
          <button
            type="button"
            className="tb-arrow"
            aria-label={mode === "replay" ? labels.replayNextPhase : labels.nextTurn}
            title={mode === "replay" ? labels.replayNextPhase : labels.nextTurn}
            disabled={mode === "replay" ? cursor >= replaySteps : game.outcome !== undefined}
            onClick={() => {
              if (mode === "replay") store.getState().stepPhase(1);
              else dispatch({ type: "endPhase" });
              clearLocal();
            }}
          >
            »
          </button>
        </div>
        {/* 실제 턴(게임의 턴·페이즈)과 유닛 턴(행동 단위)은 다른 축이다 — 붙여 쓰면 어느 쪽 화살표인지 헷갈린다. */}
        <div className="tb-meta">
          <span className="tb-turn">
            {labels.turnWord} {game.turn} · {labels.forceNames[game.phase] ?? ""} {labels.turnPhase}
          </span>
          <span className="tb-unit">
            {labels.unitTurn} {mode === "replay" ? `${cursor} / ${replaySteps}` : `${actedCount} / ${mine.length}`}
          </span>
        </div>
      </div>

      <div className="zoom-bar">
        <button
          type="button"
          aria-label={labels.zoomOut}
          title={labels.zoomOut}
          disabled={zoom <= ZOOM_MIN}
          onClick={() => changeZoom(-ZOOM_STEP)}
        >
          <MagnifierIcon plus={false} />
        </button>
        <button
          type="button"
          aria-label={labels.zoomIn}
          title={labels.zoomIn}
          disabled={zoom >= ZOOM_MAX}
          onClick={() => changeZoom(ZOOM_STEP)}
        >
          <MagnifierIcon plus />
        </button>
      </div>

      <CommandMenu
        commands={cmd === "item" ? [] : commands}
        labels={labels.commands}
        artName={selected?.engageArt?.name}
        active={cmd}
        hovered={cmdHover}
        onPick={runCommand}
        onHover={setCmdHover}
      />

      {!editing && mode !== "replay" && selected !== undefined && cmd === "item" && (
        <ItemPanel
          rows={itemRows}
          cursor={itemCursor}
          stats={itemStats?.stats}
          reach={itemStats?.reach}
          labels={labels}
          onCursor={setItemCursor}
        />
      )}

      {/* 인게이지 게이지 — 커맨드가 아니라 상태 표시라 메뉴 밖에 남긴다. */}
      {!editing && mode !== "replay" && selected?.engage !== undefined && (
        <div className="edit-bar cmd-bar" role="status">
          <span className="edit-hint">
            ⚡{" "}
            {selected.engage.engaging
              ? `${labels.commands.engage.label} ${selected.engage.turnLimit - selected.engage.turn}`
              : `${selected.engage.count}/${selected.engage.limit}`}
          </span>
        </div>
      )}

      {/* ★하위 목록 — 고른 커맨드가 무엇을 더 물어보는지에 따라 내용이 갈린다(실기 MapItemMenu 자리).
          ☠커맨드를 안 고르면 아무것도 안 뜬다: 종전처럼 전부 늘어놓으면 메뉴가 있는 의미가 없다. */}
      {!editing && mode !== "replay" && selected !== undefined && cmd !== undefined && (
        <div className="edit-bar cmd-bar" role="toolbar" aria-label={labels.commands[cmd].label}>
          {cmd === "staff" &&
            usableStaves.map(({ s, i }) => (
              <button
                key={`staff${i}`}
                type="button"
                className={staffPick === i ? "on" : undefined}
                onClick={() => {
                  setStaffPick(staffPick === i ? undefined : i);
                  setTargetId(undefined);
                }}
              >
                {s.name ?? labels.staffCmd} ({s.uses})
              </button>
            ))}
          {cmd === "staff" && staffMode === "warp" && allyTarget !== undefined && (
            <span className="edit-hint">{labels.warpPick}</span>
          )}

          {cmd === "trade" &&
            tradePartners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  // 교환은 확정 위치 기준 — 잠정 이동을 먼저 커밋한다(인게임: 이동 후 교환, 이후 재이동 불가).
                  if (commitMove()) setTradeWith(p.id);
                }}
              >
                {visuals.get(p.id)?.name ?? p.id}
              </button>
            ))}
          {cmd === "attack" && <span className="edit-hint">{labels.commands.attack.help}</span>}
          {cmd === "dance" && <span className="edit-hint">{labels.commands.dance.help}</span>}
        </div>
      )}

      {tradeWith !== undefined &&
        selected !== undefined &&
        (() => {
          const partner = alive.find((u) => u.id === tradeWith);
          if (partner === undefined) return null;
          const column = (owner: UnitState, back: boolean) => (
            <div className="trade-col" style={{ "--force": visuals.get(owner.id)?.ring ?? "#888" } as React.CSSProperties}>
              <strong className="fc-name">{visuals.get(owner.id)?.name ?? owner.id}</strong>
              {(["weapon", "staff", "consumable"] as const).flatMap((kind) => {
                const list = kind === "weapon" ? owner.weapons : kind === "staff" ? owner.staves : owner.consumables;
                return (list ?? []).map((it, i) => (
                  <button
                    key={`${kind}${i}`}
                    type="button"
                    onClick={() =>
                      void tryDispatch({
                        type: "trade",
                        unit: selected.id,
                        target: partner.id,
                        kind,
                        index: i,
                        ...(back ? { back: true } : {}),
                      })
                    }
                  >
                    {(it as { name?: string }).name ?? kind}
                    {owner.weapon === it && <em className="fc-eq" title="Equipped"> E</em>}
                  </button>
                ));
              })}
            </div>
          );
          return (
            <div className="forecast trade no-arm" role="dialog" aria-label={labels.tradeCmd}>
              {column(selected, false)}
              <div className="fc-mid">
                <span className="fc-vs" aria-hidden="true">⇄</span>
                <button type="button" className="fc-go" onClick={() => setTradeWith(undefined)}>
                  {labels.closeCmd}
                </button>
              </div>
              {column(partner, true)}
            </div>
          );
        })()}

      {admin && savesOpen && (
        <div className="saves-panel" role="group" aria-label={labels.saves.list}>
          {saves.length === 0 && <span className="saves-empty">{labels.saves.empty}</span>}
          {saves.map((s) => (
            <div key={s.n} className="saves-row">
              <button type="button" className="saves-open" onClick={() => openSave(s)}>
                <b>{padNo(s.n)}</b>
                <span>
                  {s.cid} {labels.diffNames[s.difficulty]} · {labels.turnWord} {s.turn} · {s.steps}
                  {labels.saves.steps} · {s.alive}/{s.total}
                  {s.origin === "replay" ? ` · ${labels.saves.joined}` : ""}
                </span>
                <time>{s.created.slice(0, 16).replace("T", " ")}</time>
              </button>
              <button type="button" onClick={() => copySave(s)}>
                {labels.saves.copy}
              </button>
              <button type="button" onClick={() => removeSave(s)}>
                {labels.saves.drop}
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="edit-bar" role="toolbar" aria-label={labels.editCmd}>
          <span className="edit-hint">{editSel !== undefined ? unitName(editSel) : labels.editHint}</span>
          {editSel !== undefined && !removedIds.includes(editSel) && (
            <button
              type="button"
              onClick={() => {
                patchUnit(editSel, { removed: true });
                setEditSel(undefined);
              }}
            >
              {labels.removeCmd}
            </button>
          )}
          {removedIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                const { removed: _removed, ...rest } = setup?.units?.[id] ?? {};
                store.getState().setSetup({ ...setup, units: { ...setup?.units, [id]: rest } });
              }}
            >
              {unitName(id)} · {labels.restoreCmd}
            </button>
          ))}
        </div>
      )}

      {log.length > 0 && (
        <div className="battle-log" role="status">
          {log.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}

      {aiGaps.length > 0 && (
        <div className="battle-log" role="status">
          <span>{labels.enemyAutoBlocked}</span>
          {aiGaps.map((gap, i) => (
            <span key={i}>
              {unitName(gap.unit)} · {gap.reason}
            </span>
          ))}
        </div>
      )}

      {forecast !== undefined && selected !== undefined && fcTarget !== undefined && (
        <div
          className={weapons.length > 0 ? "forecast" : "forecast no-arm"}
          role="status"
          aria-label={labels.forecast}
        >
          {weapons.length > 0 && (
            <ul className="fc-weapons" onMouseLeave={() => setWeaponHover(undefined)}>
              {weapons.map((w, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={[i === weaponIdx && "on", !inRangeOf(w) && "out"].filter(Boolean).join(" ") || undefined}
                    onMouseEnter={() => setWeaponHover(i)}
                    onFocus={() => setWeaponHover(i)}
                    onClick={() => setWeaponPick(i)}
                  >
                    {i === equippedIdx && <em className="fc-eq" title="Equipped">E</em>}
                    {w.name ?? "—"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ForecastSide
            unit={{ ...selected, weapon: activeWeapon }}
            visual={visuals.get(selected.id)}
            side={forecast.attack}
            hpAfter={forecast.selfHp}
            incoming={fcTarget.force === 0}
            labels={labels}
          />
          <div className="fc-mid">
            <span className="fc-vs" aria-hidden="true">⚔</span>
            {canAttack && foeTarget !== undefined && (
              <button
                type="button"
                className="fc-go"
                onClick={() => {
                  if (commitMove() && tryDispatch(attackAction(selected.id, foeTarget.id))) {
                    if (canterPower(selected) === undefined) setSelectedId(undefined);
                    setTargetId(undefined);
                  }
                }}
              >
                {labels.attackCmd}
              </button>
            )}
          </div>
          <ForecastSide
            unit={fcTarget}
            visual={visuals.get(fcTarget.id)}
            side={forecast.brk ? undefined : forecast.counter}
            hpAfter={forecast.targetHp}
            brk={forecast.brk}
            incoming={selected.force === 0}
            labels={labels}
          />
          <small className="fc-note">
            {[
              forecast.guarded ? labels.logTags.guard : "",
              // 체인 몫은 잔여 HP에 이미 들어가 있다 — 몇 명이 얼마를 얹었는지 밝혀야 숫자가 읽힌다.
              forecast.chain > 0 ? `${labels.logTags.chain} ×${forecast.chain} −${forecast.chainDamage}` : "",
              forecast.inRange ? "" : labels.currentPosNote,
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </div>
      )}

      {/* ★재생 예보 — 다음 수가 전투면 **돌입 전에** 예보를 세운다(실기와 같은 순서, 사용자 지정).
          열람 전용이라 무기 목록·공격 버튼이 없다(no-arm). */}
      {replayForecast !== undefined && (
        <div className="forecast no-arm" role="status" aria-label={labels.forecast}>
          <ForecastSide
            unit={replayForecast.attacker}
            visual={visuals.get(replayForecast.attacker.id)}
            side={replayForecast.attack}
            hpAfter={replayForecast.selfHp}
            incoming={replayForecast.target.force === 0}
            labels={labels}
          />
          <div className="fc-mid">
            <span className="fc-vs" aria-hidden="true">⚔</span>
          </div>
          <ForecastSide
            unit={replayForecast.target}
            visual={visuals.get(replayForecast.target.id)}
            side={replayForecast.brk ? undefined : replayForecast.counter}
            hpAfter={replayForecast.targetHp}
            brk={replayForecast.brk}
            incoming={replayForecast.attacker.force === 0}
            labels={labels}
          />
          {(replayForecast.guarded || replayForecast.chain > 0) && (
            <small className="fc-note">
              {[
                replayForecast.guarded ? labels.logTags.guard : "",
                replayForecast.chain > 0
                  ? `${labels.logTags.chain} ×${replayForecast.chain} −${replayForecast.chainDamage}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          )}
        </div>
      )}

      {healFc !== undefined && selected !== undefined && staff !== undefined && (
        <div className="forecast heal no-arm" role="status" aria-label={labels.staffCmd}>
          <div className="fc-side" style={{ "--force": visuals.get(selected.id)?.ring ?? "#888" } as React.CSSProperties}>
            <strong className="fc-name">{visuals.get(selected.id)?.name ?? selected.id}</strong>
            <span className="fc-weapon">
              {staff.name ?? labels.staffCmd} · {staff.uses}
            </span>
            <span className="fc-hp">
              HP {selected.hp}
              <small>/{selected.stats.hp}</small>
            </span>
          </div>
          <div className="fc-mid">
            <span className="fc-vs" aria-hidden="true">✚</span>
            {allyTarget !== undefined && healFc.inRange && (
              <button
                type="button"
                className="fc-go"
                onClick={() => {
                  if (
                    staffIdx !== undefined &&
                    commitMove() &&
                    tryDispatch({ type: "staff", unit: selected.id, target: allyTarget.id, staff: staffIdx })
                  ) {
                    if (canterPower(selected) === undefined) setSelectedId(undefined);
                    setTargetId(undefined);
                  }
                }}
              >
                {labels.staffCmd}
              </button>
            )}
          </div>
          <div
            className="fc-side"
            style={{ "--force": visuals.get(healFc.target.id)?.ring ?? "#888" } as React.CSSProperties}
          >
            <strong className="fc-name">
              {visuals.get(healFc.target.id)?.name ?? healFc.target.id}
              <em className="fc-heal">+{healFc.amount}</em>
            </strong>
            <span className="fc-weapon">{healFc.target.weapon?.name ?? "—"}</span>
            <span className="fc-hp">
              HP {healFc.target.hp}
              {healFc.hpAfter !== healFc.target.hp && <span className="fc-hp-to"> → {healFc.hpAfter}</span>}
              <small>/{healFc.target.stats.hp}</small>
            </span>
          </div>
          <small className="fc-note">{healFc.inRange ? "" : labels.currentPosNote}</small>
        </div>
      )}

      {interfereFc !== undefined && selected !== undefined && staff !== undefined && (
        <div className="forecast heal no-arm" role="status" aria-label={labels.staffCmd}>
          <div className="fc-side" style={{ "--force": visuals.get(selected.id)?.ring ?? "#888" } as React.CSSProperties}>
            <strong className="fc-name">{visuals.get(selected.id)?.name ?? selected.id}</strong>
            <span className="fc-weapon">
              {staff.name ?? labels.staffCmd} · {staff.uses}
            </span>
            <dl className="fc-rows">
              <dt>{labels.hit}</dt>
              <dd>{interfereFc.rate}</dd>
            </dl>
          </div>
          <div className="fc-mid">
            <span className="fc-vs" aria-hidden="true">✦</span>
            {foeTarget !== undefined && interfereFc.inRange && staffIdx !== undefined && (
              <button
                type="button"
                className="fc-go"
                onClick={() => {
                  if (
                    commitMove() &&
                    tryDispatch({ type: "staff", unit: selected.id, target: foeTarget.id, staff: staffIdx })
                  ) {
                    if (canterPower(selected) === undefined) setSelectedId(undefined);
                    setTargetId(undefined);
                  }
                }}
              >
                {labels.staffCmd}
              </button>
            )}
          </div>
          <div
            className="fc-side"
            style={{ "--force": visuals.get(interfereFc.target.id)?.ring ?? "#888" } as React.CSSProperties}
          >
            <strong className="fc-name">{visuals.get(interfereFc.target.id)?.name ?? interfereFc.target.id}</strong>
            {/* 효과 = 부여 상태 이름(GiveSids 사영) — 수치 아닌 상태 지팡이의 예보 본문. */}
            <span className="fc-weapon">{(staff.gives ?? []).map((g) => g.name ?? g.sid).join(" · ")}</span>
            <span className="fc-hp">
              HP {interfereFc.target.hp}
              <small>/{interfereFc.target.stats.hp}</small>
            </span>
          </div>
          <small className="fc-note">{interfereFc.inRange ? "" : labels.currentPosNote}</small>
        </div>
      )}
    </figure>
  );
}

/** 돋보기 +/− 아이콘 — 외부 에셋 없이 인라인 렌더(색 = currentColor로 테마 추종). */
function MagnifierIcon({ plus }: { plus: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.8 12.8 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 8.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {plus && <path d="M8.5 6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

/** 예보 패널이 그리는 한 측의 숫자 — 그 측 첫 오더의 값 + 手番回数(SideForecast 표시 부분집합). */
export type ForecastNumbers = Pick<SideForecast, "damage" | "hitRate" | "critRate" | "battleTimes"> & {
  /** 그 측 오더별 대미지(실행 순서). `damage`는 이 배열의 첫 값이다. */
  damages: readonly number[];
};

/**
 * 대미지 칸 꼬리표 — ★오더별 대미지가 **전부 같을 때만** `×N`을 쓴다.
 * 이유 = `×N`은 "같은 대미지 N번"으로 읽히는데 신속 판은 마지막 오더가 `威力 * 0.5`라 그 읽기가 총합을
 * 과대하게 만든다(대미지 칸만 보고 지르면 적이 산다). 갈리면 뒤 오더를 그대로 더해 적는다(`+5`).
 * 오더별 전체 나열 대신 **첫 값 + 나머지 가산**으로 둔 것은 칸 폭이 한 줄이기 때문이다.
 */
export const strikeSuffix = (damages: readonly number[]): string =>
  damages.length < 2 ? ""
  : damages.every((d) => d === damages[0]) ? `×${damages.length}`
  : damages.slice(1).map((d) => `+${d}`).join("");

/**
 * 전투 예보 한 벌 — 발판·무기·대상이 정해지면 판정 입력이 같다.
 * ★플레이 예보와 **재생 예보가 같은 함수**를 쓴다(사용자 확정 원칙: 같은 수가 다르게 보이면 안 된다).
 * `counterDist` = 반격 사거리를 재는 거리(사거리 밖 호버는 "붙었다면"으로 읽어 무기 최대치를 넘긴다).
 * 예상 잔여 HP는 전 타격 명중 가정(인게임 예보 문법)이다.
 * ★타격 순서·오더별 배율은 **엔진 공용 함수 `battlePlan`이 단독으로 소유**한다 — 리듀서가 소비하는
 *   바로 그 목록을 여기서도 그대로 소비하므로 두 층이 갈릴 코드 자체가 없다(종전엔 별개 루프였다).
 * ☠체인어택은 그 목록 **밖**이라 따로 얹는다 — 종전엔 통째로 빠져 있었고 그만큼 예상 잔여 HP가
 *   과대했다(실측: 기보 138 attack 스텝 중 9건이 2~4 과대). 정본도 빼지 않는다:
 *   맵 예보는 `MapUIGauge.CalcBattleInfoForNormal`(0x2025920)이 `BattleCalculator.CalcSimulation`
 *   (0x246D610)을 부른 뒤 `BattleInfoSide.NowHp`를 읽는 구조인데, `CalcSimulation`은
 *   `PushSimulation`(명중 확정·필살 없음 — `SetSimulation` 0x1E8D2E0이 확률 델리게이트를
 *   True/False로 갈아끼운다)만 걸고 **전투 계산을 통째로 돌린다**(CalcBranch → CalcOrders →
 *   CalcChainAttack 0x246F690). 즉 인게임 예보 HP에는 체인 몫이 들어 있다.
 */
export function combatForecast(
  game: GameState,
  aU: UnitState,
  target: UnitState,
  counterDist: number,
): {
  attack?: ForecastNumbers;
  counter?: ForecastNumbers;
  brk: boolean;
  selfHp: number;
  targetHp: number;
  guarded: boolean;
  /** 체인어택 참가자 수(0 = 없음) — 패널이 태그로 띄운다. */
  chain: number;
  /** 그 참가자들이 대상에게 넣는 확정 대미지 합 — 예상 잔여 HP에 이미 반영돼 있다. */
  chainDamage: number;
} {
  // ☠`terrainPatches`(terrainSet 이벤트가 갈아끼운 칸)를 빼면 리듀서(battle.ts)와 지형 보정이 갈린다 —
  //   현행 5챕터에 그 이벤트가 0건이라 대조로도 안 잡히는 잠복 결손이다.
  const a = toCombatant(aU, game.map, game.units, undefined, game.terrainPatches);
  const d = toCombatant(target, game.map, game.units, undefined, game.terrainPatches);
  const counterable =
    target.weapon !== undefined &&
    !target.broken &&
    counterDist >= target.weapon.rangeMin &&
    counterDist <= target.weapon.rangeMax;
  // 체인가드 — 대상이 지켜지면 본공격·추격 대미지는 가드에게 치환된다(판정 = 엔진 chainGuardFor 공용).
  const guarded = chainGuardFor(target, game.units) !== undefined;
  const armed = aU.weapon !== undefined;
  let brk = false;
  // 반격 게이트가 콜백인 이유 = 브레이크가 **첫 오더에서** 서면 그 자리에서 반격 슬롯이 닫히기 때문이다
  // (리듀서도 같은 자리에서 같은 질문을 한다 — 목록이 지연 열거인 근거).
  const plan = battlePlan(calculator, a, d, { counter: () => counterable && !brk });
  // 명중·필살은 그 측 **첫 오더**의 값(인게임 예보 문법) · 대미지는 오더별로 모은다(배율이 오더마다 갈린다).
  const first: [BattleOrder?, BattleOrder?] = [];
  const damages: [number[], number[]] = [[], []];
  let targetHp = target.hp;
  let selfHp = aU.hp;
  let over = false; // 어느 쪽이 쓰러진 뒤 — 표시용 숫자는 계속 줍되 HP는 더 깎지 않는다
  // 체인어택 — 리듀서는 오더 루프 **앞에서** 굴리고(battle.ts), 체인 타격은 체인가드 치환 대상이 아니다
  // (`kind !== "chain"` 게이트). 그래서 guarded여도 이 몫은 그대로 들어간다.
  const chainUnits = armed ? chainAttackers(aU, target, game.units) : [];
  const chainDamage = chainUnits.reduce(
    (sum, backup) =>
      sum +
      chainNumbers(calculator, toCombatant(backup, game.map, game.units, undefined, game.terrainPatches), d).damage,
    0,
  );
  targetHp -= chainDamage;
  if (targetHp <= 0) over = true;
  for (const order of plan.orders) {
    first[order.side] ??= order;
    if (order.side === 0) {
      if (!armed) continue;
      damages[0].push(order.damage);
      // 브레이크 = 확정 대미지 1 이상 + 상성 유리(전탄 명중 가정) — 패널은 brk면 반격 칸을 비운다.
      if (!guarded && order.damage >= 1 && canBreak(aU, target)) brk = true;
      if (over || guarded) continue;
      targetHp -= order.damage;
    } else {
      damages[1].push(order.damage);
      if (over) continue;
      selfHp -= order.damage;
    }
    if (targetHp <= 0 || selfHp <= 0) over = true;
  }
  const numbers = (side: 0 | 1): ForecastNumbers | undefined => {
    const o = first[side];
    return o === undefined ? undefined : (
      { damage: o.damage, hitRate: o.hitRate, critRate: o.critRate, battleTimes: plan.battleTimes[side], damages: damages[side] }
    );
  };
  return {
    attack: armed ? numbers(0) : undefined,
    counter: numbers(1),
    brk,
    selfHp: Math.max(selfHp, 0),
    targetHp: Math.max(targetHp, 0),
    guarded,
    chain: chainUnits.length,
    chainDamage,
  };
}

function ForecastSide({
  unit,
  visual,
  side,
  hpAfter,
  brk = false,
  incoming = false,
  labels,
}: {
  unit: UnitState;
  visual?: UnitVisual;
  side?: ForecastNumbers;
  /** 예상 잔여 HP(전 타격 명중 가정) — 0 = 죽음 X 표기. */
  hpAfter: number;
  /** 이 전투로 브레이크될 예보(피격측 전용). */
  brk?: boolean;
  /** ★이 칸의 대미지가 **자군에게 꽂히는가** — 화살표와 색이 여기서 갈린다(주는 › 파랑 · 받는 ‹ 빨강). */
  incoming?: boolean;
  labels: BoardProps["labels"];
}) {
  const value = (v: number | undefined) => (v === undefined ? "—" : v);
  const max = unit.stats.hp;
  const pct = (v: number) => `${Math.round((Math.max(v, 0) / max) * 100)}%`;
  const dead = hpAfter === 0;
  return (
    <div className="fc-side" style={{ "--force": visual?.ring ?? "#888" } as React.CSSProperties}>
      <strong className="fc-name">
        {visual?.name ?? unit.id}
        {brk && !dead && <em className="fc-brk">{labels.logTags.brk}</em>}
        {dead && (
          <em className="fc-dead" title={labels.logTags.kill} aria-label={labels.logTags.kill}>
            ✗
          </em>
        )}
      </strong>
      <span className="fc-weapon">{unit.weapon?.name ?? "—"}</span>
      <span className="fc-hp">
        HP {unit.hp}
        {hpAfter !== unit.hp && <span className="fc-hp-to"> → {hpAfter}</span>}
        <small>/{max}</small>
      </span>
      <span className="fc-hpbar" aria-hidden="true">
        <i className="keep" style={{ width: pct(hpAfter) }} />
        <i className="lose" style={{ width: pct(unit.hp - hpAfter) }} />
      </span>
      <dl className="fc-rows">
        <dt>{labels.damage}</dt>
        <dd className={incoming ? "fc-dmg in" : "fc-dmg out"}>
          {/* 실기 예보 문법 — 주는 쪽은 ›(파랑), 받는 쪽은 ‹(빨강). 방향을 색과 모양 둘로 말한다. */}
          {side?.damage !== undefined && <em className="fc-dir" aria-hidden="true">{incoming ? "‹" : "›"}</em>}
          {value(side?.damage)}
          {side !== undefined && strikeSuffix(side.damages) !== "" && (
            <em className="fc-x2">{strikeSuffix(side.damages)}</em>
          )}
        </dd>
        <dt>{labels.hit}</dt>
        <dd>{value(side?.hitRate)}</dd>
        <dt>{labels.crit}</dt>
        <dd>{value(side?.critRate)}</dd>
      </dl>
    </div>
  );
}
