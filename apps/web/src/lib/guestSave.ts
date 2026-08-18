import { parseEphemeris, serializeEphemeris, type Difficulty, type EphemerisFile, type SetupUnit } from "@fesim/shared";

/**
 * 게스트 자동 저장 — 무계정으로도 판이 이어지는 게이트 제로의 최소형.
 * 저장 계층을 여기로 격리한다(IndexedDB 교체 시 이 파일만 바뀐다). 저장 실패는 언제나 무해화:
 * 프라이빗 모드·쿼터 초과에서 판이 죽는 것보다 저장을 포기하는 편이 낫다.
 */

export interface SaveKey {
  game: string;
  mapId: string;
  difficulty: Difficulty;
  scenario?: string;
}

/** (게임, 맵, 난이도, 국면)당 1슬롯 — 같은 조합으로 돌아오면 그 판이 이어진다. */
export const slotKey = (key: SaveKey): string =>
  `fesim:eph:${key.game}:${key.mapId}:${key.difficulty}:${key.scenario ?? "-"}`;

const storage = (): Storage | undefined => {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

export function saveSlot(key: SaveKey, file: EphemerisFile): void {
  try {
    storage()?.setItem(slotKey(key), serializeEphemeris(file));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵. 진행 중인 판은 건드리지 않는다.
  }
}

/** 손상·이물 슬롯은 조용히 버린다(콘솔 경고만) — 복원 실패로 새 판을 못 시작하면 안 된다. */
export function loadSlot(key: SaveKey): EphemerisFile | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(slotKey(key));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const file = parseEphemeris(text);
    if (file.chapter.cid !== key.mapId || file.chapter.difficulty !== key.difficulty) {
      throw new Error("슬롯의 챕터 정보가 현재 판과 다르다");
    }
    if ((file.chapter.scenario ?? undefined) !== key.scenario) {
      throw new Error("슬롯의 국면이 현재 판과 다르다");
    }
    return file;
  } catch (e) {
    console.warn("게스트 저장 복원 실패 — 새 판으로 시작한다", e);
    clearSlot(key);
    return undefined;
  }
}

/**
 * 이 맵에 이어하던 판이 있나 — 난이도·국면을 가리지 않고 하나라도 있으면 참.
 * 쓰임: 맵 진입 시 기본 기보 자동 재생 여부. ☠남의 시연이 내 진행을 덮으면 안 된다.
 */
export function hasGuestSave(mapId: string, game = "fe17"): boolean {
  const s = storage();
  if (s === undefined) return false;
  const prefix = `fesim:eph:${game}:${mapId}:`;
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k !== null && k.startsWith(prefix)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function clearSlot(key: SaveKey): void {
  try {
    storage()?.removeItem(slotKey(key));
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}

/* ── 런(캠페인) — 챕터 사슬의 진행 상태. 게이트 제로 유지(서버 저장은 M4 로그인 선행).
   ☠챕터 자동 저장(fesim:eph:*)과 다른 축이다: 저쪽은 판 하나의 기보, 이쪽은 판을 잇는 로스터다. */

export interface RunState {
  game: string;
  difficulty: Difficulty;
  /** 다음에 플레이할 챕터(cid). */
  chapter: string;
  /** 완료한 챕터(cid) — 진행 순서 그대로. */
  cleared: string[];
  /** 인계 로스터 = 다음 챕터 setup에 그대로 들어간다(키 = pid, carryover 산출물). */
  roster: Record<string, SetupUnit>;
  updated: string;
}

/** 게임당 런 1개 — 다중 런 슬롯은 M4 보관함 소관이다. */
export const runKey = (game: string): string => `fesim:run:${game}`;

export function saveRun(run: RunState): void {
  try {
    storage()?.setItem(runKey(run.game), JSON.stringify(run));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵. 진행 중인 판은 건드리지 않는다.
  }
}

/** 손상·이물 런은 조용히 버린다 — 복원 실패로 캠페인 진입이 막히면 안 된다. */
export function loadRun(game = "fe17"): RunState | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(runKey(game));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const run = JSON.parse(text) as RunState;
    if (run.game !== game || typeof run.chapter !== "string" || typeof run.roster !== "object") {
      throw new Error("런 슬롯의 형태가 계약과 다르다");
    }
    return { ...run, cleared: run.cleared ?? [] };
  } catch (e) {
    console.warn("런 복원 실패 — 새 런으로 시작한다", e);
    clearRun(game);
    return undefined;
  }
}

export function clearRun(game = "fe17"): void {
  try {
    storage()?.removeItem(runKey(game));
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}

/* ── 맵 줌 배율 — 전 맵 공용 1값. 디폴트 0.9 = 현행 타일 공식 대비 -10%(2026-08-18 사용자 지시).
   ☠board-metrics.css --m-zoom-default와 동기(SSR·리플레이의 CSS 폴백이 그 값을 쓴다).
   로그인 영구저장은 M4 소셜 로그인 선행 — 그때 이 계층만 서버 동기로 확장한다. */

export const ZOOM_DEFAULT = 0.9;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;
const ZOOM_KEY = "fesim:ui:zoom";

/** 상·하한 절단 + 0.1 스텝 잔차 반올림 — 부동소수 누적이 저장·표시로 새면 안 된다. */
export const clampZoom = (zoom: number): number =>
  Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) * 10) / 10;

export function saveZoom(zoom: number): void {
  try {
    storage()?.setItem(ZOOM_KEY, String(clampZoom(zoom)));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵.
  }
}

/** 손상·범위 밖 값은 디폴트로 강하 — 이물 배율이 보드를 0px·거대 렌더로 죽이면 안 된다. */
export function loadZoom(): number {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(ZOOM_KEY);
  } catch {
    return ZOOM_DEFAULT;
  }
  if (text === null || text === undefined) return ZOOM_DEFAULT;
  const zoom = Number(text);
  return Number.isFinite(zoom) && zoom >= ZOOM_MIN && zoom <= ZOOM_MAX ? clampZoom(zoom) : ZOOM_DEFAULT;
}
