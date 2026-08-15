export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: string | undefined): v is Locale =>
  LOCALES.includes(v as Locale);

interface Strings {
  localeName: string;
  player: string;
  enemy: string;
  units: string;
  level: string;
  position: string;
  items: string;
  skills: string;
  class: string;
  group: string;
  terrain: string;
  axis: string;
  board: string;
  themeToggle: string;
  language: string;
  tagline: string;
  recommended: string;
  size: string;
}

export const UI: Record<Locale, Strings> = {
  en: {
    localeName: "EN",
    player: "Player",
    enemy: "Enemy",
    units: "units",
    level: "Lv",
    position: "Position",
    items: "Items",
    skills: "Skills",
    class: "Class",
    group: "Group",
    terrain: "Terrain",
    axis: "x left · y up",
    board: "Deployment map",
    themeToggle: "Switch theme",
    language: "Language",
    tagline: "Fire Emblem Engage",
    recommended: "Recommended",
    size: "Size",
  },
  ko: {
    localeName: "KO",
    player: "아군",
    enemy: "적군",
    units: "유닛",
    level: "Lv",
    position: "위치",
    items: "장비",
    skills: "스킬",
    class: "클래스",
    group: "그룹",
    terrain: "지형",
    axis: "x 왼쪽 · y 위",
    board: "배치도",
    themeToggle: "테마 전환",
    language: "언어",
    tagline: "파이어 엠블렘 인게이지",
    recommended: "권장 레벨",
    size: "크기",
  },
};

export const htmlLang: Record<Locale, string> = { en: "en", ko: "ko" };
