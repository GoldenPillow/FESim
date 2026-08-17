/**
 * 난수 판정 규칙 — 인게임 정본(IL2CPP 판독, FE 인게이지 5.0.0).
 *
 * 명중만 sin 곡선으로 리맵되고, 필살·스킬 발동 등 나머지 확률은 선형이다.
 * 두 경로가 게임에서도 서로 다른 함수라서 여기서도 분리해 둔다.
 */

/** 게임이 s레지스터(단정도)로만 계산하므로 매 연산을 f32로 되꺾는다 — f64로 두면 표시 75에서 1이 어긋난다. */
const f32 = Math.fround;

// App.BattleMath.GetHitRatio10000 (RVA 0x1E8D200)이 즉치로 싣는 값들.
const HALF = f32(50); // 0x42480000
const DEG_TO_RAD = f32(0.017453292); // 0x3C8EFA35
const PERCENT = f32(100); // 0x42C80000
const CURVE = f32(13.333333); // 0x41555555 = 40/3

/**
 * 표시 명중률(0..100) → [0,10000) 굴림과 비교할 임계값.
 *
 * 51~99 구간만 sin으로 상향한다. 50 이하에 하한 페널티가 없어 곡선이 비대칭이다 —
 * 낮은 명중은 표시대로 나오고 높은 명중만 더 잘 맞는다.
 */
export function hitThreshold10000(displayHit: number): number {
  if (displayHit < 51 || displayHit === 100) return displayHit * 100;
  const theta = f32(f32(f32(180 * displayHit - 9000) / HALF) * DEG_TO_RAD);
  const ratio = f32(displayHit);
  const base = f32(ratio * PERCENT);
  const lift = f32(f32(f32(Math.sin(theta)) * ratio) * CURVE);
  return Math.trunc(f32(base + lift));
}

/** 명중 판정 — 굴림은 `[0,10000)` 1회뿐이다(2RN 아님). 정본 = `_IsProbabilityHit` (RVA 0x1E8D0E0). */
export function isHit(displayHit: number, roll10000: number): boolean {
  return roll10000 < hitThreshold10000(displayHit);
}

/**
 * 필살·발동 등 일반 확률 — 정본 = `App.Random.IsProbability100` (RVA 0x23754B0).
 * 0 이하면 난수를 소모하지 않고 실패한다(롤 소비 순서가 걸린 계약이라 호출부도 이 순서를 지켜야 한다).
 */
export function isProbability100(percent: number, roll100000: number): boolean {
  if (percent <= 0) return false;
  return f32(percent * 1000) > roll100000;
}
