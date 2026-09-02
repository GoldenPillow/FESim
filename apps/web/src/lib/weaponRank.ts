/** 무기 랭크 서열(N = 착용 불가, '+' = 반 단계) — 장착 게이트(canEquip)와 목록 정렬이 공용.
    ☠클라이언트 안전 모듈이다 — fe17.ts(데이터 전량 인라인)에서 분리해 아일랜드가 값을 import해도 번들이 안 붓는다. */
const RANK_ORDER: Record<string, number> = { N: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
export const rankValue = (rank: string): number =>
  (RANK_ORDER[rank.replace("+", "")] ?? 0) + (rank.endsWith("+") ? 0.5 : 0);
