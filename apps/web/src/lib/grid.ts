/**
 * 보드 좌표계 — 클라이언트 안전 모듈(데이터 JSON 임포트 금지: 아일랜드 번들에 딸려간다).
 * 상하 반전이 화면 정본(실기 대조 확정) — 데이터 (0,0) = 화면 좌하단.
 */
export const FLIP_X = false;
export const FLIP_Y = true;

export const tileKey = (x: number, y: number): string => `${x},${y}`;

/**
 * ★좌표 표기 정본 = **인게임 좌표 `(X, Z)` 그대로**(2026-08-18 사용자 확정).
 *
 * 게임은 플레이어에게 좌표를 보여주지 않지만, **게임 자신은 좌표로 말한다** —
 * 맵 스크립트가 `UnitMovePos(pid, 5, 4)`·`pos(7,4)`·`EventEntryVisit(fn, 7, 4)`로 지시하고
 * dispos가 `DisposX`/`DisposY`로 배치하며 IL2CPP가 `x | z<<5`로 색인한다. 그 (X, Z)가 유일한 내부 정본이고
 * 우리 격자는 그것과 1:1이다(전 54챕터 지형 대조 불일치 0). ⇒ 대화·문서·화면이 **같은 수로 말한다**.
 *
 * ☠종전의 체스식 `A1`(가로 A,B,C · 세로 1부터)은 폐기한다 — 우리만 쓰는 표기라
 * 스크립트·판독 문서와 대조할 때마다 머릿속 변환이 필요했다(그 변환이 곧 오독의 자리다).
 * 화면 방향은 그대로다: 데이터 (0,0) = 화면 좌하단.
 */
export const colLabel = (x: number): string => String(x);
export const coordLabel = (x: number, y: number): string => `${x},${y}`;

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
