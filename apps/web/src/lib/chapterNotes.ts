import { coordLabel } from "./grid";
import chapternotesRaw from "../../../../data/fe17/tables/chapternotes.json?raw";
import { label, persons } from "./fe17";
import type { Locale } from "./i18n";

/**
 * 챕터 노트(chapternotes.json — tools/pipeline/build_notes.py 산출) 표시 사영.
 * ☠SSG 전용(fe17.ts와 동급) — 아일랜드·워커 반입 금지. 표시명은 여기서 전부 굳힌다.
 */

interface RawNotes {
  cid: string;
  drops: Record<"n" | "h" | "l", { iid: string; pid: string; x: number; y: number }[]>;
  visitRewards: { x: number; y: number; iid?: string; gold?: number }[];
  eventRewards?: { iid?: string; gold?: number; note?: string }[];
  unlocks: { tutid: string; mid: string; text?: Partial<Record<Locale, string>> }[];
  shopNew: Partial<Record<"weapon" | "item" | "fleaMarket", { iid: string; stock: number }[]>>;
  rings: { gain: string[]; lose: string[]; regain: string[] };
  joins: string[];
  specials: {
    trapVisits?: { x: number; y: number }[];
    turnLimit?: { n?: number; h?: number; l?: number };
    bossStock?: { pid: string; count: number }[];
    gold?: number;
    conditionalRewards?: { condition: string; items?: string[]; iid?: string; where?: string }[];
  };
}

const notes = JSON.parse(chapternotesRaw) as Record<string, RawNotes>;

const items = (() => {
  const glob = import.meta.glob("../../../../data/fe17/tables/items.json", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;
  const raw = Object.values(glob).at(0);
  return raw === undefined ? {} : (JSON.parse(raw) as Record<string, { Name?: string }>);
})();

const gods = (() => {
  const glob = import.meta.glob("../../../../data/fe17/tables/gods.json", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;
  const raw = Object.values(glob).at(0);
  return raw === undefined
    ? {}
    : (JSON.parse(raw) as { gods: Record<string, { Name?: string }> }).gods ?? {};
})();

const strip = (id: string): string => id.replace(/^[A-Z]+_/, "");
const itemName = (locale: Locale, iid: string): string => label(locale, items[iid]?.Name) ?? strip(iid);
const personName = (locale: Locale, pid: string): string =>
  label(locale, (persons[pid] as { Name?: string } | undefined)?.Name) ?? strip(pid);
const godName = (locale: Locale, gid: string): string => label(locale, gods[gid]?.Name) ?? strip(gid);

export interface ChapterNoteView {
  /** 루나틱 기준 드랍 — "표시명 — 인물명" */
  drops: string[];
  /** 이 뷰가 어느 난이도 기준인가 — 화면이 밝혀야 할 값. */
  difficulty: "n" | "h" | "l";
  /** 드랍이 난이도마다 다른가 — 참이면 라벨에 기준을 병기한다(안 하면 조용한 거짓말이 된다). */
  dropsVaryByDifficulty: boolean;
  /** 민가 보상 — 좌표 라벨 포함(보드 좌표 표기) */
  visits: string[];
  /** 이벤트·클리어 입수(絆 골드 포함) */
  rewards: string[];
  unlocks: string[];
  shopNew: { kind: string; entries: string[] }[];
  rings: { gain: string[]; lose: string[]; regain: string[] };
  joins: string[];
  cautions: string[];
}

// ☠좌표 표기는 `grid.ts`가 단일 정본이다 — 여기 사본을 두었더니 정본이 인게임 (X, Z)로 바뀐 뒤에도
//   챕터 노트만 옛 체스식(H5·O11)으로 남아 화면 안에서 두 표기가 섞였다(2026-08-18 실측).
const coord = coordLabel;

/**
 * ☠난이도 인자를 받는다 — 드랍·턴제한은 **난이도마다 다르다**(전 챕터 n180/h168/l171건).
 * 종전에는 `.l`(루나틱)만 읽고 라벨은 그냥 "드랍"이라 **노멀 플레이어에게 루나틱 드랍을 사실로 보여줬다**
 * (2026-08-19 MP8 A8 전수에서 적발). 화면이 조용히 거짓말하던 자리라 인자를 강제한다.
 * ⚠현행 호출부(맵 페이지)는 정적 렌더라 보드 기본값 `l`을 넘긴다 — 사용자가 난이도를 바꿔도
 * 노트는 따라가지 않는다. 그래서 `difficulty`를 뷰에 실어 **화면이 기준을 밝히도록** 한다.
 */
export function chapterNoteView(
  mapId: string,
  locale: Locale,
  difficulty: "n" | "h" | "l" = "l",
): ChapterNoteView | undefined {
  const n = notes[mapId];
  if (n === undefined) return undefined;
  const drops = (n.drops[difficulty] ?? []).map((d) => `${itemName(locale, d.iid)} — ${personName(locale, d.pid)} ${coord(d.x, d.y)}`);
  // 난이도별로 내용이 갈리는가 — 갈리면 화면이 기준(난이도)을 밝혀야 한다.
  const dropsVaryByDifficulty =
    new Set((["n", "h", "l"] as const).map((d) => JSON.stringify(n.drops[d] ?? []))).size > 1;
  const visits = (n.visitRewards ?? []).map((v) =>
    `${coord(v.x, v.y)}: ${v.gold !== undefined ? `${v.gold.toLocaleString()}G` : itemName(locale, v.iid ?? "")}`,
  );
  const rewards = [
    ...(n.specials.gold !== undefined ? [`${n.specials.gold.toLocaleString()}G`] : []),
    ...(n.eventRewards ?? []).map((r) =>
      r.gold !== undefined ? `${r.gold.toLocaleString()}G` : itemName(locale, r.iid ?? ""),
    ),
    ...(n.specials.conditionalRewards ?? []).map((c) => {
      const its = c.items ?? (c.iid !== undefined ? [c.iid] : []);
      return `${its.map((i) => itemName(locale, i)).join(", ")} (${c.condition})`;
    }),
  ];
  const unlocks = n.unlocks.map((u) => u.text?.[locale] ?? label(locale, u.mid) ?? u.tutid.replace(/^TUTID_/, ""));
  const shopNew = Object.entries(n.shopNew)
    .filter(([, list]) => (list?.length ?? 0) > 0)
    .map(([kind, list]) => ({
      kind,
      entries: (list ?? []).map((e) => `${itemName(locale, e.iid)}${e.stock > 0 ? ` ×${e.stock}` : ""}`),
    }));
  const rings = {
    gain: n.rings.gain.map((g) => godName(locale, g)),
    lose: n.rings.lose.map((g) => godName(locale, g)),
    regain: n.rings.regain.map((g) => godName(locale, g)),
  };
  const joins = n.joins.map((p) => personName(locale, p));
  const cautions = [
    ...(n.specials.trapVisits ?? []).map((v) => `☠${coord(v.x, v.y)}`),
    ...(n.specials.turnLimit?.[difficulty] !== undefined ? [`⏱${n.specials.turnLimit[difficulty]}`] : []),
    ...(n.specials.bossStock ?? []).map((b) => `${personName(locale, b.pid)} +${b.count}`),
  ];
  return { drops, dropsVaryByDifficulty, difficulty, visits, rewards, unlocks, shopNew, rings, joins, cautions };
}
