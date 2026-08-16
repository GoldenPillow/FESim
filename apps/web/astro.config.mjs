// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // 전 페이지 SSG 유지(기본 output=static) — 온디맨드는 prerender=false를 선언한 /s/[id]뿐이다.
  // 워커 설정 정본은 저장소 루트의 wrangler.jsonc(배포 단위가 저장소 루트라서 어댑터에 경로를 준다).
  // imageService=passthrough — astro:assets를 쓰지 않으므로 유료 Cloudflare Images 바인딩을 만들지 않는다.
  adapter: cloudflare({ configPath: '../../wrangler.jsonc', imageService: 'passthrough' }),

  // 세션 미사용 — 켜두면 어댑터가 SESSION KV 바인딩을 자동 프로비저닝한다(쓰지 않는 바인딩은 만들지 않는다).
  session: false,

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});
