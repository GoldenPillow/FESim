import { useEffect, useMemo, useRef, useState } from "react";
import {
  attackRange,
  canterPower,
  forecastSide,
  movementPath,
  movementRange,
  type BattleAction,
  type BattleEvent,
  type Combatant,
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
const toCombatant = (u: UnitState, game: GameState): Combatant => ({
  stats: { ...u.stats, maxHp: u.stats.hp, hp: u.hp },
  weapon: u.weapon,
  terrain: {
    avoid: game.map.terrain?.[u.y]?.[u.x]?.avoid ?? 0,
    def: game.map.terrain?.[u.y]?.[u.x]?.def ?? 0,
  },
  skills: u.skills,
});

export default function BoardIsland(props: BoardProps) {
  const { width, height, tiles, objects, labels } = props;
  const [store] = useState(() => createBoardStore(props));
  const game = useBoard(store, displayState);
  const difficulty = useBoard(store, (s) => s.difficulty);
  const scenario = useBoard(store, (s) => s.scenario);
  const mode = useBoard(store, (s) => s.mode);
  const visuals = useBoard(store, (s) => s.visuals);
  const [ready, setReady] = useState(false);
  const urlWritten = useRef(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [targetId, setTargetId] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<Tile | undefined>(undefined);
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

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

  const alive = useMemo(() => game.units.filter((u) => !u.dead), [game]);
  const byTile = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of alive) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [alive]);
  const selected = selectedId === undefined ? undefined : alive.find((u) => u.id === selectedId);
  const target = targetId === undefined ? undefined : alive.find((u) => u.id === targetId);

  const range = useMemo(() => {
    if (selected === undefined) return undefined;
    // 이동 예산 = 엔진과 동일 규칙: 행동 전 = 이동력 1회(이동 후엔 0 — 제자리 공격만) ·
    // 행동 후 = 재이동(시구르드) Power 1회, 없으면 범위 없음.
    let budget: number;
    if (!selected.acted) budget = selected.moved === true ? 0 : selected.movePoints;
    else if (selected.moved !== true && canterPower(selected) !== undefined) budget = canterPower(selected)!;
    else return undefined;
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
    const rangeMax = selected.acted ? 0 : selected.weapon?.rangeMax ?? 0; // 재이동 창엔 공격 없음
    const ring = rangeMax > 0 ? attackRange(move, selected.weapon!.rangeMin, rangeMax, width, height) : [];
    const attackAll = new Set(ring.map((t) => tileKey(t.x, t.y)));
    const attack = ring.filter((t) => !moveSet.has(tileKey(t.x, t.y)));
    return { query, move, moveSet, attack, attackAll };
  }, [selected, byTile, game, width, height]);

  const path = useMemo(() => {
    if (range === undefined || hover === undefined || selected === undefined) return undefined;
    if (!range.moveSet.has(tileKey(hover.x, hover.y))) return undefined;
    if (byTile.has(tileKey(hover.x, hover.y))) return undefined;
    const tiles = movementPath(range.query, hover);
    return tiles !== null && tiles.length > 1 ? tiles : undefined;
  }, [range, hover, byTile, selected]);

  const distance =
    selected !== undefined && target !== undefined
      ? Math.abs(selected.x - target.x) + Math.abs(selected.y - target.y)
      : undefined;
  const canAttack =
    selected !== undefined &&
    target !== undefined &&
    !selected.acted &&
    selected.weapon !== undefined &&
    distance !== undefined &&
    distance >= selected.weapon.rangeMin &&
    distance <= selected.weapon.rangeMax;

  const forecast = useMemo(() => {
    if (selected === undefined || target === undefined) return undefined;
    const a = toCombatant(selected, game);
    const d = toCombatant(target, game);
    const dist = Math.abs(selected.x - target.x) + Math.abs(selected.y - target.y);
    const engageDist = canAttack ? dist : selected.weapon?.rangeMax ?? 1;
    const counter =
      target.weapon !== undefined &&
      !target.broken &&
      engageDist >= target.weapon.rangeMin &&
      engageDist <= target.weapon.rangeMax;
    return {
      attack: selected.weapon !== undefined ? forecastSide(calculator, a, d) : undefined,
      counter: counter ? forecastSide(calculator, d, a) : undefined,
    };
  }, [selected, target, game, canAttack]);

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
          case "phase":
          case "outcome":
            return "";
        }
      })
      .filter((s) => s !== "");
  };

  const dispatch = (action: BattleAction): GameState => {
    const next = store.getState().dispatch(action);
    if (next === game) return game;
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

  const onTileClick = (x: number, y: number) => {
    if (game.outcome !== undefined) return;
    const key = tileKey(x, y);
    const clicked = byTile.get(key);

    if (clicked !== undefined) {
      if (selected !== undefined && clicked.force !== selected.force && range?.attackAll.has(key) === true) {
        if (clicked.id === targetId && canAttack) {
          const next = dispatch({ type: "attack", unit: selected.id, target: clicked.id });
          if (next !== game) {
            // 재이동(시구르드) 보유면 선택을 유지해 행동 후 이동 창을 이어준다.
            if (canterPower(selected) === undefined) setSelectedId(undefined);
            setTargetId(undefined);
          }
          return;
        }
        setTargetId(clicked.id);
        return;
      }
      if (clicked.id === selectedId) {
        // 자기 자신 재클릭 = 대기 (인게임 문법 근사)
        if (!clicked.acted && clicked.force === game.phase) {
          dispatch({ type: "wait", unit: clicked.id });
          if (canterPower(clicked) === undefined) setSelectedId(undefined);
          setTargetId(undefined);
          return;
        }
      }
      // 행동 완료 유닛도 재이동 창이 남아 있으면 선택 가능(범위 계산이 예산을 판정).
      const canterReady = clicked.acted && clicked.moved !== true && canterPower(clicked) !== undefined;
      setSelectedId(clicked.force === game.phase && (!clicked.acted || canterReady) ? clicked.id : undefined);
      setTargetId(undefined);
      return;
    }

    if (selected !== undefined && range?.moveSet.has(key) === true) {
      const next = dispatch({ type: "move", unit: selected.id, x, y });
      // 재이동 이동을 마치면 이 활성화는 끝 — 선택 해제로 마무리.
      if (selected.acted && next !== game) setSelectedId(undefined);
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
            store.getState().reset();
            clearLocal();
          }}
        >
          {labels.reset}
        </button>
        <button type="button" onClick={copyRecord}>
          {copied ? labels.copied : labels.copyRecord}
        </button>
      </div>

      <BoardView
        width={width}
        height={height}
        tiles={tiles}
        objects={objects}
        units={alive}
        byTile={byTile}
        visuals={visuals}
        range={range}
        path={path}
        selectedId={selectedId}
        targetId={targetId}
        banner={banner}
        bannerStay={game.outcome !== undefined}
        onTileClick={onTileClick}
        onTileHover={setHover}
      />

      {log.length > 0 && (
        <div className="battle-log" role="status">
          {log.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      )}

      {forecast !== undefined && selected !== undefined && target !== undefined && (
        <div className="forecast" role="status" aria-label={labels.forecast}>
          <ForecastSide unit={selected} visual={visuals.get(selected.id)} side={forecast.attack} labels={labels} />
          <div className="fc-mid">
            <span className="fc-vs" aria-hidden="true">⚔</span>
            {canAttack && (
              <button
                type="button"
                className="fc-go"
                onClick={() => {
                  const next = dispatch({ type: "attack", unit: selected.id, target: target.id });
                  if (next !== game) {
                    setSelectedId(undefined);
                    setTargetId(undefined);
                  }
                }}
              >
                {labels.attackCmd}
              </button>
            )}
          </div>
          <ForecastSide unit={target} visual={visuals.get(target.id)} side={forecast.counter} labels={labels} />
          <small className="fc-note">{canAttack ? "" : labels.currentPosNote}</small>
        </div>
      )}
    </figure>
  );
}

function ForecastSide({
  unit,
  visual,
  side,
  labels,
}: {
  unit: UnitState;
  visual?: UnitVisual;
  side?: SideForecast;
  labels: BoardProps["labels"];
}) {
  const value = (v: number | undefined) => (v === undefined ? "—" : v);
  return (
    <div className="fc-side" style={{ "--force": visual?.ring ?? "#888" } as React.CSSProperties}>
      <strong className="fc-name">{visual?.name ?? unit.id}</strong>
      <span className="fc-weapon">{unit.weapon?.name ?? "—"}</span>
      <span className="fc-hp">
        HP {unit.hp}/{unit.stats.hp}
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
