import type { Locale } from "./i18n";

/**
 * 정적 보드 JSON의 주소 — 생산(엔드포인트)과 소비(/s/ 워커 런타임)가 같은 함수를 쓴다.
 * ☠이 모듈은 데이터 테이블을 임포트하지 않는다: 워커 번들에 5MB 테이블이 딸려가면 안 된다(fe17.ts는 SSG 전용).
 */
export const boardsJsonPath = (mapId: string, locale: Locale): string =>
  `/fe17/boards/${mapId}.${locale}.json`;
