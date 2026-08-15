/**
 * FESim 룰 엔진 — 계약: (국면, 행동, 난수소스) → 다음 국면.
 * 순수 함수 라이브러리: 입력을 변이하지 않고, 난수는 항상 주입받는다
 * (기록 재생 = 리플레이 · 실굴림 = 샌드박스 · 열거 = 솔버가 같은 코어를 공유).
 */

/** 난수 소스 주입구. roll()은 [0, 100) 정수 — FE 판정 문법. */
export interface RandomSource {
  roll(): number;
}

/** 국면 스냅숏. state(N) = reduce(초기상태, 행동로그[0..N]). 구체 필드는 M2에서 채운다. */
export interface GameState {
  readonly turn: number;
}

export interface Action {
  readonly type: string;
}

export function reduce(state: GameState, _action: Action, _rng: RandomSource): GameState {
  return { ...state };
}
