import type { ChapterData, DisposUnit } from "@fesim/shared";
import chapterRaw from "../../../../data/fe17/chapters/m002.json?raw";
import terrainRaw from "../../../../data/fe17/tables/terrain.json?raw";
import personsRaw from "../../../../data/fe17/tables/persons.json?raw";
import jobsRaw from "../../../../data/fe17/tables/jobs.json?raw";
import namesRaw from "../../../../data/fe17/names/en.json?raw";

/** 화면상 Y축 방향 미확정(M0에서 좌표계만 확정) — 뒤집히면 이 상수만 true로. */
export const FLIP_Y = false;

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

const parse = <T,>(raw: string): T => JSON.parse(raw) as T;

export const chapter = parse<ChapterData>(chapterRaw);
export const terrain = parse<Record<string, TerrainRow>>(terrainRaw);
export const persons = parse<Record<string, PersonRow>>(personsRaw);
export const jobs = parse<Record<string, JobRow>>(jobsRaw);
export const names = parse<Record<string, string>>(namesRaw);

/** 에셋 매니페스트는 파이프라인 병렬 작업물 — 없으면 폴백(색 칩)으로 렌더한다. */
const manifestGlob = import.meta.glob("../../../../data/fe17/assets/manifest.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export const manifest: AssetManifest = Object.values(manifestGlob)
  .map((raw) => parse<AssetManifest>(raw))
  .at(0) ?? {};

/** manifest 경로는 data/fe17 기준 상대 → public/fe17 심링크로 서빙된다. */
export const assetHref = (p: string | undefined): string | undefined =>
  p === undefined ? undefined : `/fe17/${p.replace(/^\/*(fe17\/)?/, "")}`;

export const label = (key: string | undefined): string | undefined =>
  key === undefined ? undefined : names[key];

export const tileColor = (tid: string): string => {
  const t = terrain[tid];
  return t === undefined ? "rgb(0,0,0)" : `rgb(${t.ColorR},${t.ColorG},${t.ColorB})`;
};

export const tileName = (tid: string): string =>
  label(terrain[tid]?.Name) ?? tid.replace(/^TID_/, "");

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
  return words.length > 1
    ? words.map((w) => w[0]).join("").slice(0, 3)
    : job.slice(0, 2);
};

/** 아이템·스킬 이름표는 IID/SID→메시지 라벨 테이블이 아직 없다 — 원본 라벨을 그대로 보여준다. */
const stripId = (id: string): string => id.replace(/^[A-Z]+_/, "");

export function toView(unit: DisposUnit, group: string): UnitView {
  const person = persons[unit.pid];
  const job = jobs[unit.jid];
  const jobName = label(job?.Name) ?? unit.jid.replace(/^JID_/, "");
  const iconEntry = manifest.mapicons?.byPid?.[unit.pid];
  const iconPath =
    iconEntry === undefined
      ? undefined
      : iconEntry.weapons[iconEntry.defaultWeapon] ?? Object.values(iconEntry.weapons).at(0);
  return {
    unit,
    group,
    name: label(person?.Name) ?? unit.pid.replace(/^PID_/, ""),
    job: jobName,
    level: unit.level.n > 0 ? unit.level.n : (person?.Level ?? 1),
    face: assetHref(manifest.faces?.[unit.pid]),
    icon: assetHref(iconPath),
    abbr: abbreviate(jobName),
    items: unit.items.map((i) => stripId(i.iid)),
    skills: unit.sids.map(stripId),
  };
}

export const units: UnitView[] = chapter.groups.flatMap((g) =>
  g.units.map((u) => toView(u, g.name)),
);

/** 0 = 아군(파랑) · 1 = 적(빨강) · 2 = 우군/중립(초록) */
export const forceStyle = (force: number): { ring: string; chip: string; text: string } =>
  force === 0
    ? { ring: "#3b82f6", chip: "#1d4ed8", text: "Player" }
    : force === 1
      ? { ring: "#ef4444", chip: "#b91c1c", text: "Enemy" }
      : { ring: "#22c55e", chip: "#15803d", text: "Other" };
