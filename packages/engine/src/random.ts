/**
 * 인게임 정본 PRNG — xorshift128(Marsaglia) + MT식 시딩.
 *
 * `RandomSource`(battle.ts)는 **주입 계약**만 정의한다 — 값이 어디서 오는지는 묻지 않는다.
 * 이 모듈은 그 자리에 **인게임과 같은 값**을 흘리고, 무엇보다 **상태를 저장·복원**한다.
 * 되돌리기 재현이 여기 달려 있다: 커서를 되돌리면 같은 수가 다시 나오고,
 * 사이에 다른 소비가 끼면 밀린다(사용자 실기 앵커 2026-08-19).
 *
 * 정본 = `App.RandomSeed` / `App.Random` (FE 인게이지 5.0.0, IL2CPP 판독).
 * 판독물 = `~/fesim_data/extracted/il2cpp/RNG_SYSTEM.md` §1.
 * ☠모든 파생 함수가 전진식을 인라인 복제하므로 **어떤 함수를 부르든 전진은 정확히 1회**다.
 * 예외 = `peek`(0회) · `spin(n)`(n회) · `isProbability100`/`getIndex`의 조기 반환(0회).
 */
import type { RandomSource } from "./battle.js";

/** 상태 4워드 `[x, y, z, w]` — 전부 uint32. 스냅숏·복원 단위다. */
export type RandomState = readonly [number, number, number, number];

/** `RandomSeed.Initialize`(0x2375000)의 승수 — MT19937 초기화와 같은 상수. */
const INIT_MUL = 1812433253;

/** f32 왕복 — 게임이 단정도로 비교하므로 f64로 두면 경계에서 어긋난다. */
const f32 = Math.fround;

const BITS = new ArrayBuffer(4);
const BITS_U32 = new Uint32Array(BITS);
const BITS_F32 = new Float32Array(BITS);

/** `RandomSeed.Initialize`(0x2375000) — 시드 하나에서 4워드를 뽑는다. */
export function seedState(seed: number): RandomState {
  const s = seed >>> 0;
  const x = Math.imul(s ^ (s >>> 30), INIT_MUL) >>> 0;
  const y = (Math.imul(x ^ (x >>> 30), INIT_MUL) + 1) >>> 0;
  const z = (Math.imul(y ^ (y >>> 30), INIT_MUL) + 2) >>> 0;
  const w = (Math.imul(z ^ (z >>> 30), INIT_MUL) + 3) >>> 0;
  return [x, y, z, w];
}

export interface Random extends RandomSource {
  /** `Random.GetValue()`(0x23748D0) = `[0, 2^31)`. 상한을 주면 `GetValue(n)`(0x2375170). */
  getValue(bound?: number): number;
  /** `Random.Peek`(0x2375060) — 다음 `getValue()`와 **값이 같고** 상태는 안 움직인다. */
  peek(): number;
  /** `Random.Spin`(0x2375080) — n회 전진. `n < 1`이면 전진하지 않는다. */
  spin(n: number): void;
  /** `Random.GetMinMax`(0x23751B0) — ★`max`를 **포함**한다. `min > max`면 미정의(정본도 그렇다). */
  getMinMax(min: number, max: number): number;
  /** `Random.GetMaxMin`(0x2375240) — 인자 순서가 뒤바뀌어도 안전한 판. */
  getMaxMin(min: number, max: number): number;
  /** `Random.GetF01`(0x23750F0) — `[0,1)`, 해상도 2^-24. */
  getF01(): number;
  /** `Random.IsProbability100`(0x23754B0) — 해상도 0.001%. ☠`percent <= 0`이면 **굴리지 않는다**. */
  isProbability100(percent: number): boolean;
  /** `Random.GetIndex`(0x2375520) — 가중 추첨. ☠빈 표·전부 0인 표는 **굴리지 않고** -1. */
  getIndex(ratio: readonly number[]): number;
  /** 현재 상태 스냅숏 — 되감기 지점에 박아 둔다. */
  save(): RandomState;
  /** 스냅숏으로 되돌린다 — 이후 수열이 그 지점부터 그대로 재개된다. */
  restore(state: RandomState): void;
}

/** 상태에서 바로 만든다(복원·이어받기 경로). 시드에서 만들려면 `createRandom`. */
export function randomFromState(state: RandomState): Random {
  let [x, y, z, w] = state;

  /** 전진 1회 — 반환은 마스킹 전 원값 `t`(파생 함수마다 마스킹 방식이 달라 여기선 안 깎는다). */
  const advance = (): number => {
    let t = (x ^ (x << 11)) >>> 0;
    t = (t ^ (t >>> 8)) >>> 0;
    t = (t ^ w ^ (w >>> 19)) >>> 0;
    x = y;
    y = z;
    z = w;
    w = t;
    return t;
  };

  const value = (): number => advance() & 0x7fffffff;

  const self: Random = {
    getValue(bound) {
      const v = value();
      if (bound === undefined) return v;
      // ☠aarch64 `sdiv`는 0으로 나눠도 트랩하지 않고 0을 돌려준다 → `msub`가 원값을 남긴다.
      // JS의 `v % 0`은 NaN이라 특례가 없으면 조용히 NaN이 샌다.
      if (bound === 0) return v;
      return v % bound;
    },
    next(bound) {
      return self.getValue(bound);
    },
    peek() {
      // 상태를 쓰지 않고 같은 값을 만든다. 마스킹 순서만 다른 정본 식과 전 비트에서 일치한다
      // (`t>>>8`은 bit31이 0이라 마스킹을 앞뒤 어디서 하든 같다 — RNG_SYSTEM §1-3 검산).
      let t = (x ^ (x << 11)) >>> 0;
      t = (t ^ (t >>> 8)) >>> 0;
      t = (t ^ w ^ (w >>> 19)) >>> 0;
      return t & 0x7fffffff;
    },
    spin(n) {
      for (let i = 0; i < n; i += 1) advance();
    },
    getMinMax(min, max) {
      return (value() % (max - min + 1)) + min;
    },
    getMaxMin(min, max) {
      const base = Math.min(min, max);
      const range = Math.abs(max - min) + 1;
      return base + (value() % range);
    },
    getF01() {
      BITS_U32[0] = (0x3f800000 | (advance() >>> 8)) >>> 0;
      return f32(BITS_F32[0]! - 1);
    },
    isProbability100(percent) {
      if (percent <= 0) return false; // ★굴림 없음 — 소비 개수가 확률값에 의존한다
      return f32(percent * 1000) > value() % 100000;
    },
    getIndex(ratio) {
      if (ratio.length < 1) return -1; // ★굴림 없음
      let total = 0;
      for (const r of ratio) total += r;
      total *= 100;
      if (total < 1) return -1; // ★굴림 없음(전부 0인 표)
      let acc = value() % total;
      for (let i = 0; i < ratio.length; i += 1) {
        const r = ratio[i]!;
        if (r === 0) continue; // 0 가중치는 건너뛴다
        acc -= r * 100;
        if (acc < 0) return i;
      }
      return -1;
    },
    save() {
      return [x, y, z, w];
    },
    restore(s) {
      [x, y, z, w] = s;
    },
  };
  return self;
}

/**
 * 시드 하나로 스트림을 연다 — `App.Random.Initialize(uint)`(0x2374900) 대응.
 * ☠**시딩 뒤 20회 공전한다**(본문에 인라인 전진이 정확히 20회). 같은 이름의
 * `RandomSeed.Initialize`(struct 쪽, 0x2375000)에는 공전이 **없다** — 둘을 섞으면 전 수열이 어긋난다.
 */
export function createRandom(seed: number): Random {
  const r = randomFromState(seedState(seed));
  r.spin(INIT_SPIN);
  return r;
}

/** `Random.Initialize`가 시딩 직후 도는 공전 횟수(0x0237478C~0x023748B0 인라인 전진 카운트). */
export const INIT_SPIN = 20;
