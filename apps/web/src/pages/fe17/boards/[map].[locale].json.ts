import type { APIRoute, GetStaticPaths } from "astro";
import { boardPropsFor, mapIds } from "../../../lib/fe17";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "../../../lib/i18n";

/**
 * 보드 props의 정적 엔드포인트(맵 × 로케일) — 빌드 타임에 dist로 굳는다.
 * 공유 열람(/s/)은 워커에서 이 JSON을 에셋으로 읽는다: 테이블 조회·색 산출은 여기(SSG)서 끝난다.
 */
export const getStaticPaths = (() =>
  LOCALES.flatMap((locale) => mapIds.map((map) => ({ params: { map, locale } })))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
  return new Response(JSON.stringify(boardPropsFor(params.map ?? "", locale)), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
