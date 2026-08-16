import { useEffect, useMemo, useState } from "react";
import {
  attackRange,
  combatEnv,
  createCalculator,
  createReducer,
  forecastSide,
  movementPath,
  movementRange,
  type BattleEvent,
  type Combatant,
  type GameState,
  type MoveQuery,
  type RandomSource,
  type SideForecast,
  type Tile,
  type UnitState,
} from "@fesim/engine";
import type { CalculatorData } from "@fesim/shared";
import calculatorRaw from "../../../../data/fe17/tables/calculator.json?raw";
import { gridCol, gridRow } from "../lib/grid";
import type { BoardProps, BoardUnitProp, Difficulty } from "../lib/fe17";
import "./board.css";

/**
 * 보드 아일랜드 — M2: 인게임 재현 인터랙션의 hydrate 경계.
 * 상태의 정본은 엔진 GameState이고 여기는 (행동 선택 → reduce 호출 → 이벤트 표시)만 한다.
 * 난수 = 실굴림 주입(샌드박스 문법). 국면(시나리오) 선택은 페이지 CSS 라디오가 소유.
 */
const calculator = createCalculator(JSON.parse(calculatorRaw) as CalculatorData);
const reduce = createReducer(calculator);
const liveRng: RandomSource = { roll: () => Math.floor(Math.random() * 100) };

const tileKey = (x: number, y: number) => `${x},${y}`;

function useScenario(): string | undefined {
  const [scenario, setScenario] = useState<string | undefined>(undefined);
  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input.phase-input"));
    if (inputs.length === 0) return;
    const sync = () =>
      setScenario(inputs.find((i) => i.checked)?.id.replace(/^phase-/, "") ?? undefined);
    sync();
    for (const input of inputs) input.addEventListener("change", sync);
    return () => {
      for (const input of inputs) input.removeEventListener("change", sync);
    };
  }, []);
  return scenario;
}

interface UnitVisual {
  icon?: string;
  abbr: string;
  name: string;
  job: string;
  ring: string;
  chip: string;
  phase?: string;
}

function initGame(props: BoardProps, difficulty: Difficulty, scenario: string | undefined): {
  game: GameState;
  visuals: Map<string, UnitVisual>;
} {
  const visuals = new Map<string, UnitVisual>();
  const units: UnitState[] = [];
  props.units.forEach((u, i) => {
    if (u.phase !== undefined && scenario !== undefined && u.phase !== scenario) return;
    const stats = u.stats?.[difficulty];
    if (stats === undefined) return;
    const id = `u${i}`;
    visuals.set(id, {
      icon: u.icon, abbr: u.abbr, name: u.name, job: u.job, ring: u.ring, chip: u.chip, phase: u.phase,
    });
    units.push({
      id,
      name: u.name,
      force: u.force,
      x: u.x,
      y: u.y,
      hp: stats.hp,
      stats,
      weapon: u.weapon,
      skills: u.skills,
      growth: u.growth,
      level: u.levels[difficulty],
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
  const scenario = useScenario();
  const [difficulty, setDifficulty] = useState<Difficulty>("l");
  const [resetCount, setResetCount] = useState(0);
  const [init, setInit] = useState(() => initGame(props, "l", undefined));
  const [game, setGame] = useState<GameState>(init.game);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [targetId, setTargetId] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<Tile | undefined>(undefined);
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const next = initGame(props, difficulty, scenario);
    setInit(next);
    setGame(next.game);
    setSelectedId(undefined);
    setTargetId(undefined);
    setLog([]);
    setBanner(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, scenario, resetCount]);

  useEffect(() => {
    if (banner === undefined || game.outcome !== undefined) return;
    const t = setTimeout(() => setBanner(undefined), 1300);
    return () => clearTimeout(t);
  }, [banner, game.outcome]);

  const visuals = init.visuals;
  const alive = useMemo(() => game.units.filter((u) => !u.dead), [game]);
  const byTile = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of alive) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [alive]);
  const selected = selectedId === undefined ? undefined : alive.find((u) => u.id === selectedId);
  const target = targetId === undefined ? undefined : alive.find((u) => u.id === targetId);

  const range = useMemo(() => {
    if (selected === undefined || selected.acted) return undefined;
    const grid = game.map.costs[selected.moveType];
    if (grid === undefined) return undefined;
    const query: MoveQuery = {
      width,
      height,
      movePoints: selected.movePoints,
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
    const rangeMax = selected.weapon?.rangeMax ?? 0;
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

  const dispatch = (action: Parameters<typeof reduce>[1]) => {
    try {
      const next = reduce(game, action, liveRng);
      setGame(next);
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
    } catch {
      return game; // 불법 행동 = 무시 (엔진이 심판)
    }
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
            setSelectedId(undefined);
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
          setSelectedId(undefined);
          setTargetId(undefined);
          return;
        }
      }
      setSelectedId(clicked.force === game.phase && !clicked.acted ? clicked.id : undefined);
      setTargetId(undefined);
      return;
    }

    if (selected !== undefined && range?.moveSet.has(key) === true) {
      dispatch({ type: "move", unit: selected.id, x, y });
      setTargetId(undefined);
      return;
    }
    setSelectedId(undefined);
    setTargetId(undefined);
  };

  const col = (x: number) => gridCol(width, x);
  const row = (y: number) => gridRow(height, y);
  const cx = (x: number) => col(x) - 0.5;
  const cy = (y: number) => row(y) - 0.5;

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
            onClick={() => setDifficulty(d)}
          >
            {labels.diffNames[d]}
          </button>
        ))}
      </nav>

      <div className="turn-strip">
        <span className="turn-label">
          {labels.turnWord} {game.turn} · {labels.forceNames[game.phase] ?? ""} {labels.turnPhase}
        </span>
        <button type="button" onClick={() => dispatch({ type: "endPhase" })} disabled={game.outcome !== undefined}>
          {labels.endPhase}
        </button>
        <button type="button" onClick={() => setResetCount((c) => c + 1)}>
          {labels.reset}
        </button>
      </div>

      <div className="rail rail-x">
        {Array.from({ length: width }, (_, x) => (
          <span key={x} style={{ gridColumn: col(x) }}>
            {x}
          </span>
        ))}
      </div>
      <div className="rail rail-y">
        {Array.from({ length: height }, (_, y) => (
          <span key={y} style={{ gridRow: row(y) }}>
            {y}
          </span>
        ))}
      </div>

      <div className="board" onPointerLeave={() => setHover(undefined)}>
        <div className="layer">
          {tiles.map((line, y) =>
            line.map((tile, x) => (
              <i
                key={tileKey(x, y)}
                className={["tile", tile.blocked && "blocked", byTile.has(tileKey(x, y)) && "has-unit"]
                  .filter(Boolean)
                  .join(" ")}
                title={`(${x}, ${y}) ${tile.name}`}
                style={{ gridColumn: col(x), gridRow: row(y), background: tile.color }}
                onClick={() => onTileClick(x, y)}
                onPointerEnter={() => setHover({ x, y })}
              />
            )),
          )}
        </div>

        {range !== undefined && (
          <div className="layer range">
            {range.move.map((t) => (
              <i key={tileKey(t.x, t.y)} className="ov move" style={{ gridColumn: col(t.x), gridRow: row(t.y) }} />
            ))}
            {range.attack.map((t) => (
              <i key={tileKey(t.x, t.y)} className="ov atk" style={{ gridColumn: col(t.x), gridRow: row(t.y) }} />
            ))}
          </div>
        )}

        <div className="layer objects">
          {objects.map((o) => (
            <span
              key={tileKey(o.x, o.y)}
              className="cell"
              style={{ gridColumn: col(o.x), gridRow: row(o.y) }}
              title={`(${o.x}, ${o.y}) ${o.name}`}
            >
              <svg className="emblem tile-mark" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="12.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 5.5 L19.5 16 L16 26.5 L12.5 16 Z" fill="currentColor" opacity="0.9" />
                <path d="M16 10.5 L17.6 16 L16 21.5 L14.4 16 Z" fill="#f2fffd" opacity="0.85" />
              </svg>
            </span>
          ))}
        </div>

        <div className="vignette"></div>

        {path !== undefined && (
          <svg className="arrow" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <path d={path.map((t, i) => `${i === 0 ? "M" : "L"}${cx(t.x)} ${cy(t.y)}`).join(" ")} />
            <ArrowHead from={path[path.length - 2]} to={path[path.length - 1]} cx={cx} cy={cy} />
          </svg>
        )}

        <div className="layer units">
          {alive.map((u) => {
            const v = visuals.get(u.id);
            if (v === undefined) return null;
            const cls = ["cell", u === selected && "sel", u === target && "tgt", u.acted && "acted"]
              .filter(Boolean)
              .join(" ");
            return (
              <span
                key={u.id}
                className={cls}
                style={{ gridColumn: col(u.x), gridRow: row(u.y), "--force": v.ring } as React.CSSProperties}
              >
                {v.icon ? (
                  <img src={v.icon} alt={`${v.name} — ${v.job}`} className="icon" width="48" height="48" loading="eager" decoding="sync" />
                ) : (
                  <span className="chip" title={`${v.name} — ${v.job}`} style={{ background: v.chip }}>
                    {v.abbr}
                  </span>
                )}
                <span className="hpbar" aria-hidden="true">
                  <i style={{ width: `${Math.round((u.hp / u.stats.hp) * 100)}%` }} />
                </span>
                {u.broken && <span className="brk" title="Break">✗</span>}
              </span>
            );
          })}
        </div>

        {banner !== undefined && <div className={game.outcome !== undefined ? "banner stay" : "banner"}>{banner}</div>}
      </div>

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

function ArrowHead({
  from,
  to,
  cx,
  cy,
}: {
  from: Tile;
  to: Tile;
  cx: (x: number) => number;
  cy: (y: number) => number;
}) {
  const dx = cx(to.x) - cx(from.x);
  const dy = cy(to.y) - cy(from.y);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <polygon
      points="-0.16,-0.22 0.3,0 -0.16,0.22"
      transform={`translate(${cx(to.x)} ${cy(to.y)}) rotate(${angle})`}
    />
  );
}
