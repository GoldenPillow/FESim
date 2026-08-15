import { describe, expect, it } from "vitest";
import { reduce, type Action, type GameState, type RandomSource } from "@fesim/engine";

/**
 * 엔진 계약 서명: (국면, 행동, 난수소스) → 다음 국면.
 * 순수 함수여야 하는 이유 — 뷰어(리플레이 재생)·샌드박스·솔버(열거 탐색)가
 * 같은 함수를 공유하므로, 입력 변이나 숨은 난수가 있으면 세 소비자 전부가 깨진다.
 */
describe("엔진 계약", () => {
  const state: GameState = { turn: 1 };
  const action: Action = { type: "noop" };
  const recorded: RandomSource = { roll: () => 42 };

  it("reduce는 다음 국면을 반환한다", () => {
    const next = reduce(state, action, recorded);
    expect(next).toBeDefined();
    expect(typeof next.turn).toBe("number");
  });

  it("reduce는 입력 국면을 변이하지 않는다 (순수성)", () => {
    const frozen = Object.freeze({ turn: 3 }) as GameState;
    expect(() => reduce(frozen, action, recorded)).not.toThrow();
    expect(frozen.turn).toBe(3);
  });

  it("같은 (국면, 행동, 난수 기록)이면 같은 국면 (결정성 = 리플레이 재현의 전제)", () => {
    const a = reduce(state, action, { roll: () => 7 });
    const b = reduce(state, action, { roll: () => 7 });
    expect(a).toEqual(b);
  });
});
