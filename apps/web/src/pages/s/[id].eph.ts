export const prerender = false;

import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { linkKey, normalizeLinkId } from "@fesim/api";

/**
 * 기보 원문(.eph) 엔드포인트 — ReplayIsland가 하이드레이션 후 가져간다.
 * 문서에 로그를 인라인하지 않는 LCP 게이트 구조의 반쪽(다른 반쪽 = 정적 보드 SSR).
 * /s/ 프리픽스라 미들웨어의 엣지 캐시를 그대로 탄다.
 */
export const GET: APIRoute = async ({ params }) => {
  const id = normalizeLinkId(params.id);
  if (id === undefined || env.LINKS === undefined) return new Response(null, { status: 404 });
  const text = await env.LINKS.get(linkKey(id), { cacheTtl: 300 });
  if (text === null) return new Response(null, { status: 404 });
  return new Response(text, { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
