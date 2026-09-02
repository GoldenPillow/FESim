// fesim-builder Worker — 빌더 단독 공개 채널의 경로 가드(rules/deploy.md §빌더 채널).
// ☠비계: 본체 흡수 시 이 워커를 301 리다이렉트 스텁으로 격하한다(폐기 금지 — 배포된 링크 보호,
//   제거 조건·원칙 = deploy.md §피쳐 채널 원칙, 2026-08-31 사용자 확정).
// 같은 빌드 산출물(dist/client)을 쓰되 허용목록 밖은 전부 404 — fesim 본체(맵·기보·랜딩) 진입 차단.
const ALLOW = [
  /^\/(ko|en|ja)\/fe17\/builder\/?$/,
  /^\/_astro\//,
  /^\/fe17\/assets\/faces\//,
  // 아이템 장착 피쳐 에셋(2026-08-31) — ☠빠뜨리면 아이콘만 조용히 404가 난다(정식판 실사고).
  /^\/fe17\/assets\/items\//,
  /^\/fe17\/assets\/weapontypes\//,
  /^\/fe17\/assets\/engraves\//,
  /^\/fe17\/assets\/efficacy\//,
  // 문장사 반지 피쳐 에셋(2026-08-31) — 등재 규약은 items와 동일(빠뜨리면 조용히 404).
  /^\/fe17\/assets\/rings\//,
  // 스킬 아이콘(고유·계승 스킬 칩, 2026-09-02) — 정식판 첫 게시에서 빠뜨려 아이콘만 404가 났던 실사고 재발.
  /^\/fe17\/assets\/skills\//,
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
