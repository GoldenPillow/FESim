import type { Tile, UnitState } from "@fesim/engine";
import { colLabel, coordLabel, gridCol, gridRow, tileKey, tileShade } from "../lib/grid";
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
  /** [y][x] = palette 인덱스(3-6 정규화) — 표시 필드는 palette가 소유, 지터는 렌더가 소유. */
  tiles: BoardProps["tiles"];
  palette: BoardProps["palette"];
  objects: BoardProps["objects"];
  /** 표시할 구조물 — 호출측이 visibleStructures로 걸러 넘긴다(파괴·지붕 걷힘 판별은 boards.ts 소유). */
  structures?: BoardProps["structures"];
  /** 지속 오버레이(정적) — 반투명 틴트로 베이스 타일 위에 얹는다. */
  overlays?: BoardProps["overlays"];
  /** 런타임 지형 교체(TerrainSet) — 베이스 타일을 **덮는다**(오버레이와 달리 불투명 치환). */
  patches?: { x: number; y: number; tid: string; display?: { color?: string; name?: string } }[];
  /** 상호작용 마커(상자·민가·문·이탈점·파괴) — 표시 전용(실행은 이벤트 엔진 이월). */
  interactions?: BoardProps["interactions"];
  units: UnitState[];
  byTile: Map<string, UnitState>;
  visuals: Map<string, UnitVisual>;
  range?: { move: Tile[]; attack: Tile[]; staff?: Tile[] };
  path?: Tile[];
  fx?: BoardFx;
  selectedId?: string;
  targetId?: string;
  banner?: string;
  bannerStay?: boolean;
  onTileClick?: (x: number, y: number) => void;
  onTileHover?: (tile: Tile | undefined) => void;
}

/**
 * 행동 연출 상태 — 기보 작성(플레이)과 리플레이가 같은 것을 넣는다.
 * seq = 스텝 일련번호(애니메이션 재시작용). trail은 화살표 레이어가 소비한다(path와 같은 자리).
 */
export interface BoardFx {
  seq: number;
  trail?: Tile[];
  nudge?: { id: string; dx: number; dy: number };
  pulse?: readonly string[];
  /** 전사한 유닛의 자리 — 유닛이 즉시 사라져 테두리 펄스를 띄울 몸이 없다(실루엣 잔상으로 2초). */
  ghosts?: readonly { id: string; x: number; y: number }[];
}

/** 짝수/홀수로 이름을 번갈아 = 같은 연출이 연속될 때도 애니메이션이 처음부터 다시 돈다. */
const fxAnimation = (seq: number, nudge: boolean, hit: boolean): string => {
  const p = seq % 2 === 0 ? "a" : "b";
  return [nudge && `cell-nudge-${p}`, hit && `cell-hit-${p}`].filter(Boolean).join(", ");
};

export default function BoardView({
  width,
  height,
  tiles,
  palette,
  objects,
  structures,
  overlays,
  patches,
  interactions,
  units,
  byTile,
  visuals,
  range,
  path,
  fx,
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
            line.map((idx, x) => {
              const tile = palette[idx];
              if (tile === undefined) return null;
              return (
                <i
                  key={tileKey(x, y)}
                  className={["tile", tile.blocked && "blocked", byTile.has(tileKey(x, y)) && "has-unit"]
                    .filter(Boolean)
                    .join(" ")}
                  title={`${coordLabel(x, y)} ${tile.name}`}
                  style={{
                    gridColumn: col(x),
                    gridRow: row(y),
                    background: tile.color,
                    filter: `brightness(${tileShade(x, y)})`,
                  }}
                  onClick={() => onTileClick?.(x, y)}
                  onPointerEnter={() => onTileHover?.({ x, y })}
                />
              );
            }),
          )}
        </div>

        {patches !== undefined && patches.length > 0 && (
          <div className="layer">
            {patches.map((p) => (
              <i
                key={tileKey(p.x, p.y)}
                className="tile"
                title={`${coordLabel(p.x, p.y)} ${p.display?.name ?? p.tid}`}
                style={{
                  gridColumn: col(p.x),
                  gridRow: row(p.y),
                  background: p.display?.color ?? "transparent",
                  filter: `brightness(${tileShade(p.x, p.y)})`,
                }}
                onClick={() => onTileClick?.(p.x, p.y)}
                onPointerEnter={() => onTileHover?.({ x: p.x, y: p.y })}
              />
            ))}
          </div>
        )}

        {overlays !== undefined && overlays.length > 0 && (
          <div className="layer overlays">
            {overlays.map((o) => (
              <i
                key={tileKey(o.x, o.y)}
                className="ovl"
                title={`${coordLabel(o.x, o.y)} ${o.name}`}
                style={{ gridColumn: col(o.x), gridRow: row(o.y), background: o.color }}
              />
            ))}
          </div>
        )}

        {structures !== undefined && structures.some((s) => s.roof !== true) && (
          <div className="layer structures">
            {structures.map((s, i) =>
              s.roof === true ? null : (
                <i
                  key={`s${i}`}
                  className="structure"
                  title={`${coordLabel(s.x, s.y)} ${s.name}`}
                  style={{
                    gridColumn: `${col(s.x)} / span ${s.w}`,
                    gridRow: `${row(s.y + s.h - 1)} / span ${s.h}`,
                    background: s.color,
                  }}
                />
              ),
            )}
          </div>
        )}

        {range !== undefined && (
          <div className="layer range">
            {range.move.map((t) => (
              <i key={tileKey(t.x, t.y)} className="ov move" style={{ gridColumn: col(t.x), gridRow: row(t.y) }} />
            ))}
            {range.attack.map((t) => (
              <i key={tileKey(t.x, t.y)} className="ov atk" style={{ gridColumn: col(t.x), gridRow: row(t.y) }} />
            ))}
            {(range.staff ?? []).map((t) => (
              <i key={tileKey(t.x, t.y)} className="ov sta" style={{ gridColumn: col(t.x), gridRow: row(t.y) }} />
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

        {interactions !== undefined && interactions.length > 0 && (
          <div className="layer marks">
            {interactions.map((it, i) => (
              <span
                key={`i${i}`}
                className="cell"
                style={{ gridColumn: col(it.x), gridRow: row(it.y) }}
                title={`${coordLabel(it.x, it.y)} ${it.kind}${it.name !== undefined ? ` ${it.name}` : ""}`}
              >
                <svg className={`tile-mark mark-${it.kind}`} viewBox="0 0 32 32" aria-hidden="true">
                  {it.kind === "chest" ? (
                    <>
                      <rect x="7" y="12" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" />
                      <path d="M7 17 H25" stroke="currentColor" strokeWidth="2" />
                      <rect x="14" y="15.5" width="4" height="4" fill="currentColor" />
                    </>
                  ) : it.kind === "visit" ? (
                    <path d="M8 25 V14 L16 7 L24 14 V25 H18 V19 H14 V25 Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
                  ) : it.kind === "escape" ? (
                    <path d="M16 25 V10 M10 15 L16 8 L22 15" fill="none" stroke="currentColor" strokeWidth="2.8" />
                  ) : it.kind === "door" ? (
                    <path d="M10 25 V9 H22 V25 M22 25 H10 M18.5 17 h.01" fill="none" stroke="currentColor" strokeWidth="2.4" />
                  ) : it.kind === "defendArea" ? (
                    <path d="M16 6 L25 9 V16 C25 21 21 25 16 27 C11 25 7 21 7 16 V9 Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
                  ) : (
                    <path d="M9 9 L23 23 M23 9 L9 23" stroke="currentColor" strokeWidth="3" />
                  )}
                </svg>
              </span>
            ))}
          </div>
        )}

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
            const nudge = fx?.nudge?.id === u.id ? fx.nudge : undefined;
            const hit = fx?.pulse?.includes(u.id) === true;
            const cls = [
              "cell",
              u.id === selectedId && "sel",
              u.id === targetId && "tgt",
              u.acted && "acted",
              nudge !== undefined && "nudge",
              hit && "hit",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span
                key={u.id}
                className={cls}
                style={
                  {
                    gridColumn: col(u.x),
                    gridRow: row(u.y),
                    "--force": v.ring,
                    ...(nudge !== undefined ? { "--nx": nudge.dx, "--ny": nudge.dy } : {}),
                    // ☠같은 유닛이 연속으로 맞으면 클래스가 그대로라 애니메이션이 다시 안 뜬다 —
                    //   스텝마다 이름을 번갈아 줘서 브라우저가 새 애니메이션으로 보게 한다.
                    ...(nudge !== undefined || hit
                      ? { animationName: fxAnimation(fx!.seq, nudge !== undefined, hit) }
                      : {}),
                  } as React.CSSProperties
                }
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
                {/* 경험치 바(노랑) — 자군만. 적·우군은 성장하지 않아 늘 0이라 노이즈가 된다. */}
                {u.force === 0 && (
                  <span className="expbar" title={`EXP ${u.exp} / 100`} aria-hidden="true">
                    <i style={{ width: `${Math.min(Math.max(u.exp, 0), 100)}%` }} />
                  </span>
                )}
                {u.broken && <span className="brk" title="Break">✗</span>}
              </span>
            );
          })}
        </div>

        {/* 전사 잔상 — 스프라이트 알파를 마스크로 써서 도트 실루엣 그대로 단색 적색 펄스(2초). */}
        {fx?.ghosts !== undefined && fx.ghosts.length > 0 && (
          <div className="layer ghosts" aria-hidden="true">
            {fx.ghosts.map((g) => {
              const icon = visuals.get(g.id)?.icon;
              return (
                <span key={`g${fx.seq}-${g.id}`} className="cell ghost" style={{ gridColumn: col(g.x), gridRow: row(g.y) }}>
                  {icon !== undefined ? (
                    <i className="sil" style={{ "--sil": `url(${icon})` } as React.CSSProperties} />
                  ) : (
                    <i className="sil solid" />
                  )}
                </span>
              );
            })}
          </div>
        )}

        {structures !== undefined && structures.some((s) => s.roof === true) && (
          <div className="layer roofs">
            {structures.map((s, i) =>
              s.roof === true ? (
                <i
                  key={`r${i}`}
                  className="roof"
                  title={`${coordLabel(s.x, s.y)} ${s.name}`}
                  style={{
                    gridColumn: `${col(s.x)} / span ${s.w}`,
                    gridRow: `${row(s.y + s.h - 1)} / span ${s.h}`,
                    background: s.color,
                  }}
                />
              ) : null,
            )}
          </div>
        )}

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
