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
import { OpeningError, loadOpening } from "./opening.mjs";
import { playerPhase } from "./policy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = resolve(ROOT, "apps/web");
// vite = 이 도구의 의존성(루트 devDependencies) — apps/web의 astro가 쓰는 것과 같은 메이저.
const { createServer } = await import(
  pathToFileURL(createRequire(resolve(ROOT, "package.json")).resolve("vite")).href
);

/** mulberry32 — 시드 하나로 재현되는 32비트 PRNG(암호용 아님, 판 재현용). */
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return {
    next: (bound) => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * bound);
    },
  };
};

const args = process.argv.slice(2);
const cid = args.find((a) => !a.startsWith("--"));
if (cid === undefined) {
  console.error("usage: node tools/replay/make.mjs <cid> [--difficulty l] [--locale ko] [--max-turns 40] [--carry <앞 챕터 eph.json>] [--seed <정수>] [--out <path>] [--no-opening] [--opening-check]");
  process.exit(2);
}
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const difficulty = flag("difficulty", "l");
// 챕터 인계(MP5) — 앞 챕터 기보의 종료 국면에서 자군 로스터를 뽑아 이 판의 setup으로 넣는다.
const carryPath = flag("carry", undefined);
const locale = flag("locale", "ko");
// ☠재현 가능한 판 = 시드 필수. 생략하면 Math.random(매 실행 다른 판)이라 **회귀 판정이 못 선다** —
// 재생은 기록된 rolls로 결정론이지만 생성은 아니다(2026-08-18 m003 오진: 코드 회귀로 보인 것이 표본 1개였다).
// 자군(스토어)·적군(AI)이 같은 스트림을 쓰면 한쪽 행동 수가 바뀔 때 반대편까지 어긋나므로 스트림을 나눈다.
const seedArg = flag("seed", undefined);
const maxTurns = Number(flag("max-turns", "40"));
const outPath = resolve(ROOT, flag("out", `data/fe17/replays/${cid}.eph.json`));
// 오프닝 스크립트(design/opening_script.md) — 사람이 적은 정석 수순. `--no-opening`은 휴리스틱만 돌려
// 수순의 효과를 대조하는 스위치고, `--opening-check`는 해석 결과만 보고 **파일을 쓰지 않는다**(수순 검수).
const openingCheck = args.includes("--opening-check");
const opening = args.includes("--no-opening") ? undefined : loadOpening(ROOT, cid);
const liveRng = { next: (bound) => Math.floor(Math.random() * bound) };
const seed = seedArg === undefined ? undefined : Number(seedArg);
const playerRng = seed === undefined ? liveRng : mulberry32(seed);
const enemyRng = seed === undefined ? liveRng : mulberry32(seed ^ 0x9e3779b9);

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
  const { createBoardStore, calculator, displayState } = await server.ssrLoadModule("/src/lib/boardStore.ts");
  const { eventWiringFor } = await server.ssrLoadModule("/src/lib/eventWiring.ts");
  const engine = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/index.ts"));
  const eventsMod = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/events/index.ts"));

  const props = boardPropsFor(cid, locale);
  const { parseEphemeris: parseEph } = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/shared/src/index.ts"));

  /** 공용 Lua 반입 — 브라우저가 /fe17/scripts/에서 fetch하는 것과 같은 파일(경로만 파일시스템). */
  const commonsOf = (p) =>
    Object.fromEntries(
      (p.script?.commons ?? []).map((name) => [
        name,
        readFileSync(resolve(ROOT, `data/fe17/scripts/${name}.lua`), "utf-8"),
      ]),
    );

  /**
   * 앞 챕터 기보 → 이 판의 setup. 재생은 **웹과 같은 경로**로 한다(리플레이 스토어 + 커서 끝).
   * ☠기보를 다시 돌리는 것이지 국면을 상상하는 게 아니다 — 인계값의 출처는 항상 실기보다.
   */
  const carrySetup = async () => {
    if (carryPath === undefined) return undefined;
    const prevFile = parseEph(readFileSync(resolve(ROOT, carryPath), "utf-8"));
    const prevProps = boardPropsFor(prevFile.chapter.cid, locale);
    const prevWiring = eventWiringFor(prevProps, eventsMod, commonsOf(prevProps));
    const prevStore = createBoardStore(prevProps, { file: prevFile }, prevFile.setup, prevWiring);
    prevStore.getState().seek(prevFile.log.length);
    // ☠커서 국면은 displayState가 소유한다 — store.game은 리플레이 모드에서 **초기 국면**이다
    //   (그걸 읽으면 경험치·레벨이 통째로 0인 로스터가 조용히 인계된다).
    const roster = engine.carryover(displayState(prevStore.getState()));
    console.error(`carry: ${prevFile.chapter.cid} → ${cid} · 인계 ${Object.keys(roster).length}명`);
    return { units: roster };
  };
  // 공용 Lua = 브라우저가 /fe17/scripts/에서 fetch하는 것과 같은 파일(경로만 파일시스템).
  const commons = Object.fromEntries(
    (props.script?.commons ?? []).map((name) => [
      name,
      readFileSync(resolve(ROOT, `data/fe17/scripts/${name}.lua`), "utf-8"),
    ]),
  );
  const wiring = eventWiringFor(props, eventsMod, commons);
  const setup = await carrySetup();
  const store = createBoardStore(props, undefined, setup, wiring, playerRng);
  store.getState().setDifficulty(difficulty);

  const dispatch = (action) => store.getState().dispatch(action);
  const state = () => store.getState().game;

  const ai = engine.createAi(calculator);
  let memory = engine.emptyAiMemory();
  const deficits = [];
  // ★자동화율의 분모 — 결손 건수만으로는 "많이 틀렸다"와 "판이 컸다"를 구분 못 한다(MP7 B4).
  let aiCalls = 0;

  /** 적 페이즈 — BoardIsland.runEnemyAuto와 같은 루프(진행 감시 포함). */
  const enemyPhase = () => {
    for (let guard = 0; guard < 1000; guard++) {
      const before = state();
      if (before.outcome !== undefined || before.phase === 0) return;
      const decision = ai.next(before, enemyRng, memory);
      aiCalls += 1;
      memory = decision.memory;
      if (decision.actions.length === 0) {
        for (const d of decision.deficits) deficits.push(d);
        dispatch({ type: "endPhase" });
        return;
      }
      if (process.env.FESIM_AI_TRACE !== undefined) {
        const u = before.units.find((x) => x.id === decision.unit);
        if (u !== undefined && String(u.pid).includes(process.env.FESIM_AI_TRACE)) {
          console.error("AITRACE", u.pid, "ai=", JSON.stringify(u.ai), "actions=", JSON.stringify(decision.actions));
        }
      }
      for (const action of decision.actions) dispatch(action);
      if (state() === before && decision.unit !== undefined) {
        memory = { ...memory, skipped: { ...memory.skipped, [decision.unit]: "엔진이 거부한 액션" } };
      }
    }
    deficits.push({ unit: "-", kind: "engine", reason: "적턴 자동이 수렴하지 않았다(1000 액션 초과)" });
  };

  try {
  for (let guard = 0; guard < maxTurns * 4; guard++) {
    const before = state();
    if (before.outcome !== undefined) break;
    if (before.turn > maxTurns) break;
    if (before.phase === 0)
      playerPhase({
        store,
        engine,
        calculator,
        dispatch,
        state,
        log: (m) => console.error(m),
        opening,
        cid,
        openingVerbose: openingCheck,
      });
    else enemyPhase();
    if (state() === before) {
      // 한 페이즈를 통째로 돌고도 국면이 그대로 = 진행 불가. 침묵 금지.
      deficits.push({ unit: "-", kind: "engine", reason: `페이즈가 진행되지 않았다(turn ${before.turn} phase ${before.phase})` });
      break;
    }
  }
  } catch (e) {
    // ☠오프닝이 어긋나면 **기보를 쓰지 않는다**(설계 §6-A) — 잘못된 수순의 산물이 정본이 되면
    //   그 뒤 사슬 전체가 그 위에 쌓인다. 사유만 남기고 실패로 끝낸다.
    if (!(e instanceof OpeningError)) throw e;
    console.error(`☠ ${e.message}`);
    process.exitCode = 1;
    await server.close();
    process.exit(1);
  }

  const final = state();
  const file = store.getState().toFile({
    title: `${cid} ${difficulty} auto`,
    author: "FESim 기보 생성기",
    created: new Date().toISOString(),
  });
  if (!openingCheck) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(file));
  }

  const nameOf = (u) => props.units[Number(String(u.id).slice(1))]?.name ?? u.id;

  // ★왕복 검증 — 쓴 파일을 **웹과 같은 경로로** 되읽는다: parseEphemeris → 리플레이 스토어 생성.
  //   여기서 걸리면 브라우저에서도 그대로 걸린다(파싱 거부 또는 "기록 열람 모드" 배지).
  const reloaded = parseEph(openingCheck ? JSON.stringify(file) : readFileSync(outPath, "utf-8"));
  const check = createBoardStore(props, { file: reloaded }, reloaded.setup, wiring);
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
    // ★결손은 비율로 읽어야 한다 — 분모(비자군 유닛 수·AI 호출 수)를 함께 낸다(MP7 B4 재측정).
    aiUnits: final.units.filter((u) => u.force !== 0).length,
    aiCalls,
    deficits: deficits.length,
    deficitUnits: new Set(deficits.map((d) => d.unit)).size,
    deficitKinds: Object.fromEntries(
      Object.entries(deficits.reduce((acc, d) => ({ ...acc, [d.kind]: (acc[d.kind] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]),
    ),
    deficitReasons: Object.fromEntries(
      Object.entries(deficits.reduce((acc, d) => ({ ...acc, [d.reason]: (acc[d.reason] ?? 0) + 1 }), {}))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
    ),
    out: openingCheck ? "(opening check — 미기록)" : outPath,
  };
  console.log(JSON.stringify(report, null, 2));
  for (const d of deficits.slice(0, 10)) console.error(`  결손 ${d.unit}: ${d.reason}`);
  // 승리 + 자군 무손실 + 검증 통과가 아니면 실패로 알린다(조용한 합격 금지).
  process.exitCode =
    final.outcome === "victory" && report.playerLost.length === 0 && report.verified ? 0 : 1;
} finally {
  await server.close();
}
