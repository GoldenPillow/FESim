import type { Tile, UnitState } from "@fesim/engine";
import { colLabel, coordLabel, gridCol, gridRow, tileKey } from "../lib/grid";
import type { BoardProps } from "../lib/fe17";
import type { UnitVisual } from "../lib/boardStore";
import "./board.css";

/**
 * 순수 표시층 — 국면 하나를 그리는 것 외에는 아무것도 모른다(상태·룰·입력 처리 없음).
 * 맵 페이지의 인터랙션 셸과 공유 열람(포커스 모드)이 같은 그림을 쓰기 위한 경계다.
 */
export interface BoardViewProps {
  width: number;
  height: number;
  tiles: BoardProps["tiles"];
  objects: BoardProps["objects"];
  units: UnitState[];
  byTile: Map<string, UnitState>;
  visuals: Map<string, UnitVisual>;
  range?: { move: Tile[]; attack: Tile[] };
  path?: Tile[];
  selectedId?: string;
  targetId?: string;
  banner?: string;
  bannerStay?: boolean;
  onTileClick?: (x: number, y: number) => void;
  onTileHover?: (tile: Tile | undefined) => void;
}

export default function BoardView({
  width,
  height,
  tiles,
  objects,
  units,
  byTile,
  visuals,
  range,
  path,
  selectedId,
  targetId,
  banner,
  bannerStay = false,
  onTileClick,
  onTileHover,
}: BoardViewProps) {
  const col = (x: number) => gridCol(width, x);
  const row = (y: number) => gridRow(height, y);
  const cx = (x: number) => col(x) - 0.5;
  const cy = (y: number) => row(y) - 0.5;

  return (
    <>
      <div className="rail rail-x">
        {Array.from({ length: width }, (_, x) => (
          <span key={x} style={{ gridColumn: col(x) }}>
            {colLabel(x)}
          </span>
        ))}
      </div>
      <div className="rail rail-y">
        {Array.from({ length: height }, (_, y) => (
          <span key={y} style={{ gridRow: row(y) }}>
            {y + 1}
          </span>
        ))}
      </div>

      <div className="board" onPointerLeave={() => onTileHover?.(undefined)}>
        <div className="layer">
          {tiles.map((line, y) =>
            line.map((tile, x) => (
              <i
                key={tileKey(x, y)}
                className={["tile", tile.blocked && "blocked", byTile.has(tileKey(x, y)) && "has-unit"]
                  .filter(Boolean)
                  .join(" ")}
                title={`${coordLabel(x, y)} ${tile.name}`}
                style={{ gridColumn: col(x), gridRow: row(y), background: tile.color }}
                onClick={() => onTileClick?.(x, y)}
                onPointerEnter={() => onTileHover?.({ x, y })}
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
          {units.map((u) => {
            const v = visuals.get(u.id);
            if (v === undefined) return null;
            const cls = ["cell", u.id === selectedId && "sel", u.id === targetId && "tgt", u.acted && "acted"]
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

        {banner !== undefined && <div className={bannerStay ? "banner stay" : "banner"}>{banner}</div>}
      </div>
    </>
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
