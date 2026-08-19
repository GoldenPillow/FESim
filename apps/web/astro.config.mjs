// @ts-check
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// 빌드 버전 = git 짧은 해시(워터마크 표기 — 승격·실기 대조의 식별자). git 부재 환경은 dev.
let buildVersion = 'dev';
try {
  buildVersion = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* noop */
}

/**
 * 넘버링 세이브의 저장소 미러 — ★대화 앵커의 실체다.
 * 브라우저 저장소는 Claude가 못 읽으므로, dev 서버가 켜져 있는 동안 같은 세이브를
 * data/fe17/saves/{NNN}.eph.json 으로 복제한다("세이브 7 봐줘"가 성립하는 유일한 이유).
 *
 * ☠Astro API 라우트로 만들지 않는다 — 빌드에 실려 CF에 배포되면 무인증 쓰기 경로가 공개되고,
 *   워커에는 애초에 fs가 없다. apply:'serve' = dev 서버에만 존재하고 번들에는 흔적도 남지 않는다.
 * ☠경로는 실행 위치가 소유한다(저장소 절대경로 금지). data/fe17/saves/는 .gitignore 대상 —
 *   추적하면 세이브마다 작업트리가 더러워져 ./dev done의 클린 게이트가 막힌다.
 */
function saveMirror() {
  const dir = fileURLToPath(new URL('../../data/fe17/saves/', import.meta.url));
  const indexPath = `${dir}index.json`;
  /** @param {number} n */
  const pad = (n) => String(n).padStart(3, '0');

  /** @returns {{n: number}[]} */
  const readIndex = () => {
    try {
      const list = JSON.parse(readFileSync(indexPath, 'utf8'));
      return Array.isArray(list) ? list : [];
    } catch {
      return []; // 첫 세이브이거나 손상 — 새로 쓴다(브라우저 쪽이 정본이라 복구할 것이 없다).
    }
  };
  /** @param {{n: number}[]} list */
  const writeIndex = (list) => {
    // 사람과 Claude가 읽는 표라 들여쓴다(.eph 본문은 원문 그대로 = 기보 정본).
    writeFileSync(indexPath, `${JSON.stringify(list, null, 2)}\n`);
  };

  /** @param {import('node:http').IncomingMessage} req @returns {Promise<any>} */
  const body = (req) =>
    new Promise((resolve, reject) => {
      let text = '';
      req.on('data', (/** @type {Buffer} */ c) => (text += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(text));
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

  /** @type {import('vite').Plugin} */
  const plugin = {
    name: 'fesim-save-mirror',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__fesim/save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        void (async () => {
          try {
            const payload = await body(req);
            mkdirSync(dir, { recursive: true });
            if (req.url === '/delete') {
              const n = Number(payload.n);
              rmSync(`${dir}${pad(n)}.eph.json`, { force: true });
              writeIndex(readIndex().filter((s) => s.n !== n));
            } else {
              const { summary, eph } = payload;
              writeFileSync(`${dir}${pad(summary.n)}.eph.json`, eph);
              writeIndex([summary, ...readIndex().filter((s) => s.n !== summary.n)]);
              server.config.logger.info(`[FESim] 세이브 ${pad(summary.n)} 미러 — ${summary.cid} T${summary.turn} ${summary.steps}수`);
            }
            res.statusCode = 204;
            res.end();
          } catch (e) {
            // 미러 실패는 판을 죽이지 않는다 — 세이브는 이미 브라우저에 있다.
            server.config.logger.warn(`[FESim] 세이브 미러 실패: ${e}`);
            res.statusCode = 500;
            res.end();
          }
        })();
      });
    },
  };
  return plugin;
}

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
    plugins: [tailwindcss(), saveMirror()],
    define: { 'import.meta.env.PUBLIC_BUILD': JSON.stringify(buildVersion) }
  }
});
