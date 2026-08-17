import type { FidelityStatus } from "@fesim/shared";

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
  undoCmd: string;
  editCmd: string;
  editExit: string;
  editHint: string;
  removeCmd: string;
  restoreCmd: string;
  copyRecord: string;
  copied: string;
  logTags: { chain: string; counter: string; follow: string; miss: string; brk: string; kill: string; crit: string; refresh: string; engage: string; disengage: string; warp: string; guard: string; spawn: string; join: string; despawn: string };
  chapterSelect: string;
  comingSoon: string;
  categories: { main: string; paralogue: string; divine: string; fell: string };
  focus: FocusLabels;
  fidelity: FidelityLabels;
}

/** 기전 장부(재현 상태) 라벨 — 데이터 정본은 shared/fidelity.ts, 여기는 UI 문자열만. */
export interface FidelityLabels {
  badge: string;
  title: string;
  intro: string;
  statusNames: Record<FidelityStatus, string>;
  legend: Record<FidelityStatus, string>;
  unsupportedSkill: string;
}

/** 포커스 모드(공유 열람 /s/) 전용 라벨 — 셸(Astro)과 아일랜드가 같은 묶음을 쓴다. */
export interface FocusLabels {
  verified: string;
  recordOnly: string;
  prev: string;
  next: string;
  actionWord: string;
  edit: string;
  notFound: string;
  broken: string;
  shared: string;
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
    staffCmd: "Staff",
    itemCmd: "Item",
    guardCmd: "Chain Guard",
    destroyCmd: "Destroy",
    warpPick: "Choose warp destination",
    engageCmd: "Engage",
    tradeCmd: "Trade",
    closeCmd: "Close",
    turnPhase: "Phase",
    turnWord: "Turn",
    victory: "Victory!",
    defeat: "Defeat...",
    reset: "Reset",
    undoCmd: "Undo",
    editCmd: "Edit",
    editExit: "Done",
    editHint: "Click a unit, then an empty tile to reposition",
    removeCmd: "Remove",
    restoreCmd: "Restore",
    copyRecord: "Copy record",
    copied: "Copied",
    logTags: { chain: "chain", counter: "counter", follow: "follow-up", miss: "missed", brk: "Break!", kill: "defeated", crit: "crit!", refresh: "dances again", engage: "Engage!", disengage: "engage ended", warp: "warped", guard: "Chain Guard", spawn: "appears!", join: "joins the party", despawn: "leaves" },
    chapterSelect: "Chapters",
    comingSoon: "Coming soon",
    categories: { main: "Main Story", paralogue: "Paralogues", divine: "Divine Paralogues", fell: "Fell Xenologue" },
    focus: {
      verified: "Verified",
      recordOnly: "Record view",
      prev: "Previous action",
      next: "Next action",
      actionWord: "action",
      edit: "Try editing this strategy",
      notFound: "No such link.",
      broken: "This record could not be read.",
      shared: "Shared record",
    },
    fidelity: {
      badge: "Engine fidelity",
      title: "Reproduction status",
      intro:
        "Every in-game mechanic FESim tracks, and how faithfully each one is reproduced. Nothing is claimed without a source.",
      statusNames: {
        anchored: "Anchored",
        implemented: "Implemented",
        assumed: "Assumed",
        absent: "Not simulated",
        deferred: "Planned",
      },
      legend: {
        anchored: "verified against the real game or source data",
        implemented: "implemented, not yet verified in-game",
        assumed: "implemented with stated assumptions",
        absent: "not reproduced yet — shown honestly",
        deferred: "scheduled, with prerequisites",
      },
      unsupportedSkill: "Grant effect (GiveSids) not simulated yet",
    },
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
    staffCmd: "지팡이",
    itemCmd: "아이템",
    guardCmd: "체인가드",
    destroyCmd: "파괴",
    warpPick: "워프 목적지 선택",
    engageCmd: "인게이지",
    tradeCmd: "교환",
    closeCmd: "닫기",
    turnPhase: "페이즈",
    turnWord: "턴",
    victory: "승리!",
    defeat: "패배...",
    reset: "초기화",
    undoCmd: "물리기",
    editCmd: "편집",
    editExit: "편집 종료",
    editHint: "유닛 클릭 후 빈 칸 클릭 = 배치 이동",
    removeCmd: "제거",
    restoreCmd: "복원",
    copyRecord: "기보 복사",
    copied: "복사됨",
    logTags: { chain: "체인", counter: "반격", follow: "추격", miss: "빗나감", brk: "브레이크!", kill: "격파", crit: "필살!", refresh: "재행동", engage: "인게이지!", disengage: "인게이지 종료", warp: "워프", guard: "체인가드", spawn: "증원!", join: "아군 합류", despawn: "퇴장" },
    chapterSelect: "챕터 선택",
    comingSoon: "준비 중",
    categories: { main: "본편", paralogue: "외전", divine: "신룡의 장", fell: "사룡의 장" },
    focus: {
      verified: "검증됨",
      recordOnly: "기록 열람 모드",
      prev: "이전 행동",
      next: "다음 행동",
      actionWord: "행동",
      edit: "이 전략 편집해보기",
      notFound: "그런 링크가 없습니다.",
      broken: "기보를 읽을 수 없습니다.",
      shared: "공유된 기보",
    },
    fidelity: {
      badge: "재현 상태",
      title: "재현 상태",
      intro: "FESim이 추적하는 인게임 기전 전수와 각각의 재현 충실도입니다. 근거 없는 수치는 표시하지 않습니다.",
      statusNames: {
        anchored: "실측 검증",
        implemented: "구현됨",
        assumed: "가정 포함",
        absent: "미재현",
        deferred: "예정",
      },
      legend: {
        anchored: "실기·정본 데이터로 검증됨",
        implemented: "구현됨, 실기 검증 전",
        assumed: "구현됐으나 명시된 가정 포함",
        absent: "아직 재현 안 됨 — 정직 표기",
        deferred: "선행 조건과 함께 예정",
      },
      unsupportedSkill: "부여 효과(GiveSids) 미재현",
    },
  },
};

export const htmlLang: Record<Locale, string> = { en: "en", ko: "ko" };
