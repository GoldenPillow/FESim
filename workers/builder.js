// fesim-builder Worker — 빌더 단독 공개 채널의 경로 가드(rules/deploy.md §빌더 채널).
// ☠비계: 개발 완료·본체 병합 시 이 워커와 wrangler.builder.jsonc를 폐기한다(제거 조건 = deploy.md).
// 같은 빌드 산출물(dist/client)을 쓰되 허용목록 밖은 전부 404 — fesim 본체(맵·기보·랜딩) 진입 차단.
const ALLOW = [
  /^\/(ko|en|ja)\/fe17\/builder\/?$/,
  /^\/_astro\//,
  /^\/fe17\/assets\/faces\//,
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || /^\/(ko|en|ja)\/?$/.test(url.pathname)) {
      return Response.redirect(new URL("/ko/fe17/builder", url), 302);
    }
    if (ALLOW.some((re) => re.test(url.pathname))) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
