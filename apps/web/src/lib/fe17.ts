import type { ChapterData, DisposUnit, MapObject } from "@fesim/shared";
import terrainRaw from "../../../../data/fe17/tables/terrain.json?raw";
import personsRaw from "../../../../data/fe17/tables/persons.json?raw";
import jobsRaw from "../../../../data/fe17/tables/jobs.json?raw";
import namesEnRaw from "../../../../data/fe17/names/en.json?raw";
import namesKoRaw from "../../../../data/fe17/names/ko.json?raw";
import type { Locale } from "./i18n";

/** 상하 반전이 화면 정본(실기 대조 확정) — 데이터 (0,0) = 화면 좌하단. */
export const FLIP_X = false;
export const FLIP_Y = true;

export interface TerrainRow {
  Tid: string;
  Name: string;
  ColorR: number;
  ColorG: number;
  ColorB: number;
  Prohibition: number;
}

export interface PersonRow {
  Pid: string;
  Fid: string;
  Name: string;
  Jid: string;
  Level: number;
}

export interface JobRow {
  Jid: string;
  Name: string;
}

/** tools/pipeline bake_assets.py가 만드는 에셋 목록(없으면 폴백 렌더). */
export interface MapIconEntry {
  defaultWeapon: string;
  weapons: Record<string, string>;
}

export interface AssetManifest {
  mapicons?: { byPid?: Record<string, MapIconEntry> };
  faces?: Record<string, string>;
}

/** items.json·skills.json은 파이프라인 병렬 작업물 — Name(메시지 라벨)만 쓴다. */
interface NamedRow {
  Name?: string;
}

const parse = <T,>(raw: string): T => JSON.parse(raw) as T;

const optional = <T,>(glob: Record<string, string>): T | undefined =>
  Object.values(glob)
    .map((raw) => parse<T>(raw))
    .at(0);

/** 챕터 JSON은 파일이 곧 라우트다 — 새 챕터를 넣으면 페이지가 자동 생성된다. */
const chapterGlob = import.meta.glob("../../../../data/fe17/chapters/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export const chapters: Record<string, ChapterData> = Object.fromEntries(
  Object.entries(chapterGlob).map(([path, raw]) => [
    path.replace(/^.*\//, "").replace(/\.json$/, ""),
    parse<ChapterData>(raw),
  ]),
);

export const mapIds: string[] = Object.keys(chapters).sort();

export const terrain = parse<Record<string, TerrainRow>>(terrainRaw);
export const persons = parse<Record<string, PersonRow>>(personsRaw);
export const jobs = parse<Record<string, JobRow>>(jobsRaw);

const DICTS: Record<Locale, Record<string, string>> = {
  en: parse<Record<string, string>>(namesEnRaw),
  ko: parse<Record<string, string>>(namesKoRaw),
};

export const manifest: AssetManifest =
  optional<AssetManifest>(
    import.meta.glob("../../../../data/fe17/assets/manifest.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? {};

const items =
  optional<Record<string, NamedRow>>(
    import.meta.glob("../../../../data/fe17/tables/items.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? {};

const skills =
  optional<Record<string, NamedRow>>(
    import.meta.glob("../../../../data/fe17/tables/skills.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? {};

/** manifest 경로는 data/fe17 기준 상대 → public/fe17 심링크로 서빙된다. */
export const assetHref = (p: string | undefined): string | undefined =>
  p === undefined ? undefined : `/fe17/${p.replace(/^\/*(fe17\/)?/, "")}`;

export const label = (locale: Locale, key: string | undefined): string | undefined =>
  key === undefined ? undefined : DICTS[locale][key];

const stripId = (id: string): string => id.replace(/^[A-Z]+_/, "");

/** 테이블이 아직 없으면 원본 라벨로 폴백한다(표시명 누락보다 낫다). */
const namedOr = (
  table: Record<string, NamedRow>,
  locale: Locale,
  id: string,
): string => label(locale, table[id]?.Name) ?? stripId(id);

/* ── 표시 팔레트 ─────────────────────────────────────────────
   공식 ColorRGB(terrain.json)는 데이터 정본으로 두고, 화면은 항공뷰 톤으로 낮춘다.
   주요 지형은 수동 오버라이드(道 = 흙길, 平地 = 풀), 나머지는 채도·명도 압축. */

const TILE_OVERRIDE: Record<string, string> = {
  TID_平地: "#6f8a55",
  TID_道: "#9c8763",
  TID_茂み: "#4d6d40",
  TID_植込: "#35512f",
  TID_石像: "#8b8078",
  TID_階段: "#b4aa95",
  TID_進入不可: "#151a20",
  TID_無し: "#151a20",
  TID_床: "#a79d8b",
  TID_壁: "#565049",
  TID_大柱: "#6e675c",
  TID_瓦礫: "#4b463f",
  TID_空: "#151a20",
};

const hex = (r: number, g: number, b: number): string =>
  "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const toHsl = (r: number, g: number, b: number): Hsl => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60;
  return { h, s, l };
};

const toHex = ({ h, s, l }: Hsl): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(((h % 360) + 360) % 360 / 60);
  const rgb: [number, number, number] =
    seg === 0 ? [c, x, 0]
    : seg === 1 ? [x, c, 0]
    : seg === 2 ? [0, c, x]
    : seg === 3 ? [0, x, c]
    : seg === 4 ? [x, 0, c]
    : [c, 0, x];
  return hex((rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255);
};

const fromHex = (h: string): Hsl => {
  const n = parseInt(h.slice(1), 16);
  return toHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
};

const baseHsl = (tid: string): Hsl => {
  const override = TILE_OVERRIDE[tid];
  if (override !== undefined) return fromHex(override);
  const t = terrain[tid];
  if (t === undefined) return { h: 0, s: 0, l: 0.2 };
  const { h, s, l } = toHsl(t.ColorR, t.ColorG, t.ColorB);
  return { h, s: s * 0.42, l: Math.min(0.62, Math.max(0.3, l * 0.72 + 0.06)) };
};

/** 타일마다 결정적 미세 명암 — 항공뷰 텍스처감(빌드 산출물이 안정적이어야 하므로 난수 금지). */
const jitter = (x: number, y: number): number => {
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return ((h % 5) - 2) * 0.011;
};

export const tileColor = (tid: string): string => toHex(baseHsl(tid));

export const tileColorAt = (tid: string, x: number, y: number): string => {
  const b = baseHsl(tid);
  return toHex({ ...b, l: Math.min(0.95, Math.max(0.03, b.l + jitter(x, y))) });
};

/** 통행 불가 지형 — 화면에서 "덩어리"로 읽히도록 별도 음영을 준다. */
export const isBlocked = (tid: string): boolean => (terrain[tid]?.Prohibition ?? 0) > 0;

export const tileName = (locale: Locale, tid: string): string =>
  label(locale, terrain[tid]?.Name) ?? tid.replace(/^TID_/, "");

export interface UnitView {
  unit: DisposUnit;
  group: string;
  name: string;
  job: string;
  level: number;
  face?: string;
  icon?: string;
  abbr: string;
  items: string[];
  skills: string[];
}

const abbreviate = (job: string): string => {
  const words = job.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map((w) => w[0]).join("").slice(0, 3) : job.slice(0, 2);
};

/** 여러 PID가 같은 얼굴 파일을 쓰면 대표 초상이 아니라 플레이스홀더다(환영병 = Phantom). */
const sharedFaces = new Set(
  Object.entries(
    Object.values(manifest.faces ?? {}).reduce<Record<string, number>>((acc, path) => {
      acc[path] = (acc[path] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .filter(([, n]) => n > 1)
    .map(([path]) => path),
);

export function toView(unit: DisposUnit, group: string, locale: Locale): UnitView {
  const person = persons[unit.pid];
  const job = jobs[unit.jid];
  const jobName = label(locale, job?.Name) ?? unit.jid.replace(/^JID_/, "");
  const facePath = manifest.faces?.[unit.pid];
  const iconEntry = manifest.mapicons?.byPid?.[unit.pid];
  const iconPath =
    iconEntry === undefined
      ? undefined
      : iconEntry.weapons[iconEntry.defaultWeapon] ?? Object.values(iconEntry.weapons).at(0);
  return {
    unit,
    group,
    name: label(locale, person?.Name) ?? unit.pid.replace(/^PID_/, ""),
    job: jobName,
    level: unit.level.n > 0 ? unit.level.n : (person?.Level ?? 1),
    face: facePath === undefined || (sharedFaces.has(facePath) && iconPath !== undefined)
      ? undefined
      : assetHref(facePath),
    icon: assetHref(iconPath),
    abbr: abbreviate(jobName),
    items: unit.items.map((i) => namedOr(items, locale, i.iid)),
    skills: unit.sids.map((sid) => namedOr(skills, locale, sid)),
  };
}

export const unitsFor = (chapter: ChapterData, locale: Locale): UnitView[] =>
  chapter.groups.flatMap((g) => g.units.map((u) => toView(u, g.name, locale)));

/** 맵 오브젝트 표시명 — tid의 메시지 라벨(MTID_Engage 등), 없으면 pid 폴백. */
export const objectName = (locale: Locale, obj: MapObject): string =>
  label(locale, obj.tid === undefined ? undefined : terrain[obj.tid]?.Name) ??
  obj.pid.replace(/^PID_/, "");

export interface ChapterTitle {
  prefix: string;
  name: string;
  place: string;
}

export const chapterTitle = (chapter: ChapterData, locale: Locale): ChapterTitle => {
  const key = chapter.cid.replace(/^CID_/, "");
  return {
    prefix: label(locale, `MCID_${key}_PREFIX`) ?? chapter.cid,
    name: label(locale, `MCID_${key}`) ?? "",
    place: label(locale, `MCID_${key}_PLACE`) ?? "",
  };
};

/** 0 = 아군(파랑) · 1 = 적(빨강) · 2 = 우군/중립(초록) — 톤다운 보드 위에서 읽히는 채도로 맞춤 */
export interface ForceStyle {
  ring: string;
  chip: string;
  key: "player" | "enemy" | "other";
}

export const forceStyle = (force: number): ForceStyle =>
  force === 0
    ? { ring: "#5b95e6", chip: "#2b5fb0", key: "player" }
    : force === 1
      ? { ring: "#e2635c", chip: "#a8322d", key: "enemy" }
      : { ring: "#63b06d", chip: "#2f7a3c", key: "other" };
