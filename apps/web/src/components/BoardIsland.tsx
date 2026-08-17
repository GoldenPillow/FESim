import { useEffect, useMemo, useRef, useState } from "react";
import {
  attackRange,
  BAD_STATE,
  canBreak,
  canChainGuard,
  canDance,
  canterPower,
  chainGuardFor,
  destroyTargets,
  hasChainGuardSkill,
  effectiveWeapons,
  forecastSide,
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
  warpDestinations,
  type BattleAction,
  type BattleEvent,
  type BattleWeapon,
  type GameState,
  type MoveQuery,
  type SideForecast,
  type Tile,
  type UnitState,
} from "@fesim/engine";
import { serializeEphemeris } from "@fesim/shared";
import { tileKey } from "../lib/grid";
import type { BoardProps, Difficulty } from "../lib/fe17";
import { scriptPath, visibleObjects, visibleStructures } from "../lib/boards";
import type { EventHost } from "@fesim/engine/events";
import {
  baseReduce,
  calculator,
  createBoardStore,
  displayState,
  projectUnit,
  useBoard,
  type BoardStore,
  type EventWiring,
  type UnitVisual,
} from "../lib/boardStore";
import { readMapQuery, writeMapQuery } from "../lib/replayQuery";
import BoardView from "./BoardView";
import "./board.css";

/**
 * 보드 아일랜드 — 인터랙션 셸: 선택·호버·명령 배선만 하고 국면은 스토어(boardStore)가 소유한다.
 * 그림은 BoardView, 룰은 엔진. 이벤트 챕터(script 팩)는 여기서 세션을 만들어 스토어에 주입한다 —
 * ☠fengari가 이 아일랜드 청크에만 실린다(제작 경로 — 열람 /s/는 절대 이벤트 복원).
 */

/**
 * 이벤트 배선 — 새 판마다 새 세션(Startup 재등록 중복 방지). 호스트 = props 사영(원천 테이블 무반입).
 * ☠이벤트 모듈은 동적 임포트로만 — fengari(-web interop)가 임포트 시점에 Function()을 실행해
 * SSR(CF 워커 러너 = 코드 생성 금지)이 죽는다. 클라이언트 하이드레이션 후에만 로드한다.
 */
type EventsModule = typeof import("@fesim/engine/events");

function eventWiringFor(
  props: BoardProps,
  mod: EventsModule,
  commonSources?: Record<string, string>,
): EventWiring | undefined {
  const script = props.script;
  if (script === undefined) return undefined;
  const sources = { ...commonSources, ...script.sources };
  return {
    create(difficulty) {
      const host: EventHost = {
        spawnGroup: (group, state) =>
          props.units.flatMap((u, i) => {
            if (u.group !== group) return [];
            // ☠id 계약(u{i} = visuals 조회 키)상 같은 그룹 재스폰은 미재현 — 원기는 중복 허용(장부 events.dispos).
            if (state.units.some((placed) => placed.id === `u${i}`)) return [];
            const unit = projectUnit(props, i, difficulty);
            return unit === undefined ? [] : [unit];
          }),
        skillRow: (sid) => script.skills[sid],
        godUnit: (_unit, gid) => {
          const god = script.gods[gid];
          if (god === undefined) return undefined;
          // 기술(engageArt)·인게이지 스킬 세트는 미배선(발현 시 흡수) — 게이지·엠블렘 무기까지 사영.
          return { engage: { ...god.engage }, ...(god.engageWeapons !== undefined ? { engageWeapons: god.engageWeapons } : {}) };
        },
      };
      const session = mod.createEventSession({ sources, chapter: script.chapter, host });
      return mod.createEventedReducer(baseReduce, session);
    },
  };
}
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
  const [ready, setReady] = useState(false);
  const urlWritten = useRef(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [targetId, setTargetId] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<Tile | undefined>(undefined);
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

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

  const clearLocal = () => {
    setSelectedId(undefined);
    setTargetId(undefined);
    setLog([]);
    setBanner(undefined);
  };

  useEffect(() => {
    // 국면 프리셋 폐지(MP2) — 국면 전이는 이벤트 엔진이 소유한다. URL의 d(난이도)만 읽는다.
    const boot = (target: BoardStore) => {
      const query = readMapQuery(window.location.search);
      if (query.d !== undefined) target.getState().setDifficulty(query.d);
      target.getState().restore();
      setReady(true);
    };
    if (props.script === undefined) {
      boot(store);
      return;
    }
    let dead = false;
    // 공용 Lua(common*)는 보드 JSON에 인라인하지 않는다 — 이벤트 모듈과 병렬 fetch 후 세션에 병합(3-6).
    const commonFetches = (props.script.commons ?? []).map(async (name) => {
      const res = await fetch(scriptPath(name));
      if (!res.ok) throw new Error(`공용 스크립트 로드 실패: ${name} (${res.status})`);
      return [name, await res.text()] as const;
    });
    void Promise.all([import("@fesim/engine/events"), Promise.all(commonFetches)])
      .then(([mod, pairs]) => {
        if (dead) return;
        const commons = Object.fromEntries(pairs);
        const next = createBoardStore(props, undefined, undefined, eventWiringFor(props, mod, commons));
        setStore(next);
        boot(next);
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

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1300);
    return () => clearTimeout(t);
  }, [copied]);

  // 전투 취소 — 보드·예보(플레이트) 바깥 클릭 = 교전 해제(인게임 B버튼 문법).
  useEffect(() => {
    if (targetId === undefined) return;
    const cancel = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || e.target.closest(".plate") === null) setTargetId(undefined);
    };
    document.addEventListener("pointerdown", cancel);
    return () => document.removeEventListener("pointerdown", cancel);
  }, [targetId]);

  const alive = useMemo(() => game.units.filter((u) => !u.dead), [game]);
  const byTile = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of alive) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [alive]);
  const selected = selectedId === undefined ? undefined : alive.find((u) => u.id === selectedId);
  const target = targetId === undefined ? undefined : alive.find((u) => u.id === targetId);
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
    const a = toCombatant(aU, game.map, game.units);
    const d = toCombatant(fcTarget, game.map, game.units);
    const dist = Math.abs(fcAt.x - fcTarget.x) + Math.abs(fcAt.y - fcTarget.y);
    const inRange =
      !selected.acted &&
      activeWeapon !== undefined &&
      dist >= activeWeapon.rangeMin &&
      dist <= activeWeapon.rangeMax;
    const engageDist = inRange ? dist : activeWeapon?.rangeMax ?? 1;
    const counterable =
      fcTarget.weapon !== undefined &&
      !fcTarget.broken &&
      engageDist >= fcTarget.weapon.rangeMin &&
      engageDist <= fcTarget.weapon.rangeMax;
    const attack = activeWeapon !== undefined ? forecastSide(calculator, a, d) : undefined;
    const counter = counterable ? forecastSide(calculator, d, a) : undefined;
    // 체인가드 — 대상이 지켜지면 본공격·추격 대미지는 가드에게 치환된다(판정 = 엔진 chainGuardFor 공용).
    const guarded = chainGuardFor(fcTarget, game.units) !== undefined;
    // 예상 잔여 HP — 전 타격 명중 가정(인게임 예보 문법), 엔진 타격 순서 그대로:
    // 본공격 → (생존·미브레이크 시) 반격 → 추격 → 반격측 추격. 브레이크면 반격 몰수. 체인어택 제외.
    const brk = attack !== undefined && attack.damage >= 1 && !guarded && canBreak(aU, fcTarget);
    let targetHp = fcTarget.hp;
    let selfHp = selected.hp;
    const counters = counter !== undefined && !brk;
    if (attack !== undefined && !guarded) targetHp -= attack.damage;
    if (counters && targetHp > 0) selfHp -= counter.damage;
    if (attack?.followUp === true && !guarded && targetHp > 0) targetHp -= attack.damage;
    if (counters && counter.followUp && targetHp > 0 && selfHp > 0) selfHp -= counter.damage;
    targetHp = Math.max(targetHp, 0);
    selfHp = Math.max(selfHp, 0);
    return { attack, counter, inRange, brk, selfHp, targetHp, guarded };
  }, [selected, fcAt, fcTarget, game, activeWeapon, staffMode]);

  const describe = (events: BattleEvent[]): string[] => {
    const t = labels.logTags;
    return events
      .map((ev) => {
        const name = (id: string) => visuals.get(id)?.name ?? id;
        switch (ev.type) {
          case "strike": {
            const tag =
              ev.kind === "chain" ? ` (${t.chain})`
              : ev.kind === "counter" ? ` (${t.counter})`
              : ev.kind === "followUp" || ev.kind === "counterFollowUp" ? ` (${t.follow})`
              : "";
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
          case "reset":
          case "unitFlags":
            return ""; // 이벤트 내부 상태 — 로그 소음(연출 no-op 결정과 동급)
        }
      })
      .filter((s) => s !== "");
  };

  const dispatch = (action: BattleAction): GameState => {
    // 한 클릭에 move+행동이 연달아 커밋되므로 비교 기준은 렌더 시점 game이 아니라 스토어 최신이어야 한다.
    const prev = store.getState().game;
    const next = store.getState().dispatch(action);
    if (next === prev) return prev;
    const lines = describe(next.events);
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

  /** 공격 액션 — 무기 목록이 있으면 선택 인덱스를 기보에 싣는다(장비 전환 포함 재현 계약). */
  const attackAction = (unit: string, target: string): BattleAction =>
    weapons.length > 0 ? { type: "attack", unit, target, weapon: weaponIdx } : { type: "attack", unit, target };

  /** 잠정 이동 확정 — 행동 직전에만 호출된다. 이동 없음/제자리 = 성공으로 친다. */
  const commitMove = (): boolean => {
    if (selected === undefined || pending === undefined) return true;
    if (pending.x === selected.x && pending.y === selected.y) return true;
    return tryDispatch({ type: "move", unit: selected.id, x: pending.x, y: pending.y });
  };

  const onTileClick = (x: number, y: number) => {
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
      if (clicked.id === selectedId) {
        // 자기 자신 재클릭 = 대기 (인게임 문법 근사) — 잠정 이동이 있으면 함께 확정된다.
        if (!clicked.acted && clicked.force === game.phase) {
          if (commitMove()) {
            tryDispatch({ type: "wait", unit: clicked.id });
            if (canterPower(clicked) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
      }
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

  const copyRecord = () => {
    const file = store.getState().toFile({ created: new Date().toISOString() });
    void navigator.clipboard
      .writeText(serializeEphemeris(file))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <figure
      className="plate"
      style={{ "--cols": width, "--rows": height } as React.CSSProperties}
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

      <div className="turn-strip">
        <span className="turn-label">
          {labels.turnWord} {game.turn} · {labels.forceNames[game.phase] ?? ""} {labels.turnPhase}
        </span>
        <button
          type="button"
          onClick={() => dispatch({ type: "endPhase" })}
          disabled={game.outcome !== undefined || mode === "replay"}
        >
          {labels.endPhase}
        </button>
        <button
          type="button"
          onClick={() => {
            store.getState().undo();
            clearLocal();
          }}
          disabled={recorded === 0 || mode === "replay"}
        >
          {labels.undoCmd}
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
        objects={visibleObjects(objects, game.crests)}
        structures={visibleStructures(props.structures, game.structures)}
        overlays={props.overlays}
        interactions={props.interactions}
        units={viewUnits}
        byTile={byTileView}
        visuals={visuals}
        range={boardRange}
        path={path}
        selectedId={editing ? editSel : selectedId}
        targetId={targetId}
        banner={banner}
        bannerStay={game.outcome !== undefined}
        onTileClick={onTileClick}
        onTileHover={setHover}
      />

      {!editing && mode !== "replay" && selected !== undefined && (itemButtons.length > 0 || selected.engage !== undefined || tradePartners.length > 0 || usableStaves.some(({ s }) => s.rodType !== 2) || hasChainGuardSkill(selected)) && (
        <div className="edit-bar cmd-bar" role="toolbar" aria-label={labels.itemCmd}>
          {selected.engage !== undefined && (
            <span className="edit-hint">
              ⚡{" "}
              {selected.engage.engaging
                ? `${labels.engageCmd} ${selected.engage.turnLimit - selected.engage.turn}`
                : `${selected.engage.count}/${selected.engage.limit}`}
            </span>
          )}
          {selected.engage !== undefined &&
            !selected.engage.engaging &&
            !selected.acted &&
            selected.traded !== true && // 교환 후 인게이지 발동 불가(실기 판별) — 엔진과 동일 게이트
            selected.engage.limit > 0 &&
            selected.engage.count >= selected.engage.limit && (
              <button type="button" onClick={() => void tryDispatch({ type: "engage", unit: selected.id })}>
                {labels.engageCmd}
              </button>
            )}
          {/* 체인가드 지정 — 만HP 미달이면 비활성(인게임 GuardType.NotEnoughHP 문법). */}
          {hasChainGuardSkill(selected) && !selected.acted && selected.force === game.phase && (
            <button
              type="button"
              className={selected.guarding === true ? "on" : undefined}
              disabled={selected.guarding === true || !canChainGuard(selected)}
              onClick={() => {
                if (commitMove() && tryDispatch({ type: "guard", unit: selected.id })) {
                  if (canterPower(selected) === undefined) setSelectedId(undefined);
                  setTargetId(undefined);
                }
              }}
            >
              {labels.guardCmd}
            </button>
          )}
          {/* 파괴 — 인접 파괴 가능물(Destroyer 자격) 존재 시. 열거 = 엔진 destroyTargets 단일 정본(C4). */}
          {!selected.acted && selected.force === game.phase && breakables.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const t = breakables[0];
                if (commitMove() && tryDispatch({ type: "destroy", unit: selected.id, x: t.x, y: t.y })) {
                  if (canterPower(selected) === undefined) setSelectedId(undefined);
                  setTargetId(undefined);
                }
              }}
            >
              {labels.destroyCmd}
            </button>
          )}
          {/* 지팡이 선택 버튼 — 방해·워프 보유 시에만(기본 회복 문법은 버튼 없이 그대로). 재클릭 = 해제. */}
          {usableStaves.some(({ s }) => s.rodType !== 2) &&
            !selected.acted &&
            selected.force === game.phase &&
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
          {staffMode === "warp" && allyTarget !== undefined && <span className="edit-hint">{labels.warpPick}</span>}
          {itemButtons.map(({ c, i }) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (selected !== undefined && commitMove() && tryDispatch({ type: "item", unit: selected.id, item: i })) {
                  if (canterPower(selected) === undefined) setSelectedId(undefined);
                  setTargetId(undefined);
                }
              }}
            >
              {c.name ?? labels.itemCmd} +{c.power} ({c.uses})
            </button>
          ))}
          {tradePartners.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                // 교환은 확정 위치 기준 — 잠정 이동을 먼저 커밋한다(인게임: 이동 후 교환, 이후 재이동 불가).
                if (commitMove()) setTradeWith(p.id);
              }}
            >
              {labels.tradeCmd}: {visuals.get(p.id)?.name ?? p.id}
            </button>
          ))}
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
            labels={labels}
          />
          <small className="fc-note">
            {[forecast.guarded ? labels.logTags.guard : "", forecast.inRange ? "" : labels.currentPosNote]
              .filter(Boolean)
              .join(" · ")}
          </small>
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

function ForecastSide({
  unit,
  visual,
  side,
  hpAfter,
  brk = false,
  labels,
}: {
  unit: UnitState;
  visual?: UnitVisual;
  side?: SideForecast;
  /** 예상 잔여 HP(전 타격 명중 가정) — 0 = 죽음 X 표기. */
  hpAfter: number;
  /** 이 전투로 브레이크될 예보(피격측 전용). */
  brk?: boolean;
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
        <dd>
          {value(side?.damage)}
          {side?.followUp === true && <em className="fc-x2">×2</em>}
        </dd>
        <dt>{labels.hit}</dt>
        <dd>{value(side?.hitRate)}</dd>
        <dt>{labels.crit}</dt>
        <dd>{value(side?.critRate)}</dd>
      </dl>
    </div>
  );
}
