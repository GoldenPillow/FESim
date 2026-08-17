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

const colLabel = (x: number): string => {
  let n = x;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};
const coord = (x: number, y: number): string => `${colLabel(x)}${y + 1}`;

export function chapterNoteView(mapId: string, locale: Locale): ChapterNoteView | undefined {
  const n = notes[mapId];
  if (n === undefined) return undefined;
  const drops = (n.drops.l ?? []).map((d) => `${itemName(locale, d.iid)} — ${personName(locale, d.pid)} ${coord(d.x, d.y)}`);
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
    ...(n.specials.turnLimit?.l !== undefined ? [`⏱${n.specials.turnLimit.l}`] : []),
    ...(n.specials.bossStock ?? []).map((b) => `${personName(locale, b.pid)} +${b.count}`),
  ];
  return { drops, visits, rewards, unlocks, shopNew, rings, joins, cautions };
}
