import type { StepAddress, UnitState } from "@fesim/engine";
import type { BoardProps } from "../lib/fe17";
import type { FocusLabels } from "../lib/i18n";
import type { UnitVisual } from "../lib/boardStore";
import BoardView from "./BoardView";
import "./replay.css";

/**
 * 포커스 모드의 표시 프레임(턴 라벨·보드·스테퍼 버튼) — 정본 하나를 두 곳이 쓴다:
 * /s/ 페이지가 정적 SSR로(핸들러 없음, LCP는 이 마크업이 담당), ReplayIsland가 라이브로.
 * ☠기보·보드 props는 문서에 인라인하지 않는다 — 실측(2026-08-16)상 문서가 TCP 1라운드(≈14.6KB)를
 * 넘는 순간 LCP 게이트가 깨지고, 실전 기보 로그는 그 예산에 절대 들어가지 않는다.
 */
export interface ReplayFrameProps {
  board: Pick<BoardProps, "width" | "height" | "tiles" | "palette" | "objects" | "structures" | "overlays" | "interactions" | "labels">;
  address?: StepAddress;
  badge?: { text: string; ok: boolean };
  at: number;
  steps: number;
  labels: FocusLabels;
  alive: UnitState[];
  byTile: Map<string, UnitState>;
  visuals: Map<string, UnitVisual>;
  selectedId?: string;
  onStep?: (delta: 1 | -1) => void;
  onTouchStart?: React.TouchEventHandler;
  onTouchEnd?: React.TouchEventHandler;
}

const PHASE_INDEX: Record<StepAddress["p"], number> = { player: 0, enemy: 1, ally: 2 };

export default function ReplayFrame(p: ReplayFrameProps) {
  return (
    <figure
      className="plate replay"
      style={{ "--cols": p.board.width, "--rows": p.board.height } as React.CSSProperties}
      aria-label={p.board.labels.board}
      onTouchStart={p.onTouchStart}
      onTouchEnd={p.onTouchEnd}
    >
      <div className="turn-strip">
        <span className="turn-label">
          {p.address === undefined
            ? ""
            : `${p.board.labels.turnWord} ${p.address.t} · ${p.board.labels.forceNames[PHASE_INDEX[p.address.p]]} ${p.board.labels.turnPhase} · ${p.labels.actionWord} ${p.address.a}`}
        </span>
        {p.badge !== undefined && (
          <span className={p.badge.ok ? "verify-badge ok" : "verify-badge"}>{p.badge.text}</span>
        )}
      </div>

      <BoardView
        width={p.board.width}
        height={p.board.height}
        tiles={p.board.tiles}
        palette={p.board.palette}
        objects={p.board.objects}
        structures={p.board.structures}
        overlays={p.board.overlays}
        interactions={p.board.interactions}
        units={p.alive}
        byTile={p.byTile}
        visuals={p.visuals}
        selectedId={p.selectedId}
      />

      <nav className="replay-nav" aria-label={p.board.labels.board}>
        <button
          type="button"
          aria-label={p.labels.prev}
          disabled={p.onStep === undefined || p.at <= 0}
          onClick={() => p.onStep?.(-1)}
        >
          ←
        </button>
        <span className="replay-count">
          {p.at} / {p.steps}
        </span>
        <button
          type="button"
          aria-label={p.labels.next}
          disabled={p.onStep === undefined || p.at >= p.steps}
          onClick={() => p.onStep?.(1)}
        >
          →
        </button>
      </nav>
    </figure>
  );
}
