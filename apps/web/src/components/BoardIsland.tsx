import { useEffect, useMemo, useState } from "react";
import {
  attackRange,
  movementPath,
  movementRange,
  type MoveQuery,
  type ReachableTile,
  type Tile,
} from "@fesim/engine";
import { gridCol, gridRow } from "../lib/grid";
import type { BoardProps, BoardUnitProp } from "../lib/fe17";
import "./board.css";

/**
 * 보드 아일랜드 — 이 프로젝트의 첫 hydrate 경계.
 * props는 SSG가 직렬화한 산출물뿐이라 대용량 테이블 JSON이 클라이언트로 새지 않는다.
 * 국면(phase) 전환은 페이지의 CSS 라디오가 소유 — 아일랜드는 change 이벤트만 구독한다.
 */

const tileKey = (x: number, y: number) => `${x},${y}`;

/** 페이지의 phase 라디오(있다면)와 동기화된 현재 국면 id. */
function usePhase(): string | undefined {
  const [phase, setPhase] = useState<string | undefined>(undefined);
  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input.phase-input"));
    if (inputs.length === 0) return;
    const sync = () =>
      setPhase(inputs.find((i) => i.checked)?.id.replace(/^phase-/, "") ?? undefined);
    sync();
    for (const input of inputs) input.addEventListener("change", sync);
    return () => {
      for (const input of inputs) input.removeEventListener("change", sync);
    };
  }, []);
  return phase;
}

interface RangeView {
  unit: BoardUnitProp;
  query: MoveQuery;
  move: ReachableTile[];
  moveSet: Set<string>;
  attack: Tile[];
}

export default function BoardIsland(props: BoardProps) {
  const { width, height, tiles, costs, objects, units, labels } = props;
  const phase = usePhase();
  const [selectedAt, setSelectedAt] = useState<string | undefined>(undefined);
  const [hover, setHover] = useState<Tile | undefined>(undefined);

  const active = useMemo(
    () => units.filter((u) => u.phase === undefined || phase === undefined || u.phase === phase),
    [units, phase],
  );
  const byTile = useMemo(() => {
    const map = new Map<string, BoardUnitProp>();
    for (const u of active) map.set(tileKey(u.x, u.y), u);
    return map;
  }, [active]);

  const selected = selectedAt === undefined ? undefined : byTile.get(selectedAt);

  const range = useMemo<RangeView | undefined>(() => {
    if (selected === undefined) return undefined;
    const grid = costs[selected.moveType];
    if (grid === undefined) return undefined;
    const query: MoveQuery = {
      width,
      height,
      movePoints: selected.movePoints,
      start: { x: selected.x, y: selected.y },
      costAt: (x, y) => grid[y]?.[x] ?? 255,
      // 타군 = 통과 불가 · 같은 군 = 통과 가능/정지 불가. 제3군 상호 차단은 가정(실기 반증 시 갱신).
      blocked: (x, y) => {
        const other = byTile.get(tileKey(x, y));
        return other !== undefined && other.force !== selected.force;
      },
      occupied: (x, y) => {
        const other = byTile.get(tileKey(x, y));
        return other !== undefined && other.force === selected.force;
      },
    };
    const move = movementRange(query);
    const moveSet = new Set(move.map((t) => tileKey(t.x, t.y)));
    const attack =
      selected.rangeMax > 0
        ? attackRange(move, selected.rangeMin, selected.rangeMax, width, height).filter(
            (t) => !moveSet.has(tileKey(t.x, t.y)),
          )
        : [];
    return { unit: selected, query, move, moveSet, attack };
  }, [selected, byTile, costs, width, height]);

  const path = useMemo(() => {
    if (range === undefined || hover === undefined) return undefined;
    if (!range.moveSet.has(tileKey(hover.x, hover.y))) return undefined;
    if (byTile.has(tileKey(hover.x, hover.y))) return undefined;
    const tiles = movementPath(range.query, hover);
    return tiles !== null && tiles.length > 1 ? tiles : undefined;
  }, [range, hover, byTile]);

  const col = (x: number) => gridCol(width, x);
  const row = (y: number) => gridRow(height, y);
  const cx = (x: number) => col(x) - 0.5;
  const cy = (y: number) => row(y) - 0.5;

  const onTileClick = (x: number, y: number) => {
    const key = tileKey(x, y);
    setSelectedAt(byTile.has(key) && key !== selectedAt ? key : undefined);
  };

  return (
    <figure
      className="plate"
      style={{ "--cols": width, "--rows": height } as React.CSSProperties}
      aria-label={labels.board}
    >
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
                className={[
                  "tile",
                  tile.blocked && "blocked",
                  byTile.has(tileKey(x, y)) && "has-unit",
                ]
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
              <i
                key={tileKey(t.x, t.y)}
                className="ov move"
                style={{ gridColumn: col(t.x), gridRow: row(t.y) }}
              />
            ))}
            {range.attack.map((t) => (
              <i
                key={tileKey(t.x, t.y)}
                className="ov atk"
                style={{ gridColumn: col(t.x), gridRow: row(t.y) }}
              />
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

        {/* DOM은 전 유닛 — 국면 표시/숨김은 페이지 CSS([data-phase])가 소유. 로직만 active를 쓴다. */}
        <div className="layer units">
          {units.map((u, i) => (
            <span
              key={i}
              className={selected === u ? "cell sel" : "cell"}
              data-phase={u.phase}
              style={{ gridColumn: col(u.x), gridRow: row(u.y), "--force": u.ring } as React.CSSProperties}
            >
              {u.icon ? (
                <img
                  src={u.icon}
                  alt={`${u.name} — ${u.job}`}
                  className="icon"
                  width="48"
                  height="48"
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <span className="chip" title={`${u.name} — ${u.job}`} style={{ background: u.chip }}>
                  {u.abbr}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </figure>
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
