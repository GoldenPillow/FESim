import { useEffect, useMemo, useRef, useState } from "react";
import { toAddress, type UnitState } from "@fesim/engine";
import { parseEphemeris, type EphemerisFile } from "@fesim/shared";
import { tileKey } from "../lib/grid";
import { boardsJsonPath, visibleObjects, visibleStructures } from "../lib/boards";
import type { BoardProps } from "../lib/fe17";
import type { FocusLabels, Locale } from "../lib/i18n";
import { createBoardStore, displayState, useBoard, type BoardStore } from "../lib/boardStore";
import { writeAddress } from "../lib/replayQuery";
import ReplayFrame from "./ReplayFrame";

/**
 * 공유 열람(포커스 모드)의 스테퍼 — client:only. 첫 페인트는 페이지의 정적 SSR(ReplayFrame)이 담당하고,
 * 이 아일랜드는 기보(.eph)·보드 JSON을 **하이드레이션 후 fetch**해 조작을 활성화한다(둘 다 캐시되는 정적 응답).
 * 로드가 끝나면 정적 보드(ssrBoardId)를 숨기고 라이브 프레임으로 교대한다 — 이후 스테핑은 네트워크 제로.
 */
export interface ReplayIslandProps {
  id: string;
  /** 서버가 ?t/p/a로 계산한 시작 커서 — 정적 렌더와 첫 라이브 렌더가 같은 국면이어야 한다. */
  cursor: number;
  /** ?u= 지정 유닛 하이라이트(패널 펼침은 M4). */
  unit?: string;
  labels: FocusLabels;
  locale: Locale;
  ssrBoardId: string;
}

/** 스와이프 판정 최소 이동(px) — 세로 스크롤을 가로 스테핑으로 오해하지 않을 만큼. */
const SWIPE_MIN = 44;

interface Loaded {
  board: BoardProps;
  file: EphemerisFile;
  store: BoardStore;
}

export default function ReplayIsland({ id, cursor, unit, labels, locale, ssrBoardId }: ReplayIslandProps) {
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ephRes = await fetch(`/s/${id}.eph`);
        if (!ephRes.ok) return;
        const file = parseEphemeris(await ephRes.text());
        const boardRes = await fetch(boardsJsonPath(file.chapter.cid, locale));
        if (!boardRes.ok) return;
        const board = (await boardRes.json()) as BoardProps;
        if (!alive) return;
        setLoaded({ board, file, store: createBoardStore(board, { file, cursor }) });
      } catch (e) {
        console.warn("replay load failed — 정적 보드 유지", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, cursor, locale]);

  useEffect(() => {
    if (loaded !== undefined) document.getElementById(ssrBoardId)?.setAttribute("hidden", "");
  }, [loaded, ssrBoardId]);

  if (loaded === undefined) return null;
  return <LiveFrame {...loaded} unit={unit} labels={labels} />;
}

function LiveFrame({ board, file, store, unit, labels }: Loaded & { unit?: string; labels: FocusLabels }) {
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
      : { text: replay.verify.ok ? `${labels.verified} ${file.ruleVersion}` : labels.recordOnly, ok: replay.verify.ok };

  return (
    <ReplayFrame
      board={{ ...board, objects: visibleObjects(board.objects, game.crests, board.crestName), structures: visibleStructures(board.structures, game.structures) }}
      patches={game.terrainPatches}
      address={address}
      badge={badge}
      at={at}
      steps={steps}
      labels={labels}
      alive={alive}
      byTile={byTile}
      visuals={visuals}
      selectedId={unit}
      onStep={(delta) => store.getState().stepAction(delta)}
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
    />
  );
}
