import type { ChapterData, DisposUnit, MapObject } from "@fesim/shared";
import {
  MOVE_TYPES,
  deriveStats,
  staticEnhances,
  type MoveType,
  type SkillRow,
  type StatBlock,
} from "@fesim/engine";
import godsRaw from "../../../../data/fe17/tables/gods.json?raw";
import terrainRaw from "../../../../data/fe17/tables/terrain.json?raw";
import personsRaw from "../../../../data/fe17/tables/persons.json?raw";
import jobsRaw from "../../../../data/fe17/tables/jobs.json?raw";
import namesEnRaw from "../../../../data/fe17/names/en.json?raw";
import namesKoRaw from "../../../../data/fe17/names/ko.json?raw";
import { phaseOfGroup } from "./phases";
import type { Locale } from "./i18n";

export { FLIP_X, FLIP_Y, forceStyle, type ForceStyle } from "./grid";
import { forceStyle } from "./grid";

export interface TerrainRow {
  Tid: string;
  Name: string;
  ColorR: number;
  ColorG: number;
  ColorB: number;
  Prohibition: number;
  Avoid?: number;
  Defense?: number;
  /** 이동타입별 진입 코스트(파이프라인이 地形コスト에서 병합, 255 = 불가) — 통행 판정의 정본. */
  cost?: Record<MoveType, number>;
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
  /** 地形コスト 컬럼 순서 인덱스(1=foot, 3=fly 실측) — MOVE_TYPES가 정본. */
  MoveType?: number;
  "Base.Move"?: number;
  StyleName?: string;
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

interface NamedRow {
  Name?: string;
}

/** Kind 실측 분류: 1검 2창 3도끼 4활 5나이프 6마도서 7지팡이 8체술 9브레스류 10~ 소비/기타. */
interface ItemRow extends NamedRow {
  Kind?: number;
  RangeI?: number;
  RangeO?: number;
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

interface GodsTable {
  gods: Record<string, Record<string, unknown>>;
  growth: Record<string, Record<string, { SynchroSkills?: string[]; EngageSkills?: string[]; EngageItems?: string[] }>>;
}
const godsTable = parse<GodsTable>(godsRaw);

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
  optional<Record<string, ItemRow>>(
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

/* ── 스탯 산출 ───────────────────────────────────────────────
   공식·검증 근거는 packages/engine/src/stats.ts가 소유. 여기는 테이블 필드 → 입력 사상만. */

export type Difficulty = "n" | "h" | "l";

/** 데이터 필드명(일본어 원본 유래) → 엔진 스탯 키. Tech=기량, Quick=속도, Mdef=마방, Phys=체격. */
const STAT_FIELDS: Record<keyof StatBlock, string> = {
  hp: "Hp",
  str: "Str",
  mag: "Magic",
  dex: "Tech",
  spd: "Quick",
  lck: "Luck",
  def: "Def",
  res: "Mdef",
  bld: "Phys",
};

const DIFF_SUFFIX: Record<Difficulty, string> = { n: "N", h: "H", l: "L" };

const statBlock = (row: Record<string, unknown>, prefix: string): StatBlock => {
  const out = {} as StatBlock;
  for (const [key, field] of Object.entries(STAT_FIELDS) as [keyof StatBlock, string][]) {
    out[key] = Number(row[`${prefix}${field}`] ?? 0);
  }
  return out;
};

/** dispos 유닛의 표시 레벨(난이도 반영, dispos 0 = 인물 기본). */
export function unitLevel(unit: DisposUnit, difficulty: Difficulty): number {
  const disposLevel = unit.level[difficulty];
  if (disposLevel > 0) return disposLevel;
  return Number((persons[unit.pid] as unknown as Record<string, unknown> | undefined)?.["Level"] ?? 1);
}

/** dispos 유닛의 실스탯(난이도 반영). 인물·직업 테이블 미비 시 undefined. */
export function unitStats(unit: DisposUnit, difficulty: Difficulty): StatBlock | undefined {
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const job = jobs[unit.jid] as unknown as Record<string, unknown> | undefined;
  if (person === undefined || job === undefined) return undefined;
  const suffix = DIFF_SUFFIX[difficulty];
  return deriveStats({
    jobBase: statBlock(job, "Base."),
    jobInternalLevel: Number(job["InternalLevel"] ?? 0),
    personOffset: statBlock(person, `Offset${suffix}.`),
    personGrowth: statBlock(person, "Grow."),
    level: unitLevel(unit, difficulty),
    autoGrowOffset: Number(person[`AutoGrowOffset${suffix}`] ?? 0),
  });
}

/* ── 유닛 스킬 (dispos Sid + 인물 CommonSids + 장착 엠블렘 絆1 싱크로) ── */

const SKILL_ROW_FIELDS = [
  "Sid", "Timing", "Condition", "ActNames", "ActOperations", "ActValues",
  "GiveSids", "GiveTarget", "Target", "RangeI", "RangeO",
] as const;

/** skills.json 행 → 엔진 SkillRow 슬림 사영(EnhanceValue.* 포함) — 아일랜드 직렬화 대상. */
const slimSkill = (sid: string): SkillRow | undefined => {
  const row = skills[sid] as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of SKILL_ROW_FIELDS) if (row[key] !== undefined) out[key] = row[key];
  for (const key of Object.keys(row)) if (key.startsWith("EnhanceValue.")) out[key] = row[key];
  out["Sid"] = sid;
  return out as unknown as SkillRow;
};

/** 絆 레벨 1 싱크로 스킬(장착 = 싱크로 상태 가정 — 인게이지 발동은 후속). */
const emblemSyncSids = (gid: string): string[] => {
  const god = godsTable.gods[gid];
  const table = god === undefined ? undefined : godsTable.growth[String(god["GrowTable"] ?? "")];
  return table?.["1"]?.SynchroSkills ?? [];
};

export function unitSkillRows(unit: DisposUnit): SkillRow[] {
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const commons = (person?.["CommonSids"] as string[] | undefined) ?? [];
  const sync = unit.gid !== undefined ? emblemSyncSids(unit.gid) : [];
  const sids = [...new Set([...unit.sids, ...commons, ...sync])];
  return sids.map(slimSkill).filter((r): r is SkillRow => r !== undefined);
}

/* ── 보드 아일랜드 props ─────────────────────────────────────
   아일랜드(클라이언트)는 이 직렬화 산출물만 받는다 — 대용량 테이블 JSON은 SSG에만 남는다. */

export interface BoardTileProp {
  color: string;
  name: string;
  blocked: boolean;
  /** 지형 회피/방어 보정 — 전투 공식의 地形回避/地形防御 입력. */
  avoid: number;
  def: number;
}

export interface BoardWeaponProp {
  name: string;
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid: number;
  magic: boolean;
  rangeMin: number;
  rangeMax: number;
  /** items.json Kind — 상성(브레이크) 판정 입력. */
  kind: number;
}

export interface BoardUnitProp {
  x: number;
  y: number;
  force: number;
  phase?: string;
  icon?: string;
  abbr: string;
  name: string;
  job: string;
  ring: string;
  chip: string;
  movePoints: number;
  moveType: MoveType;
  /** 공격 무기(지팡이 제외) 사거리 합집합. 0-0 = 공격 수단 없음. */
  rangeMin: number;
  rangeMax: number;
  /** 난이도별 실스탯(스탯 모델 v1 + 정적 스킬 보정) — 아일랜드가 실시간 난이도 전환. */
  stats?: Record<Difficulty, StatBlock | undefined>;
  /** 장비 무기 = 소지품 첫 공격 무기(가정 — 실기 반증 시 갱신). */
  weapon?: BoardWeaponProp;
  levels: Record<Difficulty, number>;
  /** 직업 내부레벨(상급 20) — 경험치 레벨차 근사 입력. */
  internalLevel: number;
  /** 인물 성장률(%) — 자군 레벨업 롤. */
  growth?: StatBlock;
  /** 직업 StyleName 원문(連携 = 체인어택 · 重装 = 브레이크 면역). */
  style?: string;
  skills?: SkillRow[];
}

export interface BoardProps {
  mapId: string;
  width: number;
  height: number;
  /** [y][x] */
  tiles: BoardTileProp[][];
  /** 이동타입별 진입 코스트 [y][x] — 실사용 타입만 담는다. */
  costs: Partial<Record<MoveType, number[][]>>;
  objects: { x: number; y: number; name: string }[];
  units: BoardUnitProp[];
  labels: {
    board: string;
    forecast: string;
    hit: string;
    crit: string;
    damage: string;
    currentPosNote: string;
    difficulty: string;
    diffNames: Record<Difficulty, string>;
    forceNames: [string, string, string];
    endPhase: string;
    waitCmd: string;
    attackCmd: string;
    turnPhase: string;
    turnWord: string;
    victory: string;
    defeat: string;
    reset: string;
    logTags: { chain: string; counter: string; follow: string; miss: string; brk: string; kill: string; crit: string };
  };
}

/** 공격 사거리를 갖는 무기 분류(Kind 실측) — 7 = 지팡이는 공격이 아니다. */
const WEAPON_KINDS = new Set([1, 2, 3, 4, 5, 6, 8, 9]);

const weaponRange = (unit: DisposUnit): { rangeMin: number; rangeMax: number } => {
  let min = Infinity;
  let max = 0;
  for (const entry of unit.items) {
    const row = items[entry.iid];
    if (row === undefined || !WEAPON_KINDS.has(row.Kind ?? 0)) continue;
    const outer = row.RangeO ?? 0;
    if (outer < 1) continue;
    min = Math.min(min, row.RangeI ?? 1);
    max = Math.max(max, outer);
  }
  return max > 0 ? { rangeMin: min, rangeMax: max } : { rangeMin: 0, rangeMax: 0 };
};

/** 마법 데미지 판별: 마도서(Kind 6) 또는 Flag bit16(光の弓·火のブレス 실측) — 가정 포함, 코퍼스 검증 대상. */
const MAGIC_FLAG = 0x10000;

const equippedWeapon = (unit: DisposUnit, locale: Locale): BoardWeaponProp | undefined => {
  for (const entry of unit.items) {
    const row = items[entry.iid] as (ItemRow & Record<string, number | string | undefined>) | undefined;
    if (row === undefined || !WEAPON_KINDS.has(row.Kind ?? 0) || (row.RangeO ?? 0) < 1) continue;
    return {
      name: namedOr(items, locale, entry.iid),
      might: Number(row["Power"] ?? 0),
      hit: Number(row["Hit"] ?? 0),
      crit: Number(row["Critical"] ?? 0),
      weight: Number(row["Weight"] ?? 0),
      avoid: Number(row["Avoid"] ?? 0),
      magic: row.Kind === 6 || (Number(row["Flag"] ?? 0) & MAGIC_FLAG) !== 0,
      rangeMin: row.RangeI ?? 1,
      rangeMax: row.RangeO ?? 1,
      kind: row.Kind ?? 0,
    };
  }
  return undefined;
};

export function boardProps(
  chapter: ChapterData,
  mapId: string,
  locale: Locale,
  labels: BoardProps["labels"],
): BoardProps {
  const map = chapter.map;
  const views = unitsFor(chapter, locale);
  const moveTypes = new Set<MoveType>();
  const units: BoardUnitProp[] = views.map((v) => {
    const job = jobs[v.unit.jid];
    const moveType = MOVE_TYPES[job?.MoveType ?? 0] ?? "none";
    moveTypes.add(moveType);
    const style = forceStyle(v.unit.force);
    const skillRows = unitSkillRows(v.unit);
    const withEnhance = (d: Difficulty): StatBlock | undefined => {
      const base = unitStats(v.unit, d);
      return base === undefined ? undefined : staticEnhances(base, skillRows);
    };
    const person = persons[v.unit.pid] as unknown as Record<string, unknown> | undefined;
    return {
      x: v.unit.x,
      y: v.unit.y,
      force: v.unit.force,
      phase: phaseOfGroup(mapId, v.group),
      icon: v.icon,
      abbr: v.abbr,
      name: v.name,
      job: v.job,
      ring: style.ring,
      chip: style.chip,
      movePoints: job?.["Base.Move"] ?? 0,
      moveType,
      ...weaponRange(v.unit),
      stats: { n: withEnhance("n"), h: withEnhance("h"), l: withEnhance("l") },
      weapon: equippedWeapon(v.unit, locale),
      levels: { n: unitLevel(v.unit, "n"), h: unitLevel(v.unit, "h"), l: unitLevel(v.unit, "l") },
      internalLevel: Number((jobs[v.unit.jid] as unknown as Record<string, unknown> | undefined)?.["InternalLevel"] ?? 0),
      growth: person === undefined ? undefined : statBlock(person, "Grow."),
      style: job?.StyleName,
      skills: skillRows.length > 0 ? skillRows : undefined,
    };
  });
  // 베이스 지형 코스트만 — 구조물(m_Layers) 통행 반영은 구조물 렌더와 함께 미룸(M005 실재 맵 시점).
  const costs: Partial<Record<MoveType, number[][]>> = {};
  for (const type of moveTypes) {
    costs[type] = map.terrain.map((line) => line.map((tid) => terrain[tid]?.cost?.[type] ?? 255));
  }
  return {
    mapId,
    width: map.width,
    height: map.height,
    tiles: map.terrain.map((line, y) =>
      line.map((tid, x) => ({
        color: tileColorAt(tid, x, y),
        name: tileName(locale, tid),
        blocked: isBlocked(tid),
        avoid: terrain[tid]?.Avoid ?? 0,
        def: terrain[tid]?.Defense ?? 0,
      })),
    ),
    costs,
    objects: (map.objects ?? []).map((o) => ({ x: o.x, y: o.y, name: objectName(locale, o) })),
    units,
    labels,
  };
}
