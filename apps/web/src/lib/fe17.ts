import type { ChapterData, ConsumableItem, DisposUnit, EngageArt, EngageState, MapObject, StaffItem } from "@fesim/shared";
import {
  MOVE_TYPES,
  STAT_KEYS,
  deriveStats,
  mergeStatCap,
  moveBase,
  staticEnhances,
  type GrowthPathJob,
  type MoveType,
  type AiCommand,
  type AiSnapshot,
  type MapInteraction,
  type SkillRow,
  type StatBlock,
  type StatKey,
} from "@fesim/engine";
import godsRaw from "../../../../data/fe17/tables/gods.json?raw";
import chapterlistRaw from "../../../../data/fe17/tables/chapterlist.json?raw";
import chapternotesRaw from "../../../../data/fe17/tables/chapternotes.json?raw";
import joinitemsRaw from "../../../../data/fe17/tables/joinitems.json?raw";
import terrainRaw from "../../../../data/fe17/tables/terrain.json?raw";
import personsRaw from "../../../../data/fe17/tables/persons.json?raw";
import jobsRaw from "../../../../data/fe17/tables/jobs.json?raw";
import namesEnRaw from "../../../../data/fe17/names/en.json?raw";
import namesJaRaw from "../../../../data/fe17/names/ja.json?raw";
import namesKoRaw from "../../../../data/fe17/names/ko.json?raw";
import { UI, type Locale, type Strings } from "./i18n";
import { rankValue } from "./weaponRank";

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
  /** 최대 레벨(20 = 정규직 · 40 = 특수직) — 경험치 정지의 정본. */
  MaxLevel?: number;
}

/** tools/pipeline bake_assets.py가 만드는 에셋 목록(없으면 폴백 렌더). */
export interface MapIconEntry {
  defaultWeapon: string;
  weapons: Record<string, string>;
}

export interface AssetManifest {
  mapicons?: { byPid?: Record<string, MapIconEntry> };
  faces?: Record<string, string>;
  /** 문장사 초상 — GID 키(인물 얼굴은 pid 키라 같은 표에 못 넣는다: 엠블렘은 인물이 아니다). */
  godFaces?: Record<string, string>;
  /** 각인(刻印) 심볼 — GID 키, ui_icon/godsymbolengrave 베이크 산출(대표 신장 20종). */
  godEngraves?: Record<string, string>;
  /** 특효(特効) 아이콘 — 키 = skills.IconLabel(Armor·Fly·…), ui_icon/efficacy 베이크 산출. */
  efficacy?: Record<string, string>;
  /** 아이템 아이콘(items.json Icon 키) — ui_icon/item 번들 베이크 산출. */
  items?: Record<string, string>;
  /** 무기군(카테고리) 아이콘 — ui_icon/weapon 번들 베이크 산출(흰 실루엣.
      ☠weaponoutline 번들이 아니다 — 그쪽은 어두운 그림자 레이어, 이름과 반대. 베이크 보고 2026-08-31). */
  weapontypes?: Record<string, string>;
  /** 문장사 반지 아이콘 — GID 키, ui_icon/godring 베이크 산출(대표 신장 20종). */
  godRings?: Record<string, string>;
  /** 스킬 아이콘 — 키 = Sid에서 SID_ 제거(스프라이트명), ui_icon/skill 전수 베이크(2026-09-02). */
  skills?: Record<string, string>;
  /** 絆지환 레어도 링(Bronze·Silver·Gold·Platinum) — 미장착 플레이스홀더·후속 絆지환용. */
  ringCommons?: Record<string, string>;
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
  ja: parse<Record<string, string>>(namesJaRaw),
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

/** 무기 강화(+1~+5) 누적 보정 — 키 = IID_ 접미사(transform build_refine). */
const refineTable =
  optional<Record<string, { power: number; weight: number; hit: number; crit: number }[]>>(
    import.meta.glob("../../../../data/fe17/tables/refine.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? {};

/** 무기 상점 판매 목록(첫 등장 순) — 빌더 정렬(기본무기군 전열)의 정본. */
const shopTable =
  optional<{ weapons: string[] }>(
    import.meta.glob("../../../../data/fe17/tables/shop.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>,
  ) ?? { weapons: [] };

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
/**
 * 통행 불가 표시 — ☠**`Prohibition`으로 판정하지 않는다**(2026-08-18 정정).
 * `MOVE_TERRAIN.md` §6-2가 "`Prohibition`(戦闘禁止)은 **통행성이 아닌 것은 확정**"이라 못박았는데도
 * 이 함수가 그 필드를 쓰고 있었다. 그 결과 **45개 지형이 통행 불가처럼 그려졌다** —
 * 砦(회피 30·회복 10, 보병 코스트 2)와 성벽 위(`低い壁`·`防壁` = COST_空 = 비행 진입 가능)가 전부 막힌 칸으로 보였다.
 * 정본 = 코스트다. 어느 이동 타입으로도 못 들어가는 칸(COST_不可)만 통행 불가로 표시한다.
 * (이동 계산 자체는 늘 코스트 격자만 봤으므로 규칙은 원래 옳았고, 틀린 것은 **표시**였다.)
 */
export const isBlocked = (tid: string): boolean => {
  const cost = terrain[tid]?.cost;
  if (cost === undefined) return false;
  const values = Object.values(cost);
  return values.length > 0 && values.every((v) => v >= 255);
};

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
  /** chapter.xml NextChapter — 본편 사슬의 다음 챕터(캠페인 진행의 순서 정본). */
  next?: string;
  /** chapter.xml GmapSpotOpenCondition — 이 챕터가 열리는 시점(외전 개방 조건, 접두 없는 챕터 꼬리). */
  unlock?: string;
}



export const chapterList = parse<ChapterListEntry[]>(chapterlistRaw);

const chapterByCid = new Map(chapterList.map((e) => [e.cid, e]));

/** 다음 챕터(cid) — 사슬 끝(엔딩)이나 사슬 밖(외전·신룡의 장)이면 undefined. */
export const nextChapter = (cid: string): string | undefined => chapterByCid.get(cid)?.next;

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

/**
 * items.json `Enhance.*` → 엔진 스탯 키. 비0인 항목만 담고, 전부 0이면 undefined(스냅숏 군살 방지).
 * ☠`Enhance`는 도핑 아이템 전용이 아니다 — 무기 35종이 이 열을 든다(2026-08-19 MP8 A8 확인).
 */
const enhanceBlock = (row: Record<string, unknown>): Partial<StatBlock> | undefined => {
  const out: Partial<StatBlock> = {};
  let any = false;
  for (const [key, field] of Object.entries(STAT_FIELDS) as [keyof StatBlock, string][]) {
    const v = Number(row[`Enhance.${field}`] ?? 0);
    if (v !== 0) {
      out[key] = v;
      any = true;
    }
  }
  return any ? out : undefined;
};

const statBlock = (row: Record<string, unknown>, prefix: string): StatBlock => {
  const out = {} as StatBlock;
  for (const [key, field] of Object.entries(STAT_FIELDS) as [keyof StatBlock, string][]) {
    out[key] = Number(row[`${prefix}${field}`] ?? 0);
  }
  return out;
};

/** 스탯 상한 = job.Limit + person.Limit — 합성 답변자는 엔진 mergeStatCap(빌더와 공용, 복제 금지). */
const statCap = (job: Record<string, unknown>, person: Record<string, unknown>): StatBlock =>
  mergeStatCap(statBlock(job, "Limit."), statBlock(person, "Limit."));

/** 유닛의 스탯 상한 — 성장 게이트(rollGrowth)의 입력. 인물·직업 테이블 미비 시 undefined. */
export function unitCap(unit: DisposUnit): StatBlock | undefined {
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const job = jobs[unit.jid] as unknown as Record<string, unknown> | undefined;
  if (person === undefined || job === undefined) return undefined;
  return statCap(job, person);
}

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
  // ☠성장률은 **택일**이다(person.Grow 전 0 → job.BaseGrow + 난이도 델타). 일반 적 1379행이 전 0이라
  //   이 갈래가 없으면 적이 통째로 약해진다 — M002 보스가 반격 한 번에 죽던 실사례(2026-08-18).
  const diffGrow = { n: "DiffGrowNormal.", h: "DiffGrowHard.", l: "DiffGrowLunatic." }[difficulty];
  return deriveStats({
    jobBase: statBlock(job, "Base."),
    jobRank: Number(job["Rank"] ?? 0),
    personOffset: statBlock(person, `Offset${suffix}.`),
    personGrowth: statBlock(person, "Grow."),
    jobBaseGrow: statBlock(job, "BaseGrow."),
    jobDiffGrow: statBlock(job, diffGrow),
    // AutoGrowOffset은 `person.AssetForce == Enemy(1)`일 때만 성장 레벨 수에 든다.
    enemy: Number(person["AssetForce"] ?? 0) === 1,
    level: unitLevel(unit, difficulty),
    autoGrowOffset: Number(person[`AutoGrowOffset${suffix}`] ?? 0),
    cap: statCap(job, person),
  });
}

/* ── 유닛 스킬 (dispos Sid + 인물 CommonSids + 장착 엠블렘 絆 레벨 싱크로) ── */

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
 * 스타일 분기 치환 — `SkillData.GetStyleSkill`(0x248D920)을 `SkillArray.Commit`(0x2485A10)이
 * **수집된 모든 카테고리의 행에** 거는 파생이다(il2cpp/SKILL_ENGINE.md §3 표 17행).
 * 인게이지 기술의 최종 치환(`GetEngageAttack` 0x2341A6C)도 같은 층이라 스킬·기술이 한 함수를 쓴다.
 * ☠빈 열은 "치환 없음"이다 — 없으면 본체가 정답이고, 임의 행으로 채우면 다른 스킬이 조용히 붙는다.
 */
const styleVariantSid = (sid: string, styleName: string | undefined): string => {
  const field = STYLE_SKILL_FIELD[styleName ?? ""];
  if (field === undefined) return sid;
  const variant = (skills[sid] as Record<string, unknown> | undefined)?.[field];
  return typeof variant === "string" && skills[variant] !== undefined ? variant : sid;
};

/** dispos 유닛의 직업 스타일 — 스킬 스타일 분기의 입력(jobs.xml StyleName). */
const unitStyleName = (unit: DisposUnit): string | undefined => jobs[unit.jid]?.StyleName;

const SKILL_ROW_FIELDS = [
  // ☠Order를 빠뜨리면 웹 사영을 거친 행만 정렬 키를 잃어 실행 순서가 배열 순서로 돌아간다
  //   (엔진 테스트는 그대로 그린이라 안 잡힌다 — skills.timing-filter에서 이미 한 번 난 사고 유형).
  // ☠Cycle이 빠지면 부여층이 전투 로컬(0)과 유닛 영속(!=0)을 못 가른다 — 영속 부여가 전투 사본에 섞인다.
  "Sid", "Timing", "Order", "Cycle", "Stand", "Action", "Condition", "ActNames", "ActOperations", "ActValues",
  "GiveSids", "GiveTarget", "Target", "Power", "Removable", "RangeI", "RangeO",
  "Efficacy", "EfficacyValue", "EfficacyIgnore",
] as const;

/**
 * 0이 곧 엔진 기본값이라 **안 실어도 값이 같은** 필드 — 유닛마다 반복되는 0은 보드 JSON 예산만 먹는다.
 * ☠계약은 엔진이 소유한다: `skills.ts`가 `skill.Order ?? 0` · `(row.Cycle ?? 0) === 0`으로 읽는 두 자리뿐이다.
 *   Timing은 여기 못 넣는다 — `passesFilter`가 `undefined`(무검사 통과)와 `0`(전투 밖 = 탈락)을 **다르게** 읽는다.
 */
const SKILL_ROW_DEFAULT_ZERO = new Set<string>(["Order", "Cycle"]);

/**
 * GiveSids 해소 깊이 — 신속 사슬이 `SID_カウンター` → `…ダメージ５０％` → `SID_神速発動済み`로 2단이라 3이면 족하다.
 * 상한이 곧 순환 가드다(자기 자신을 주는 행이 있어도 여기서 멈춘다).
 */
const GIVE_DEPTH = 3;

/** skills.json 행 → 엔진 SkillRow 슬림 사영(EnhanceValue.* 포함) — 아일랜드 직렬화 대상. */
const slimSkill = (sid: string, depth = 0): SkillRow | undefined => {
  const row = skills[sid] as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of SKILL_ROW_FIELDS) {
    if (row[key] === undefined) continue;
    if (row[key] === 0 && SKILL_ROW_DEFAULT_ZERO.has(key)) continue;
    out[key] = row[key];
  }
  for (const key of Object.keys(row)) if (key.startsWith("EnhanceValue.")) out[key] = row[key];
  // CalcWork 변조 축(Work 2 = 레벨업 클래스 성장 몫, 努力の才) — 1252행이 0이라 비영일 때만 싣는다.
  if (typeof row["Work"] === "number" && row["Work"] !== 0) {
    out["Work"] = row["Work"];
    out["WorkOperation"] = row["WorkOperation"];
    out["WorkValue"] = row["WorkValue"];
  }
  out["Sid"] = sid;
  // ☠GiveSids는 **문자열**이라 엔진 혼자서는 아무것도 못 붙인다(엔진에 스킬 표가 없다 — 행은 유닛이 들고 다닌다).
  //   정본 SkillData.GiveSkills(+0x238)도 이미 해소된 목록이므로 여기서 행으로 풀어 실어 보낸다.
  //   안 실으면 부여층이 조용히 무발현으로 강하한다(신속이 정확히 그렇게 죽어 있었다).
  if (depth < GIVE_DEPTH) {
    const gives = ((row["GiveSids"] as string[] | undefined) ?? [])
      .map((given) => slimSkill(given, depth + 1))
      .filter((r): r is SkillRow => r !== undefined);
    if (gives.length > 0) out["Gives"] = gives;
  }
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

/**
 * ☠**비계** — 인연(絆) 레벨 스케폴드.
 * 진행 중 絆 레벨은 romfs·IL2CPP 어디에도 없다(dispos는 배치만 싣고, 絆는 플레이어 진행이 소유한다).
 * 사용자 지시(2026-08-19) = 경험치 스케폴드와 같은 문법으로 **유닛 레벨 / 2**를 쓰고,
 * 본편 문장사는 **외전 클리어 전까지 10에서 잠긴다**(클리어하면 상한 20까지 풀린다).
 * ★제거 조건 = 런(캠페인) 상태가 絆 레벨을 실제로 들고 다닐 때 그 값으로 교체한다.
 */
export const bondScaffold = (unitLevel: number, paralogueCleared = false): number =>
  Math.min(Math.max(1, Math.floor(unitLevel / 2)), paralogueCleared ? 20 : 10);

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

/**
 * 사람이 소유한 스킬 행(dispos sids + person.CommonSids).
 * ☠엠블렘 싱크로는 여기 섞지 않는다 — 반지는 붙였다 떼는 것이라 `synchroSkills`(엠블렘 클러스터)가
 * 소유해야 해제가 성립한다. 합류는 엔진 `effectiveSkills` 한 곳에서만 일어난다.
 */
export function unitSkillRows(unit: DisposUnit): SkillRow[] {
  const person = persons[unit.pid] as unknown as Record<string, unknown> | undefined;
  const commons = (person?.["CommonSids"] as string[] | undefined) ?? [];
  const style = unitStyleName(unit);
  const sids = [...new Set([...unit.sids, ...commons].map((sid) => styleVariantSid(sid, style)))];
  return sids.map((sid) => slimSkill(sid)).filter((r): r is SkillRow => r !== undefined);
}

/**
 * 엠블렘 싱크로 스킬 행 — 장착 중 상시 유효(문장사 패시브).
 * ☠스타일 분기는 **받는 유닛**이 정한다(`GetStyleSkill`은 Commit 시점 = 유닛의 직업을 안다) —
 * 그래서 SID 목록(`emblemSyncSids`)이 아니라 여기서 건다. 카무이 `SID_竜脈`이 그 자리다.
 */
export function unitSynchroSkillRows(unit: DisposUnit, bondLevel?: number): SkillRow[] | undefined {
  if (unit.gid === undefined) return undefined;
  const style = unitStyleName(unit);
  const rows = emblemSyncSids(unit.gid, bondLevel)
    .map((sid) => slimSkill(styleVariantSid(sid, style)))
    .filter((r): r is SkillRow => r !== undefined);
  return rows.length > 0 ? rows : undefined;
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
  const style = unitStyleName(unit);
  // ☠스타일 분기는 EngageSid 치환(月の腕輪 → 日月の腕輪) **뒤**다 — 정본도 배열에 담은 뒤 Commit이 파생을 건다.
  //   뤼에르(竜族スタイル)가 마르스의 SID_カウンター를 SID_カウンター_竜族으로 받는 자리가 여기다.
  const sids = [...new Set([...unit.sids, ...commons, ...engaged].map((sid) => styleVariantSid(sid, style)))];
  return sids.map((sid) => slimSkill(sid)).filter((r): r is SkillRow => r !== undefined);
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
  /** 워프 목적지 금지 — TerrainData.IsNotTarget = Flag & 0x2001(扉류 2종). 리워프형 기술 착지 게이트. */
  notTarget?: boolean;
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
  /**
   * items.json `Enhance.*` — 장비 중 스탯 강화(무기 35종이 든다: 티르핑 마방+5 등).
   * ☠도핑 아이템 전용이 아니다. 엔진 `toCombatant`가 소비한다.
   */
  enhance?: Partial<StatBlock>;
  /** 무기 부여 스킬 행(EquipSids 슬림 사영) — 장비 중에만 유효(엔진 effectiveSkills 합류). */
  sids?: SkillRow[];
  /** items.json Secure — 무기 필살회피(엔진 combat의 `武器必殺回避`). 부재 = 0. */
  dodge?: number;
  /** items.json Flag의 Engage 비트(128) — 엠블렘 무기 표식. 목록 글자색이 여기서 갈린다. */
  engage?: boolean;
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
  /**
   * 소지 공격 무기 전체(소지품 순) — 예보 패널 무기 목록·attack.weapon 인덱스의 해석 대상.
   * ☠**장비 무기는 따로 싣지 않는다** = 항상 `weapons[0]`이다(가정: 소지품 첫 공격 무기 — 실기 반증 시 갱신).
   * 종전엔 같은 무기를 `weapon`으로도 실어 e006.ko 기준 1.8KB gz를 중복 지출했다(챕터 JSON 예산 §11).
   */
  weapons?: BoardWeaponProp[];
  /** 소지 지팡이 전체(소지품 순) — staff.staff 인덱스의 해석 대상. */
  staves?: StaffItem[];
  /** 사용형 아이템 전체(소지품 순) — item.item 인덱스의 해석 대상. */
  consumables?: ConsumableItem[];
  /** HP 스톡(dispos HpStockCount) — 다단 보스. ☠사영·이벤트 전용, 부활 거동은 미배선(장부 combat.hp-stock). */
  hpStock?: number;
  /** 장착 엠블렘(GID) — 문장사 배지의 주소. 얼굴 경로는 보드 단위 `godFaces`가 소유(유닛마다 반복 금지). */
  gid?: string;
  /** dispos Flag 원값 — 하위 3비트 = 난이도 마스크(N1/H2/L4). 배치 게이트는 `projectUnit`이 건다. */
  flag?: number;
  /** 인게이지 게이지 초기 스냅숏 — 엠블렘(gid) 장착 유닛만. */
  engage?: EngageState;
  /** 엠블렘 싱크로 스킬(SynchroSkills) — 장착 중 상시 유효한 문장사 패시브. */
  synchroSkills?: SkillRow[];
  /** 인게이지 중 스킬 세트(EngagedSkills 교체본) — engaging일 때 skills 대신 이 목록이 유효. */
  engagedSkills?: SkillRow[];
  /** 엠블렘 무기(EngageItems) — engaging일 때 weapons 뒤에 증설(인덱스 계약 유지). */
  engageWeapons?: BoardWeaponProp[];
  /** 인게이지 기술 스냅숏(스타일 분기 해소 후) — engageAttack 액션의 실행물. */
  engageArt?: EngageArt;
  levels: Record<Difficulty, number>;
  /** 직업 내부레벨(상급 20) — 경험치 레벨차 근사 입력. */
  internalLevel: number;
  /** 인물 성장률(%) — 자군 레벨업 rate의 개인 몫이자 고정 누적기 초기값. */
  growth?: StatBlock;
  /** 레벨업 rate의 클래스 몫(현재 job.DiffGrow — 자군 한정). ☠자동레벨의 DiffGrowN/H/L과 다른 필드다. */
  growthJob?: StatBlock;
  /** 스탯 상한(job.Limit + person.Limit) — 성장 게이트의 입력. 없으면 무제한 성장이 된다. */
  cap?: StatBlock;
  /** 직업 최대 레벨(job.MaxLevel) — 도달 시 경험치 정지. */
  maxLevel?: number;
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
  /**
   * 紋章氣 표시명(로케일) — ☠**런타임 생성분 전용**이다. 스크립트가 `MapOverlapSetOne`으로
   * 충전 지점을 새로 놓는 챕터(m002 뤼미에르 격파 후 등)는 정적 objects에 그 좌표가 없어서
   * 이름을 빌려올 데가 없다. 정적 紋章氣가 있으면 그쪽 이름을 쓴다.
   */
  crestName: string;
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
  /** GID → 문장사 초상 경로 — 이 챕터가 쓰는 것만. 배지 렌더의 유일한 얼굴 원천. */
  godFaces?: Record<string, string>;
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
    /** 스크립트가 부르는 SID 행 사영(UnitSetPrivateSkill용). */
    skills: Record<string, SkillRow>;
    /**
     * 스크립트가 부르는 GID 사영(UnitSetGodUnit 패치).
     * arts = 인게이지 기술의 **스타일 분기 해소본**("" = 스타일 무관 기본, 그 외 = StyleName 키).
     * ☠스크립트가 반지를 주는 유닛(m004 세리카→세리누)은 dispos에 gid가 없어 기술이 여기서만 온다.
     */
    gods: Record<
      string,
      {
        engage: EngageState;
        /** 싱크로 스킬 행(장착 중 상시) — 문장사 패시브. 없으면 그 엠블렘은 성장표가 비었다는 뜻. */
        synchroSkills?: SkillRow[];
        /** 인게이지 중 교체본(싱크로 ∪ 인게이지 스킬) — 迅走 같은 발동 한정 패시브가 여기 산다. */
        engagedSkills?: SkillRow[];
        engageWeapons?: BoardWeaponProp[];
        arts?: Record<string, EngageArt>;
        /**
         * StyleName → (원본 Sid → 스타일 변형 행) 치환표 — `GetStyleSkill` 그 자체의 모양이다.
         * ☠여기는 **받을 유닛을 모르는 자리**(스크립트가 나중에 붙인다)라 사영이 스타일을 못 고른다.
         * 치환되는 행만 싣고(전량 복제하면 스타일 수만큼 목록이 불어난다), 고르는 것은
         * 소비처(eventWiring godUnit)가 `unit.style`로 한다.
         */
        styles?: Record<string, Record<string, SkillRow>>;
      }
    >;
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
      cell: { tid: string; costName?: string; avoid: number; def: number } & Partial<Record<"playerAvoid" | "playerDef" | "enemyAvoid" | "enemyDef" | "heal" | "moveFirst", number>> & { notWarp?: boolean; notTarget?: boolean };
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
    dangerAll: string;
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
    replayOn: string;
    replayOff: string;
    unitTurn: string;
    prevUnit: string;
    nextUnit: string;
    nextTurn: string;
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
    /** 유닛 커맨드 메뉴 라벨·설명문(residentmenu.msbt 정본) — i18n Strings.commands 그대로. */
    commands: Strings["commands"];
    /** 소지품 능력표 라벨(system.msbt MID_SYS_* 정본). */
    itemStats: Strings["itemStats"];
    saves: {
      save: string; list: string; empty: string; drop: string; copy: string;
      saved: string; joined: string; steps: string; hint: string;
    };
    logTags: { chain: string; counter: string; follow: string; extra: string; miss: string; brk: string; kill: string; crit: string; refresh: string; engage: string; disengage: string; warp: string; guard: string; spawn: string; join: string; despawn: string };
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
/** items.json Flag의 엠블렘 무기 비트 — 정본 `ItemData.Flags.Engage = 128`(dump.cs:600903).
 *  `UnitItem.GetFontColor`(0x1F95D70)가 이 비트로 목록 글자색을 시안으로 가른다. */
const ENGAGE_FLAG = 128;

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
    // ☠Secure를 안 실으면 `武器必殺回避`가 늘 0이 되어 **예보 필살 확률이 과대**해진다.
    //   엔진(combat.ts)은 이미 소비 중이었고 사영만 끊겨 있었다 — 값이 틀릴 뿐 오류는 안 난다.
    ...(Number(row["Secure"] ?? 0) !== 0 ? { dodge: Number(row["Secure"]) } : {}),
    ...((Number(row["Flag"] ?? 0) & ENGAGE_FLAG) !== 0 ? { engage: true as const } : {}),
    ...(() => {
      const rows = (row.EquipSids ?? []).map((sid) => slimSkill(sid)).filter((r): r is SkillRow => r !== undefined);
      return rows.length > 0 ? { sids: rows } : {};
    })(),
    ...(() => {
      // 장비 중 스탯 강화(items.json `Enhance.*`) — 무기 35종이 든다(티르핑 마방+5 등).
      // ☠도핑 아이템 전용이 아니다. 소비는 엔진 toCombatant 한 곳.
      const enhance = enhanceBlock(row);
      return enhance === undefined ? {} : { enhance };
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

/**
 * 인게이지 기술 선택 — god.EngageAttack → 스타일 분기 1회(GetEngageAttack 0x2341640의 최종 단계).
 * ☠連動(EngageAttackLink — リュール 전용)·暴走(Rampage — 적 GodState)은 미배선: 기본 경로만 산출한다.
 * 스킬 세트 = 기술 행 + SyncSids 1단 전개(汎用設定·ダメージ% 류) — engageAttack 전투 한정 주입물.
 */
/**
 * ☠비계(2026-08-18) — god.xml이 비운 EngageAttack을 정규 엠블렘 것으로 메운다.
 * GID_M002_シグルド는 `EngageAttack=""` · `AIEngageAttackType=None`이라 판독상 오버드라이브가 없는데,
 * **사용자 실기 관측은 2회전 뤼미에르가 H9 도달 시 오버드라이브를 쓴다**(2026-08-18 확인, 관측 우선 결정).
 * 제거 조건 = 실기 재관측으로 미사용이 확인되거나, 변종 엠블렘이 정규 기술을 참조하는 경로를 판독했을 때.
 */
const ENGAGE_ATTACK_SCAFFOLD: Record<string, string> = {
  GID_M002_シグルド: "SID_シグルドエンゲージ技",
};

export const emblemEngageArt = (gid: string, styleName: string | undefined, locale: Locale): EngageArt | undefined => {
  const god = godsTable.gods[gid];
  const baseSid =
    god === undefined ? undefined : String(god["EngageAttack"] ?? "") || (ENGAGE_ATTACK_SCAFFOLD[gid] ?? "");
  if (baseSid === undefined || baseSid === "" || skills[baseSid] === undefined) return undefined;
  const sid = styleVariantSid(baseSid, styleName);
  const row = skills[sid] as Record<string, unknown>;
  // ☠순서가 값을 정한다 — `SID_エンゲージ技_汎用設定`이 攻撃回数=1 같은 **기본값**을 `=`로 대입하므로
  //   기술 자신의 행이 **뒤에** 와야 한다(마르스 스타 러시 = 7타, 竜族 변형 9타). 앞에 두면 1타로 깎여
  //   프롤로그 마무리가 4피해 1타로 나갔다(2026-08-18 실측).
  const rows = [...((row["SyncSids"] as string[] | undefined) ?? []), sid]
    .map((sid) => slimSkill(sid))
    .filter((r): r is SkillRow => r !== undefined);
  const equipIids = (row["EquipIids"] as string[] | undefined) ?? [];
  const weapons = equipIids.map((iid) => (iid === "IID_無し" ? null : (attackWeaponProp(iid, locale) ?? null)));
  return {
    sid,
    name: namedOr(skills, locale, sid),
    skills: rows,
    ...(weapons.length > 0 ? { weapons } : {}),
    // ☠RangeI/RangeO = 0은 "사거리 0"이 아니라 **미지정**이다 — 엔진 계약(`art.rangeMin ?? 무기.rangeMin`)이
    //   그 자리를 무기 사거리에 넘긴다. 0을 그대로 실으면 0~0이 되어 기술이 영영 못 나간다
    //   (세리카 ワープライナ·아이크·베레트·헥토르·카밀라·미카야 = 전부 0. 마르스류는 1~1로 명시).
    ...(typeof row["RangeI"] === "number" && (row["RangeI"] as number) > 0 ? { rangeMin: row["RangeI"] as number } : {}),
    ...(typeof row["RangeO"] === "number" && (row["RangeO"] as number) > 0 ? { rangeMax: row["RangeO"] as number } : {}),
    cost: Number(row["Cost"] ?? 0),
    ...(Number(row["Rewarp"] ?? 0) > 0 ? { rewarp: Number(row["Rewarp"]) } : {}),
    // Target = SkillData.Targets.Pierce(4) = 관통형(시구르드 オーバードライブ) — 실행 문법은 엔진이 소유.
    ...(Number(row["Target"] ?? 0) === 4 ? { pierce: true as const } : {}),
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
  // 이 챕터가 실제로 쓰는 GID만 모은다 — 얼굴 경로를 유닛마다 반복하지 않고 보드에 한 번만 싣는다.
  const gidsUsed = new Set<string>();
  const units: BoardUnitProp[] = views.map((v) => {
    const job = jobs[v.unit.jid];
    const moveType = MOVE_TYPES[job?.MoveType ?? 0] ?? "none";
    moveTypes.add(moveType);
    const style = forceStyle(v.unit.force);
    const skillRows = unitSkillRows(v.unit);
    /**
     * ★문장사(싱크로) 패시브의 정적 보정도 스냅숏에 든다 — 종전에는 **유닛 자기 스킬만** 넣어서
     * 반지를 낀 유닛의 力/技/速さ 보정이 통째로 빠져 있었다.
     * 실기 앵커(2026-08-19 사용자 스크린샷) = 뤼에르&마르스 絆1·철의 검에서 **물공 12**인데
     * 보정 없이는 11이 나온다(힘 6 + 위력 5). ☠속도는 추격 임계를 직접 가르므로 판정까지 바뀐다.
     * 絆 레벨은 bondScaffold가 정한다(진행 중 絆는 어떤 덤프에도 없다).
     */
    const bondLevel = v.unit.gid === undefined ? undefined : bondScaffold(unitLevel(v.unit, "l"));
    const syncRows = v.unit.gid === undefined ? undefined : unitSynchroSkillRows(v.unit, bondLevel);
    const enhanceRows = syncRows === undefined ? skillRows : [...(skillRows ?? []), ...syncRows];
    const withEnhance = (d: Difficulty): StatBlock | undefined => {
      const base = unitStats(v.unit, d);
      return base === undefined ? undefined : staticEnhances(base, enhanceRows ?? []);
    };
    const person = persons[v.unit.pid] as unknown as Record<string, unknown> | undefined;
    return {
      x: v.unit.x,
      y: v.unit.y,
      force: v.unit.force,
      group: v.group,
      ...(v.unit.flag !== undefined ? { flag: v.unit.flag } : {}),
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
        return weapons.length > 0 ? { weapons } : {};
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
        // 絆 레벨 = 스케폴드(위 bondScaffold). ☠난이도별로 갈리지 않게 **루나틱 레벨**을 기준으로 삼는다 —
        // 스킬 목록은 보드 JSON에 한 벌만 실리므로(난이도별 3벌 = 용량 정책 위반) 기준을 하나로 고정해야 한다.
        const bond = bondLevel ?? bondScaffold(unitLevel(v.unit, "l"));
        const engage = engageStateFor(v.unit.gid, bond);
        if (engage === undefined) return {};
        gidsUsed.add(v.unit.gid);
        const synchroSkills = syncRows;
        const engagedSkills = unitEngagedSkillRows(v.unit, bond);
        const engageWeapons = emblemEngageWeapons(v.unit.gid, locale, bond);
        const engageArt = emblemEngageArt(v.unit.gid, job?.StyleName, locale);
        return {
          gid: v.unit.gid,
          engage,
          ...(synchroSkills !== undefined ? { synchroSkills } : {}),
          ...(engagedSkills !== undefined ? { engagedSkills } : {}),
          ...(engageWeapons.length > 0 ? { engageWeapons } : {}),
          ...(engageArt !== undefined ? { engageArt } : {}),
        };
      })(),
      ...(v.unit.hpStock !== undefined && v.unit.hpStock > 0 ? { hpStock: v.unit.hpStock } : {}),
      levels: { n: unitLevel(v.unit, "n"), h: unitLevel(v.unit, "h"), l: unitLevel(v.unit, "l") },
      internalLevel: Number((jobs[v.unit.jid] as unknown as Record<string, unknown> | undefined)?.["InternalLevel"] ?? 0),
      growth: person === undefined ? undefined : statBlock(person, "Grow."),
      // 성장 게이트 입력은 자군에만 싣는다 — 경험치·레벨업이 자군 한정이라(battle.ts grantExp)
      // 적·우군에 실으면 소비처 없이 유닛당 9숫자가 늘어 챕터 JSON 예산(§11)을 밀어낸다.
      ...(v.unit.force === 0
        ? {
            cap: unitCap(v.unit),
            maxLevel: job?.MaxLevel,
            // 레벨업 rate의 클래스 몫(LEVELUP_GROW.md) — 개인 단독 사영이던 결손을 2026-08-31 수리.
            ...(job !== undefined
              ? { growthJob: statBlock(job as unknown as Record<string, unknown>, "DiffGrow.") }
              : {}),
          }
        : {}),
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
      ...((Number(row?.Flag ?? 0) & 0x2001) !== 0 ? { notTarget: true } : {}),
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
      ...((Number(row?.Flag ?? 0) & 0x2001) !== 0 ? { notTarget: true } : {}),
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
        // ☠**서는 칸**을 빠뜨리면 민가가 영영 안 열린다 — 민가 본체는 통행 불가고 `EventEntryVisit`이
        //   등록하는 좌표는 **앞칸**이다(m004: 집 (7,5) · 서는 칸 (7,4)). 방문 액션의 합법성 기준.
        ...(it.stand !== undefined ? { stand: it.stand } : {}),
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
    crestName: tileName(locale, "TID_紋章氣"),
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
      // ☠챕터 전용 Include(기믹 스크립트)를 실어야 한다 — common*은 클라이언트가 fetch하지만
      //   `Include("G002_Gimmick")` 같은 챕터 전속 소스는 아무도 안 실어서 g002·g003·g005가
      //   개시조차 못 했다(2026-08-18 MP7 B4). 키는 Include가 소문자로 찾으므로 파일명 그대로다.
      const locals = [
        ...new Set(
          [...src.matchAll(/Include\(\s*"([^"]+)"/g)]
            .map((m) => m[1].toLowerCase())
            .filter((name) => name !== mapId && !name.startsWith("common") && scriptFiles[name] !== undefined),
        ),
      ].sort();
      for (const name of locals) sources[name] = scriptFiles[name]!;
      // 표 사영의 폐포 = 챕터 + 챕터 전용 Include(기믹이 자기 스킬·엠블렘·아이템·지형을 쓴다).
      const own = [mapId, ...locals];
      const ownSrc = own.map((name) => scriptFiles[name] ?? "").join("\n");
      const sidRows: Record<string, SkillRow> = {};
      for (const m of ownSrc.matchAll(/"(SID_[^"]+)"/g)) {
        const row = slimSkill(m[1]);
        if (row !== undefined) sidRows[m[1]] = row;
      }
      const gods: NonNullable<BoardProps["script"]>["gods"] = {};
      for (const m of ownSrc.matchAll(/"(GID_[^"]+)"/g)) {
        const engage = engageStateFor(m[1]);
        if (engage === undefined) continue;
        const engageWeapons = emblemEngageWeapons(m[1], locale);
        // 기술은 스타일로 갈린다(STYLE_SKILL_FIELD) — 받을 유닛을 모르므로 **이 챕터에 실재하는 스타일만**
        // 해소해 싣는다(기본과 같은 결과는 싣지 않는다 = 종별 선형).
        const chapterStyles = new Set(units.map((u) => u.style).filter((v): v is string => v !== undefined));
        const baseArt = emblemEngageArt(m[1], undefined, locale);
        const arts: Record<string, EngageArt> = baseArt === undefined ? {} : { "": baseArt };
        for (const style of chapterStyles) {
          const art = emblemEngageArt(m[1], style, locale);
          if (art !== undefined && art.sid !== baseArt?.sid) arts[style] = art;
        }
        // 문장사 패시브 — 싱크로(상시)와 인게이지 교체본(발동 중)을 **함께** 싣는다.
        // 없으면 Lua로 붙인 엠블렘이 게이지·무기·기술만 얻고 패시브는 조용히 사라진다.
        const passiveSids = [...emblemSyncSids(m[1]), ...emblemEngagedSids(m[1])];
        const synchroSkills = emblemSyncSids(m[1]).map((sid) => slimSkill(sid)).filter((r): r is SkillRow => r !== undefined);
        const engagedSkills = emblemEngagedSids(m[1]).map((sid) => slimSkill(sid)).filter((r): r is SkillRow => r !== undefined);
        // 스타일 분기(GetStyleSkill)는 기술만의 규칙이 아니다 — 迅走는 본체 이동 +5, 竜族 변형은 +6이다.
        // 치환표만 싣는다: 목록을 스타일마다 복제하면 같은 행이 8벌로 불어난다(보드 JSON 예산 §11).
        const styles: Record<string, Record<string, SkillRow>> = {};
        for (const style of chapterStyles) {
          const swap: Record<string, SkillRow> = {};
          for (const sid of new Set(passiveSids)) {
            const variant = styleVariantSid(sid, style);
            if (variant === sid) continue;
            const row = slimSkill(variant);
            if (row !== undefined) swap[sid] = row;
          }
          if (Object.keys(swap).length > 0) styles[style] = swap;
        }
        gods[m[1]] = {
          engage,
          ...(synchroSkills.length > 0 ? { synchroSkills } : {}),
          ...(engagedSkills.length > 0 ? { engagedSkills } : {}),
          ...(engageWeapons.length > 0 ? { engageWeapons } : {}),
          ...(Object.keys(arts).length > 0 ? { arts } : {}),
          ...(Object.keys(styles).length > 0 ? { styles } : {}),
        };
        gidsUsed.add(m[1]);
      }
      // 아이템 사영 — 폐포 = 챕터 + common*(공용 헬퍼가 상자·민가 지급을 소유한다).
      const itemPack: NonNullable<BoardProps["script"]>["items"] = {};
      for (const name of [...own, ...commons]) {
        for (const m of (scriptFiles[name] ?? "").matchAll(/"(IID_[^"]+)"/g)) {
          if (itemPack[m[1]] !== undefined) continue;
          const row = gainItemFor(m[1], locale);
          if (row !== undefined) itemPack[m[1]] = row;
        }
      }
      // 지형 사영 — 폐포 = 챕터 + common*(공용 헬퍼도 TerrainSet을 부른다). 실사용 TID만 담긴다(종별 선형).
      const terrains: NonNullable<BoardProps["script"]>["terrains"] = {};
      for (const name of [...own, ...commons]) {
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
              ...((Number(row.Flag ?? 0) & 0x2001) !== 0 ? { notTarget: true } : {}),
            },
            ...(row.cost !== undefined ? { cost: row.cost } : {}),
            color: tileColor(m[1]),
            name: tileName(locale, m[1]),
          };
        }
      }
      return { script: { chapter: mapId, sources, commons, skills: sidRows, gods, terrains, items: itemPack } };
    })(),
    // ★엠블렘 초상은 **보드에 한 번만** 싣는다(유닛 사영은 gid 문자열만) — 같은 경로를 유닛마다
    //   반복하면 챕터 JSON 예산(§11)을 갉아먹는다. ☠스크립트 gods 뒤에 와야 한다(gidsUsed가 그때 완성된다).
    ...(() => {
      const godFaces: Record<string, string> = {};
      for (const gid of [...gidsUsed].sort()) {
        const path = assetHref(manifest.godFaces?.[gid]);
        if (path !== undefined) godFaces[gid] = path;
      }
      return Object.keys(godFaces).length > 0 ? { godFaces } : {};
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
    dangerAll: t.dangerAll,
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
    replayOn: t.replayOn,
    replayOff: t.replayOff,
    unitTurn: t.unitTurn,
    prevUnit: t.prevUnit,
    nextUnit: t.nextUnit,
    nextTurn: t.nextTurn,
    zoomIn: t.zoomIn,
    zoomOut: t.zoomOut,
    copyRecord: t.copyRecord,
    copied: t.copied,
    commands: t.commands,
    itemStats: t.itemStats,
    saves: t.saves,
    logTags: t.logTags,
  });
}

/* ── 엔트리 빌더 사영 (design/avg_stats_builder.md B2) ──
   섬(BuilderIsland)은 여기서 만든 직렬화 props만 받는다 — 원천 테이블은 클라이언트에 싣지 않는다.
   계산 답변자는 엔진(growthPath·mergeStatCap·levelUpGrowthRate) — 여기는 테이블 필드 → 입력 사상만. */

export interface BuilderCharProp {
  pid: string;
  name: string;
  face?: string;
  joinLevel: number;
  /** person.InternalLevel — 합류 내부 레벨(1기점) = internalOffset + joinLevel. */
  internalOffset: number;
  personGrowth: StatBlock;
  /** 루나틱 고정(OffsetL) — 설계 결정 Q1(2026-08-31). */
  personOffset: StatBlock;
  /** 개인 캡 보정(s8 음수 가능) — 섬이 mergeStatCap(job.limit, personLimit)으로 합성한다. */
  personLimit: StatBlock;
  joinJid: string;
  /** CalcWork 변조 스킬(Work 비영 — 장 努力の才) — growthPath workSkills 입력. */
  workSkills?: SkillRow[];
  /** 스포일러 표식(본편 후반 2인: 모브·베일) — 스포일러 체커 꺼짐(기본)이면 섬이 표에서 뺀다. */
  spoiler?: true;
  /** DLC 사룡의 장 5인 — DLC 체커 소관(스포일러와 분리, 2026-08-31 사용자 지시). */
  dlc?: true;
  /** 합류 초기 무기(chart.xml 加入 로드아웃의 첫 공격 무기) — 글로벌 아이템 미선택 시 카드 기본값
      (2026-09-01 사용자 지시). chart에 없는 DLC 5인 등은 없음 = 미착용. */
  joinIid?: string;
  /** 고유 무기 적성 = person.Aptitude 비트마스크(1<<Kind — Sword 2 … Fist 256). 실효 랭크·블루 표식의
      입력(effectiveWeaponRanks). SubAptitude는 랭크 보정이 없어 사영하지 않는다(2026-09-02 판독). */
  aptitude: number;
  /** 고유 스킬 = CommonSids 중 이름 라벨이 있는 것(SID_主人公 같은 무명 플래그 제외) — 네임카드 칩. */
  personalSkills: EmblemSkillProp[];
}

/** 합류 직업 단면 — 경로 입력 + 무기군 랭크(직업 미선택 카드의 적성 표시용, 2026-09-02). */
export interface JoinJobProp extends GrowthPathJob {
  weaponRanks: Record<number, string>;
}

export interface BuilderJobProp extends GrowthPathJob {
  jid: string;
  /** 로케일 직업명 — 헤더 성장률 행에 게시(멀티클래스 개편으로 영문 코너 폐지, 2026-08-31). */
  name: string;
  /** 전용직의 가능 캐릭터(정확히 1명 — Q3: 가능자 상단 표시) — 범용은 undefined. */
  uniquePid?: string;
  /** 착용 가능 무기군 → 최대 랭크(job Weapon*=1 && MaxWeaponLevel* != N). 키 = Kind(지팡이 7 포함). */
  weaponRanks: Record<number, string>;
}

/** 강화 단계 하나의 누적 보정(refine.json — 錬成 시트 정본). */
export interface RefineStage {
  power: number;
  weight: number;
  hit: number;
  crit: number;
}

/** 빌더 장비 후보 무기 — 표시·전투력 합산에 필요한 단면만(적 전용·비공개는 사영 전에 걸린다). */
export interface BuilderWeaponProp {
  iid: string;
  name: string;
  /** items.json Kind(1검 2창 3도끼 4활 5나이프 6마도서 8체술 9특수) — 장착 가능 판정·정렬 축. */
  kind: number;
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid: number;
  dodge: number;
  magic: boolean;
  /** 착용 요구 랭크(WeaponLevel) — ignoreRank(Flag 256)면 무시. */
  rank: string;
  ignoreRank?: true;
  /** 무기 상점 판매(기본무기군 = 전열 정렬) — 없으면 유니크류 후열. */
  shop?: true;
  /** 엠블렘(엔게이지) 무기 — 목록 글자색 표지(인게임 시안 관례). */
  engage?: true;
  /** 장비 중 스탯 강화(Enhance.*) — 스탯 합산 후 전투력을 평가한다. */
  enhance?: Partial<StatBlock>;
  /** 특효(EquipSids의 Efficacy 스킬) — kind = IconLabel(아이콘·명칭 키), help = 정본 스킬 설명(로케일). */
  efficacies?: { kind: string; help: string; icon?: string }[];
  /** 강화 +1~+5 누적 보정 — 없으면 강화 불가 무기. */
  refine?: RefineStage[];
  /** 아이콘 에셋 href — 베이크 전이면 undefined(표시는 이름만). */
  icon?: string;
}

/** 각인(刻印) 후보 — god.xml 엠블렘 행의 무기 보정 단면. 인게임은 무기 스탯 게터 안에서
    직접 가산된다(UnitItem.GetPower 계열 — shared/fidelity weapons.forge-engrave §11·§12). */
export interface BuilderEngraveProp {
  gid: string;
  /** 각인명(EngraveWord MGEID — 인게임 각인 표기: 시작의 문장 …). */
  name: string;
  /** 엠블렘 얼굴 아이콘 — 없으면 이름 칩 폴백(베로니카는 정규 얼굴 에셋이 없다). */
  icon?: string;
  /** 본편 후반 스포일러(불꽃의 문장) — 스포일러 체커 소관(2026-08-31 사용자 지정). */
  spoiler?: true;
  /** DLC 엠블렘(god Flag 32) — DLC 체커 소관(2026-08-31 사용자 확정). */
  dlc?: true;
  power: number;
  weight: number;
  hit: number;
  crit: number;
  avoid: number;
  /** EngraveSecure = 필살회피. */
  dodge: number;
}

/** 문장사 레벨 상세의 스킬 한 줄 — 이름은 표기, 설명(Help)은 호버 상세가 소비. */
export interface EmblemSkillProp {
  sid: string;
  name: string;
  help?: string;
  /** 스킬 아이콘 href(manifest.skills) — 베이크 전·아이콘 없는 Sid는 undefined(이름만). */
  icon?: string;
}

/** 문장사 레벨 상세의 엔게이지 아이템 — 공격 무기면 스펙 단면(weapon) 동봉(지팡이류는 이름·설명만). */
export interface EmblemItemProp {
  iid: string;
  name: string;
  help?: string;
  icon?: string;
  weapon?: BuilderWeaponProp;
}

/** 絆 레벨 1칸의 획득분(성장표 원행 그대로 — 누적·대체는 bonuses가 소유). 전부 빈 레벨은 목록에서 뺀다. */
export interface EmblemLevelProp {
  bond: number;
  synchro?: EmblemSkillProp[];
  engage?: EmblemSkillProp[];
  weapons?: EmblemItemProp[];
}

/** 문장사(반지) 후보 — 대표 신장 20(builderEngraves와 동일 판별). */
export interface BuilderEmblemProp {
  gid: string;
  /** 문장사 이름(Mid) — 드롭다운·카드 하단 표기. */
  name: string;
  /** 반지 아이콘(godring 베이크) — 베이크 전이면 이름 칩 폴백. */
  icon?: string;
  spoiler?: true;
  dlc?: true;
  /** 絆 1..20 누적 시너지 스탯 델타(동계열 대체 = emblemSyncSids 정본) — 인덱스 = 絆-1, 비영 키만. */
  bonuses: Partial<Record<StatKey, number>>[];
  levels: EmblemLevelProp[];
  /** 계승 가능 스킬(성장표 InheritanceSkills, 첫 등장 순) — 카드 계승 슬롯 드롭다운의 그룹 항목(2026-09-02). */
  inherits: InheritSkillProp[];
}

/** 계승 스킬 후보 — 표기 단면 + 해금 絆 + SP 비용 + 엔진 평가용 슬림 행. */
export interface InheritSkillProp extends EmblemSkillProp {
  bond: number;
  cost?: number;
  row: SkillRow;
}

export interface BuilderProps {
  locale: Locale;
  /** 星玉の加護 행(Work 3 = TotalGrowChange +15) — 빌더 체커가 켜면 전 캐릭터 workSkills에 얹는다. */
  starsphere?: SkillRow;
  /** 합류순(본편 사슬 + 외전은 개방 시점(unlock) 뒤 삽입) — 초기 정렬의 정본. */
  chars: BuilderCharProp[];
  /** 합류 직업 단면(jid → 경로 입력 + 무기군 랭크) — chars.joinJid가 참조. limit는 job.Limit 원값. */
  joinJobs: Record<string, JoinJobProp>;
  /** 드롭다운 목록(Sort 순): 범용 + 전용. limit는 job.Limit 원값(개인 보정은 섬이 합성). */
  targetJobs: BuilderJobProp[];
  /** 장비 후보 무기 전량 — 상점 전열(등장순) → 유니크 후열(kind → 랭크 → 가격). */
  weapons: BuilderWeaponProp[];
  /** 각인 후보(각인값 채운 엠블렘 22행) — gods.json 순서 그대로(본편 → DLC). */
  engraves: BuilderEngraveProp[];
  /** 문장사 반지 후보(대표 신장 20) — 카드 반지 슬롯·絆 보너스·레벨 상세 팝업이 소비. */
  emblems: BuilderEmblemProp[];
  /** 미장착 반지 플레이스홀더 아이콘(絆지환 실버 링) — 베이크 전이면 라벨 폴백. */
  ringPlaceholder?: string;
  /** 무기군 아이콘(흰 실루엣) href — 키 = Kind(1~9, 지팡이 7 포함). 베이크 전이면 빈 객체. */
  kindIcons: Record<number, string>;
}

/** 스포일러 명단(2026-08-31 사용자 재지정: DLC와 분리) — 본편 후반 합류 2인(모브 m021·베일 m022). */
const SPOILER_PIDS = new Set(["PID_モーヴ", "PID_ヴェイル"]);
/** DLC 사룡의 장 5인 — "DLC 및 사룡의 장 표시" 체커 소관(2026-08-31 사용자 지정). */
const DLC_PIDS = new Set([
  "PID_エル", "PID_ラファール", "PID_セレスティア", "PID_グレゴリー", "PID_マデリーン",
]);

/** job.xml 무기 적성 ↔ items Kind — 지팡이(7)는 무기군 아이콘 표시용(장비 후보 목록은 공격 무기만). */
const JOB_WEAPON_FIELDS: readonly [number, string, string][] = [
  [1, "WeaponSword", "MaxWeaponLevelSword"],
  [2, "WeaponLance", "MaxWeaponLevelLance"],
  [3, "WeaponAxe", "MaxWeaponLevelAxe"],
  [4, "WeaponBow", "MaxWeaponLevelBow"],
  [5, "WeaponDagger", "MaxWeaponLevelDagger"],
  [6, "WeaponMagic", "MaxWeaponLevelMagic"],
  [7, "WeaponRod", "MaxWeaponLevelRod"],
  [8, "WeaponFist", "MaxWeaponLevelFist"],
  [9, "WeaponSpecial", "MaxWeaponLevelSpecial"],
];

const jobWeaponRanks = (r: Record<string, unknown>): Record<number, string> => {
  const out: Record<number, string> = {};
  for (const [kind, flagField, rankField] of JOB_WEAPON_FIELDS) {
    // Weapon*는 0/1/2 열거(0 불가 · 1 고정 · 2 전직 선택 무기군) — 선택 무기군도 전부 적용한다
    // (2026-08-31 사용자 지시: 드래곤나이트 = 검·창·도끼).
    if (Number(r[flagField] ?? 0) === 0) continue;
    const rank = String(r[rankField] ?? "N");
    if (rank !== "N") out[kind] = rank;
  }
  return out;
};

/* items.json Flag 비트(정본 ItemData.Flags, dump.cs:600892~) — 빌더 목록 필터·랭크 무시·DLC 후열. */
const ITEM_FLAG_ONLY_ENEMY = 16;
const ITEM_FLAG_IGNORE_RANK = 256;
const ITEM_FLAG_UNPUBLIC = 512;
const ITEM_FLAG_DOWNLOAD = 4096;

// 랭크 서열은 weaponRank.ts(클라이언트 안전)가 소유한다 — 여기서 재정의하면 서열이 갈라진다.
export { rankValue };

/** 무기 특효 단면(EquipSids → Efficacy 비영 스킬) — 빌더 무기 목록·문장사 엔게이지 무기가 공용.
    아이콘 키 = IconLabel(efficacy 스프라이트 동명). */
const weaponEfficacies = (row: Record<string, unknown>, locale: Locale): { kind: string; help: string; icon?: string }[] =>
  ((row["EquipSids"] as string[] | undefined) ?? []).flatMap((sid) => {
    const skill = skills[sid] as Record<string, unknown> | undefined;
    if (typeof skill?.["Efficacy"] !== "number" || skill["Efficacy"] === 0) return [];
    const kind = String(skill["IconLabel"] ?? "");
    const effIcon = assetHref(manifest.efficacy?.[kind]);
    return [
      {
        kind,
        help: label(locale, String(skill["Help"] ?? "")) ?? "",
        ...(effIcon !== undefined ? { icon: effIcon } : {}),
      },
    ];
  });

/** 장비 후보 무기 전량 — 적 전용(OnlyEnemy)·비공개(Unpublic)·문장사 무기 제외
    (엠블렘 무기 제외 = 2026-08-31 사용자 지시 — 엔게이지 상태 한정 무기라 상시 장비 목록 밖.
    ☠판별은 Engage 플래그만으로 부족하다: _通常 변형은 Flag 3이라 새어 들어온다(실측) —
    엠블렘 이름 접두 IID를 gods 정본 키로 함께 거른다).
    정렬(2026-08-31 사용자 지시) = 상점 기본무기(약함→강함: 랭크→위력→가격) → 유니크 → DLC. */
function builderWeapons(locale: Locale): BuilderWeaponProp[] {
  const shopIndex = new Map(shopTable.weapons.map((iid, i) => [iid, i]));
  // 엠블렘 이름 집합 — gods 키(GID_*)에서 챕터코드(E/M###)·상手 변형을 뺀 첫 토막.
  const emblemNames = new Set<string>();
  for (const gid of Object.keys(godsTable.gods)) {
    const name = gid.replace(/^GID_/, "").split("_")[0] ?? "";
    if (name !== "" && !/^[EM]\d{3}$/.test(name) && !name.startsWith("相手")) emblemNames.add(name);
  }
  const emblemPrefixed = (iid: string): boolean => {
    const m = /^IID_([^_]+)_/.exec(iid);
    return m !== null && emblemNames.has(m[1] ?? "");
  };
  const list: (BuilderWeaponProp & { group: number; price: number })[] = [];
  for (const iid of Object.keys(items)) {
    const row = items[iid] as unknown as Record<string, unknown>;
    const flag = Number(row["Flag"] ?? 0);
    if ((flag & (ITEM_FLAG_ONLY_ENEMY | ITEM_FLAG_UNPUBLIC | ENGAGE_FLAG)) !== 0) continue;
    if (emblemPrefixed(iid)) continue;
    const prop = attackWeaponProp(iid, locale);
    if (prop === undefined) continue;
    const stages = refineTable[iid.replace(/^IID_/, "")];
    const icon = assetHref(manifest.items?.[String(row["Icon"] ?? "")]);
    const shopIdx = shopIndex.get(iid);
    const efficacies = weaponEfficacies(row, locale);
    list.push({
      iid,
      name: prop.name,
      kind: prop.kind,
      might: prop.might,
      hit: prop.hit,
      crit: prop.crit,
      weight: prop.weight,
      avoid: prop.avoid,
      dodge: prop.dodge ?? 0,
      magic: prop.magic,
      rank: String(row["WeaponLevel"] ?? "N"),
      ...((flag & ITEM_FLAG_IGNORE_RANK) !== 0 ? { ignoreRank: true as const } : {}),
      ...(shopIdx !== undefined ? { shop: true as const } : {}),
      ...(prop.engage === true ? { engage: true as const } : {}),
      ...(prop.enhance !== undefined ? { enhance: prop.enhance } : {}),
      ...(efficacies.length > 0 ? { efficacies } : {}),
      ...(stages !== undefined ? { refine: stages } : {}),
      ...(icon !== undefined ? { icon } : {}),
      group: shopIdx !== undefined ? 0 : (flag & ITEM_FLAG_DOWNLOAD) !== 0 ? 2 : 1,
      price: Number(row["Price"] ?? 0),
    });
  }
  list.sort(
    (a, b) =>
      a.group - b.group ||
      a.kind - b.kind ||
      rankValue(a.rank) - rankValue(b.rank) ||
      a.might - b.might ||
      a.price - b.price ||
      a.name.localeCompare(b.name),
  );
  // 표시명 중복 제거(2026-08-31 사용자 지시) — 엠블렘 무기는 접두·通常·챕터판 변형 IID가 겹친다.
  // 정렬이 상점 원판을 앞세우므로 첫 항목이 대표가 된다.
  const seen = new Set<string>();
  return list.flatMap(({ group: _group, price: _price, ...weapon }) => {
    if (seen.has(weapon.name)) return [];
    seen.add(weapon.name);
    return [weapon];
  });
}

/** god Flag DLC 비트(실측: 본편 엠블렘 Flag 2 · DLC 34/50 — 32가 가른다). */
const GOD_FLAG_DLC = 32;
/** 불꽃의 문장(리유의 각인) — 본편 후반 스포일러(2026-08-31 사용자 지정: 각인 쪽 유일 스포일러). */
const SPOILER_ENGRAVE_GID = "GID_リュール";

/** 각인 후보 — 각인 필드가 하나라도 비영인 행(적 변형은 전부 0) 중 **대표 신장**만(Gbid == 자기 GBID).
    팔찌 변신형(디미트리·클로드)은 에델가르트 팔찌의 Gbid를 갖고, 각인 심볼 번들에도 없다 —
    인게임 각인은 팔찌당 1개("삼정의 문장", 2026-08-31 사용자 실기 확인) = 정확히 20행. */
function builderEngraves(locale: Locale): BuilderEngraveProp[] {
  const out: BuilderEngraveProp[] = [];
  for (const [gid, row] of Object.entries(godsTable.gods)) {
    const vals = {
      power: Number(row["EngravePower"] ?? 0),
      weight: Number(row["EngraveWeight"] ?? 0),
      hit: Number(row["EngraveHit"] ?? 0),
      crit: Number(row["EngraveCritical"] ?? 0),
      avoid: Number(row["EngraveAvoid"] ?? 0),
      dodge: Number(row["EngraveSecure"] ?? 0),
    };
    if (Object.values(vals).every((v) => v === 0)) continue;
    if (String(row["Gbid"] ?? "") !== gid.replace(/^GID_/, "GBID_")) continue;
    // 아이콘 = 각인 심볼(초상 대체, 2026-08-31 사용자 지시) — 베이크 전이면 이름 칩 폴백.
    const icon = assetHref(manifest.godEngraves?.[gid]);
    out.push({
      gid,
      name: label(locale, String(row["EngraveWord"] ?? "")) ?? gid,
      ...(icon !== undefined ? { icon } : {}),
      ...(gid === SPOILER_ENGRAVE_GID ? { spoiler: true as const } : {}),
      ...((Number(row["Flag"] ?? 0) & GOD_FLAG_DLC) !== 0 ? { dlc: true as const } : {}),
      ...vals,
    });
  }
  return out;
}

/** 스킬 아이콘 href — 키 = IconLabel(있으면) 아니면 Sid에서 SID_ 제거. ☠힘+1류는 아이콘이 `力＋１_継承用`에만
    있어 Sid만 보면 결손(2026-09-02 조사) — 고유 스킬·계승 스킬이 같은 경로를 쓴다. */
const skillIconHref = (sid: string, row: Record<string, unknown> | undefined): string | undefined => {
  const iconLabel = String(row?.["IconLabel"] ?? "");
  return assetHref(manifest.skills?.[iconLabel !== "" ? iconLabel : sid.replace(/^SID_/, "")]);
};

/** skills 행 → 팝업 표기 단면 — 이름 MSID가 없는 내부 행(무효과 슬롯)은 표시하지 않는다. */
const emblemSkillBrief = (sid: string, locale: Locale): EmblemSkillProp | undefined => {
  const row = skills[sid] as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const name = label(locale, String(row["Name"] ?? ""));
  if (name === undefined || name === "") return undefined;
  const help = label(locale, String(row["Help"] ?? ""));
  const icon = skillIconHref(sid, row);
  return { sid, name, ...(help !== undefined && help !== "" ? { help } : {}), ...(icon !== undefined ? { icon } : {}) };
};

/** 문장사 계승 가능 스킬 목록 — 성장표 1..20의 InheritanceSkills를 첫 등장 순으로(같은 sid 중복 제거).
    행(SkillRow 슬림)을 동봉해 표시층이 정적 스탯(EnhanceValue)·전투 보정(Act*)을 엔진으로 평가한다.
    ☠InheritanceSkills는 카탈로그일 뿐(fidelity §InheritanceSkills) — 실소유는 세이브라 사용자 선택 입력으로 다룬다. */
const emblemInherits = (table: Record<string, { InheritanceSkills?: string[] }>, locale: Locale): InheritSkillProp[] => {
  const out: InheritSkillProp[] = [];
  const seen = new Set<string>();
  for (let bond = 1; bond <= 20; bond++) {
    for (const sid of table[String(bond)]?.InheritanceSkills ?? []) {
      if (seen.has(sid)) continue;
      seen.add(sid);
      const brief = emblemSkillBrief(sid, locale);
      const row = slimSkill(sid);
      if (brief === undefined || row === undefined) continue;
      const cost = (skills[sid] as Record<string, unknown> | undefined)?.["InheritanceCost"];
      out.push({ ...brief, bond, ...(typeof cost === "number" ? { cost } : {}), row });
    }
  }
  return out;
};

/** 엔게이지 아이템 단면 — 공격 무기면 빌더 무기 스펙(BuilderWeaponProp)을 동봉해 SpecPanel이 선다. */
const emblemItemBrief = (iid: string, locale: Locale): EmblemItemProp | undefined => {
  const row = items[iid] as unknown as Record<string, unknown> | undefined;
  if (row === undefined) return undefined;
  const name = label(locale, String(row["Name"] ?? "")) ?? iid;
  const help = label(locale, String(row["Help"] ?? ""));
  const icon = assetHref(manifest.items?.[String(row["Icon"] ?? "")]);
  const prop = attackWeaponProp(iid, locale);
  const efficacies = weaponEfficacies(row, locale);
  const weapon: BuilderWeaponProp | undefined =
    prop === undefined
      ? undefined
      : {
          iid,
          name: prop.name,
          kind: prop.kind,
          might: prop.might,
          hit: prop.hit,
          crit: prop.crit,
          weight: prop.weight,
          avoid: prop.avoid,
          dodge: prop.dodge ?? 0,
          magic: prop.magic,
          rank: String(row["WeaponLevel"] ?? "N"),
          ...(prop.engage === true ? { engage: true as const } : {}),
          ...(prop.enhance !== undefined ? { enhance: prop.enhance } : {}),
          ...(efficacies.length > 0 ? { efficacies } : {}),
          ...(icon !== undefined ? { icon } : {}),
        };
  return {
    iid,
    name,
    ...(help !== undefined && help !== "" ? { help } : {}),
    ...(icon !== undefined ? { icon } : {}),
    ...(weapon !== undefined ? { weapon } : {}),
  };
};

/** 絆 레벨 누적 시너지 스탯 델타 — SID 누적·동계열 대체는 emblemSyncSids(보드 정본)가 소유하고,
    합산은 엔진 staticEnhances와 같은 축(EnhanceValue 층)이다. 비영 키만 남긴다. */
const emblemBonusAt = (gid: string, bond: number): Partial<Record<StatKey, number>> => {
  const rows = emblemSyncSids(gid, bond)
    .map((sid) => slimSkill(sid))
    .filter((r): r is SkillRow => r !== undefined);
  const zero = {} as StatBlock;
  for (const key of STAT_KEYS) zero[key] = 0;
  const sum = staticEnhances(zero, rows);
  const out: Partial<Record<StatKey, number>> = {};
  for (const key of STAT_KEYS) if (sum[key] !== 0) out[key] = sum[key];
  return out;
};

/** 문장사(반지) 후보 — 판별은 builderEngraves와 동일(각인값 비영 + 대표 신장 Gbid) = 정확히 20행. */
function builderEmblems(locale: Locale): BuilderEmblemProp[] {
  const engraveFields = ["EngravePower", "EngraveWeight", "EngraveHit", "EngraveCritical", "EngraveAvoid", "EngraveSecure"];
  const out: BuilderEmblemProp[] = [];
  for (const [gid, row] of Object.entries(godsTable.gods)) {
    if (engraveFields.every((f) => Number(row[f] ?? 0) === 0)) continue;
    if (String(row["Gbid"] ?? "") !== gid.replace(/^GID_/, "GBID_")) continue;
    const icon = assetHref(manifest.godRings?.[gid]);
    const bonuses: Partial<Record<StatKey, number>>[] = [];
    for (let bond = 1; bond <= 20; bond++) bonuses.push(emblemBonusAt(gid, bond));
    const table = godsTable.growth[String(row["GrowTable"] ?? "")] ?? {};
    const inherits = emblemInherits(table, locale);
    const levels: EmblemLevelProp[] = [];
    for (let bond = 1; bond <= 20; bond++) {
      const lv = table[String(bond)];
      if (lv === undefined) continue;
      const synchro = (lv.SynchroSkills ?? []).flatMap((sid) => emblemSkillBrief(sid, locale) ?? []);
      const engage = (lv.EngageSkills ?? []).flatMap((sid) => emblemSkillBrief(sid, locale) ?? []);
      const weapons = (lv.EngageItems ?? []).flatMap((iid) => emblemItemBrief(iid, locale) ?? []);
      if (synchro.length + engage.length + weapons.length === 0) continue;
      levels.push({
        bond,
        ...(synchro.length > 0 ? { synchro } : {}),
        ...(engage.length > 0 ? { engage } : {}),
        ...(weapons.length > 0 ? { weapons } : {}),
      });
    }
    out.push({
      gid,
      name: label(locale, String(row["Mid"] ?? "")) ?? gid,
      ...(icon !== undefined ? { icon } : {}),
      ...(gid === SPOILER_ENGRAVE_GID ? { spoiler: true as const } : {}),
      ...((Number(row["Flag"] ?? 0) & GOD_FLAG_DLC) !== 0 ? { dlc: true as const } : {}),
      bonuses,
      levels,
      inherits,
    });
  }
  return out;
}

/** 무기군 아이콘 스프라이트 이름(ui_icon/weapon 번들 베이크 실측 — Kind 1~9, 흰 실루엣).
    Kind 9는 Breath·Bullet로 갈리는데 직업 플래그로는 구분 불가 — Breath 대표값(플랜 §0 이월). */
const KIND_ICON_NAMES: Record<number, string> = {
  1: "Sword", 2: "Lance", 3: "Ax", 4: "Bow", 5: "Dagger", 6: "Magic", 7: "Rod", 8: "Fist", 9: "Breath",
};

const kindIconsOf = (): Record<number, string> => {
  const table = manifest.weapontypes ?? {};
  const out: Record<number, string> = {};
  for (const [kind, name] of Object.entries(KIND_ICON_NAMES)) {
    const href = assetHref(table[name]);
    if (href !== undefined) out[Number(kind)] = href;
  }
  return out;
};

const pathJobOf = (jid: string): GrowthPathJob | undefined => {
  const job = jobs[jid] as unknown as Record<string, unknown> | undefined;
  if (job === undefined) return undefined;
  return {
    base: statBlock(job, "Base."),
    limit: statBlock(job, "Limit."),
    // ☠레벨업 rate의 클래스 몫 = 공용 DiffGrow — 자동레벨의 DiffGrowN/H/L(난이도별)이 아니다.
    diffGrow: statBlock(job, "DiffGrow."),
    rank: Number(job["Rank"] ?? 0),
  };
};

export function builderPropsFor(locale: Locale): BuilderProps {
  const notes = parse<Record<string, { joins?: string[] }>>(chapternotesRaw);
  // 합류순 = 본편 사슬 순서 + 외전은 개방 챕터(unlock) 바로 뒤. 뤼에르만 join 이벤트가 없다(m000 상주).
  const order: string[] = ["PID_リュール"];
  for (const entry of chapterList) {
    if (entry.category !== "main") continue;
    for (const pid of notes[chapterMapId(entry.cid)]?.joins ?? []) order.push(pid);
    const tail = entry.cid.replace(/^CID_/, "");
    for (const para of chapterList) {
      if (para.category !== "paralogue" || para.unlock !== tail) continue;
      for (const pid of notes[chapterMapId(para.cid)]?.joins ?? []) order.push(pid);
    }
  }
  // DLC(사룡의 장) 5인 — E챕터 chapternotes.joins가 전부 빈 배열이라(보상 합류가 이벤트 데이터 밖)
  // 뤼에르와 같은 명시 예외로 잇는다. DLC 제외 해제 = 2026-08-31 사용자 지시.
  order.push("PID_エル", "PID_ラファール", "PID_セレスティア", "PID_グレゴリー", "PID_マデリーン");
  // 이름 기반 얼굴 폴백 — 정본 pid 매핑이 없는 DLC 5인용(파일명 = Name에서 MPID_ 제거).
  const facePaths = new Set(Object.values(manifest.faces ?? {}));
  // 합류 초기 무기 — 무기 후보 목록(중복 제거 후)에 실존하는 첫 iid만 사영(목록 밖이면 미착용 강하).
  const weaponList = builderWeapons(locale);
  const weaponIids = new Set(weaponList.map((w) => w.iid));
  const joinItems = parse<Record<string, string[]>>(joinitemsRaw);
  const chars: BuilderCharProp[] = [];
  for (const pid of order) {
    const person = persons[pid] as unknown as Record<string, unknown> | undefined;
    if (person === undefined) continue;
    const workSkills = ((person["CommonSids"] as string[] | undefined) ?? []).flatMap((sid) => {
      const row = skills[sid] as Record<string, unknown> | undefined;
      if (typeof row?.["Work"] !== "number" || row["Work"] === 0) return [];
      return [
        {
          Sid: sid,
          Work: Number(row["Work"]),
          WorkOperation: String(row["WorkOperation"]),
          WorkValue: Number(row["WorkValue"]),
        } as SkillRow,
      ];
    });
    // ☠얼굴은 pid 직결로 읽는다 — toView의 sharedFaces 히스토그램은 DLC 위장 pid와의 파일 공유로
    //   본편 14명을 아이콘으로 강등시킨다(2026-08-31 조사) — 빌더에는 그 은폐 로직이 필요 없다.
    const nameFace = `assets/faces/${String(person["Name"] ?? "").replace(/^MPID_/, "")}.webp`;
    const face = assetHref(manifest.faces?.[pid] ?? (facePaths.has(nameFace) ? nameFace : undefined));
    chars.push({
      pid,
      name: label(locale, String(person["Name"])) ?? pid,
      ...(face !== undefined ? { face } : {}),
      joinLevel: Number(person["Level"] ?? 1),
      // 내부 레벨 base = person.InternalLevel, 0이면 job.InternalLevel 폴백(内部レベル計算 정본 — B0-3).
      internalOffset:
        Number(person["InternalLevel"] ?? 0) ||
        Number((jobs[String(person["Jid"])] as unknown as Record<string, unknown> | undefined)?.["InternalLevel"] ?? 0),
      personGrowth: statBlock(person, "Grow."),
      personOffset: statBlock(person, "OffsetL."),
      personLimit: statBlock(person, "Limit."),
      joinJid: String(person["Jid"]),
      ...(workSkills.length > 0 ? { workSkills } : {}),
      ...(SPOILER_PIDS.has(pid) ? { spoiler: true as const } : {}),
      ...(DLC_PIDS.has(pid) ? { dlc: true as const } : {}),
      ...(() => {
        const iid = (joinItems[pid] ?? []).find((i) => weaponIids.has(i));
        return iid !== undefined ? { joinIid: iid } : {};
      })(),
      aptitude: Number(person["Aptitude"] ?? 0),
      personalSkills: ((person["CommonSids"] as string[] | undefined) ?? []).flatMap((sid) => {
        const row = skills[sid] as Record<string, unknown> | undefined;
        const name = row === undefined ? undefined : label(locale, String(row["Name"] ?? ""));
        if (name === undefined) return [];
        const help = label(locale, String(row?.["Help"] ?? ""));
        const icon = skillIconHref(sid, row);
        return [{ sid, name, ...(help !== undefined ? { help } : {}), ...(icon !== undefined ? { icon } : {}) }];
      }),
    });
  }
  const joinJobs: Record<string, JoinJobProp> = {};
  for (const c of chars) {
    if (joinJobs[c.joinJid] === undefined) {
      const job = pathJobOf(c.joinJid);
      const row = jobs[c.joinJid] as unknown as Record<string, unknown> | undefined;
      if (job !== undefined && row !== undefined) joinJobs[c.joinJid] = { ...job, weaponRanks: jobWeaponRanks(row) };
    }
  }
  // 승급망 도달 = 기본직(Rank 0)의 HighJob1/2 합집합. ☠LowJob 필드는 Jid가 아니라 MSBT 라벨이다.
  const reachedBy = new Map<string, string>();
  for (const [jid, row] of Object.entries(jobs)) {
    const r = row as unknown as Record<string, unknown>;
    if (Number(r["Rank"] ?? 0) !== 0) continue;
    for (const f of ["HighJob1", "HighJob2"]) {
      const high = r[f];
      if (typeof high === "string" && high.startsWith("JID_") && !reachedBy.has(high)) reachedBy.set(high, jid);
    }
  }
  const targetJobs: (BuilderJobProp & { sort: number })[] = [];
  for (const [jid, row] of Object.entries(jobs)) {
    const r = row as unknown as Record<string, unknown>;
    const rank = Number(r["Rank"] ?? 0);
    // 특수직(시프·댄서·사룡 계열) = Rank 0 + MaxLevel 40 시그니처 — 승급망 밖이라 랭크 1 필터가
    // 놓친다(2026-08-31 사용자 지적). 전직 게이트는 엔진 growthPath가 랭크 무관으로 이미 다룬다.
    const special = rank === 0 && Number(r["MaxLevel"] ?? 0) === 40;
    if (rank !== 1 && !special) continue;
    const flag = Number(r["Flag"] ?? 0);
    const low = reachedBy.get(jid);
    // 범용 = Flag 11(승급망 밖 인챈트·메이지캐넌·시프 포함) · 전용 = Flag 1 + 가능자
    // (승급망 기본직 합류 || 그 직업 직접 합류 — 댄서=세아다스, 사룡 계열) · Flag 0 = 적 전용 변형.
    const uniquePid = flag === 1 ? chars.find((c) => c.joinJid === low || c.joinJid === jid)?.pid : undefined;
    if (!(flag === 11 || uniquePid !== undefined)) continue;
    const path = pathJobOf(jid);
    if (path === undefined) continue;
    targetJobs.push({
      jid,
      name: label(locale, String(r["Name"])) ?? jid,
      ...path,
      ...(uniquePid !== undefined ? { uniquePid } : {}),
      weaponRanks: jobWeaponRanks(r),
      sort: Number(r["Sort"] ?? 0),
    });
  }
  targetJobs.sort((a, b) => a.sort - b.sort);
  const star = skills["SID_星玉の加護"] as Record<string, unknown> | undefined;
  return {
    locale,
    ...(typeof star?.["Work"] === "number" && star["Work"] !== 0
      ? {
          starsphere: {
            Sid: "SID_星玉の加護",
            Work: Number(star["Work"]),
            WorkOperation: String(star["WorkOperation"]),
            WorkValue: Number(star["WorkValue"]),
          } as SkillRow,
        }
      : {}),
    chars,
    joinJobs,
    targetJobs: targetJobs.map(({ sort: _sort, ...job }) => job),
    weapons: weaponList,
    engraves: builderEngraves(locale),
    emblems: builderEmblems(locale),
    ...(() => {
      const href = assetHref(manifest.ringCommons?.["Silver"]);
      return href !== undefined ? { ringPlaceholder: href } : {};
    })(),
    kindIcons: kindIconsOf(),
  };
}
