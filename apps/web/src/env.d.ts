/**
 * 워커 런타임 바인딩의 **구조적 최소 선언** — @cloudflare/workers-types를 끌어오지 않는다.
 * 계약의 정본은 wrangler.jsonc(어떤 바인딩이 있나)와 @fesim/api(레코드가 무엇인가)다.
 * 옵셔널로 두는 이유: astro dev 폴백 경로가 바인딩 부재를 명시적으로 다뤄야 하기 때문(조용한 undefined 금지).
 */
declare module "cloudflare:workers" {
  export const env: {
    LINKS?: { get(key: string): Promise<string | null> };
    ASSETS?: { fetch(input: Request | URL | string): Promise<Response> };
  };
}
