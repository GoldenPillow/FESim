import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

/**
 * /s/ 전용 2단 최적화 — LCP 게이트 실측(2026-08-16)으로 확정된 병목에 각각 대응한다.
 * (1) 응답 엣지 캐시(Cache API): 문서 TTFB의 서버 몫(KV 콜드 읽기 + SSR) 제거. 레코드 불변이라 안전.
 * (2) SSR 마크업의 유닛 아이콘 img를 data URI로 치환: LCP 요소(아이콘)의 별도 왕복 제거.
 *     ☠마크업만 바꾼다 — island props 속 경로는 HTML 이스케이프돼 패턴에 안 걸린다(이중 복사 방지의 핵심).
 *     클라이언트 vdom은 경로를 기대하므로 BoardView img가 suppressHydrationWarning으로 불일치를 무해화한다.
 * 온디맨드 라우트는 /s/ 뿐이므로 정적 페이지 경로에는 실행되지 않는다.
 */
const TTL_SECONDS = 3600;
const ICON_SRC = /src="(\/fe17\/assets\/mapicons\/[^"]+\.webp)"/g;

async function inlineIcons(html: string, origin: URL): Promise<string> {
  const paths = [...new Set([...html.matchAll(ICON_SRC)].map((m) => m[1]))];
  const uris = new Map<string, string>();
  await Promise.all(
    paths.map(async (path) => {
      try {
        const url = new URL(path, origin);
        const res = env.ASSETS === undefined ? await fetch(url) : await env.ASSETS.fetch(url);
        if (!res.ok) return;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        uris.set(path, `data:image/webp;base64,${btoa(bin)}`);
      } catch {
        /* 폴백 = 원경로 */
      }
    }),
  );
  return html.replace(ICON_SRC, (whole, path: string) => {
    const uri = uris.get(path);
    return uri === undefined ? whole : `src="${uri}"`;
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith("/s/")) return next();
  const cache = globalThis.caches?.default;
  const key = new Request(context.url.href);
  if (cache !== undefined) {
    const hit = await cache.match(key);
    if (hit !== undefined) return hit;
  }

  const response = await next();
  if (response.status !== 200) return response;

  const html = await inlineIcons(await response.text(), context.url);
  const out = new Response(html, response);
  out.headers.set("Cache-Control", `public, s-maxage=${TTL_SECONDS}`);
  if (cache !== undefined) await cache.put(key, out.clone());
  return out;
});
