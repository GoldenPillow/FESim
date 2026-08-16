export const LOCALES = ["en", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: string | undefined): v is Locale =>
  LOCALES.includes(v as Locale);

interface Strings {
  localeName: string;
  player: string;
  enemy: string;
  ally: string;
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
  phase: string;
  objects: string;
  forecast: string;
  hit: string;
  crit: string;
  damage: string;
  currentPosNote: string;
  difficulty: string;
  diffN: string;
  diffH: string;
  diffL: string;
  endPhase: string;
  waitCmd: string;
  attackCmd: string;
  turnPhase: string;
  turnWord: string;
  victory: string;
  defeat: string;
  reset: string;
  logTags: { chain: string; counter: string; follow: string; miss: string; brk: string; kill: string; crit: string };
  chapterSelect: string;
  comingSoon: string;
  categories: { main: string; paralogue: string; divine: string; fell: string };
}

export const UI: Record<Locale, Strings> = {
  en: {
    localeName: "EN",
    player: "Player",
    enemy: "Enemy",
    ally: "Ally",
    units: "units",
    level: "Lv",
    position: "Position",
    items: "Items",
    skills: "Skills",
    class: "Class",
    group: "Group",
    terrain: "Terrain",
    axis: "x right · y up",
    board: "Deployment map",
    themeToggle: "Switch theme",
    language: "Language",
    tagline: "Fire Emblem Engage",
    recommended: "Recommended",
    size: "Size",
    phase: "Phase",
    objects: "Objects",
    forecast: "Battle forecast",
    hit: "Hit",
    crit: "Crit",
    damage: "Dmg",
    currentPosNote: "Assumes attack at max weapon range",
    difficulty: "Difficulty",
    diffN: "Normal",
    diffH: "Hard",
    diffL: "Maddening",
    endPhase: "End phase",
    waitCmd: "Wait",
    attackCmd: "Attack",
    turnPhase: "Phase",
    turnWord: "Turn",
    victory: "Victory!",
    defeat: "Defeat...",
    reset: "Reset",
    logTags: { chain: "chain", counter: "counter", follow: "follow-up", miss: "missed", brk: "Break!", kill: "defeated", crit: "crit!" },
    chapterSelect: "Chapters",
    comingSoon: "Coming soon",
    categories: { main: "Main Story", paralogue: "Paralogues", divine: "Divine Paralogues", fell: "Fell Xenologue" },
  },
  ko: {
    localeName: "KO",
    player: "아군",
    enemy: "적군",
    ally: "우군",
    units: "유닛",
    level: "Lv",
    position: "위치",
    items: "장비",
    skills: "스킬",
    class: "클래스",
    group: "그룹",
    terrain: "지형",
    axis: "x 오른쪽 · y 위",
    board: "배치도",
    themeToggle: "테마 전환",
    language: "언어",
    tagline: "파이어 엠블렘 인게이지",
    recommended: "권장 레벨",
    size: "크기",
    phase: "국면",
    objects: "오브젝트",
    forecast: "전투 예보",
    hit: "명중",
    crit: "필살",
    damage: "위력",
    currentPosNote: "공격측 최대 사거리 교전 기준 근사",
    difficulty: "난이도",
    diffN: "노멀",
    diffH: "하드",
    diffL: "루나틱",
    endPhase: "페이즈 종료",
    waitCmd: "대기",
    attackCmd: "공격",
    turnPhase: "페이즈",
    turnWord: "턴",
    victory: "승리!",
    defeat: "패배...",
    reset: "초기화",
    logTags: { chain: "체인", counter: "반격", follow: "추격", miss: "빗나감", brk: "브레이크!", kill: "격파", crit: "필살!" },
    chapterSelect: "챕터 선택",
    comingSoon: "준비 중",
    categories: { main: "본편", paralogue: "외전", divine: "신룡의 장", fell: "사룡의 장" },
  },
};

export const htmlLang: Record<Locale, string> = { en: "en", ko: "ko" };
