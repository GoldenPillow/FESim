/**
 * 유닛별 AI 상태 — 회복 임계 · 이동 제약 · 밴드 활성(AI_ENGINE §8-4 · §9).
 */
import type { UnitState } from "../battle.js";
import { AI_FLAG } from "./types.js";

/**
 * `AIThink$$UpdateHealCondition`(0x1941570).
 * ★덮어쓰기 조건은 "위임"이 아니라 **`Force.Type == Player(0)`**이다 —
 * 플레이어 진영은 dispos 임계를 무시하고 항상 75/30, 적(1)·동맹NPC(2)는 dispos 값(기본 75/50).
 * hp 비율은 정수 나눗셈(내림).
 */
export function aiHealCondition(u: UnitState, healPower = 0): { askHealA: boolean; askHealB: boolean } {
  const maxHp = u.stats.hp;
  if (maxHp <= 0) return { askHealA: false, askHealB: false };
  if (u.hp + healPower >= maxHp) return { askHealA: false, askHealB: false };
  const rateA = u.force === 0 ? 75 : u.ai?.healRateA ?? 75;
  const rateB = u.force === 0 ? 30 : u.ai?.healRateB ?? 50;
  const pct = Math.trunc(((u.hp + healPower) * 100) / maxHp);
  return { askHealA: pct < rateA, askHealB: pct < rateB };
}

export interface MoveLimitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * `AI_MoveLimit` 파싱 — `Unit$$SetDisposAi`(0x1A0C268).
 * `(x1,z1),(x2,z2)` → `Rect{X:x1, Z:z1, W:x2-x1+1, H:y2-y1+1}`(양끝 포함).
 * ★dispos 경로는 항상 `Rect`로만 파싱된다 — 실데이터의 LimitType은 Rect/None뿐이다.
 */
export function parseMoveLimit(raw: string | undefined): MoveLimitRect | undefined {
  if (raw === undefined || raw === "") return undefined;
  const m = /^\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*,\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*$/.exec(raw);
  if (m === null) return undefined;
  const [x1, y1, x2, y2] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
}

/**
 * `MapDeployTemplate$$UnitAIMoveLimit`(0x2C227C0) 집행 — 반개구간 밖은 도달 불가.
 * ★단 유닛의 **발밑 칸은 예외로 항상 허용**(제자리 대기 보장).
 */
export function moveLimitAllows(rect: MoveLimitRect | undefined, u: UnitState, x: number, y: number): boolean {
  if (rect === undefined) return true;
  if (x === u.x && y === u.y) return true;
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** `AI_Flag` 비트 검사. */
export const aiHasFlag = (u: UnitState, bit: number): boolean => ((u.ai?.flag ?? 0) & bit) !== 0;

/**
 * `UnitUtil$$BandActivate`(0x1C73E30) — 같은 `AI_BandNo` 전원을 일괄 각성시킨다.
 * ★`AI_BandNo != 0`이면 게이트(`BandActivation`)가 자동으로 켜지므로 별도 입력이 필요 없다.
 * ☠`BandActivationMove`/`Attacked`를 세우는 코드가 없어 정규 플레이에서 항상 0 →
 * Move 시퀀스 복사는 **구현하지 않는 것이 정확**하다(§8-4).
 */
export function bandMembers(units: readonly UnitState[], u: UnitState): UnitState[] {
  const band = u.ai?.bandNo ?? 0;
  if (band === 0) return [];
  return units.filter((v) => !v.dead && v !== u && v.force === u.force && (v.ai?.bandNo ?? 0) === band);
}

/**
 * 루나틱(난이도 >= 2)이면 dispos 지정과 무관하게 전 유닛에 `RejectPower0Attack`이 강제된다
 * (`SetDisposAi` 0x1A0C4DC~0x1A0C624).
 */
export function rejectsPower0(u: UnitState, difficulty: string | undefined): boolean {
  return difficulty === "l" || aiHasFlag(u, AI_FLAG.zeroAttack);
}
