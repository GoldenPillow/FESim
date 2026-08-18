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
  /** GID → 문장사 초상 경로 — 반지 장착 유닛의 왼쪽 위 배지. 없으면 배지 없이 게이지만 선다. */
  godFaces?: BoardProps["godFaces"];
  /**
   * 전투 타격 요약 — ★fx와 **수명이 다르다**(사용자 확정 "다음 행동까지"):
   * fx는 1~2초 뒤 스스로 걷히는 연출이고 이쪽은 멈춰서 읽는 표라 다음 행동이 갈아끼울 때까지 선다.
   */
  strikes?: readonly StrikeSummary[];
  fx?: BoardFx;
  /**
   * 이동 잔상 — 그 유닛의 **출발 칸**. 수명이 fx(1~2초)와 다르다(유닛 턴 마무리까지)라 별도 입력이다.
   */
  moveOrigin?: { unit: string; x: number; y: number };
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
  /** 이동 잔상의 주인 — 궤적이 아니라 **출발 칸 한 곳**에만 남긴다(BoardViewProps.moveOrigin). */
  trailUnit?: string;
  nudge?: { id: string; dx: number; dy: number };
  pulse?: readonly string[];
  /** 전사한 유닛의 자리 — 유닛이 즉시 사라져 테두리 펄스를 띄울 몸이 없다(실루엣 잔상으로 2초). */
  ghosts?: readonly { id: string; x: number; y: number }[];
}

/** 한 유닛 옆에 붙는 타격 표 — 그 전투에서 이 유닛이 낀 타격이 시간순 한 줄씩. */
export interface StrikeSummary {
  id: string;
  /** 표를 세울 쪽 — ☠**상대의 반대편**이다: 둘 다 같은 쪽에 세우면 두 표가 서로를 덮는다. */
  anchor: "left" | "right";
  rows: readonly StrikeRow[];
}

/**
 * 타격 한 줄 — 왼쪽 = 쓰인 무기 + **받은** 대미지 · 오른쪽 = **준** 대미지(사용자 지정 배치).
 * 한 타격에서 이 유닛은 때리거나 맞거나 둘 중 하나라 `side`가 어느 칸에 수치가 서는지를 정한다.
 * 라벨(kind·무기명)은 로케일 소관이라 산출측(BoardIsland)이 이미 번역해서 넘긴다.
 */
export interface StrikeRow {
  weapon?: string;
  /** 체인·반격·추격 표시. 본공격은 붙이지 않는다(줄 수만으로 읽힌다). */
  kind?: string;
  side: "taken" | "dealt";
  miss: boolean;
  crit: boolean;
  damage: number;
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
  godFaces,
  strikes,
  fx,
  moveOrigin,
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
            const godFace = u.gid === undefined ? undefined : godFaces?.[u.gid];
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
                {/* 인게이지 발동 = 테두리 푸른 점멸. ☠연출이 아니라 **상태 표시**라 모드 무관 상시(사용자 확정).
                    링을 실제 자식으로 두는 이유 = ::before(선택)·::after(피격)가 이미 차 있다. */}
                {u.engage?.engaging === true && <i className="engring" aria-hidden="true" />}
                {u.engage !== undefined && (
                  <span className="god" title={`${u.engage.count} / ${u.engage.limit}`}>
                    {godFace !== undefined && <img src={godFace} alt="" width="32" height="32" loading="lazy" decoding="async" />}
                    <b>{u.engage.count}/{u.engage.limit}</b>
                  </span>
                )}
                {u.broken && <span className="brk" title="Break">✗</span>}
              </span>
            );
          })}
        </div>

        {/* 이동 잔상 — ★**출발 칸 한 곳에 고정**으로 흐리게 남긴다(2026-08-18 사용자 지정).
            궤적을 따라 흩뿌리면 어디서 왔는지가 아니라 "지나갔다"만 보인다.
            수명 = 그 유닛의 턴 마무리까지 — fx 타이머(1초)와 무관하게 호출측이 소유한다. */}
        {moveOrigin !== undefined && (
          <div className="layer afterimages" aria-hidden="true">
            {(() => {
              const icon = visuals.get(moveOrigin.unit)?.icon;
              if (icon === undefined) return null;
              return (
                <span
                  className="cell afterimage"
                  style={{ gridColumn: col(moveOrigin.x), gridRow: row(moveOrigin.y) } as React.CSSProperties}
                >
                  <img src={icon} alt="" width="48" height="48" />
                </span>
              );
            })()}
          </div>
        )}

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

        {/* 타격 요약 — 전투에 낀 유닛 옆에 붙는 작은 표. 오른쪽 끝 유닛은 왼쪽으로 뒤집는다(잘림 방지). */}
        {strikes !== undefined && strikes.length > 0 && (
          <div className="layer strikes">
            {strikes.map((s) => {
              const u = units.find((x) => x.id === s.id);
              if (u === undefined) return null;
              return (
                <span
                  key={s.id}
                  className={strikeSide(s.anchor, u.x, width) === "left" ? "cell strike flip" : "cell strike"}
                  style={{ gridColumn: col(u.x), gridRow: row(u.y) }}
                >
                  <span className="sbox">
                    {s.rows.map((r, i) => (
                      <span key={i} className="srow">
                        <span className="sl">
                          {r.weapon !== undefined && <i className="sw">{r.weapon}</i>}
                          {r.kind !== undefined && <i className="sk">{r.kind}</i>}
                          {r.side === "taken" && <b className={dmgClass(r)}>{r.miss ? "MISS" : r.damage}</b>}
                        </span>
                        <span className="sr">
                          {r.side === "dealt" && <b className={dmgClass(r)}>{r.miss ? "MISS" : r.damage}</b>}
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {banner !== undefined && <div className={bannerStay ? "banner stay" : "banner"}>{banner}</div>}
      </div>
    </>
  );
}

/** miss = 화이트 · crit = 노란색 · 그 외 대미지 = 레드(사용자 지정). */
const dmgClass = (r: StrikeRow): string => (r.miss ? "miss" : r.crit ? "crit" : "dmg");

/**
 * 상대 반대편이 기본 — 둘 다 같은 쪽이면 두 표가 서로를 덮는다.
 * ☠맨 끝 칸에서만 뒤집는다: 표가 보드 밖으로 조금 넘치는 건 괜찮지만(레이어가 overflow: visible)
 * 반대편으로 옮기면 상대 표와 정면으로 겹쳐 둘 다 못 읽는다.
 */
const strikeSide = (anchor: "left" | "right", x: number, width: number): "left" | "right" => {
  if (anchor === "left" && x === 0) return "right";
  if (anchor === "right" && x === width - 1) return "left";
  return anchor;
};

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
