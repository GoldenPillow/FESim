/**
 * 룰북 생성기 — ☠**생성물이지 저작물이 아니다**(MP8 §2-1, 안전 불변식 1).
 *
 * 코드가 단일 진실 정본이므로 룰북은 손으로 쓰지 않는다. 손으로 쓰면 반드시 코드와 어긋나고,
 * 어긋난 룰북으로 쓴 기보는 조용히 틀린다. 여기서 하는 일은 **뽑아내기**뿐이다.
 *
 * ☠못 뽑는 절은 산문으로 채우지 않는다 — `generated: false` + 사유로 **드러낸다**.
 * 룰북의 절반은 "어디를 믿으면 안 되는가"이므로 빈 절을 감추면 룰북 자체가 거짓말이 된다.
 *
 * 산출 = data/fe17/rulebook/{rulebook.json, ko.md, en.md}
 * 실행 = ./dev rulebook   (신선도 게이트 = ./dev gate가 재생성분과 대조)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "data/fe17/rulebook");
const src = (p) => readFileSync(resolve(ROOT, p), "utf-8");

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

try {
  const engine = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/engine/src/index.ts"));
  const shared = await server.ssrLoadModule("/@fs" + resolve(ROOT, "packages/shared/src/index.ts"));

  /** 소스에서 심볼별 RVA 주석을 걷는다 — 룰북이 인용할 **출처**의 원천. */
  const rvasOf = (path) => {
    const text = src(path);
    const found = new Map();
    for (const m of text.matchAll(/`?([A-Za-z_][\w.$<>]*)`?\s*\(?(0x[0-9A-Fa-f]{6,})\)?/g)) {
      if (!found.has(m[2])) found.set(m[2], m[1]);
    }
    return [...found].map(([rva, symbol]) => ({ rva, symbol, file: path }));
  };

  // ── 1. 액션 전수 — 거부 조건은 엔진이 실제로 던지는 문구가 정본이다 ──────────────
  const battleSrc = src("packages/engine/src/battle.ts");
  const rejections = [...battleSrc.matchAll(/throw new Error\(`?"?([^"`)]+)/g)]
    .map((m) => m[1].trim())
    .filter((r) => r.length > 0 && !r.startsWith("$"));
  const actionTypes = Object.keys(shared.ACTION_TYPES ?? {});

  // ── 2. 수치·식 — calculator.xml 원문(우리가 옮겨 적지 않는다) ────────────────────
  const calc = JSON.parse(src("data/fe17/tables/calculator.json"));
  const formulas = Object.entries(calc.formulas).map(([name, body]) => ({
    name,
    expression: typeof body === "string" ? body : JSON.stringify(body),
  }));

  // ── 3. 상수 — 코드의 실값을 그대로 싣는다(B3 자기검증의 대조 대상) ───────────────
  const constants = {
    RULE_VERSION: engine.RULE_VERSION,
    INIT_SPIN: engine.INIT_SPIN,
    BAD_STATE: engine.BAD_STATE,
    BLOW_SCORE: engine.BLOW_SCORE,
    AI_THINK: engine.AI_THINK,
    AI_FLAG: engine.AI_FLAG,
    ATTACK_FLAG: engine.ATTACK_FLAG,
    ACT: engine.ACT,
  };

  // ── 4. 결손 목록 — 장부 전재. ☠룰북의 절반이 이것이다 ──────────────────────────
  const deficits = shared.FIDELITY.map((e) => ({
    id: e.id,
    label: e.label,
    status: e.status,
    evidence: e.evidence,
  }));
  const statusCount = deficits.reduce((a, e) => ({ ...a, [e.status]: (a[e.status] ?? 0) + 1 }), {});

  // ── 5. 계약 예제 — 테스트 이름이 곧 "이 룰이 지켜지는지"의 주소다 ────────────────
  const testFiles = ["battle", "guard", "engage", "staff", "efficacy", "probability", "random", "attackPriority", "enhance", "replay", "ai"];
  const contracts = testFiles.map((f) => {
    const text = src(`packages/engine/tests/${f}.test.ts`);
    return {
      file: `packages/engine/tests/${f}.test.ts`,
      cases: [...text.matchAll(/\bit\(\s*"([^"]+)"/g)].map((m) => m[1]),
    };
  });


  // ── 6. 문장사(엠블렘) 패시브 전수 — ★상시 컨텍스트 주입용(2026-08-19 사용자 지시) ───────
  // 왜 룰북에 박는가: 絆 레벨마다 붙는 패시브가 판정을 바꾸는데(신속 = 추가타, 見切り = 필살 무효)
  // 그 목록이 어디에도 정리돼 있지 않아 **매번 데이터를 다시 뒤지게 된다**. 실측 앵커를 대조할 때
  // "그 수치가 어느 패시브에서 왔는가"를 즉시 못 답하면 엉뚱한 층(스탯 계산 등)을 의심하게 된다.
  // ☠배선 여부는 기계로 판정한다 — `ActName`이 calculator 공식 이름과 일치할 때만 엔진이 질의하고
  //   (calculator.ts:48·84가 그 이름으로 modify를 부른다), `EnhanceValue.*`는 정적 보정으로 항상 산다.
  //   둘 다 아니면 **데이터는 있는데 아무도 안 읽는다** = 조용한 결손이다.
  const godsTable = JSON.parse(src("data/fe17/tables/gods.json"));
  const skillTable = JSON.parse(src("data/fe17/tables/skills.json"));
  const nameKo = JSON.parse(src("data/fe17/names/ko.json"));
  // ☠질의 이름은 공식명이 아니라 **`計算`을 뗀 값 이름**이다(calculator.ts eval: valueName).
  //   `回避値計算` 공식이 있으면 스킬은 `回避値`라는 이름으로 보정에 걸린다 —
  //   이 변환을 빼면 멀쩡히 사는 패시브가 전부 "미배선"으로 잡혀 룰북이 거짓말을 한다.
  const formulaNames = new Set();
  for (const key of Object.keys(calc.formulas)) {
    formulaNames.add(key);
    if (key.endsWith("計算")) formulaNames.add(key.slice(0, -2));
  }
  const ENHANCE_KEYS = ["Hp", "Str", "Tech", "Quick", "Luck", "Def", "Magic", "Mdef", "Phys", "Move"];

  const skillFacts = (sid) => {
    const row = skillTable[sid];
    if (row === undefined) return { sid, missing: true, wired: false };
    const enhances = ENHANCE_KEYS.filter((k) => Number(row[`EnhanceValue.${k}`] ?? 0) !== 0)
      .map((k) => `${k}${row[`EnhanceValue.${k}`] > 0 ? "+" : ""}${row[`EnhanceValue.${k}`]}`);
    const acts = (row.ActNames ?? []).map((n, i) => `${n}${row.ActOperations?.[i] ?? "+"}${row.ActValues?.[i] ?? "0"}`);
    const actWired = (row.ActNames ?? []).filter((n) => formulaNames.has(n));
    const actDead = (row.ActNames ?? []).filter((n) => !formulaNames.has(n));
    return {
      sid,
      name: nameKo[row.Name] ?? row.Name ?? sid,
      ...(enhances.length > 0 ? { enhance: enhances } : {}),
      ...(acts.length > 0 ? { act: acts } : {}),
      ...(row.Condition ? { condition: row.Condition } : {}),
      // 정적 보정이 있거나, 계산값 보정이 실제로 질의되는 공식이면 산다.
      wired: enhances.length > 0 || actWired.length > 0,
      ...(actDead.length > 0 ? { unreadActNames: actDead } : {}),
    };
  };

  const emblems = Object.entries(godsTable.gods)
    .filter(([, g]) => godsTable.growth[String(g.GrowTable ?? "")] !== undefined)
    .map(([gid, g]) => {
      const table = godsTable.growth[String(g.GrowTable)];
      const levels = Object.keys(table)
        .sort((a, b) => Number(a) - Number(b))
        .map((lv) => {
          const row = table[lv];
          const pick = (key) => (row[key] ?? []).map(skillFacts);
          const sync = pick("SynchroSkills");
          const eng = pick("EngageSkills");
          if (sync.length === 0 && eng.length === 0) return undefined;
          return { bond: Number(lv), ...(sync.length > 0 ? { synchro: sync } : {}), ...(eng.length > 0 ? { engaged: eng } : {}) };
        })
        .filter((r) => r !== undefined);
      return { gid, name: nameKo[g.Mid] ?? g.Gid ?? gid, levels };
    })
    .filter((e) => e.levels.length > 0);

  /**
   * ☠아무도 안 읽는 패시브 = **효과 값을 들고 있는데 엔진이 그 이름을 질의하지 않는** 것만 센다.
   * 효과 필드가 아예 없는 스킬(특효 마스크·GiveSids·조건부 부여 등 다른 경로로 작동)은
   * 여기 넣지 않는다 — 넣으면 결손 목록이 부풀어 **진짜 결손이 묻힌다**.
   */
  const unwiredPassives = [];
  const outOfScope = new Set();
  for (const e of emblems) {
    for (const lv of e.levels) {
      for (const kind of ["synchro", "engaged"]) {
        for (const s of lv[kind] ?? []) {
          if (s.wired) continue;
          if (s.unreadActNames === undefined) {
            outOfScope.add(s.sid); // 이 판정 기준 밖(다른 메커니즘) — 결손이 아니라 미판정이다
            continue;
          }
          unwiredPassives.push({ gid: e.gid, bond: lv.bond, kind, sid: s.sid, name: s.name, unreadActNames: s.unreadActNames });
        }
      }
    }
  }

  const section = (id, ko, en, generated, payload, sources = [], why) => ({
    id,
    title: { ko, en },
    generated,
    ...(generated ? {} : { ungeneratedReason: why }),
    ...payload,
    sources,
  });

  const sections = [
    section("grammar", "판의 문법", "Board grammar", true, {
      coordinates: "인게임 (X, Z) — 좌하단 원점. 표기 정본 = apps/web/src/lib/grid.ts coordLabel",
      phases: "force 오름차순 순환(0 자군 · 1 적군 · 2 우군). 한 바퀴 = 1턴",
      activation: "유닛당 이동 1회 + 행동 1회. 행동이 재이동 창을 연다(moved 해제)",
      ruleVersion: engine.RULE_VERSION,
    }, rvasOf("packages/engine/src/battle.ts").slice(0, 12)),

    section("actions", "액션 전수", "Action inventory", true, {
      types: actionTypes,
      rejections,
      note: "거부 문구는 엔진이 실제로 던지는 것 그대로다 — 산문 요약이 아니다",
    }),

    section("numbers", "수치·식", "Formulas", true, {
      formulaCount: formulas.length,
      formulas,
      hitCurve: "명중은 sin 리맵(51~99만 상향, 100은 예외) — formula/probability.ts hitThreshold10000",
      probability: "일반 확률은 percent*1000 > roll(0..99999), ☠percent<=0이면 굴림 자체가 없다",
    }),

    section("rng", "난수 계통", "RNG", true, {
      prng: "xorshift128(Marsaglia) — t = x^(x<<11); t ^= t>>>8; t ^= w^(w>>>19)",
      seeding: `MT식 시딩(1812433253) + 시딩 뒤 공전 ${engine.INIT_SPIN}회`,
      rewind: "되감기 = 상태 4워드 복원. 굴림 1회 = 전진 1회이므로 '시드 + 남은 롤 수 공전'과 등가",
      quirks: [
        "GetValue(0)은 예외가 아니라 원값(aarch64 sdiv 0)",
        "IsProbability100(pct<=0)·GetIndex(빈 표)는 굴림을 소비하지 않는다",
      ],
    }, rvasOf("packages/engine/src/random.ts")),

    section("enemy-ai", "적 AI", "Enemy AI", true, {
      priorityLadder: [
        "S0 첫 후보는 무조건 채택(target.Unit == null)",
        "S1 Decoy 하드 게이트 — 즉시 return, OR에 넣지 않는다",
        "S2 Bullet 적합성 · S3 ChainAttackCount · S4 Blow · S5 Command(맨해튼, v1 좌표)",
        "S6 넷 중 하나라도 우세면 스코어를 보지 않고 채택",
        "S7 Score는 uint 단일 무부호 비교 — ☠다필드 사전식이 아니다",
        "S8 동점이면 Random.System.GetValue(2)==0에서 새 후보",
      ],
      thinkModes: engine.AI_THINK,
      opcodes: engine.ACT,
    }, rvasOf("packages/engine/src/ai/attack.ts")),

    section("constants", "상수", "Constants", true, { constants }),

    section(
      "emblems",
      "문장사 패시브",
      "Emblem passives",
      true,
      {
        note:
          "絆 레벨마다 붙는 싱크로(상시)·인게이지(발동 중) 패시브 전수. wired=false는 데이터는 있는데 " +
          "엔진이 읽지 않는다는 뜻이다 — ActName이 calculator 공식 이름과 일치할 때만 질의되기 때문이다.",
        emblems,
        unwiredCount: unwiredPassives.length,
        unwired: unwiredPassives,
        outOfScopeCount: outOfScope.size,
        outOfScopeNote:
          "효과 필드(EnhanceValue·ActNames)가 없어 이 기준으로는 판정할 수 없는 스킬 수. " +
          "특효 마스크·GiveSids 등 다른 경로로 작동하며, 결손이라는 뜻이 아니다.",
      },
      [
        { file: "data/fe17/tables/gods.json", what: "絆 성장표(SynchroSkills·EngageSkills)" },
        { file: "data/fe17/tables/skills.json", what: "스킬 행 원형" },
        { file: "packages/engine/src/formula/calculator.ts", what: "modify 질의 = 배선 판정 기준" },
      ],
    ),

    section("contracts", "계약 예제", "Contract examples", true, { contracts }),

    section("deficits", "결손 목록", "Known gaps", true, {
      statusCount,
      note: "☠status가 anchored가 아닌 항목은 '여기는 실기와 다를 수 있다'는 뜻이다",
      entries: deficits,
    }),

    section("items-shop", "아이템·상점·경제", "Items, shops, economy", false, {}, [],
      "선행 = items.json의 UseType·Enhance 사영과 chapternotes 상점 확장(MP8 A8 §5 산출 스키마). 파이프라인이 아직 안 싣는다"),

    section("strategy", "전략 규약", "Strategy rules", false, {}, [],
      "선행 = C 전략 엔진(packages/engine/src/strategy/). 코드가 없으므로 뽑을 것이 없다 — ☠산문으로 채우면 이중화다"),
  ];

  const book = {
    game: "fe17",
    ruleVersion: engine.RULE_VERSION,
    generatedBy: "tools/rulebook/build.mjs",
    generatedFrom: [
      "packages/engine/src/**",
      "packages/shared/src/fidelity.ts",
      "data/fe17/tables/calculator.json",
      "packages/engine/tests/**",
    ],
    sections,
  };

  const check = process.argv.includes("--check");
  const jsonText = JSON.stringify(book, null, 2) + "\n";

  // ── 마크다운 렌더 ────────────────────────────────────────────────────────────
  const render = (lang) => {
    const t = (ko, en) => (lang === "ko" ? ko : en);
    const out = [];
    out.push(`# ${t("FESim 룰북", "FESim Rulebook")} — fe17 / ${engine.RULE_VERSION}`);
    out.push("");
    out.push(t(
      "☠**이 문서는 생성물이다.** `./dev rulebook`이 코드에서 뽑아낸다 — 손으로 고치면 다음 생성에서 사라진다.",
      "☠**Generated document.** `./dev rulebook` extracts it from code — hand edits are lost on regeneration.",
    ));
    out.push("");
    for (const s of book.sections) {
      out.push(`## ${s.title[lang]}`);
      if (!s.generated) {
        out.push("");
        out.push(t(`☠**미생성** — ${s.ungeneratedReason}`, `☠**Not generated** — ${s.ungeneratedReason}`));
        out.push("");
        continue;
      }
      out.push("");
      out.push("```json");
      const { id, title, generated, sources, ...body } = s;
      out.push(JSON.stringify(body, null, 2));
      out.push("```");
      if (sources.length > 0) {
        out.push("");
        out.push(t("**출처**", "**Sources**") + ": " + sources.map((r) => `\`${r.symbol}\` ${r.rva}`).join(" · "));
      }
      out.push("");
    }
    return out.join("\n");
  };

  const outputs = [
    ["rulebook.json", jsonText],
    ["ko.md", render("ko")],
    ["en.md", render("en")],
  ];

  if (check) {
    // ☠신선도 게이트 — **낡은 룰북은 없는 룰북보다 나쁘다**(틀린 근거를 주니까).
    const stale = [];
    for (const [name, want] of outputs) {
      let have = null;
      try {
        have = readFileSync(resolve(OUT, name), "utf-8");
      } catch {
        stale.push(`${name}: 없음`);
        continue;
      }
      if (have !== want) stale.push(`${name}: 코드와 불일치`);
    }
    if (stale.length > 0) {
      console.error(`[rulebook] ☠낡았다 — ${stale.join(" · ")}`);
      console.error("[rulebook] 고치는 법 = ./dev rulebook (코드에서 재생성)");
      process.exitCode = 1;
    } else {
      console.error("[rulebook] 신선함 — 코드 재생성분과 일치");
    }
  } else {
    mkdirSync(OUT, { recursive: true });
    for (const [name, text] of outputs) writeFileSync(resolve(OUT, name), text);
  }

  if (!check) {

    const generated = sections.filter((s) => s.generated).length;
    console.error(
      `[rulebook] ${engine.RULE_VERSION} · 절 ${sections.length}(생성 ${generated} · 미생성 ${sections.length - generated})` +
        ` · 식 ${formulas.length} · 장부 ${deficits.length} · 액션 ${actionTypes.length}`,
    );
    console.log(resolve(OUT, "rulebook.json"));
  }
} finally {
  await server.close();
}
