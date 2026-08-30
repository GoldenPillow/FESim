import type { FidelityStatus, StatKey } from "@fesim/shared";

/** 순서가 곧 스위처 표기 순서(EN JP KO — 2026-08-31 사용자 지정). 코드는 언어코드 ja, 표기는 JP. */
export const LOCALES = ["en", "ja", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (v: string | undefined): v is Locale =>
  LOCALES.includes(v as Locale);

export interface Strings {
  localeName: string;
  player: string;
  enemy: string;
  ally: string;
  /** 챕터 노트(획득물·해금·상점·특이사항 — chapternotes.json 표시) */
  notes: {
    title: string; drops: string; visits: string; rewards: string; unlocks: string;
    shop: string; shopKinds: { weapon: string; item: string; fleaMarket: string };
    /** 난이도 표기 — 드랍처럼 난이도마다 갈리는 항목의 기준을 밝힌다. */
    diffNames: { n: string; h: string; l: string };
    ringsGain: string; ringsLose: string; ringsRegain: string; joins: string; cautions: string;
  };
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
  enemyAuto: string;
  enemyAutoBlocked: string;
  /** 「위험 범위」 전체 표시 토글 — 인게임 ZL(tutorial.msbt MID_TUT_OVERALLINFORMATION_1). */
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
  /**
   * 유닛 커맨드 메뉴 — ★라벨·설명문의 정본은 `residentmenu.msbt`(`MID_MENU_*` / `MID_MENU_HELP_*`)다.
   * 손으로 지어내지 않는다. `engageArt`만 라벨이 기술명이라 여기 값은 폴백이고
   * 설명문은 정본을 못 찾아 비운다(`MID_TUT_BMAP_ENGAGE_ATTACK_TITLE` 사영).
   * ☠객체 하나로 묶는 이유 = i18n → BoardProps → 컴포넌트 3층을 지나므로 낱개 키면 한 층에서 빠져도
   * 빈 문자열로 조용히 렌더된다.
   */
  /** 소지품 "사용 시 능력" 표의 항목 라벨 — 정본 = system.msbt MID_SYS_*. */
  itemStats: { atk: string; hit: string; crit: string; spd: string; avo: string; dodge: string; rng: string };
  commands: Record<
    "engage" | "engageArt" | "attack" | "staff" | "dance" | "guard" | "destroy" | "visit" | "item" | "trade" | "wait",
    { label: string; help?: string }
  >;
  /**
   * 넘버링 세이브(관리자 표면) — 객체 하나로 묶는 이유: 라벨은 i18n → BoardProps → 컴포넌트로
   * ☠3층을 지나므로, 낱개 키로 늘리면 한 층에서 빠져도 조용히 빈 문자열로 렌더된다.
   */
  saves: {
    save: string; list: string; empty: string; drop: string; copy: string;
    saved: string; joined: string; steps: string; hint: string;
  };
  logTags: { chain: string; counter: string; follow: string; extra: string; miss: string; brk: string; kill: string; crit: string; refresh: string; engage: string; disengage: string; warp: string; guard: string; spawn: string; join: string; despawn: string };
  chapterSelect: string;
  comingSoon: string;
  categories: { main: string; paralogue: string; divine: string; fell: string };
  focus: FocusLabels;
  fidelity: FidelityLabels;
  builder: BuilderLabels;
  home: HomeLabels;
}

/**
 * 캐릭터 빌더 라벨 — ☠객체 하나로 묶는다: i18n → 페이지 → 아일랜드 3층을 지나므로
 * 낱개 키로 늘리면 한 층에서 빠져도 조용히 빈 문자열로 렌더된다.
 */
export interface BuilderLabels {
  title: string;
  intro: string;
  job: string;
  /** 드롭다운 미선택 옵션. */
  jobNone: string;
  /** 내부 레벨 드롭다운 라벨(정본 = calculator.json 内部レベル計算, 1기점 표기). */
  internal: string;
  /** 표 헤더용 짧은 표기. */
  internalShort: string;
  /** 성옥의 가호 체커 라벨(+15% 총 성장). */
  starsphere: string;
  /** 스포일러 체커 라벨 — 켜면 후반(모브·베일)·사룡의 장 캐릭터 표시(기본 숨김, localStorage 저장). */
  showSpoilers: string;
  /** 멀티클래스 비교 추가 버튼 — 누르면 아래에 직업 선택기가 한 줄 늘어난다. */
  addCompare: string;
  /** 고유 성장률 체커 — 켜면 캐릭터 블록 첫 줄에 개인 성장률(블루)이 선다(기존 행은 한 칸씩 밀림). */
  personalGrowth: string;
  /** 비교 선택기 제거 버튼의 접근성 라벨. */
  removeCompare: string;
  /** 헤더 둘째 줄 = 선택 직업의 클래스 성장률. */
  growth: string;
  /** 직업 미선택 안내(합류 시점 값이라는 사실). */
  joinedNote: string;
  cappedNote: string;
  /** 전용직 불가 행 표식. */
  unavailable: string;
  stats: Record<StatKey, string>;
}

/** 메인 랜딩(허브) 라벨 — 섹션·링크는 정적 페이지가 그대로 편다. */
export interface HomeLabels {
  intro: string;
  sections: { general: string; battle: string; character: string; data: string };
  links: Record<"simulator" | "fidelity" | "builder" | "classes" | "skills", { name: string; desc: string }>;
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
    notes: {
      title: "Chapter Notes", drops: "Drops", visits: "Visits", rewards: "Rewards", unlocks: "Unlocks",
      shop: "Shop stock", shopKinds: { weapon: "Weapons", item: "Items", fleaMarket: "Flea market" },
      diffNames: { n: "Normal", h: "Hard", l: "Lunatic" },
      ringsGain: "Rings gained", ringsLose: "Rings lost", ringsRegain: "Rings regained", joins: "Joins",
      cautions: "Cautions",
    },
    units: "units",
    level: "Lv",
    position: "Position",
    items: "Items",
    skills: "Skills",
    class: "Class",
    group: "Group",
    terrain: "Terrain",
    axis: "cols 1→ · rows A↑ (origin bottom-left)",
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
    enemyAuto: "Auto enemy turn",
    enemyAutoBlocked: "AI gap — units skipped",
    dangerAll: "Danger area",
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
    replayCmd: "Replay",
    replayPrev: "Previous action",
    replayNext: "Next action",
    replayPrevPhase: "Previous phase",
    replayNextPhase: "Next phase",
    replayOn: "Replay running — press to take over from here",
    replayOff: "Watch the replay of this chapter",
    unitTurn: "Action",
    prevUnit: "Previous unit",
    nextUnit: "Next unit",
    nextTurn: "End turn",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    undoCmd: "Undo",
    editCmd: "Edit",
    editExit: "Done",
    editHint: "Click a unit, then an empty tile to reposition",
    removeCmd: "Remove",
    restoreCmd: "Restore",
    copyRecord: "Copy record",
    itemStats: { atk: "Ph Atk", hit: "Hit", crit: "Crit", spd: "Spd", avo: "Avo", dodge: "Ddg", rng: "Rng" },
    commands: {
      engage: { label: "Engage", help: "Merge with an Emblem." },
      engageArt: { label: "Engage Attacks" },
      attack: { label: "Attack", help: "Combat a foe." },
      staff: { label: "Staff", help: "Heal allies, impair enemies, etc." },
      dance: { label: "Dance", help: "Inspire allies to act again this phase." },
      guard: { label: "Chain Guard", help: "Shield adjacent allies from attack." },
      destroy: { label: "Destroy", help: "Break through walls or obstacles." },
      visit: { label: "Visit", help: "Speak to people in houses." },
      item: { label: "Items", help: "Use or equip items." },
      trade: { label: "Trade", help: "Swap items with an ally." },
      wait: { label: "Wait", help: "End this unit's turn." },
    },
    saves: {
      save: "Save", list: "Load", empty: "No saves yet", drop: "Delete", copy: "Copy",
      saved: "Save", joined: "joined", steps: "moves", hint: "Callable by number",
    },
    copied: "Copied",
    logTags: { chain: "chain", counter: "counter", follow: "follow-up", extra: "extra strike", miss: "missed", brk: "Break!", kill: "defeated", crit: "crit!", refresh: "dances again", engage: "Engage!", disengage: "engage ended", warp: "warped", guard: "Chain Guard", spawn: "appears!", join: "joins the party", despawn: "leaves" },
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
    builder: {
      title: "Character Builder",
      intro:
        "Pick an advanced class and an internal level to compare every recruit in one table. Fixed growth, Maddening, no equipment. Promotion happens as soon as the minimum level requirement is met.",
      job: "Class",
      jobNone: "No class",
      internal: "Internal level",
      internalShort: "Int. Lv",
      starsphere: "Starsphere (+15% growths)",
      showSpoilers: "Show spoiler + Fell Xenologue (DLC) characters",
      addCompare: "Multiclass compare",
      personalGrowth: "Show personal growths",
      removeCompare: "Remove comparison",
      growth: "Growth",
      joinedNote: "No class selected — each unit at their join-time level.",
      cappedNote: "Highlighted values have reached the stat cap.",
      unavailable: "Cannot reach this class",
      stats: {
        hp: "HP", str: "Str", mag: "Mag", dex: "Dex", spd: "Spd",
        lck: "Lck", def: "Def", res: "Res", bld: "Bld",
      },
    },
    home: {
      intro:
        "A fan-made Fire Emblem Engage strategy simulator and guide hub. No ads, and no affiliation with Nintendo or Intelligent Systems.",
      sections: { general: "General", battle: "Battle", character: "Characters", data: "Data" },
      links: {
        simulator: { name: "Chapter simulator", desc: "Play any chapter on the real map, by the real rules." },
        fidelity: { name: "Reproduction status", desc: "What the engine reproduces, and how it was verified." },
        builder: { name: "Character builder", desc: "Compare every unit's stats in one advanced class." },
        classes: { name: "Class data", desc: "Bases, caps and growths for every class." },
        skills: { name: "Skill data", desc: "Personal, class and inheritable skills." },
      },
    },
  },
  ja: {
    // 게임 용어는 jp/jpja MSBT 정본에서 역조회한 값(MID_MENU_*·MID_SYS_* 등) — 손으로 짓지 않는다.
    localeName: "JP",
    player: "自軍",
    enemy: "敵軍",
    ally: "友軍",
    notes: {
      title: "章ノート", drops: "ドロップ", visits: "民家", rewards: "入手", unlocks: "解禁",
      shop: "ショップ入荷", shopKinds: { weapon: "武器屋", item: "道具屋", fleaMarket: "フリーマーケット" },
      diffNames: { n: "ノーマル", h: "ハード", l: "ルナティック" },
      ringsGain: "指輪入手", ringsLose: "指輪喪失", ringsRegain: "指輪回収", joins: "加入",
      cautions: "注意",
    },
    units: "ユニット",
    level: "Lv",
    position: "位置",
    items: "持ち物",
    skills: "スキル",
    class: "クラス",
    group: "グループ",
    terrain: "地形",
    axis: "横 1→ · 縦 A↑（左下基準）",
    board: "配置図",
    themeToggle: "テーマ切替",
    language: "言語",
    tagline: "ファイアーエムブレム エンゲージ",
    recommended: "推奨レベル",
    size: "サイズ",
    phase: "局面",
    objects: "オブジェクト",
    forecast: "戦闘予測",
    hit: "命中",
    crit: "必殺",
    damage: "威力",
    currentPosNote: "攻撃側の最大射程での交戦を想定した近似",
    difficulty: "難易度",
    diffN: "ノーマル",
    diffH: "ハード",
    diffL: "ルナティック",
    endPhase: "フェイズ終了",
    enemyAuto: "敵ターン自動",
    enemyAutoBlocked: "AI未実装 — スキップしたユニット",
    dangerAll: "危険範囲",
    waitCmd: "待機",
    attackCmd: "攻撃",
    staffCmd: "杖",
    itemCmd: "アイテム",
    guardCmd: "チェインガード",
    destroyCmd: "破壊",
    warpPick: "ワープ先を選択",
    engageCmd: "エンゲージ",
    tradeCmd: "交換",
    closeCmd: "閉じる",
    turnPhase: "フェイズ",
    turnWord: "ターン",
    victory: "勝利!",
    defeat: "敗北...",
    reset: "リセット",
    replayCmd: "リプレイ",
    replayPrev: "前の行動",
    replayNext: "次の行動",
    replayPrevPhase: "前のフェイズ",
    replayNextPhase: "次のフェイズ",
    replayOn: "リプレイ再生中 — 押すとこの局面から操作できる",
    replayOff: "この章の棋譜を見る",
    unitTurn: "行動",
    prevUnit: "前のユニット",
    nextUnit: "次のユニット",
    nextTurn: "ターン終了",
    zoomIn: "拡大",
    zoomOut: "縮小",
    undoCmd: "待った",
    editCmd: "編集",
    editExit: "編集終了",
    editHint: "ユニットをクリック後、空きマスをクリックで再配置",
    removeCmd: "外す",
    restoreCmd: "戻す",
    copyRecord: "棋譜をコピー",
    itemStats: { atk: "物攻", hit: "命中", crit: "必殺", spd: "速さ", avo: "回避", dodge: "必避", rng: "射程" },
    commands: {
      engage: { label: "エンゲージ", help: "紋章士と一体化する" },
      engageArt: { label: "エンゲージ技" },
      attack: { label: "攻撃", help: "敵と戦う" },
      staff: { label: "杖", help: "味方の回復や敵の妨害などを行う" },
      dance: { label: "踊る", help: "特別な踊りで味方を再行動させる" },
      guard: { label: "チェインガード", help: "隣接する味方が受ける攻撃を無効化" },
      destroy: { label: "破壊", help: "壁や障害物を破壊する" },
      visit: { label: "訪問", help: "民家を訪れる" },
      item: { label: "持ち物", help: "アイテムを使用/装備する" },
      trade: { label: "持ち物交換", help: "味方とアイテムを交換する" },
      wait: { label: "待機", help: "行動を終える" },
    },
    saves: {
      save: "セーブ", list: "ロード", empty: "セーブはまだない", drop: "削除", copy: "コピー",
      saved: "セーブ", joined: "乱入", steps: "手", hint: "番号で呼び出せる",
    },
    copied: "コピーした",
    logTags: { chain: "チェイン", counter: "反撃", follow: "追撃", extra: "追加攻撃", miss: "ミス", brk: "ブレイク!", kill: "撃破", crit: "必殺!", refresh: "再行動", engage: "エンゲージ!", disengage: "エンゲージ終了", warp: "ワープ", guard: "チェインガード", spawn: "増援!", join: "仲間に加わる", despawn: "退場" },
    chapterSelect: "章選択",
    comingSoon: "準備中",
    categories: { main: "本編", paralogue: "外伝", divine: "神竜の章", fell: "邪竜の章" },
    focus: {
      verified: "検証済み",
      recordOnly: "記録閲覧モード",
      prev: "前の行動",
      next: "次の行動",
      actionWord: "行動",
      edit: "この戦略を編集してみる",
      notFound: "リンクが見つかりません。",
      broken: "この棋譜は読み込めませんでした。",
      shared: "共有された棋譜",
    },
    fidelity: {
      badge: "再現状況",
      title: "再現状況",
      intro: "FESimが追跡するゲーム内メカニクスの全数と、それぞれの再現度です。根拠のない数値は表示しません。",
      statusNames: {
        anchored: "実機検証",
        implemented: "実装済み",
        assumed: "仮定あり",
        absent: "未再現",
        deferred: "予定",
      },
      legend: {
        anchored: "実機・正本データで検証済み",
        implemented: "実装済み、実機検証前",
        assumed: "実装済みだが明示した仮定を含む",
        absent: "まだ再現していない — 正直に表示",
        deferred: "前提条件つきで予定",
      },
      unsupportedSkill: "付与効果（GiveSids）は未再現",
    },
    builder: {
      title: "キャラクタービルダー",
      intro:
        "上級職と内部レベルを選ぶと、加入キャラクター全員をひとつの表で比較できます。固定成長・ルナティック・装備なし基準。クラスチェンジは最低レベル条件を満たし次第すぐ行う想定です。",
      job: "クラス",
      jobNone: "クラス未選択",
      internal: "内部レベル",
      internalShort: "内部Lv",
      starsphere: "星玉の加護 (+15% 成長)",
      showSpoilers: "ネタバレキャラ + DLC邪竜の章を表示",
      addCompare: "マルチクラス比較",
      personalGrowth: "個人成長率を表示",
      removeCompare: "比較を削除",
      growth: "成長率",
      joinedNote: "クラス未選択 — 各キャラクターの加入時点レベル",
      cappedNote: "色の違う値はステータス上限に到達した値です。",
      unavailable: "このクラスにはなれない",
      stats: {
        hp: "HP", str: "力", mag: "魔力", dex: "技", spd: "速さ",
        lck: "幸運", def: "守備", res: "魔防", bld: "体格",
      },
    },
    home: {
      intro: "ファイアーエムブレム エンゲージの戦略シミュレーター・攻略ハブ。ファンメイド・広告なし・任天堂/インテリジェントシステムズとは無関係です。",
      sections: { general: "紹介", battle: "戦闘", character: "キャラクター", data: "データ" },
      links: {
        simulator: { name: "シミュレーター", desc: "実際のマップ・実際のルールで章をプレイ。" },
        fidelity: { name: "再現状況", desc: "エンジンが何をどこまで再現しているか、根拠つきで。" },
        builder: { name: "キャラクタービルダー", desc: "ひとつの上級職で全キャラのステータスを比較。" },
        classes: { name: "クラスデータ", desc: "クラス別の基本値・上限・成長率。" },
        skills: { name: "スキルデータ", desc: "個人・クラス・継承スキル。" },
      },
    },
  },
  ko: {
    localeName: "KO",
    player: "아군",
    enemy: "적군",
    ally: "우군",
    notes: {
      title: "챕터 노트", drops: "드랍", visits: "민가", rewards: "입수", unlocks: "해금",
      shop: "상점 입하", shopKinds: { weapon: "무기점", item: "도구점", fleaMarket: "벼룩시장" },
      diffNames: { n: "노멀", h: "하드", l: "루나틱" },
      ringsGain: "반지 획득", ringsLose: "반지 상실", ringsRegain: "반지 회수", joins: "가입",
      cautions: "주의",
    },
    units: "유닛",
    level: "Lv",
    position: "위치",
    items: "장비",
    skills: "스킬",
    class: "클래스",
    group: "그룹",
    terrain: "지형",
    axis: "가로 1→ · 세로 A↑ (좌하단 기준)",
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
    enemyAuto: "적턴 자동",
    enemyAutoBlocked: "AI 결손 — 건너뛴 유닛",
    dangerAll: "위험 범위",
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
    replayCmd: "리플레이",
    replayPrev: "이전 행동",
    replayNext: "다음 행동",
    replayPrevPhase: "이전 페이즈",
    replayNextPhase: "다음 페이즈",
    replayOn: "리플레이 재생 중 — 누르면 이 국면부터 직접 둔다",
    replayOff: "이 챕터의 기보를 본다",
    unitTurn: "행동",
    prevUnit: "이전 유닛",
    nextUnit: "다음 유닛",
    nextTurn: "턴 종료",
    zoomIn: "확대",
    zoomOut: "축소",
    undoCmd: "물리기",
    editCmd: "편집",
    editExit: "편집 종료",
    editHint: "유닛 클릭 후 빈 칸 클릭 = 배치 이동",
    removeCmd: "제거",
    restoreCmd: "복원",
    copyRecord: "기보 복사",
    itemStats: { atk: "물공", hit: "명중", crit: "필살", spd: "속도", avo: "회피", dodge: "필살 회피", rng: "사정" },
    commands: {
      engage: { label: "인게이지", help: "문장사와 일체화한다" },
      engageArt: { label: "인게이지 기술" },
      attack: { label: "공격", help: "적과 싸운다" },
      staff: { label: "지팡이", help: "아군을 회복시키거나 적을 방해한다" },
      dance: { label: "춤추기", help: "특별한 춤을 춰 아군을 재행동시킨다" },
      guard: { label: "체인 가드", help: "인접한 아군이 받는 공격을 무효화한다" },
      destroy: { label: "파괴", help: "벽이나 장애물을 파괴한다" },
      visit: { label: "방문", help: "민가를 방문한다" },
      item: { label: "소지품", help: "아이템을 사용하거나 장비한다" },
      trade: { label: "소지품 교환", help: "아군과 아이템을 교환한다" },
      wait: { label: "대기", help: "행동을 마친다" },
    },
    saves: {
      save: "세이브", list: "불러오기", empty: "저장된 판이 없다", drop: "삭제", copy: "복사",
      saved: "세이브", joined: "난입", steps: "수", hint: "번호로 부를 수 있다",
    },
    copied: "복사됨",
    logTags: { chain: "체인", counter: "반격", follow: "추격", extra: "추가타", miss: "빗나감", brk: "브레이크!", kill: "격파", crit: "필살!", refresh: "재행동", engage: "인게이지!", disengage: "인게이지 종료", warp: "워프", guard: "체인가드", spawn: "증원!", join: "아군 합류", despawn: "퇴장" },
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
    builder: {
      title: "캐릭터 빌더",
      intro:
        "상급직과 내부 레벨을 선택시 영입 캐릭터 전원을 한 표에서 비교합니다. 고정 성장·루나틱·장비 미적용 기준. 전직은 최소 레벨 조건 만족 시 전직 기준.",
      job: "클래스",
      jobNone: "직업 미선택",
      internal: "내부 레벨",
      internalShort: "내부레벨",
      starsphere: "성옥의 가호 (+15% 성장)",
      showSpoilers: "스포일러 캐릭터 + DLC 사룡의장 표시",
      addCompare: "멀티클래스 비교",
      personalGrowth: "고유 성장률 표시",
      removeCompare: "비교 제거",
      growth: "성장률",
      joinedNote: "직업 미선택 — 각 캐릭터의 합류 시점 레벨",
      cappedNote: "색이 다른 값은 스탯 상한에 도달한 값입니다.",
      unavailable: "이 직업으로 갈 수 없음",
      stats: {
        hp: "HP", str: "힘", mag: "마력", dex: "기량", spd: "속도",
        lck: "행운", def: "수비", res: "마방", bld: "체격",
      },
    },
    home: {
      intro: "파이어 엠블렘 인게이지 전략 시뮬레이터·공략 허브. 팬 제작 · 무광고 · 닌텐도/인텔리전트 시스템즈와 무관합니다.",
      sections: { general: "소개", battle: "전투", character: "캐릭터", data: "데이터" },
      links: {
        simulator: { name: "시뮬레이터", desc: "실제 맵·실제 룰로 챕터를 직접 둡니다." },
        fidelity: { name: "재현 상태", desc: "엔진이 무엇을 어디까지 재현하는지, 근거와 함께." },
        builder: { name: "캐릭터 빌더", desc: "상급직 하나로 전 캐릭터 스탯을 비교합니다." },
        classes: { name: "클래스 데이터", desc: "직업별 기본치·상한·성장률." },
        skills: { name: "스킬 데이터", desc: "개인·클래스·계승 스킬." },
      },
    },
  },
};

export const htmlLang: Record<Locale, string> = { en: "en", ja: "ja", ko: "ko" };
