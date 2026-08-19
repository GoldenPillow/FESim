/**
 * 저장소 기보 신선도 검사 — `./dev replay:verify` (게이트가 부른다).
 *
 * ☠**이 검사가 없어서 사고가 났다**(2026-08-19): RULE_VERSION을 fe17-14로 올리고 기보를 안 고쳤는데
 * 아무것도 빨개지지 않았다. 맵 진입은 기본 기보를 자동 재생하므로(BoardIsland) **모든 맵의 첫 화면**이
 * 낡은 기록이 되고 배지만 `검증됨` → `기록만`으로 조용히 내려앉는다 — 사용자가 우연히 보기 전엔 모른다.
 *
 * 검사 2단 (얕은 쪽이 게이트, 깊은 쪽은 `--deep`):
 *  (1) ruleVersion == RULE_VERSION — 파일만 읽으면 되므로 사실상 공짜다.
 *  (2) --deep: 웹과 같은 경로로 되읽어 재계산 일치(verify)까지 본다. vite 모듈 반입이 필요해 초 단위다.
 *      룰을 안 올린 채 거동만 바꾼 회귀는 (1)이 못 잡으므로 이쪽이 진짜 그물이다.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = resolve(ROOT, "data/fe17/replays");
const deep = process.argv.includes("--deep");

const files = readdirSync(DIR).filter((f) => f.endsWith(".eph.json")).sort();
if (files.length === 0) {
  console.error("☠ 기보가 없다 — data/fe17/replays/ 가 비었다");
  process.exit(1);
}

const { createServer } = await import(
  pathToFileURL(createRequire(resolve(ROOT, "package.json")).resolve("vite")).href
);
const server = await createServer({
  root: resolve(ROOT, "apps/web"),
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  ssr: { noExternal: [/^@fesim\//] },
  resolve: { alias: { "fengari-web": resolve(ROOT, "tools/replay/fengari-node.mjs") } },
});

let bad = 0;
try {
  const { RULE_VERSION } = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/index.ts"));
  const web = deep ? await server.ssrLoadModule("/src/lib/boardStore.ts") : undefined;
  const fe17 = deep ? await server.ssrLoadModule("/src/lib/fe17.ts") : undefined;
  const wiringMod = deep ? await server.ssrLoadModule("/src/lib/eventWiring.ts") : undefined;
  const eventsMod = deep
    ? await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/events/index.ts"))
    : undefined;
  const shared = deep
    ? await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/shared/src/index.ts"))
    : undefined;

  for (const name of files) {
    const raw = readFileSync(resolve(DIR, name), "utf-8");
    const file = JSON.parse(raw);
    if (file.ruleVersion !== RULE_VERSION) {
      console.error(`  ☠ ${name}: ruleVersion ${file.ruleVersion} ≠ ${RULE_VERSION} — ./dev replay 로 다시 만들어라`);
      bad += 1;
      continue;
    }
    if (!deep) {
      console.log(`  · ${name}: ${file.ruleVersion} · ${file.log.length}스텝`);
      continue;
    }
    const parsed = shared.parseEphemeris(raw);
    const props = fe17.boardPropsFor(parsed.chapter.cid, "ko");
    const commons = Object.fromEntries(
      (props.script?.commons ?? []).map((n) => [n, readFileSync(resolve(ROOT, `data/fe17/scripts/${n}.lua`), "utf-8")]),
    );
    const store = web.createBoardStore(props, { file: parsed }, parsed.setup, wiringMod.eventWiringFor(props, eventsMod, commons));
    const { verify } = store.getState().replay;
    if (verify.ok === true) {
      console.log(`  · ${name}: ${file.ruleVersion} · ${file.log.length}스텝 · verified`);
    } else {
      console.error(`  ☠ ${name}: 재계산 불일치 ${verify.mismatches.length}건 — ${JSON.stringify(verify.mismatches[0])}`);
      bad += 1;
    }
  }
} finally {
  await server.close();
}

if (bad > 0) {
  console.error(`☠ ./dev replay:verify: 기보 ${bad}/${files.length}건이 낡았다`);
  process.exit(1);
}
console.log(`== ./dev replay:verify: 기보 ${files.length}건 신선${deep ? " · 재계산 일치" : ""} ==`);
