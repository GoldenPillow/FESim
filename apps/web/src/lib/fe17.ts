import type { ChapterData, ConsumableItem, DisposUnit, EngageArt, EngageState, MapObject, StaffItem } from "@fesim/shared";
import {
  MOVE_TYPES,
  deriveStats,
  moveBase,
  staticEnhances,
  type MoveType,
  type AiCommand,
  type AiSnapshot,
  type MapInteraction,
  type SkillRow,
  type StatBlock,
} from "@fesim/engine";
import godsRaw from "../../../../data/fe17/tables/gods.json?raw";
import chapterlistRaw from "../../../../data/fe17/tables/chapterlist.json?raw";
import terrainRaw from "../../../../data/fe17/tables/terrain.json?raw";
import personsRaw from "../../../../data/fe17/tables/persons.json?raw";
import jobsRaw from "../../../../data/fe17/tables/jobs.json?raw";
import namesEnRaw from "../../../../data/fe17/names/en.json?raw";
import namesKoRaw from "../../../../data/fe17/names/ko.json?raw";
import { UI, type Locale } from "./i18n";

export { FLIP_X, FLIP_Y, forceStyle, type ForceStyle } from "./grid";
import { forceStyle } from "./grid";

export interface TerrainRow {
  Tid: string;
  Name: string;
  /** 코스트 종별(COST_*) — 이벤트 질의 TerrainGetMoveCost가 문자열로 비교한다. */
  CostName?: string;
  ColorR: number;
  ColorG: number;
  ColorB: number;
  Prohibition: number;
  Avoid?: number;
  Defense?: number;
  PlayerAvoid?: number;
  PlayerDefense?: number;
  EnemyAvoid?: number;
  EnemyDefense?: number;
  Heal?: number;
  MoveFirst?: number;
  Flag?: number;
  MoveCost?: number;
  FlyCost?: number;
  Hp_N?: number;
  Hp_H?: number;
  Hp_L?: number;
  /** 파괴 자격 — 0 양군 · 1 자군만 · 2 적군만(BreakdownMenuItem GetForce). */
  Destroyer?: number;
  /** ☠지붕 판별자 아님 — m_Layers 실사용 TID 전수가 1(레이어 배치 표식). 지붕 = TID_屋根. */
  Layer?: number;
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
  "Limit.Move"?: number;
  /** SkillData.Attrs 마스크 — bit3(8) = Fly(지형 회복·피해 면제 판정, JobData.IsFly). ☠용(16)은 별개 비트. */
  Attrs?: number;
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
  /** 무기 부여 스킬(장비 중 유효) — 특효 스킬의 원천(아머킬러 → SID_鎧特効). */
  EquipSids?: string[];
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
  growth: Record<
    string,
    Record<
      string,
      { SynchroSkills?: string[]; EngageSkills?: string[]; EngageItems?: string[]; InheritanceSkills?: string[]; Flag?: number }
    >
  >;
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

const scriptFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../../../data/fe17/scripts/*.lua", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ).map(([path, src]) => [path.replace(/^.*\//, "").replace(/\.lua$/, ""), src]),
);

const skills =
  optional<Record<string, NamedRow>>(
    import.meta.glob("../../../../data/fe17/tables/skills.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? {};

/** ai.xml 루틴 전량(141종). ☠아일랜드에는 반입하지 않는다 — 유닛이 쓰는 행만 골라 굳힌다. */
const aiRoutines =
  optional<Record<string, AiCommand[]>>(
    import.meta.glob("../../../../data/fe17/tables/ai.json", {
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
  // MP3 전맵 증설(육안 실측 — 원본 ColorRGB가 실기 톤과 어긋나는 고빈도 특수 지형)
  TID_砂漠: "#b09a63",
  TID_流砂: "#997f4e",
  TID_砦: "#7d8a70",
  TID_回復床: "#6f8f7d",
  TID_防衛床: "#68789a",
  TID_宝箱: "#8a7448",
  TID_民家入口: "#8a6f4f",
  TID_砲台: "#5d6166",
  TID_篝火: "#8a5a3a",
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
  /** deferred = 부여 체계(GiveSids) 미재현 스킬 — 화면에서 점선 표기(기전 장부 skills.give-sids). */
  skills: { name: string; deferred: boolean }[];
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
    skills: unit.sids.map((sid) => {
      const give = (skills[sid] as Record<string, unknown> | undefined)?.["GiveSids"];
      return { name: namedOr(skills, locale, sid), deferred: Array.isArray(give) && give.length > 0 };
    }),
  };
}

/** chapter 객체 → mapId 역인덱스 — cid(CID_M003)와 mapId(m003)는 표기가 다르다. */
const mapIdOfChapter = new Map<ChapterData, string>(
  Object.entries(chapters).map(([id, ch]) => [ch, id]),
);

const hasAttackItem = (u: DisposUnit): boolean =>
  u.items.some((entry) => {
    const row = items[entry.iid];
    return row !== undefined && WEAPON_KINDS.has(row.Kind ?? 0) && (row.RangeO ?? 0) >= 1;
  });

const hasStaffItem = (u: DisposUnit): boolean =>
  u.items.some((entry) => items[entry.iid]?.Kind === STAFF_KIND);

/**
 * 소지품 인계 근사 — 후속장 dispos의 자군 items는 빈 배열이다(인게임에선 세이브가 소유·인계).
 * 공격 무기도 지팡이도 없는 자군 유닛은 앞선 챕터의 같은 인물 소지품을 그대로 쓴다(지팡이 전담자 포함).
 * ☠구매·강화·교환 진행은 재현 대상 아님(진행 소유) — 최후 등장 dispos가 근사의 정본이다.
 */
const inheritItems = (chapter: ChapterData, u: DisposUnit): DisposUnit => {
  if (u.force !== 0 || hasAttackItem(u) || hasStaffItem(u)) return u;
  const mapId = mapIdOfChapter.get(chapter);
  if (mapId === undefined) return u;
  for (const prevId of [...mapIds].reverse()) {
    if (prevId >= mapId) continue;
    for (const g of chapters[prevId].groups) {
      const prev = g.units.find((v) => v.pid === u.pid && v.force === 0);
      if (prev !== undefined && (hasAttackItem(prev) || hasStaffItem(prev))) return { ...u, items: prev.items };
    }
  }
  return u;
};

export const unitsFor = (chapter: ChapterData, locale: Locale): UnitView[] =>
  chapter.groups.flatMap((g) => g.units.map((u) => toView(inheritItems(chapter, u), g.name, locale)));

/** 맵 오브젝트 표시명 — tid의 메시지 라벨(MTID_Engage 등), 없으면 pid 폴백. */
export const objectName = (locale: Locale, obj: MapObject): string =>
  label(locale, obj.tid === undefined ? undefined : terrain[obj.tid]?.Name) ??
  obj.pid.replace(/^PID_/, "");

export interface ChapterTitle {
  prefix: string;
  name: string;
  place: string;
}

export const chapterTitleById = (cid: string, locale: Locale): ChapterTitle => {
  const key = cid.replace(/^CID_/, "");
  return {
    prefix: label(locale, `MCID_${key}_PREFIX`) ?? cid,
    name: label(locale, `MCID_${key}`) ?? "",
    place: label(locale, `MCID_${key}_PLACE`) ?? "",
  };
};

export const chapterTitle = (chapter: ChapterData, locale: Locale): ChapterTitle =>
  chapterTitleById(chapter.cid, locale);

/** 챕터 선택기용 전 챕터 목록 — 구현 여부는 chapters(빌드된 챕터 JSON) 존재로 판정. */
export type ChapterCategory = "main" | "paralogue" | "divine" | "fell";

export interface ChapterListEntry {
  cid: string;
  category: ChapterCategory;
  recommendedLevel?: number;
}

export const chapterList = parse<ChapterListEntry[]>(chapterlistRaw);

export const chapterMapId = (cid: string): string => cid.replace(/^CID_/, "").toLowerCase();

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

/** 스탯 상한 = job.xml Limit(직업 캡) + person.xml Limit(개인 보정, s8 -120..120) — 합산 후 클램프. */
const statCap = (job: Record<string, unknown>, person: Record<string, unknown>): StatBlock => {
  const jobLimit = statBlock(job, "Limit.");
  const personLimit = statBlock(person, "Limit.");
  const out = {} as StatBlock;
  for (const key of Object.keys(STAT_FIELDS) as (keyof StatBlock)[]) {
    out[key] = jobLimit[key] + personLimit[key];
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
    cap: statCap(job, person),
  });
}

/* ── 유닛 스킬 (dispos Sid + 인물 CommonSids + 장착 엠블렘 絆 레벨 싱크로) ── */

const SKILL_ROW_FIELDS = [
  "Sid", "Timing", "Stand", "Action", "Condition", "ActNames", "ActOperations", "ActValues",
  "GiveSids", "GiveTarget", "Target", "Power", "Removable", "RangeI", "RangeO",
  "Efficacy", "EfficacyValue", "EfficacyIgnore",
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

/**
 * 동계열의 정본 = SkillData.Group — XML에 없고, 로드 시 GroupAssign(RVA 0x248D0C0)이
 * skill.xml 習得優先度(Priority) 연속 오름차순 구간으로 부여한다(il2cpp/EMBLEM_ENGAGE §2-2, 100그룹·412스킬).
 * skills.json이 원본 행 순서를 보존하므로 같은 식을 여기서 1회 재현한다. ☠SID 명명 규칙 근사는 반증돼 폐기.
 */
const skillGroups = new Map<string, { group?: number; priority: number; canOverride: boolean }>();
{
  let groupId = 0;
  let prev = 0;
  for (const [sid, row] of Object.entries(skills)) {
    const p = Number((row as Record<string, unknown>)["Priority"] ?? 0);
    if (p === 0) {
      prev = 0;
      skillGroups.set(sid, { priority: 0, canOverride: false });
      continue;
    }
    if (prev === 0 || prev > p || prev + 50 < p) groupId += 1;
    skillGroups.set(sid, { group: groupId, priority: p, canOverride: p <= 99 });
    prev = p;
  }
}

/**
 * LevelData.Add(RVA 0x1CD7500)의 병합 규칙: 같은 SID = 스킵 · 새 스킬이 CanOverride이고 같은 Group
 * 엔트리가 있으면 Priority 크거나 같은 쪽이 그 자리를 차지 · 그 외 = 합집합(Priority 0은 그룹이 없어 항상 합집합).
 */
const addGodSkill = (out: string[], sid: string): void => {
  if (out.includes(sid)) return;
  const m = skillGroups.get(sid);
  if (m?.group !== undefined && m.canOverride) {
    const idx = out.findIndex((other) => skillGroups.get(other)?.group === m.group);
    if (idx >= 0) {
      if (m.priority >= (skillGroups.get(out[idx])?.priority ?? 0)) out[idx] = sid;
      return;
    }
  }
  out.push(sid);
};

const godGrowthRows = (gid: string, bondLevel?: number) => {
  const god = godsTable.gods[gid];
  const table = god === undefined ? undefined : godsTable.growth[String(god["GrowTable"] ?? "")];
  if (god === undefined || table === undefined) return undefined;
  const max = bondLevel ?? Number(god["Level"] ?? 1);
  const rows = [];
  for (let level = 1; level <= max; level++) {
    const row = table[String(level)];
    if (row !== undefined) rows.push(row);
  }
  return rows;
};

/**
 * 絆 레벨 N까지의 싱크로 스킬 = 레벨 1..N 누적(LevelData.Add 재현 — 합집합·동계열 대체).
 * N 기본값 = god.xml Level(엠블렘 초기 絆 레벨) — 진행 중 絆 레벨은 덤프·dispos 어디에도 없어 호출측이 넘긴다.
 */
export const emblemSyncSids = (gid: string, bondLevel?: number): string[] => {
  const out: string[] = [];
  for (const row of godGrowthRows(gid, bondLevel) ?? []) {
    for (const sid of row.SynchroSkills ?? []) addGodSkill(out, sid);
  }
  return out;
};

/**
 * 인게이지 중 스킬 세트 = EngagedSkills(싱크로 ∪ 인게이지 스킬) — GetSyncroSkills(RVA 0x2342530)가
 * Engaging이면 이 배열로 교체한다. 담기 직전 EngageSid(エンゲージ変化スキル)가 있으면 그 변형으로 치환
 * (0x1CD7ACC — 月の腕輪 → 日月の腕輪 등. SID_無し 치환도 원본 그대로 담는다 — 무효과 행이라 무해).
 */
export const emblemEngagedSids = (gid: string, bondLevel?: number): string[] => {
  const variant = (sid: string): string => {
    const engageSid = (skills[sid] as Record<string, unknown> | undefined)?.["EngageSid"];
    return typeof engageSid === "string" ? engageSid : sid;
  };
  const out: string[] = [];
  for (const row of godGrowthRows(gid, bondLevel) ?? []) {
    for (const sid of row.SynchroSkills ?? []) addGodSkill(out, variant(sid));
    for (const sid of row.EngageSkills ?? []) addGodSkill(out, variant(sid));
  }
  return out;
};

/**
 * 인게이지 게이지 초기 스냅숏 — 정본 = il2cpp/EMBLEM_ENGAGE §3(코드 확정):
 * limit = god.EngageCount - (絆 성장표 Flag 4 보유 레벨 도달 시 1) · turnLimit = 3 + (Flag 2 도달 시 1) ·
 * 초기 count = min(7, limit)(params エンゲージ初期値 — 정규 엠블렘은 맵 시작부터 발동 가능).
 * ☠장착 스킬 Flag bit42(SubEngageCountLimit) 차감은 미배선(skills 사영에 Flags 없음 — 후속).
 */
export const engageStateFor = (gid: string, bondLevel?: number): EngageState | undefined => {
  const god = godsTable.gods[gid];
  const table = god === undefined ? undefined : godsTable.growth[String(god["GrowTable"] ?? "")];
  if (god === undefined || table === undefined) return undefined;
  const bond = bondLevel ?? Number(god["Level"] ?? 1);
  let flags = 0;
  for (let level = 1; level <= bond; level++) flags |= Number(table[String(level)]?.Flag ?? 0);
  const limit = Math.max(0, Number(god["EngageCount"] ?? 0) - ((flags & 4) !== 0 ? 1 : 0));
  return {
    count: Math.min(7, limit),
    limit,
    turnLimit: 3 + ((flags & 2) !== 0 ? 1 : 0),
    turn: 0,
    engaging: false,
  };
};

export function unitSkillRows(unit: DisposUnit, bondLevel?: number): SkillRow[] {
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const commons = (person?.["CommonSids"] as string[] | undefined) ?? [];
  const sync = unit.gid !== undefined ? emblemSyncSids(unit.gid, bondLevel) : [];
  const sids = [...new Set([...unit.sids, ...commons, ...sync])];
  return sids.map(slimSkill).filter((r): r is SkillRow => r !== undefined);
}

/**
 * 이 챕터가 실제로 쓰는 ai.xml 루틴만 모은 표(SkillRow 슬림 사영 관례).
 * ☠전량(141루틴 63KB)을 아일랜드에 반입하지 않고, ★유닛마다 복사하지도 않는다 —
 * 보드 JSON 예산(50KB gz)을 지키려면 루틴은 보드 단위로 **한 번만** 실려야 한다.
 * 소비 = 엔진 `aiNextAction`(적 페이즈 전용. 위임은 dispos AI를 읽지 않는 별도 경로 — AI_ENGINE §6-2).
 */
export function chapterAiRoutines(units: readonly DisposUnit[]): Record<string, AiCommand[]> | undefined {
  const out: Record<string, AiCommand[]> = {};
  const queue: string[] = [];
  for (const unit of units) {
    for (const name of [unit.ai?.action, unit.ai?.mind, unit.ai?.attack, unit.ai?.move]) {
      if (name !== undefined && name !== "") queue.push(name);
    }
  }
  // ★전이 수집 — `AI_ChangeSeq`(Code 6)가 갈아끼우는 루틴은 dispos 슬롯에 안 적혀 있다.
  //   그 본문까지 실어야 치환 후 사고가 "루틴 미탑재" 결손으로 죽지 않는다.
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (out[name] !== undefined) continue;
    const rows = aiRoutines[name];
    if (rows === undefined) continue;
    out[name] = rows;
    for (const row of rows) {
      if (row.Code === 6 && typeof row.StrValue0 === "string" && row.StrValue0 !== "") queue.push(row.StrValue0);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 인게이지 중 스킬 행 — 싱크로 층만 EngagedSkills로 교체한 전체 목록(엔진 effectiveSkills의 소비물). */
export function unitEngagedSkillRows(unit: DisposUnit, bondLevel?: number): SkillRow[] | undefined {
  if (unit.gid === undefined) return undefined;
  const engaged = emblemEngagedSids(unit.gid, bondLevel);
  if (engaged.length === 0) return undefined;
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const commons = (person?.["CommonSids"] as string[] | undefined) ?? [];
  const sids = [...new Set([...unit.sids, ...commons, ...engaged])];
  return sids.map(slimSkill).filter((r): r is SkillRow => r !== undefined);
}

/* ── 보드 아일랜드 props ─────────────────────────────────────
   아일랜드(클라이언트)는 이 직렬화 산출물만 받는다 — 대용량 테이블 JSON은 SSG에만 남는다. */

export interface BoardStructureProp {
  x: number;
  y: number;
  w: number;
  h: number;
  tid: string;
  group: number;
  name: string;
  color: string;
  /** 난이도별 초기 HP(terrain.json Hp_N/H/L) — 0 = 파괴 불가 표시 없음. */
  hp: { n: number; h: number; l: number };
  /** TID_屋根 = 지붕(렌더 전용 — 통행·전투 무관, 문 개방 시 걷힘). ☠Layer 필드는 판별자 아님(전 레이어 TID가 1). */
  roof?: boolean;
  /** 파괴 자격(terrain.json Destroyer) — 0 양군 · 1 자군만 · 2 적군만. */
  destroyer?: number;
  /** 구조물 TID의 이동 코스트(통행 치환용). */
  costs?: Partial<Record<MoveType, number>>;
}

export interface BoardOverlayProp {
  x: number;
  y: number;
  tid: string;
  name: string;
  color: string;
  /** 전투·상태 가산분(TerrainCell 동형, 0 생략). */
  avoid: number;
  def: number;
  playerAvoid?: number;
  playerDef?: number;
  enemyAvoid?: number;
  enemyDef?: number;
  heal?: number;
  moveFirst?: number;
  notWarp?: boolean;
  /** 이동 코스트 가산(terrain.json MoveCost/FlyCost). */
  moveCost?: number;
  flyCost?: number;
}

/** 팔레트 항목 = 타일 종별 표시·판정 필드 + 이동 코스트(격자 파생용). */
export interface BoardPaletteEntry extends BoardTileProp {
  tid: string;
  /** terrain.json CostName — 엔진 TerrainCell.costName(이벤트 TerrainGetMoveCost)의 원천. */
  costName?: string;
  cost?: Partial<Record<MoveType, number>>;
}

export interface BoardTileProp {
  color: string;
  name: string;
  blocked: boolean;
  /** 지형 회피/방어 보정 — 전투 공식의 地形回避/地形防御 입력. */
  avoid: number;
  def: number;
  /** 진영 비대칭 보정(瘴気류) — 0은 생략(직렬화 절약). 소비 = 엔진 terrainBonusAt. */
  playerAvoid?: number;
  playerDef?: number;
  enemyAvoid?: number;
  enemyDef?: number;
  /** 자기 페이즈 시작 회복(+)/피해(−) — terrain.json Heal. */
  heal?: number;
  /** 출발 칸 이동력 보정 — terrain.json MoveFirst. */
  moveFirst?: number;
  /** 워프 착지 금지 — terrain.json Flag bit17. */
  notWarp?: boolean;
}

export interface BoardWeaponProp {
  /** items.json Iid — 이벤트(UnitSetItemEquip)의 주소. 엔진 BattleWeapon.iid의 원천. */
  iid?: string;
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
  /** 무기 부여 스킬 행(EquipSids 슬림 사영) — 장비 중에만 유효(엔진 effectiveSkills 합류). */
  sids?: SkillRow[];
}

export interface BoardUnitProp {
  x: number;
  y: number;
  force: number;
  /** dispos 그룹명 — 이벤트 스폰(Dispos)의 주소. 스크립트 없는 챕터는 전 그룹 즉시 배치. */
  group: string;
  /** dispos Pid — 이벤트 스크립트가 유닛을 부르는 주소. */
  pid: string;
  /** 인물 이름 ID(person.xml Name = "MPID_...") — 이벤트 UnitGetMPID 사영. */
  mpid?: string;
  /** dispos Jid — 직업 지정 AI(AT_Job)의 판별 주소. */
  jid: string;
  icon?: string;
  abbr: string;
  name: string;
  job: string;
  ring: string;
  chip: string;
  movePoints: number;
  moveType: MoveType;
  /** 직업 Attrs bit3(Fly) — 지형 회복·피해 면제(☠moveType 판별 금지 — 용은 비면제). */
  flying?: boolean;
  /** 특효 피격 마스크 = person.Attrs | job.Attrs — 엔진 combatEnv efficacyOf 소비. */
  attrs?: number;
  /** 공격 무기(지팡이 제외) 사거리 합집합. 0-0 = 공격 수단 없음. */
  rangeMin: number;
  rangeMax: number;
  /** 난이도별 실스탯(스탯 모델 v1 + 정적 스킬 보정) — 아일랜드가 실시간 난이도 전환. */
  stats?: Record<Difficulty, StatBlock | undefined>;
  /** 장비 무기 = 소지품 첫 공격 무기(가정 — 실기 반증 시 갱신). */
  weapon?: BoardWeaponProp;
  /** 소지 공격 무기 전체(소지품 순) — 예보 패널 무기 목록·attack.weapon 인덱스의 해석 대상. */
  weapons?: BoardWeaponProp[];
  /** 소지 지팡이 전체(소지품 순) — staff.staff 인덱스의 해석 대상. */
  staves?: StaffItem[];
  /** 사용형 아이템 전체(소지품 순) — item.item 인덱스의 해석 대상. */
  consumables?: ConsumableItem[];
  /** HP 스톡(dispos HpStockCount) — 다단 보스. ☠사영·이벤트 전용, 부활 거동은 미배선(장부 combat.hp-stock). */
  hpStock?: number;
  /** 인게이지 게이지 초기 스냅숏 — 엠블렘(gid) 장착 유닛만. */
  engage?: EngageState;
  /** 인게이지 중 스킬 세트(EngagedSkills 교체본) — engaging일 때 skills 대신 이 목록이 유효. */
  engagedSkills?: SkillRow[];
  /** 엠블렘 무기(EngageItems) — engaging일 때 weapons 뒤에 증설(인덱스 계약 유지). */
  engageWeapons?: BoardWeaponProp[];
  /** 인게이지 기술 스냅숏(스타일 분기 해소 후) — engageAttack 액션의 실행물. */
  engageArt?: EngageArt;
  levels: Record<Difficulty, number>;
  /** 직업 내부레벨(상급 20) — 경험치 레벨차 근사 입력. */
  internalLevel: number;
  /** 인물 성장률(%) — 자군 레벨업 롤. */
  growth?: StatBlock;
  /** 직업 StyleName 원문(連携 = 체인어택 · 重装 = 브레이크 면역). */
  style?: string;
  skills?: SkillRow[];
  /** dispos AI 사영 + 참조 루틴 스냅숏 — 적턴 자동(aiNextAction)의 유일한 입력. */
  ai?: AiSnapshot;
}

export interface BoardProps {
  mapId: string;
  /** 챕터 표시명 — 공유 열람(/s/)이 테이블 없이 제목을 쓸 수 있도록 여기서 굳힌다. */
  title: ChapterTitle;
  width: number;
  height: number;
  /** 타일 종별 팔레트 — tiles의 인덱스가 가리킨다(코스트 포함 — 격자 파생은 initGame 소유). */
  palette: BoardPaletteEntry[];
  /** [y][x] = palette 인덱스. */
  tiles: number[][];
  /** crest = 紋章氣(1회성 소비 타일) — 엔진 국면 crests의 초기값이자 소멸 표시 판별자. */
  objects: { x: number; y: number; name: string; crest?: boolean }[];
  /** 구조물 레이어(m_Layers) — 엔진 StructureState의 초기값 + 렌더 표시 필드(색·이름은 SSG에서 굳힘). */
  structures?: BoardStructureProp[];
  /** 지속 오버레이(m_Overlaps) — 엔진 BattleMap.overlays의 초기값 + 렌더 표시 필드. */
  overlays?: BoardOverlayProp[];
  /** 상호작용 지점(Lua 추출 — 상자·민가·문·이탈점·파괴 트리거) — 표시 마커 전용(실행 = MP2 이월). */
  /**
   * 조사 지점(상자·민가·문·이탈점·방어영역·파괴 트리거) — 표시 마커이자 **AI 이동 목적지의 입력**.
   * `kind`는 엔진 `MapInteraction`과 같은 열거를 쓴다(사영 계약 일치 — projectUnit 관례).
   */
  interactions?: (MapInteraction & { name?: string })[];
  units: BoardUnitProp[];
  /**
   * 이 챕터가 쓰는 ai.xml 루틴만 모은 표 — ★유닛마다 복사하지 않고 보드에 **한 번만** 싣는다.
   * projectUnit이 각 유닛의 `ai.routines`에 같은 참조를 붙인다(적턴 자동의 유일한 프로그램 원천).
   */
  aiRoutines?: Record<string, AiCommand[]>;
  /**
   * 챕터 이벤트 스크립트 팩(MP2) — 있으면 보드가 이벤트 구동으로 초기 배치·증원·승리조건을 돌린다.
   * ☠클라이언트 아일랜드는 원천 테이블이 없다 — 스크립트가 쓰는 스킬 행·엠블렘 사영을 여기 굳힌다.
   */
  script?: {
    chapter: string;
    /** Include 해석용 소스(챕터분만 인라인) — 세션이 이름으로 찾는다. */
    sources: Record<string, string>;
    /** 공용 소스(common*) 이름 목록 — 본문은 /fe17/scripts/{name}.lua 정적 fetch로 병합(용량 정책 3-6). */
    commons?: string[];
    /** 스크립트가 정적으로 Dispos하는 그룹 — 초기 배치에서 제외(이벤트가 소환). */
    disposGroups: string[];
    /** 스크립트가 부르는 SID 행 사영(UnitSetPrivateSkill용). */
    skills: Record<string, SkillRow>;
    /** 스크립트가 부르는 GID 사영(UnitSetGodUnit 패치 — 기술(art)은 미배선·발현 시 흡수). */
    gods: Record<string, { engage: EngageState; engageWeapons?: BoardWeaponProp[] }>;
    /**
     * 스크립트가 부르는 TID 사영(TerrainSet·TerrainSetOne — 런타임 지형 교체).
     * ☠클라이언트엔 terrain 표가 없다 — 챕터 Lua 폐포(챕터 + common*)의 "TID_..." 전수를 여기 굳힌다.
     */
    /**
     * 스크립트가 부르는 IID 사영(ItemGain — 아이템 지급). 채널·스냅숏 전문.
     * ☠클라이언트엔 items 표가 없다 — 챕터 Lua 폐포의 "IID_..." 전수를 여기 굳힌다.
     */
    items: Record<string, { kind: "weapon" | "staff" | "consumable" | "none"; item?: BoardWeaponProp | StaffItem | ConsumableItem }>;
    terrains: Record<string, {
      /** 엔진 TerrainCell 그대로(표시 필드 제외 — 색·이름은 아래가 소유, 중복 직렬화 금지). */
      cell: { tid: string; costName?: string; avoid: number; def: number } & Partial<Record<"playerAvoid" | "playerDef" | "enemyAvoid" | "enemyDef" | "heal" | "moveFirst", number>> & { notWarp?: boolean };
      cost?: Partial<Record<MoveType, number>>;
      color: string;
      name: string;
    }>;
  };
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
    enemyAuto: string;
    enemyAutoBlocked: string;
    waitCmd: string;
    attackCmd: string;
    staffCmd: string;
    itemCmd: string;
    guardCmd: string;
    destroyCmd: string;
    warpPick: string;
    engageCmd: string;
    tradeCmd: string;
    closeCmd: string;
    turnPhase: string;
    turnWord: string;
    victory: string;
    defeat: string;
    reset: string;
    replayCmd: string;
    replayPrev: string;
    replayNext: string;
    replayPrevPhase: string;
    replayNextPhase: string;
    zoomIn: string;
    zoomOut: string;
    undoCmd: string;
    editCmd: string;
    editExit: string;
    editHint: string;
    removeCmd: string;
    restoreCmd: string;
    copyRecord: string;
    copied: string;
    logTags: { chain: string; counter: string; follow: string; miss: string; brk: string; kill: string; crit: string; refresh: string; engage: string; disengage: string; warp: string; guard: string; spawn: string; join: string; despawn: string };
  };
}

/** 공격 사거리를 갖는 무기 분류(Kind 실측) — 7 = 지팡이는 공격이 아니다. */
const WEAPON_KINDS = new Set([1, 2, 3, 4, 5, 6, 8, 9]);
const STAFF_KIND = 7;

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

const attackWeaponProp = (iid: string, locale: Locale): BoardWeaponProp | undefined => {
  const row = items[iid] as (ItemRow & Record<string, number | string | undefined>) | undefined;
  if (row === undefined || !WEAPON_KINDS.has(row.Kind ?? 0) || (row.RangeO ?? 0) < 1) return undefined;
  return {
    iid,
    name: namedOr(items, locale, iid),
    might: Number(row["Power"] ?? 0),
    hit: Number(row["Hit"] ?? 0),
    crit: Number(row["Critical"] ?? 0),
    weight: Number(row["Weight"] ?? 0),
    avoid: Number(row["Avoid"] ?? 0),
    magic: row.Kind === 6 || (Number(row["Flag"] ?? 0) & MAGIC_FLAG) !== 0,
    rangeMin: row.RangeI ?? 1,
    rangeMax: row.RangeO ?? 1,
    kind: row.Kind ?? 0,
    ...(() => {
      const rows = (row.EquipSids ?? []).map(slimSkill).filter((r): r is SkillRow => r !== undefined);
      return rows.length > 0 ? { sids: rows } : {};
    })(),
  };
};

export const attackWeapons = (unit: DisposUnit, locale: Locale): BoardWeaponProp[] => {
  const list: BoardWeaponProp[] = [];
  for (const entry of unit.items) {
    const prop = attackWeaponProp(entry.iid, locale);
    if (prop !== undefined) list.push(prop);
  }
  return list;
};

/** 직업 StyleName → skills.json 스타일 분기 필드(SkillData.m_StyleSkills의 데이터 원형). */
const STYLE_SKILL_FIELD: Record<string, string> = {
  連携スタイル: "CooperationSkill",
  隠密スタイル: "CovertSkill",
  竜族スタイル: "DragonSkill",
  魔法スタイル: "MagicSkill",
  騎馬スタイル: "HorseSkill",
  重装スタイル: "HeavySkill",
  気功スタイル: "PranaSkill",
  飛行スタイル: "FlySkill",
};

/**
 * 인게이지 기술 선택 — god.EngageAttack → 스타일 분기 1회(GetEngageAttack 0x2341640의 최종 단계).
 * ☠連動(EngageAttackLink — リュール 전용)·暴走(Rampage — 적 GodState)은 미배선: 기본 경로만 산출한다.
 * 스킬 세트 = 기술 행 + SyncSids 1단 전개(汎用設定·ダメージ% 류) — engageAttack 전투 한정 주입물.
 */
export const emblemEngageArt = (gid: string, styleName: string | undefined, locale: Locale): EngageArt | undefined => {
  const god = godsTable.gods[gid];
  const baseSid = god === undefined ? undefined : String(god["EngageAttack"] ?? "");
  if (baseSid === undefined || baseSid === "" || skills[baseSid] === undefined) return undefined;
  const field = STYLE_SKILL_FIELD[styleName ?? ""];
  const variant = field === undefined ? undefined : (skills[baseSid] as Record<string, unknown>)[field];
  const sid = typeof variant === "string" && skills[variant] !== undefined ? variant : baseSid;
  const row = skills[sid] as Record<string, unknown>;
  const rows = [sid, ...((row["SyncSids"] as string[] | undefined) ?? [])]
    .map(slimSkill)
    .filter((r): r is SkillRow => r !== undefined);
  const equipIids = (row["EquipIids"] as string[] | undefined) ?? [];
  const weapons = equipIids.map((iid) => (iid === "IID_無し" ? null : (attackWeaponProp(iid, locale) ?? null)));
  return {
    sid,
    name: namedOr(skills, locale, sid),
    skills: rows,
    ...(weapons.length > 0 ? { weapons } : {}),
    ...(typeof row["RangeI"] === "number" ? { rangeMin: row["RangeI"] as number } : {}),
    ...(typeof row["RangeO"] === "number" ? { rangeMax: row["RangeO"] as number } : {}),
    cost: Number(row["Cost"] ?? 0),
    ...(Number(row["Rewarp"] ?? 0) > 0 ? { rewarp: Number(row["Rewarp"]) } : {}),
    ...(row["WeaponProhibit"] !== undefined ? { weaponProhibit: Number(row["WeaponProhibit"]) } : {}),
  };
};

/**
 * 엠블렘 무기 = 成長表 EngageItems 레벨 1..N 누적(같은 IID 스킵 — 가정, Add의 스킬 배열과 동형).
 * 공격 무기만 사영한다 — 엠블렘 지팡이(リカバー 등)는 미배선 결손으로 등재(장부 emblem.engage-kit).
 */
export const emblemEngageWeapons = (gid: string, locale: Locale, bondLevel?: number): BoardWeaponProp[] => {
  const iids: string[] = [];
  for (const row of godGrowthRows(gid, bondLevel) ?? []) {
    for (const iid of row.EngageItems ?? []) if (!iids.includes(iid)) iids.push(iid);
  }
  return iids
    .map((iid) => attackWeaponProp(iid, locale))
    .filter((w): w is BoardWeaponProp => w !== undefined);
};

/**
 * 지팡이 1개 스냅숏 — 소지품 사영과 이벤트 지급(ItemGain)이 **같은 것**을 써야 한다(☠중복 구현 금지).
 * power는 기본값(연성·각인은 진행 소유라 dispos 근사에 없음).
 */
const staffItemFor = (iid: string, locale: Locale): StaffItem | undefined => {
  const row = items[iid] as (ItemRow & Record<string, unknown>) | undefined;
  if (row === undefined || row.Kind !== STAFF_KIND) return undefined;
  // 방해 지팡이 GiveSids → 상태 스킬 행(BadState·Life) 사영 — 엔진 status 이벤트의 원천.
  const gives = ((row["GiveSids"] as string[] | undefined) ?? []).flatMap((sid) => {
    const s = skills[sid] as Record<string, unknown> | undefined;
    if (s === undefined) return [];
    return [{
      sid,
      badState: Number(s["BadState"] ?? 0),
      life: Number(s["Life"] ?? 0),
      name: namedOr(skills, locale, sid),
    }];
  });
  return {
    iid,
    name: namedOr(items, locale, iid),
    power: Number(row["Power"] ?? 0),
    rangeMin: row.RangeI ?? 1,
    rangeMax: row.RangeO ?? 1,
    uses: Number(row["Endurance"] ?? 0),
    rodType: Number(row["RodType"] ?? 0),
    useType: Number(row["UseType"] ?? 0),
    hit: Number(row["Hit"] ?? 0),
    distance: Number(row["Distance"] ?? 0),
    ...(gives.length > 0 ? { gives } : {}),
    rodExp: Number(row["RodExp"] ?? 0),
  };
};

/** 소지 지팡이 스냅숏 — 소지품 순서 유지(staff.staff 인덱스의 해석 대상). */
export const staffItems = (unit: DisposUnit, locale: Locale): StaffItem[] => {
  const list: StaffItem[] = [];
  for (const entry of unit.items) {
    const item = staffItemFor(entry.iid, locale);
    if (item !== undefined) list.push(item);
  }
  return list;
};

/**
 * 사용형 아이템 스냅숏 — Kind=10 중 AddTarget != 0 전부(미배선 포함).
 * ☠필터를 배선 여부로 좁히면 나중에 배선을 넓힐 때 item 인덱스 계약이 흔들려 기보가 깨진다.
 */
export const consumableItems = (unit: DisposUnit, locale: Locale): ConsumableItem[] => {
  const list: ConsumableItem[] = [];
  for (const entry of unit.items) {
    const item = consumableItemFor(entry.iid, locale);
    if (item !== undefined) list.push(item);
  }
  return list;
};

/** 사용형 아이템 1개 스냅숏 — 소지품 사영과 ItemGain 공용(☠중복 구현 금지). */
const consumableItemFor = (iid: string, locale: Locale): ConsumableItem | undefined => {
  const row = items[iid] as (ItemRow & Record<string, number | string | undefined>) | undefined;
  if (row === undefined || row.Kind !== 10 || Number(row["AddTarget"] ?? 0) === 0) return undefined;
  return {
    iid,
    name: namedOr(items, locale, iid),
    addType: Number(row["AddType"] ?? 0),
    power: Number(row["AddPower"] ?? 0),
    range: Number(row["AddRange"] ?? 0),
    uses: Number(row["Endurance"] ?? 0),
  };
};

/**
 * IID → 소지품 채널·스냅숏(ItemGain 사영). 세 채널 판별은 setup 사영과 **같은 규칙**이라
 * 런타임 지급 아이템이 초기 배치 아이템과 구별되지 않는다.
 * kind "none" = 맵 국면에 효과가 없는 종별(Kind 10·AddTarget 0 매각 귀중품 · 13 도구 · 18 금전) —
 * ☠조용한 누락이 아니라 "효과 없음"을 데이터가 **명시**하는 자리다. 표에 없는 IID는 아예 안 실린다(정직 거부).
 */
const gainItemFor = (
  iid: string,
  locale: Locale,
): { kind: "weapon" | "staff" | "consumable" | "none"; item?: BoardWeaponProp | StaffItem | ConsumableItem } | undefined => {
  if (items[iid] === undefined) return undefined;
  const weapon = attackWeaponProp(iid, locale);
  if (weapon !== undefined) return { kind: "weapon", item: weapon };
  const staff = staffItemFor(iid, locale);
  if (staff !== undefined) return { kind: "staff", item: staff };
  const consumable = consumableItemFor(iid, locale);
  if (consumable !== undefined) return { kind: "consumable", item: consumable };
  return { kind: "none" };
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
      group: v.group,
      pid: v.unit.pid,
      jid: v.unit.jid,
      ...(person?.["Name"] !== undefined ? { mpid: String(person["Name"]) } : {}),
      icon: v.icon,
      abbr: v.abbr,
      name: v.name,
      job: v.job,
      ring: style.ring,
      chip: style.chip,
      // 이동력 스냅숏 = Clamp(base, 0, jobLimit+personLimit) — Enhance(迅走 등)는 엔진 movePower가 런타임 가산.
      movePoints: moveBase(
        Number(job?.["Base.Move"] ?? 0),
        Number(job?.["Limit.Move"] ?? 99),
        Number(person?.["Limit.Move"] ?? 0),
      ),
      moveType,
      ...(((Number(job?.Attrs ?? 0)) & 8) !== 0 ? { flying: true } : {}),
      ...(() => {
        const attrs = Number(job?.Attrs ?? 0) | Number((person as { Attrs?: number } | undefined)?.Attrs ?? 0);
        return attrs !== 0 ? { attrs } : {};
      })(),
      ...weaponRange(v.unit),
      stats: { n: withEnhance("n"), h: withEnhance("h"), l: withEnhance("l") },
      ...(() => {
        const weapons = attackWeapons(v.unit, locale);
        return weapons.length > 0 ? { weapon: weapons[0], weapons } : {};
      })(),
      ...(() => {
        const staves = staffItems(v.unit, locale);
        return staves.length > 0 ? { staves } : {};
      })(),
      ...(() => {
        const consumables = consumableItems(v.unit, locale);
        return consumables.length > 0 ? { consumables } : {};
      })(),
      ...(() => {
        if (v.unit.gid === undefined) return {};
        const engage = engageStateFor(v.unit.gid);
        if (engage === undefined) return {};
        const engagedSkills = unitEngagedSkillRows(v.unit);
        const engageWeapons = emblemEngageWeapons(v.unit.gid, locale);
        const engageArt = emblemEngageArt(v.unit.gid, job?.StyleName, locale);
        return {
          engage,
          ...(engagedSkills !== undefined ? { engagedSkills } : {}),
          ...(engageWeapons.length > 0 ? { engageWeapons } : {}),
          ...(engageArt !== undefined ? { engageArt } : {}),
        };
      })(),
      ...(v.unit.hpStock !== undefined && v.unit.hpStock > 0 ? { hpStock: v.unit.hpStock } : {}),
      levels: { n: unitLevel(v.unit, "n"), h: unitLevel(v.unit, "h"), l: unitLevel(v.unit, "l") },
      internalLevel: Number((jobs[v.unit.jid] as unknown as Record<string, unknown> | undefined)?.["InternalLevel"] ?? 0),
      growth: person === undefined ? undefined : statBlock(person, "Grow."),
      style: job?.StyleName,
      skills: skillRows.length > 0 ? skillRows : undefined,
      ai: v.unit.ai,
    };
  });
  // ★타일 팔레트 정규화(3-6) — 셀마다 객체를 반복하지 않는다: palette[tid 종별] + tiles[인덱스 격자].
  // 코스트 격자도 싣지 않는다 — 클라이언트(initGame)가 palette.cost에서 파생(직렬화 = 타일 수 선형 → 종별 선형).
  const tids: string[] = [];
  const tidIndex = new Map<string, number>();
  const indexOf = (tid: string): number => {
    let i = tidIndex.get(tid);
    if (i === undefined) {
      i = tids.length;
      tids.push(tid);
      tidIndex.set(tid, i);
    }
    return i;
  };
  const tileGrid = map.terrain.map((line) => line.map(indexOf));
  const opt = (key: string, value: number | undefined): Record<string, number> =>
    typeof value === "number" && value !== 0 ? { [key]: value } : {};
  const palette = tids.map((tid) => {
    const row = terrain[tid];
    return {
      tid,
      ...(row?.CostName !== undefined ? { costName: row.CostName } : {}),
      color: tileColor(tid),
      name: tileName(locale, tid),
      blocked: isBlocked(tid),
      avoid: row?.Avoid ?? 0,
      def: row?.Defense ?? 0,
      ...opt("playerAvoid", row?.PlayerAvoid),
      ...opt("playerDef", row?.PlayerDefense),
      ...opt("enemyAvoid", row?.EnemyAvoid),
      ...opt("enemyDef", row?.EnemyDefense),
      ...opt("heal", row?.Heal),
      ...opt("moveFirst", row?.MoveFirst),
      ...((Number(row?.Flag ?? 0) & (1 << 17)) !== 0 ? { notWarp: true } : {}),
      ...(row?.cost !== undefined ? { cost: row.cost } : {}),
    };
  });
  void moveTypes;
  return {
    mapId,
    title: chapterTitle(chapter, locale),
    width: map.width,
    height: map.height,
    palette,
    tiles: tileGrid,
    objects: (map.objects ?? []).map((o) => ({
      x: o.x,
      y: o.y,
      name: objectName(locale, o),
      ...(o.pid === "PID_紋章氣" ? { crest: true } : {}),
    })),
    ...(() => {
      const opt = (key: string, value: number | undefined): Record<string, number> =>
        typeof value === "number" && value !== 0 ? { [key]: value } : {};
      const structures = (map.structures ?? []).map((s) => {
        const row = terrain[s.tid];
        return {
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          tid: s.tid,
          group: s.group,
          name: tileName(locale, s.tid),
          color: tileColorAt(s.tid, s.x, s.y),
          hp: { n: row?.Hp_N ?? 0, h: row?.Hp_H ?? 0, l: row?.Hp_L ?? 0 },
          // 지붕 판별 = TID (m_Layers 실사용 11종 전수에서 Layer=1 공통이라 Layer는 판별자가 아니다 —
          // TID_屋根만 Hp 0·렌더 전용, 2026-08-18 전수 실측).
          ...(s.tid === "TID_屋根" ? { roof: true } : {}),
          ...opt("destroyer", row?.Destroyer),
          ...(row?.cost !== undefined ? { costs: row.cost } : {}),
        };
      });
      const overlays = (map.overlays ?? []).map((o) => {
        const row = terrain[o.tid];
        return {
          x: o.x,
          y: o.y,
          tid: o.tid,
          name: tileName(locale, o.tid),
          color: tileColorAt(o.tid, o.x, o.y),
          avoid: row?.Avoid ?? 0,
          def: row?.Defense ?? 0,
          ...opt("playerAvoid", row?.PlayerAvoid),
          ...opt("playerDef", row?.PlayerDefense),
          ...opt("enemyAvoid", row?.EnemyAvoid),
          ...opt("enemyDef", row?.EnemyDefense),
          ...opt("heal", row?.Heal),
          ...opt("moveFirst", row?.MoveFirst),
          ...((Number(row?.Flag ?? 0) & (1 << 17)) !== 0 ? { notWarp: true } : {}),
          ...opt("moveCost", row?.MoveCost),
          ...opt("flyCost", row?.FlyCost),
        };
      });
      const interactions = (map.interactions ?? []).map((it) => ({
        kind: it.kind,
        x: it.x,
        y: it.y,
        ...(it.x2 !== undefined ? { x2: it.x2 } : {}),
        ...(it.y2 !== undefined ? { y2: it.y2 } : {}),
        ...(it.iid !== undefined ? { name: namedOr(items, locale, it.iid), iid: it.iid } : {}),
        // ★이탈점의 대상 인물 — S015처럼 특정 유닛 전용 이탈점이 있다(AI MV_Escape가 소비).
        ...(it.pid !== undefined ? { pid: it.pid } : {}),
      }));
      return {
        ...(structures.length > 0 ? { structures } : {}),
        ...(overlays.length > 0 ? { overlays } : {}),
        ...(interactions.length > 0 ? { interactions } : {}),
      };
    })(),
    units,
    labels,
    ...(() => {
      const routines = chapterAiRoutines(views.map((v) => v.unit));
      return routines === undefined ? {} : { aiRoutines: routines };
    })(),
    ...(() => {
      const src = scriptFiles[mapId];
      if (src === undefined) return {};
      // ☠common* 전문은 인라인하지 않는다 — 챕터×로케일 산출물마다 17KB+ 중복(용량 정책 3-6).
      // 이름만 싣고 클라이언트가 /fe17/scripts/에서 병렬 fetch 후 sources에 병합한다(fengari 실행은 동기 유지).
      const sources: Record<string, string> = { [mapId]: src };
      const commons = Object.keys(scriptFiles).filter((name) => name.startsWith("common")).sort();
      const disposGroups = [...new Set([...src.matchAll(/Dispos\(\s*"([^"]+)"/g)].map((m) => m[1]))];
      const sidRows: Record<string, SkillRow> = {};
      for (const m of src.matchAll(/"(SID_[^"]+)"/g)) {
        const row = slimSkill(m[1]);
        if (row !== undefined) sidRows[m[1]] = row;
      }
      const gods: NonNullable<BoardProps["script"]>["gods"] = {};
      for (const m of src.matchAll(/"(GID_[^"]+)"/g)) {
        const engage = engageStateFor(m[1]);
        if (engage === undefined) continue;
        const engageWeapons = emblemEngageWeapons(m[1], locale);
        gods[m[1]] = { engage, ...(engageWeapons.length > 0 ? { engageWeapons } : {}) };
      }
      // 아이템 사영 — 폐포 = 챕터 + common*(공용 헬퍼가 상자·민가 지급을 소유한다).
      const itemPack: NonNullable<BoardProps["script"]>["items"] = {};
      for (const name of [mapId, ...commons]) {
        for (const m of (scriptFiles[name] ?? "").matchAll(/"(IID_[^"]+)"/g)) {
          if (itemPack[m[1]] !== undefined) continue;
          const row = gainItemFor(m[1], locale);
          if (row !== undefined) itemPack[m[1]] = row;
        }
      }
      // 지형 사영 — 폐포 = 챕터 + common*(공용 헬퍼도 TerrainSet을 부른다). 실사용 TID만 담긴다(종별 선형).
      const terrains: NonNullable<BoardProps["script"]>["terrains"] = {};
      for (const name of [mapId, ...commons]) {
        for (const m of (scriptFiles[name] ?? "").matchAll(/"(TID_[^"]+)"/g)) {
          const row = terrain[m[1]];
          if (row === undefined || terrains[m[1]] !== undefined) continue;
          terrains[m[1]] = {
            cell: {
              tid: m[1],
              ...(row.CostName !== undefined ? { costName: row.CostName } : {}),
              avoid: row.Avoid ?? 0,
              def: row.Defense ?? 0,
              ...opt("playerAvoid", row.PlayerAvoid),
              ...opt("playerDef", row.PlayerDefense),
              ...opt("enemyAvoid", row.EnemyAvoid),
              ...opt("enemyDef", row.EnemyDefense),
              ...opt("heal", row.Heal),
              ...opt("moveFirst", row.MoveFirst),
              ...((Number(row.Flag ?? 0) & (1 << 17)) !== 0 ? { notWarp: true } : {}),
            },
            ...(row.cost !== undefined ? { cost: row.cost } : {}),
            color: tileColor(m[1]),
            name: tileName(locale, m[1]),
          };
        }
      }
      return { script: { chapter: mapId, sources, commons, disposGroups, skills: sidRows, gods, terrains, items: itemPack } };
    })(),
  };
}

/**
 * (맵, 로케일) → 보드 props 단일 진입점.
 * SSG 셸(Board.astro)과 정적 JSON 엔드포인트(/fe17/boards/*.json)가 **같은 산출물**을 써야 한다 —
 * 공유 열람(/s/)은 워커에서 이 JSON을 읽는다(대용량 테이블을 워커에 반입하지 않기 위한 경계).
 */
export function boardPropsFor(mapId: string, locale: Locale): BoardProps {
  const chapter = chapters[mapId];
  if (chapter === undefined) throw new Error(`unknown map: ${mapId}`);
  const t = UI[locale];
  return boardProps(chapter, mapId, locale, {
    board: t.board,
    forecast: t.forecast,
    hit: t.hit,
    crit: t.crit,
    damage: t.damage,
    currentPosNote: t.currentPosNote,
    difficulty: t.difficulty,
    diffNames: { n: t.diffN, h: t.diffH, l: t.diffL },
    forceNames: [t.player, t.enemy, t.ally],
    endPhase: t.endPhase,
    enemyAuto: t.enemyAuto,
    enemyAutoBlocked: t.enemyAutoBlocked,
    undoCmd: t.undoCmd,
    editCmd: t.editCmd,
    editExit: t.editExit,
    editHint: t.editHint,
    removeCmd: t.removeCmd,
    restoreCmd: t.restoreCmd,
    waitCmd: t.waitCmd,
    attackCmd: t.attackCmd,
    staffCmd: t.staffCmd,
    itemCmd: t.itemCmd,
    guardCmd: t.guardCmd,
    destroyCmd: t.destroyCmd,
    warpPick: t.warpPick,
    engageCmd: t.engageCmd,
    tradeCmd: t.tradeCmd,
    closeCmd: t.closeCmd,
    turnPhase: t.turnPhase,
    turnWord: t.turnWord,
    victory: t.victory,
    defeat: t.defeat,
    reset: t.reset,
    replayCmd: t.replayCmd,
    replayPrev: t.replayPrev,
    replayNext: t.replayNext,
    replayPrevPhase: t.replayPrevPhase,
    replayNextPhase: t.replayNextPhase,
    zoomIn: t.zoomIn,
    zoomOut: t.zoomOut,
    copyRecord: t.copyRecord,
    copied: t.copied,
    logTags: t.logTags,
  });
}
