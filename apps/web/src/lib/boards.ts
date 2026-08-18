import type { Locale } from "./i18n";
import type { BoardProps } from "./fe17";

/**
 * 정적 보드 JSON의 주소 — 생산(엔드포인트)과 소비(/s/ 워커 런타임)가 같은 함수를 쓴다.
 * ☠이 모듈은 데이터 테이블을 임포트하지 않는다: 워커 번들에 5MB 테이블이 딸려가면 안 된다(fe17.ts는 SSG 전용).
 */
export const boardsJsonPath = (mapId: string, locale: Locale): string =>
  `/fe17/boards/${mapId}.${locale}.json`;

/** 공용 Lua 소스 주소 — 생산(public/fe17/scripts 심링크)과 소비(세션 부트 fetch)가 같은 함수를 쓴다. */
export const scriptPath = (name: string): string => `/fe17/scripts/${name}.lua`;

/**
 * 맵의 **기본 기보** 주소 — 없으면 404다(있는 챕터만 리플레이로 열린다).
 * 생산 = `./dev replay <cid>` → data/fe17/replays/ (public/fe17/replays 심링크로 서빙).
 * 맵 진입이 곧 리플레이 시작이라 이 파일이 신규 사용자의 첫 화면을 소유한다.
 */
export const defaultReplayPath = (mapId: string): string => `/fe17/replays/${mapId}.eph.json`;

/**
 * 표시용 구조물 — 파괴분(hp 0)을 제거하고, 같은 group의 지붕은 그 group의 비지붕 구조물이 전멸하면
 * 함께 걷힌다(m015 문·지붕 연동, group 0 = 무연동). props[i] ↔ state[i]는 initGame이 보존하는 인덱스 계약.
 * 보드·리플레이·/s/ SSR 공용(중복 구현 금지) — 이 모듈은 테이블 무임포트(워커 안전).
 */
export const visibleStructures = (
  structures: import("./fe17").BoardStructureProp[] | undefined,
  state: readonly { group: number; hp: number; roof?: boolean }[] | undefined,
): import("./fe17").BoardStructureProp[] => {
  if (structures === undefined) return [];
  if (state === undefined) return structures;
  const groupAlive = (group: number): boolean =>
    state.some((s) => s.roof !== true && s.group === group && s.hp > 0);
  return structures.filter((p, i) => {
    const s = state[i];
    if (s === undefined) return true;
    if (s.roof === true || p.roof === true) return s.group === 0 || groupAlive(s.group);
    return s.hp > 0;
  });
};

/** 표시용 objects — 소비된 紋章氣(국면 crests에 없음)를 걸러낸다. 보드·리플레이·/s/ SSR 공용(중복 구현 금지). */
export const visibleObjects = (
  objects: BoardProps["objects"],
  crests: { x: number; y: number }[] | undefined,
): BoardProps["objects"] =>
  objects.filter((o) => o.crest !== true || crests?.some((c) => c.x === o.x && c.y === o.y) !== false);
