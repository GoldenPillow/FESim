/**
 * 보드 좌표계 — 클라이언트 안전 모듈(데이터 JSON 임포트 금지: 아일랜드 번들에 딸려간다).
 * 상하 반전이 화면 정본(실기 대조 확정) — 데이터 (0,0) = 화면 좌하단.
 */
export const FLIP_X = false;
export const FLIP_Y = true;

/** CSS Grid 1-based 라인 번호. SVG 좌표는 (gridCol(x) - 0.5, gridRow(y) - 0.5)가 타일 중심. */
export const gridCol = (width: number, x: number): number => (FLIP_X ? width - x : x + 1);
export const gridRow = (height: number, y: number): number => (FLIP_Y ? height - y : y + 1);

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
