/**
 * ephemeris(.eph) 기보 포맷 헤더 — 타이틀 중립 원칙:
 * 게임ID(fe17 등)와 룰 버전이 네임스페이스라서, 엔진이 시리즈 확장돼도 기보가 충돌하지 않는다.
 * 스키마의 정본은 이 타입이다(산문 명세 이중화 금지). 본문 스키마는 M3(리플레이)에서 채운다.
 */
export interface EphemerisHeader {
  game: string;
  ruleVersion: string;
}

/**
 * 챕터 데이터 JSON 스키마 — 파이프라인(tools/pipeline) 산출물의 계약.
 * 좌표계(실측 전수 검증됨): 0-based, index = y*width + x, 32×32 패딩은 제거하고
 * 실맵(m_Width×m_Height)만 담는다. terrain[y][x] = Tid. 실기 화면 = 데이터 기준 180도 회전:
 * 데이터 (0,0) = 화면 우하단(실기 대조 확정). 뷰는 FLIP_X=true, FLIP_Y=true로 그린다.
 */
export type Fe17Force = 0 | 1 | 2;

export interface ChapterMap {
  width: number;
  height: number;
  terrain: string[][];
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
  ai: {
    action?: string;
    actionVal?: string;
    mind?: string;
    mindVal?: string;
    attack?: string;
    attackVal?: string;
    move?: string;
    moveVal?: string;
    battleRate?: number;
    priority?: number;
    bandNo?: number;
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
