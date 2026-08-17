import { describe, expect, it } from "vitest";
import { hitThreshold10000, isHit, isProbability100 } from "@fesim/engine";

/**
 * 명중 난수 곡선 — 인게임 정본(IL2CPP 판독, 5.0.0).
 *
 * 왜 위험했나: 엔진은 오랫동안 표시 명중을 그대로 굴리는 선형 1RN이었다(`roll() < hitRate`).
 * 실제 게임은 굴림은 1회지만 **임계값을 sin 곡선으로 상향 리맵**한다 — 표시 80이 실제로는 90.14%다.
 * 즉 예보가 같아도 결과 분포가 달랐다. 전략 시뮬레이터에서 이건 조언 자체를 틀리게 만든다.
 *
 * 정본 = App.BattleMath.GetHitRatio10000 (RVA 0x1E8D200) · _IsProbabilityHit (0x1E8D0E0).
 * 상세 = ~/fesim_data/extracted/il2cpp/HIT_RANDOM.md
 */

describe("명중 임계 곡선 — GetHitRatio10000", () => {
  it("50 이하는 리맵하지 않는다(하한 페널티 없는 비대칭 곡선)", () => {
    expect(hitThreshold10000(0)).toBe(0);
    expect(hitThreshold10000(1)).toBe(100);
    expect(hitThreshold10000(30)).toBe(3000);
    expect(hitThreshold10000(50)).toBe(5000);
  });

  it("100은 정확히 100%다(곡선 예외)", () => {
    expect(hitThreshold10000(100)).toBe(10000);
  });

  /**
   * 기대값은 float32 연산으로 산출한 정본이다 — 게임이 s레지스터(단정도)로만 계산하기 때문.
   * ☠float64로 계산하면 표시 75에서 8499가 나와 1이 어긋난다. 정밀도까지 재현해야 하는 이유.
   */
  it("51~99는 sin 곡선으로 상향된다", () => {
    expect(hitThreshold10000(51)).toBe(5142);
    expect(hitThreshold10000(55)).toBe(5726);
    expect(hitThreshold10000(60)).toBe(6470);
    expect(hitThreshold10000(65)).toBe(7201);
    expect(hitThreshold10000(70)).toBe(7887);
    expect(hitThreshold10000(75)).toBe(8500);
    expect(hitThreshold10000(80)).toBe(9014);
    expect(hitThreshold10000(85)).toBe(9416);
    expect(hitThreshold10000(90)).toBe(9705);
    expect(hitThreshold10000(95)).toBe(9891);
    expect(hitThreshold10000(99)).toBe(9982);
  });

  it("단조 증가하며 표시값 이상이다(보정은 항상 상향)", () => {
    let prev = -1;
    for (let r = 0; r <= 100; r++) {
      const t = hitThreshold10000(r);
      expect(t).toBeGreaterThan(prev);
      expect(t).toBeGreaterThanOrEqual(r * 100);
      prev = t;
    }
  });

  it("최대 편차는 표시 78에서 +10.21%p다", () => {
    const deltas = Array.from({ length: 101 }, (_, r) => hitThreshold10000(r) / 100 - r);
    const peak = deltas.indexOf(Math.max(...deltas));
    expect(peak).toBe(78);
    expect(deltas[78]).toBeCloseTo(10.21, 2);
  });
});

describe("명중 판정 — roll < 임계", () => {
  it("굴림이 임계 미만이면 명중이다", () => {
    expect(isHit(80, 9013)).toBe(true);
    expect(isHit(80, 9014)).toBe(false);
  });

  it("표시 100은 어떤 굴림에도 명중한다(굴림 상한 9999)", () => {
    expect(isHit(100, 9999)).toBe(true);
  });

  it("표시 0은 어떤 굴림에도 빗나간다", () => {
    expect(isHit(0, 0)).toBe(false);
  });
});

describe("일반 확률 판정 — 필살·발동 (선형, sin 보정 없음)", () => {
  /** 정본 = App.Random.IsProbability100 (RVA 0x23754B0): percent*1000 > roll(100000). */
  it("명중 곡선을 쓰지 않는다 — 표시 그대로 선형이다", () => {
    expect(isProbability100(80, 79999)).toBe(true);
    expect(isProbability100(80, 80000)).toBe(false);
  });

  it("해상도가 0.001%다", () => {
    expect(isProbability100(0.5, 499)).toBe(true);
    expect(isProbability100(0.5, 500)).toBe(false);
  });

  it("0 이하는 난수를 보지 않고 실패한다", () => {
    expect(isProbability100(0, 0)).toBe(false);
    expect(isProbability100(-1, 0)).toBe(false);
  });
});
