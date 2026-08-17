import { useEffect, useMemo, useRef, useState } from "react";
import {
  attackRange,
  canBreak,
  canterPower,
  forecastSide,
  itemTargets,
  moveBudget,
  movementPath,
  movementRange,
  staffHealAmount,
  toCombatant,
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
import { calculator, createBoardStore, displayState, useBoard, type UnitVisual } from "../lib/boardStore";
import { readMapQuery, writeMapQuery } from "../lib/replayQuery";
import BoardView from "./BoardView";
import "./board.css";

/**
 * 보드 아일랜드 — 인터랙션 셸: 선택·호버·명령 배선만 하고 국면은 스토어(boardStore)가 소유한다.
 * 그림은 BoardView, 룰은 엔진. 국면(시나리오) 라디오는 무JS 폴백으로 남기고 정본은 스토어다.
 */
export default function BoardIsland(props: BoardProps) {
  const { width, height, tiles, objects, labels } = props;
  const [store] = useState(() => createBoardStore(props));
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
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input.phase-input"));
    const query = readMapQuery(window.location.search);
    const fromUrl = inputs.find((i) => i.id === `phase-${query.p}`);
    if (fromUrl !== undefined) fromUrl.checked = true;
    const checked = () => inputs.find((i) => i.checked)?.id.replace(/^phase-/, "");
    if (query.d !== undefined) store.getState().setDifficulty(query.d);
    store.getState().setScenario(checked());
    store.getState().restore();
    setReady(true);
    const sync = () => {
      store.getState().setScenario(checked());
      store.getState().restore();
      clearLocal();
    };
    for (const input of inputs) input.addEventListener("change", sync);
    return () => {
      for (const input of inputs) input.removeEventListener("change", sync);
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
  const weapons: BattleWeapon[] = useMemo(
    () => selected?.weapons ?? (selected?.weapon !== undefined ? [selected.weapon] : []),
    [selected],
  );
  const equippedIdx = Math.max(0, weapons.findIndex((w) => w === selected?.weapon));
  const weaponIdx = weaponPick ?? equippedIdx;
  const chosenWeapon = weapons[weaponIdx] ?? selected?.weapon;
  const activeWeapon = weapons[weaponHover ?? weaponIdx] ?? chosenWeapon;

  // 지팡이(회복) — v1: 첫 사용 가능 지팡이가 활성. 복수 지팡이 선택 UI는 커맨드 전수(MP1) 몫.
  const staffIdx = useMemo(() => {
    const i = (selected?.staves ?? []).findIndex((s) => s.rodType === 2 && s.uses > 0);
    return i >= 0 ? i : undefined;
  }, [selected]);
  const staff = staffIdx === undefined ? undefined : selected?.staves?.[staffIdx];

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
    // 이동 예산의 정본은 엔진 moveBudget — UI 중복 구현 금지(C4 표류 방지, verification.md §2-3).
    const budget = moveBudget(selected);
    if (budget === undefined) return undefined;
    const grid = game.map.costs[selected.moveType];
    if (grid === undefined) return undefined;
    const query: MoveQuery = {
      width,
      height,
      movePoints: budget,
      start: { x: selected.x, y: selected.y },
      costAt: (x, y) => grid[y]?.[x] ?? 255,
      blocked: (x, y) => {
        const o = byTile.get(tileKey(x, y));
        return o !== undefined && o.force !== selected.force;
      },
      occupied: (x, y) => {
        const o = byTile.get(tileKey(x, y));
        return o !== undefined && o.force === selected.force && o !== selected;
      },
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
  }, [selected, byTile, game, width, height, pending, chosenWeapon, staff]);

  // 호버 예보(인게임 문법): 사거리 안 적에 커서만 올려도 공격 발판이 정해지고 즉시 예보가 뜬다.
  // 발판 우선순위 = 유저가 그린 마지막 경로 끝점 → 제자리 → 최소 이동비용 지점.
  const hoverEnemy = useMemo(() => {
    if (selected === undefined || selected.acted || hover === undefined || target !== undefined) return undefined;
    const u = byTileView.get(tileKey(hover.x, hover.y));
    if (u === undefined || u.force === selected.force) return undefined;
    if (range?.attackAll.has(tileKey(hover.x, hover.y)) === true) return u;
    // 편의(인게임과 다름): 원거리(사거리 2+)는 잠정 이동 후 사거리 밖 적 호버에도 근사 예보를 띄운다.
    return pending !== undefined && (chosenWeapon?.rangeMax ?? 0) >= 2 ? u : undefined;
  }, [selected, hover, byTileView, range, target, pending, chosenWeapon]);

  // 아군 호버 회복 예보 — 손상된 아군에 커서만 올려도 발판이 정해지고 회복 예보가 뜬다(교전 문법과 동일).
  const hoverAlly = useMemo(() => {
    if (selected === undefined || selected.acted || hover === undefined || target !== undefined || staff === undefined)
      return undefined;
    const u = byTileView.get(tileKey(hover.x, hover.y));
    if (u === undefined || u.force !== selected.force || u.id === selected.id) return undefined;
    if (u.hp >= u.stats.hp) return undefined;
    return range?.staffAll.has(tileKey(hover.x, hover.y)) === true ? u : undefined;
  }, [selected, hover, byTileView, range, target, staff]);

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
    const tgt = allyTarget ?? hoverAlly;
    if (selected === undefined || staff === undefined || tgt === undefined) return undefined;
    return foothold(tgt, staff.rangeMin, staff.rangeMax, allyTarget !== undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, allyTarget, hoverAlly, pending, range, byTile, staff]);

  const path = useMemo(() => {
    if (range === undefined || hover === undefined || selected === undefined || pending !== undefined) return undefined;
    // 적(교전)·아군(지팡이) 호버 중엔 발판까지의 경로를 유지한다(경로가 사라지지 않는 인게임 문법).
    const goal = hoverEnemy !== undefined ? engageAt : hoverAlly !== undefined ? staffAt : hover;
    if (goal === undefined || !range.moveSet.has(tileKey(goal.x, goal.y))) return undefined;
    if (byTile.has(tileKey(goal.x, goal.y))) return undefined;
    const tiles = movementPath(range.query, goal);
    return tiles !== null && tiles.length > 1 ? tiles : undefined;
  }, [range, hover, byTile, selected, pending, hoverEnemy, engageAt, hoverAlly, staffAt]);

  // 일반 이동 호버의 경로 끝점을 기억 — 적·아군 호버로 넘어갈 때 이 지점이 발판이 된다.
  useEffect(() => {
    if (path !== undefined && hoverEnemy === undefined && hoverAlly === undefined)
      lastPathEnd.current = path[path.length - 1];
  }, [path, hoverEnemy, hoverAlly]);

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
    if (selected === undefined || staff === undefined || staffIdx === undefined) return undefined;
    const tgt = allyTarget ?? hoverAlly;
    const at = (allyTarget !== undefined ? selectedAt : staffAt) ?? selectedAt;
    if (tgt === undefined || at === undefined) return undefined;
    const dist = Math.abs(at.x - tgt.x) + Math.abs(at.y - tgt.y);
    const inRange = !selected.acted && dist >= staff.rangeMin && dist <= staff.rangeMax;
    const amount = staffHealAmount(selected, tgt, staff);
    return { target: tgt, amount, hpAfter: Math.min(tgt.hp + amount, tgt.stats.hp), inRange };
  }, [selected, staff, staffIdx, allyTarget, hoverAlly, staffAt, selectedAt]);

  const forecast = useMemo(() => {
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
    // 예상 잔여 HP — 전 타격 명중 가정(인게임 예보 문법), 엔진 타격 순서 그대로:
    // 본공격 → (생존·미브레이크 시) 반격 → 추격 → 반격측 추격. 브레이크면 반격 몰수. 체인어택 제외.
    const brk = attack !== undefined && attack.damage >= 1 && canBreak(aU, fcTarget);
    let targetHp = fcTarget.hp;
    let selfHp = selected.hp;
    const counters = counter !== undefined && !brk;
    if (attack !== undefined) targetHp -= attack.damage;
    if (counters && targetHp > 0) selfHp -= counter.damage;
    if (attack?.followUp === true && targetHp > 0) targetHp -= attack.damage;
    if (counters && counter.followUp && targetHp > 0 && selfHp > 0) selfHp -= counter.damage;
    targetHp = Math.max(targetHp, 0);
    selfHp = Math.max(selfHp, 0);
    return { attack, counter, inRange, brk, selfHp, targetHp };
  }, [selected, fcAt, fcTarget, game, activeWeapon]);

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
          case "breakRelease":
          case "phase":
          case "outcome":
            return "";
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
      if (selected !== undefined && clicked.force !== selected.force && range?.attackAll.has(key) === true) {
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
      // 지팡이 대상(손상 아군) — 교전과 같은 문법: 첫 클릭 = 대상 확정+발판, 재클릭 = 회복 커밋.
      if (
        selected !== undefined &&
        !selected.acted &&
        staffIdx !== undefined &&
        clicked.force === selected.force &&
        clicked.id !== selected.id &&
        clicked.hp < clicked.stats.hp &&
        range?.staffAll.has(key) === true
      ) {
        if (clicked.id === targetId && healFc?.inRange === true) {
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
        objects={objects}
        units={viewUnits}
        byTile={byTileView}
        visuals={visuals}
        range={range}
        path={path}
        selectedId={editing ? editSel : selectedId}
        targetId={targetId}
        banner={banner}
        bannerStay={game.outcome !== undefined}
        onTileClick={onTileClick}
        onTileHover={setHover}
      />

      {!editing && itemButtons.length > 0 && mode !== "replay" && (
        <div className="edit-bar cmd-bar" role="toolbar" aria-label={labels.itemCmd}>
          <span className="edit-hint">{labels.itemCmd}</span>
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
          <small className="fc-note">{forecast.inRange ? "" : labels.currentPosNote}</small>
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
