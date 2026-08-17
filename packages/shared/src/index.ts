export {
  STAT_KEYS,
  type BattleAction,
  type BattleEvent,
  type Difficulty,
  type StatBlock,
  type StatKey,
  type StrikeKind,
} from "./battle.js";

export {
  FIDELITY,
  FIDELITY_CATEGORIES,
  fidelityCategoryOf,
  fidelitySummary,
  type FidelityCategory,
  type FidelityEntry,
  type FidelityStatus,
} from "./fidelity.js";

export {
  parseEphemeris,
  serializeEphemeris,
  type EphemerisFile,
  type EphemerisHeader,
  type EphemerisSetup,
  type EphemerisStep,
  type SetupUnit,
} from "./ephemeris.js";

/**
 * 챕터 데이터 JSON 스키마 — 파이프라인(tools/pipeline) 산출물의 계약.
 * 좌표계(실측 전수 검증됨): 0-based, index = y*width + x, 32×32 패딩은 제거하고
 * 실맵(m_Width×m_Height)만 담는다. terrain[y][x] = Tid. 화면 매핑(실기 대조 확정):
 * 상하만 반전 — 데이터 (0,0) = 화면 좌하단. 뷰는 FLIP_X=false, FLIP_Y=true로 그린다.
 */
export type Fe17Force = 0 | 1 | 2;

/** 사각형 구조물 레이어 — terrains의 m_Layers(문·부술 수 있는 벽·지붕). */
export interface MapStructure {
  x: number;
  y: number;
  w: number;
  h: number;
  tid: string;
  /** 연동 그룹 — 같은 group의 지붕(TID_屋根)은 문 개방 시 함께 걷힌다(m015 실측 기반, 0 = 무연동). */
  group: number;
}

/** 1칸 지속 오버레이 — terrains의 m_Overlaps(장독·안개·화염 등, 초기 상태만). */
export interface MapOverlay {
  x: number;
  y: number;
  tid: string;
}

/** dispos Terrain 그룹이 심는 맵 오브젝트 — 현재 실재 종류는 PID_紋章氣(엔게이지 회복 마스) 1종. */
export interface MapObject {
  pid: string;
  x: number;
  y: number;
  tid?: string;
  flag?: number;
}

/**
 * Lua(scripts/)가 배선하는 상호작용 지점. 좌표는 전부 "대상 타일" 기준으로 파이프라인이 정규화한다
 * (visit의 Lua 좌표는 문 앞 칸이라 tile = (x, y+1)이 입구 — 원본 칸은 stand에 보존).
 */
export interface MapInteraction {
  kind: "chest" | "visit" | "door" | "escape" | "defendArea" | "destroy";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  iid?: string;
  pid?: string;
  stand?: { x: number; y: number };
}

export interface ChapterMap {
  width: number;
  height: number;
  terrain: string[][];
  structures?: MapStructure[];
  overlays?: MapOverlay[];
  objects?: MapObject[];
  interactions?: MapInteraction[];
}

/**
 * MoveType별 이동 코스트(255 = 진입 불가) — terrain.xml CostName → 地形コスト 시트 조인.
 * ☠통행 판정의 정본은 이것이다. Prohibition(戦闘禁止)은 통행성이 아니다(전수 실측으로 반증됨).
 */
export interface TerrainCost {
  none: number;
  foot: number;
  horse: number;
  fly: number;
  dragon: number;
  pad: number;
}

export interface DisposItem {
  iid: string;
  drop: boolean;
}

export interface DisposUnit {
  pid: string;
  jid: string;
  force: Fe17Force;
  x: number;
  y: number;
  /** 0 = 미지정, 1..8 = 8방향(링 순서 가설: 1=+Y 3=+X 5=-Y 7=-X, 짝수 = 대각) */
  direction: number;
  level: { n: number; h: number; l: number };
  items: DisposItem[];
  sids: string[];
  gid?: string;
  bid?: string;
  /** 등장 좌표 원본값 — (0,0)이 sentinel인지 실좌표인지 미확정이라 원본 보존 */
  appear?: { x: number; y: number };
  /** HP 스톡(HP0 도달 시 남은 스톡만큼 부활하는 다단 보스) 원값. 0이면 생략 — 엔진 부활 거동은 미구현. */
  hpStock?: number;
  /** dispos State1 원값(-1 = 미사용이면 생략). 부활 시 상태 전환 슬롯 추정이나 범례가 없어 해석 금지. */
  state1?: number;
  ai: {
    action?: string;
    actionVal?: string;
    mind?: string;
    mindVal?: string;
    attack?: string;
    attackVal?: string;
    move?: string;
    moveVal?: string;
    /** 원문이 문자열(突撃 등) — number로 오기돼 있던 타입 거짓 정정(2026-08-17, 소비처 0 시점). */
    battleRate?: string;
    priority?: number;
    bandNo?: number;
    /** 회복 행동 임계 A/B(원문 기본 75/50) — 0도 유효값이라 없으면 없는 것이지 기본값이 아니다. */
    healRateA?: number;
    healRateB?: number;
    /** 이동 가능 영역 하드 제약 원문 `(x1,z1),(x2,z2)` — 파싱은 소비처(M5) 몫. */
    moveLimit?: string;
    /** AI 행동 비트플래그 원값. 비트 범례가 덤프에 없어 해석 금지(유닛의 dispos flag와 별개). */
    flag?: number;
  };
  flag?: number;
}

export interface DisposGroup {
  name: string;
  units: DisposUnit[];
}

export interface ChapterData {
  game: "fe17";
  cid: string;
  recommendedLevel?: number;
  map: ChapterMap;
  groups: DisposGroup[];
}

/**
 * styles.json 스키마 — job.xml 戦闘スタイル 시트의 사영. 키 = Style(jobs.StyleName과 같은 값).
 * ☠스타일 특성의 정본은 이 표의 Skills다 — 엔진이 스타일 이름을 문자열로 하드코딩하는 경로와 이중화하지 말 것.
 */
export interface StyleRow {
  Style: string;
  /** MBSID_* 라벨(표시명은 names 사전) */
  Name: string;
  Help: string;
  /** 스타일이 부여하는 SID. 부여 스킬이 없는 스타일은 키 자체가 없다. */
  Skills?: string[];
}

/**
 * supports.json 스키마 — reliance.xml 3시트의 사영. 지원(絆) 전투 보정 수치의 정본은 支援効果뿐이다.
 * ☠수치를 코드에 박제하지 말 것 — 엔진은 이 표를 주입받는다.
 */
export interface SupportEffect {
  /** 支援命中 · 支援必殺 · 支援回避 · 支援必殺回避에 그대로 들어가는 가산값(원문 필드명 보존). */
  Hit: number;
  Critical: number;
  Avoid: number;
  Secure: number;
}

/** 支援レベル — 원문 그대로 1~4. C/B/A/S 대응은 원문에 라벨이 없어 미확정(必要経験値 시트는 C/B/A 3단뿐). */
/** 지원 랭크 — 1=C · 2=B · 3=A · 4=A+ (☠S가 아니다: RelianceData.Level 열거, il2cpp/SUPPORT.md). 경험 승급은 A까지고 A+는 엠블럼 링크 경로다. */
export type SupportLevel = 1 | 2 | 3 | 4;

/** 랭크 승급 누적 지원치 패턴. 배열 인덱스 = 支援関係 행렬의 값(0 = REXID_なし = 지원 불가). */
export interface SupportExpPattern {
  Rexid: string;
  ExpC: number;
  ExpB: number;
  ExpA: number;
}

export interface SupportsTable {
  /** effects[SupportCategory(person.xml)][Level] — 6 archetype × 4단. */
  effects: Record<string, Record<string, SupportEffect>>;
  expPatterns: SupportExpPattern[];
  /** pairs[Pid][상대 Pid] = expPatterns 인덱스. 원문이 하삼각만 채우므로 대칭화는 소비처 몫이다. */
  pairs: Record<string, Record<string, number>>;
}

/**
 * calculator.json 스키마 — calculator.xml(전투 계산식 정본)의 무손실 사영.
 * 공식은 DSL 원문 그대로 담고 평가는 엔진(packages/engine/src/formula)이 한다.
 * 분기 계약: conditions[i]가 참이면 functions[i], 전부 거짓이면 functions[conditions.length](기본 분기).
 */
export interface CalculatorFormula {
  conditions: string[];
  functions: string[];
}

/** 경험치 룩업 테이블 — values[n - base]. 원본 정의역은 base=-39..+40. */
export interface CalculatorTable {
  base: number;
  values: number[];
}

export interface CalculatorData {
  formulas: Record<string, CalculatorFormula>;
  tables: Record<string, CalculatorTable>;
}
