/**
 * 기보 생성기 — 챕터 하나를 헤드리스로 완주시켜 .eph 기보를 뽑는다(`./dev replay <cid>`).
 *
 * ☠왜 브라우저를 안 쓰나: 이전 기보(m000~m002)는 세션 스크래치의 DOM 드라이버로 만들어져
 * 도구가 사라지자 재제작이 불가능해졌다(2026-08-18). 이 파일은 저장소에 등재된 정본 도구다.
 *
 * ★정합의 뼈대 = **웹과 같은 모듈을 그대로 돌린다**. 유닛 사영·이벤트 배선·기록 계약을 다시 쓰면
 * 도구가 만든 기보와 브라우저 재생이 조용히 어긋난다 — vite ssrLoadModule로 apps/web의
 * boardPropsFor / createBoardStore / eventWiringFor를 **실물 그대로** 불러 쓴다.
 *
 * 자군 = 정책 플레이어(policy.mjs) · 적군 = 엔진 AI(createAi) — 웹의 "적턴 자동"과 같은 루프.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { playerPhase } from "./policy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = resolve(ROOT, "apps/web");
// vite = 이 도구의 의존성(루트 devDependencies) — apps/web의 astro가 쓰는 것과 같은 메이저.
const { createServer } = await import(
  pathToFileURL(createRequire(resolve(ROOT, "package.json")).resolve("vite")).href
);

const args = process.argv.slice(2);
const cid = args.find((a) => !a.startsWith("--"));
if (cid === undefined) {
  console.error("usage: node tools/replay/make.mjs <cid> [--difficulty l] [--locale ko] [--max-turns 40] [--out <path>]");
  process.exit(2);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const difficulty = flag("difficulty", "l");
const locale = flag("locale", "ko");
const maxTurns = Number(flag("max-turns", "40"));
const outPath = resolve(ROOT, flag("out", `data/fe17/replays/${cid}.eph.json`));

const server = await createServer({
  root: WEB,
  configFile: false,
  logLevel: "warn",
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  // @fesim/* 는 워크스페이스 심링크(TS 소스 노출) — 번들이 아니라 소스를 그대로 태운다.
  ssr: { noExternal: [/^@fesim\//] },
  // fengari-web(브라우저 번들)은 Node에서 안 열린다 — 코어 fengari를 되쏘는 대역으로 바꿔 낀다.
  resolve: { alias: { "fengari-web": resolve(ROOT, "tools/replay/fengari-node.mjs") } },
});

try {
  const { boardPropsFor } = await server.ssrLoadModule("/src/lib/fe17.ts");
  const { createBoardStore, calculator } = await server.ssrLoadModule("/src/lib/boardStore.ts");
  const { eventWiringFor } = await server.ssrLoadModule("/src/lib/eventWiring.ts");
  const engine = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/index.ts"));
  const eventsMod = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/events/index.ts"));

  const props = boardPropsFor(cid, locale);
  // 공용 Lua = 브라우저가 /fe17/scripts/에서 fetch하는 것과 같은 파일(경로만 파일시스템).
  const commons = Object.fromEntries(
    (props.script?.commons ?? []).map((name) => [
      name,
      readFileSync(resolve(ROOT, `data/fe17/scripts/${name}.lua`), "utf-8"),
    ]),
  );
  const wiring = eventWiringFor(props, eventsMod, commons);
  const store = createBoardStore(props, undefined, undefined, wiring);
  store.getState().setDifficulty(difficulty);

  const dispatch = (action) => store.getState().dispatch(action);
  const state = () => store.getState().game;

  const ai = engine.createAi(calculator);
  let memory = engine.emptyAiMemory();
  const deficits = [];

  /** 적 페이즈 — BoardIsland.runEnemyAuto와 같은 루프(진행 감시 포함). */
  const enemyPhase = () => {
    for (let guard = 0; guard < 1000; guard++) {
      const before = state();
      if (before.outcome !== undefined || before.phase === 0) return;
      const decision = ai.next(before, { next: (bound) => Math.floor(Math.random() * bound) }, memory);
      memory = decision.memory;
      if (decision.actions.length === 0) {
        for (const d of decision.deficits) deficits.push(d);
        dispatch({ type: "endPhase" });
        return;
      }
      for (const action of decision.actions) dispatch(action);
      if (state() === before && decision.unit !== undefined) {
        memory = { ...memory, skipped: { ...memory.skipped, [decision.unit]: "엔진이 거부한 액션" } };
      }
    }
    deficits.push({ unit: "-", kind: "engine", reason: "적턴 자동이 수렴하지 않았다(1000 액션 초과)" });
  };

  for (let guard = 0; guard < maxTurns * 4; guard++) {
    const before = state();
    if (before.outcome !== undefined) break;
    if (before.turn > maxTurns) break;
    if (before.phase === 0) playerPhase({ store, engine, calculator, dispatch, state, log: (m) => console.error(m) });
    else enemyPhase();
    if (state() === before) {
      // 한 페이즈를 통째로 돌고도 국면이 그대로 = 진행 불가. 침묵 금지.
      deficits.push({ unit: "-", kind: "engine", reason: `페이즈가 진행되지 않았다(turn ${before.turn} phase ${before.phase})` });
      break;
    }
  }

  const final = state();
  const file = store.getState().toFile({
    title: `${cid} ${difficulty} auto`,
    author: "FESim 기보 생성기",
    created: new Date().toISOString(),
  });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(file));

  const nameOf = (u) => props.units[Number(String(u.id).slice(1))]?.name ?? u.id;

  // ★왕복 검증 — 쓴 파일을 **웹과 같은 경로로** 되읽는다: parseEphemeris → 리플레이 스토어 생성.
  //   여기서 걸리면 브라우저에서도 그대로 걸린다(파싱 거부 또는 "기록 열람 모드" 배지).
  const { parseEphemeris } = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/shared/src/index.ts"));
  const reloaded = parseEphemeris(readFileSync(outPath, "utf-8"));
  const check = createBoardStore(props, { file: reloaded }, undefined, wiring);
  const session = check.getState().replay;
  const replayed = check.getState().replay.timeline;

  const report = {
    cid,
    difficulty,
    outcome: final.outcome ?? "미결",
    turn: final.turn,
    steps: file.log.length,
    // ★재생 = 파일을 되읽어 만든 타임라인 기준(웹이 보는 것과 같은 값).
    replaySteps: replayed.steps.length,
    verified: session.verify.ok === true,
    mismatches: session.verify.mismatches.slice(0, 5),
    playerAlive: final.units.filter((u) => u.force === 0 && !u.dead).map(nameOf),
    // ☠자군 전사는 모범답안지의 실격 사유다 — 숫자로 숨기지 말고 이름으로 남긴다.
    playerLost: final.units.filter((u) => u.force === 0 && u.dead).map(nameOf),
    enemyAlive: final.units.filter((u) => u.force === 1 && !u.dead).length,
    deficits: deficits.length,
    out: outPath,
  };
  console.log(JSON.stringify(report, null, 2));
  for (const d of deficits.slice(0, 10)) console.error(`  결손 ${d.unit}: ${d.reason}`);
  // 승리 + 자군 무손실 + 검증 통과가 아니면 실패로 알린다(조용한 합격 금지).
  process.exitCode =
    final.outcome === "victory" && report.playerLost.length === 0 && report.verified ? 0 : 1;
} finally {
  await server.close();
}
