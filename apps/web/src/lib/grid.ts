/**
 * 보드 좌표계 — 클라이언트 안전 모듈(데이터 JSON 임포트 금지: 아일랜드 번들에 딸려간다).
 * 상하 반전이 화면 정본(실기 대조 확정) — 데이터 (0,0) = 화면 좌하단.
 */
export const FLIP_X = false;
export const FLIP_Y = true;

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/**
 * ★화면 좌표 표기 = **좌하단 기준 · 가로 1,2,3… · 세로 A,B,C…**(2026-08-18 사용자 지정).
 * 표기 순서는 세로(글자) → 가로(숫자) = `C3`(해전 게임 관례 — 세로가 글자면 글자를 먼저 읽는다).
 * 26줄을 넘으면 `AA`·`AB`로 잇는다(최대 맵 32줄).
 *
 * ☠**인게임 좌표 (X, Z)는 버리지 않는다** — 맵 스크립트(`UnitMovePos(pid, 5, 4)`)·dispos·IL2CPP 색인이
 * 전부 그 수로 말하므로, 판독 문서와 대조하는 자리에서는 그것이 유일한 정본이다.
 * 그래서 **칸에는 이 표기, 툴팁에는 둘 다**(`C3 · (2,2)`) 싣는다 — 변환을 머리로 하지 않게 한다.
 * 화면 방향은 그대로다: 데이터 (0,0) = 화면 좌하단.
 */
export const colLabel = (x: number): string => String(x + 1);
export const rowLabel = (y: number): string => {
  let n = y;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};
export const coordLabel = (x: number, y: number): string => `${rowLabel(y)}${colLabel(x)}`;
/** 인게임 좌표 원문 — 스크립트·판독 문서와 대조하는 자리(툴팁·개발 로그)에서 쓴다. */
export const rawCoord = (x: number, y: number): string => `(${x},${y})`;

/** CSS Grid 1-based 라인 번호. SVG 좌표는 (gridCol(x) - 0.5, gridRow(y) - 0.5)가 타일 중심. */
export const gridCol = (width: number, x: number): number => (FLIP_X ? width - x : x + 1);
export const gridRow = (height: number, y: number): number => (FLIP_Y ? height - y : y + 1);

/**
 * 타일 결정적 미세 명암(항공뷰 텍스처감) — 팔레트 정규화(3-6) 후 지터는 렌더 측 brightness가 소유한다
 * (직렬화엔 종별 기본색만 — 난수 금지 = 빌드 안정성은 결정적 해시로 유지).
 */
export const tileShade = (x: number, y: number): number => {
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return 1 + ((h % 5) - 2) * 0.016;
};

/** 0 = 아군(파랑) · 1 = 적(빨강) · 2 = 우군/중립(초록) — 톤다운 보드 위에서 읽히는 채도로 맞춤 */
export interface ForceStyle {
  ring: string;
  chip: string;
  key: "player" | "enemy" | "other";
}

export const forceStyle = (force: number): ForceStyle =>
  force === 0
    ? { ring: "#5b95e6", chip: "#2b5fb0", key: "player" }
    : force === 1
      ? { ring: "#e2635c", chip: "#a8322d", key: "enemy" }
      : { ring: "#63b06d", chip: "#2f7a3c", key: "other" };
