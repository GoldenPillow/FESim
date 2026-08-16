import { useEffect, useMemo, useRef, useState } from "react";
import { toAddress, type StepAddress, type UnitState } from "@fesim/engine";
import type { EphemerisFile } from "@fesim/shared";
import { tileKey } from "../lib/grid";
import type { BoardProps } from "../lib/fe17";
import type { FocusLabels } from "../lib/i18n";
import { createBoardStore, displayState, useBoard } from "../lib/boardStore";
import { writeAddress } from "../lib/replayQuery";
import BoardView from "./BoardView";
import "./replay.css";

/**
 * 공유 열람(포커스 모드)의 스테퍼 — 표시는 BoardView, 국면은 스토어(리플레이 모드), 룰은 엔진.
 * 기보는 props로 인라인돼 오므로 **스테핑에 네트워크가 없다**(열람 경로가 릴리즈 게이트다).
 */
export interface ReplayIslandProps {
  board: BoardProps;
  file: EphemerisFile;
  /** 서버가 ?t/p/a로 계산한 시작 커서 — 서버 렌더와 첫 클라 렌더가 같은 국면이어야 한다. */
  cursor: number;
  /** ?u= 지정 유닛 하이라이트(패널 펼침은 M4). */
  unit?: string;
  labels: FocusLabels;
}

const PHASE_INDEX: Record<StepAddress["p"], number> = { player: 0, enemy: 1, ally: 2 };

/** 스와이프 판정 최소 이동(px) — 세로 스크롤을 가로 스테핑으로 오해하지 않을 만큼. */
const SWIPE_MIN = 44;

export default function ReplayIsland({ board, file, cursor, unit, labels }: ReplayIslandProps) {
  const [store] = useState(() => {
    const created = createBoardStore(board);
    created.getState().loadReplay(file);
    created.getState().seek(cursor);
    return created;
  });
  const game = useBoard(store, displayState);
  const visuals = useBoard(store, (s) => s.visuals);
  const replay = useBoard(store, (s) => s.replay);
  const at = useBoard(store, (s) => s.cursor);
  const opened = useRef(false);
  const touchFrom = useRef<number | undefined>(undefined);

  const alive = useMemo(() => game.units.filter((u) => !u.dead), [game]);
  const byTile = useMemo(() => {
    const m = new Map<string, UnitState>();
    for (const u of alive) m.set(tileKey(u.x, u.y), u);
    return m;
  }, [alive]);

  const steps = replay?.timeline.steps.length ?? 0;
  const address = replay === undefined ? undefined : toAddress(replay.timeline, at);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      if (e.shiftKey) store.getState().stepPhase(delta);
      else store.getState().stepAction(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  // 링크를 연 순간의 주소는 방문자가 받은 그대로 둔다 — 첫 스테핑부터 역기입한다.
  const [t, p, a] = [address?.t, address?.p, address?.a];
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      return;
    }
    if (t === undefined || p === undefined || a === undefined) return;
    const search = writeAddress(window.location.search, { t, p, a });
    window.history.replaceState(null, "", `${window.location.pathname}${search}${window.location.hash}`);
  }, [t, p, a]);

  const badge =
    replay === undefined
      ? undefined
      : replay.verify.ok
        ? `${labels.verified} ${file.ruleVersion}`
        : labels.recordOnly;

  return (
    <figure
      className="plate replay"
      style={{ "--cols": board.width, "--rows": board.height } as React.CSSProperties}
      aria-label={board.labels.board}
      onTouchStart={(e) => {
        touchFrom.current = e.touches[0]?.clientX;
      }}
      onTouchEnd={(e) => {
        const from = touchFrom.current;
        touchFrom.current = undefined;
        if (from === undefined) return;
        const dx = (e.changedTouches[0]?.clientX ?? from) - from;
        if (Math.abs(dx) < SWIPE_MIN) return;
        store.getState().stepAction(dx < 0 ? 1 : -1); // 왼쪽으로 밀면 다음 행동(캐러셀 문법)
      }}
    >
      <div className="turn-strip">
        <span className="turn-label">
          {address === undefined
            ? ""
            : `${board.labels.turnWord} ${address.t} · ${board.labels.forceNames[PHASE_INDEX[address.p]]} ${board.labels.turnPhase} · ${labels.actionWord} ${address.a}`}
        </span>
        {badge !== undefined && (
          <span className={replay?.verify.ok === true ? "verify-badge ok" : "verify-badge"}>{badge}</span>
        )}
      </div>

      <BoardView
        width={board.width}
        height={board.height}
        tiles={board.tiles}
        objects={board.objects}
        units={alive}
        byTile={byTile}
        visuals={visuals}
        selectedId={unit}
      />

      <nav className="replay-nav" aria-label={board.labels.board}>
        <button
          type="button"
          aria-label={labels.prev}
          disabled={at <= 0}
          onClick={() => store.getState().stepAction(-1)}
        >
          ←
        </button>
        <span className="replay-count">
          {at} / {steps}
        </span>
        <button
          type="button"
          aria-label={labels.next}
          disabled={at >= steps}
          onClick={() => store.getState().stepAction(1)}
        >
          →
        </button>
      </nav>
    </figure>
  );
}
