import { describe, expect, it } from "vitest";
import {
  createRandom,
  INIT_SPIN,
  randomFromState,
  seedState,
  type RandomState,
} from "@fesim/engine";

/**
 * 인게임 PRNG 이식 — xorshift128(Marsaglia) + MT식 시딩.
 *
 * 왜 위험했나: 지금까지 난수는 **주입만 정본**이었다(계약 = (국면, 행동, 난수소스) → 국면).
 * 굴림 개수·순서는 기보에 박혀 재생은 결정론이지만 **어떤 값이 나오는가**는 우리 것이라
 * "같은 판을 인게임에서 돌리면 같은 결과인가"를 검증할 수단조차 없었다.
 * 더 큰 문제는 되돌리기다 — 웹은 `Math.random`을 쓰므로 되감고 같은 수를 두면 **다른 결과**가 나온다.
 * 인게임은 반대다(사용자 실측 2026-08-19: 되감아도 같고, 사이에 다른 타격이 끼면 바뀐다).
 * 그 거동은 상태 4워드를 저장·복원해야만 재현된다.
 *
 * 정본 = `App.RandomSeed`/`App.Random` (5.0.0) — 전진식 0x23750C0 · 시딩 0x2375000 ·
 * GetValue(n) 0x2375170 · Peek 0x2375060 · Spin 0x2375080 · GetF01 0x23750F0 ·
 * GetMinMax 0x23751B0 · GetMaxMin 0x2375240 · GetIndex 0x2375520.
 * 판독물 = ~/fesim_data/extracted/il2cpp/RNG_SYSTEM.md §1
 */

describe("시딩 — RandomSeed.Initialize (0x2375000)", () => {
  it("MT19937 상수 1812433253으로 4워드를 만들고 각각 +0/+1/+2/+3을 더한다", () => {
    const C = 1812433253;
    const s = 12345;
    const x = Math.imul(s ^ (s >>> 30), C) >>> 0;
    const y = (Math.imul(x ^ (x >>> 30), C) + 1) >>> 0;
    const z = (Math.imul(y ^ (y >>> 30), C) + 2) >>> 0;
    const w = (Math.imul(z ^ (z >>> 30), C) + 3) >>> 0;
    expect(seedState(s)).toEqual([x, y, z, w]);
  });

  it("시드가 다르면 상태가 다르다", () => {
    expect(seedState(1)).not.toEqual(seedState(2));
  });
});

describe("전진식 — GetValue (0x23750C0)", () => {
  it("t = x^(x<<11) ^ ((t)>>>8) ^ w ^ (w>>>19), 반환은 31비트 마스크", () => {
    const state = seedState(777);
    const [x, y, z, w] = state;
    let t = (x ^ (x << 11)) >>> 0;
    t = (t ^ (t >>> 8)) >>> 0;
    t = (t ^ w ^ (w >>> 19)) >>> 0;

    const r = randomFromState(state);
    expect(r.getValue()).toBe(t & 0x7fffffff);
    // x=y, y=z, z=w, w=t 로 밀린다
    expect(r.save()).toEqual([y, z, w, t]);
  });

  /**
   * ☠`Random.Initialize(uint)`(0x2374900)는 시딩 뒤 **20회 공전**한다. struct 쪽
   * `RandomSeed.Initialize`(0x2375000)에는 공전이 없다 — 이름이 같아 섞기 쉽고,
   * 섞으면 첫 굴림부터 전 수열이 어긋난다(값은 그럴듯해서 화면으로는 안 보인다).
   */
  it("createRandom은 시딩 뒤 20회 공전한다(Random.Initialize)", () => {
    expect(INIT_SPIN).toBe(20);
    const spun = randomFromState(seedState(777));
    spun.spin(20);
    expect(createRandom(777).save()).toEqual(spun.save());
    // 공전을 빠뜨린 것과는 다른 수열이어야 한다
    expect(createRandom(777).getValue()).not.toBe(randomFromState(seedState(777)).getValue());
  });

  it("반환값은 항상 [0, 2^31) 이다(bit31 마스크)", () => {
    const r = createRandom(3);
    for (let i = 0; i < 200; i += 1) {
      const v = r.getValue();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0x80000000);
    }
  });
});

describe("범위 축소 — GetValue(n) (0x2375170)", () => {
  it("모듈로다 — 편향을 그대로 재현한다(비트 일치가 목표라 나눗셈까지 이식)", () => {
    const probe = createRandom(99);
    const raw = probe.getValue();
    const r = createRandom(99);
    expect(r.getValue(7)).toBe(raw % 7);
  });

  /**
   * ☠aarch64 `sdiv`는 0으로 나눠도 트랩하지 않고 0을 돌려준다 —
   * `msub`가 `v - 0*0 = v`를 남기므로 **원값이 그대로 나온다**. C#이면 예외가 날 자리인데
   * IL2CPP AOT 코드에는 가드가 없다. JS는 `v % 0 = NaN`이라 특례를 안 넣으면 조용히 NaN이 샌다.
   */
  it("n = 0이면 예외가 아니라 원값을 돌려준다(sdiv 0 = 0)", () => {
    const probe = createRandom(4242);
    const raw = probe.getValue();
    expect(createRandom(4242).getValue(0)).toBe(raw);
  });

  it("어떤 상한으로 부르든 상태 전진은 정확히 1회다", () => {
    const a = createRandom(5);
    a.getValue(10);
    const b = createRandom(5);
    b.getValue();
    expect(a.save()).toEqual(b.save());
  });
});

describe("Peek (0x2375060) — 값은 같고 상태는 안 움직인다", () => {
  /**
   * `rng_ai_fidelity.md` §0-1은 "Peek는 GetValue와 식이 다르다"고 판독했으나 **오독이었다**.
   * 마스킹 순서만 다르고(`(A&0x7FFFFFFF)^B` vs `(A^B)&0x7FFFFFFF`), `B = t>>>8`은 bit31이 0이라
   * 두 식은 전 비트에서 일치한다. 즉 정확히 "다음 값 미리보기"다.
   */
  it("peek() == 다음 getValue()", () => {
    const r = createRandom(31337);
    const peeked = r.peek();
    expect(r.peek()).toBe(peeked); // 몇 번을 봐도 같다
    expect(r.getValue()).toBe(peeked);
  });

  it("peek는 상태를 전진시키지 않는다", () => {
    const r = createRandom(8);
    const before = r.save();
    r.peek();
    expect(r.save()).toEqual(before);
  });
});

describe("Spin (0x2375080)", () => {
  it("n회 전진한다", () => {
    const a = createRandom(11);
    a.spin(3);
    const b = createRandom(11);
    b.getValue();
    b.getValue();
    b.getValue();
    expect(a.save()).toEqual(b.save());
  });

  it("n < 1이면 전진하지 않는다", () => {
    const r = createRandom(11);
    const before = r.save();
    r.spin(0);
    r.spin(-5);
    expect(r.save()).toEqual(before);
  });
});

describe("파생 함수", () => {
  it("getMinMax(min,max)는 max를 포함한다 (0x23751B0)", () => {
    const r = createRandom(2024);
    for (let i = 0; i < 300; i += 1) {
      const v = r.getMinMax(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it("getMaxMin은 인자 순서가 뒤바뀌어도 같은 범위다 (0x2375240)", () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect(a.getMaxMin(2, 9)).toBe(b.getMaxMin(9, 2));
  });

  it("getF01은 [0,1)이고 해상도가 2^-24다 (0x23750F0)", () => {
    const r = createRandom(1234);
    for (let i = 0; i < 200; i += 1) {
      const v = r.getF01();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(Number.isInteger(v * 0x1000000)).toBe(true);
    }
  });

  /** ☠확률이 0 이하면 굴림 자체가 없다 — 소비 개수가 확률값에 의존한다(순서가 깨지는 자리). */
  it("isProbability100은 percent <= 0에서 난수를 소비하지 않는다 (0x23754B0)", () => {
    const r = createRandom(55);
    const before = r.save();
    expect(r.isProbability100(0)).toBe(false);
    expect(r.isProbability100(-10)).toBe(false);
    expect(r.save()).toEqual(before);
    r.isProbability100(50);
    expect(r.save()).not.toEqual(before);
  });

  it("isProbability100(100)은 항상 참이다(해상도 0.001%)", () => {
    const r = createRandom(56);
    for (let i = 0; i < 100; i += 1) expect(r.isProbability100(100)).toBe(true);
  });

  /** ☠빈 표·전부 0인 표는 난수를 소비하지 않는다(위와 같은 이유로 순서가 깨진다). */
  it("getIndex는 빈 표·전부 0인 표에서 -1이고 난수를 안 쓴다 (0x2375520)", () => {
    const r = createRandom(60);
    const before = r.save();
    expect(r.getIndex([])).toBe(-1);
    expect(r.getIndex([0, 0, 0])).toBe(-1);
    expect(r.save()).toEqual(before);
  });

  it("getIndex는 가중치 0인 칸을 건너뛴다", () => {
    const r = createRandom(61);
    for (let i = 0; i < 200; i += 1) {
      const idx = r.getIndex([0, 5, 0, 5]);
      expect([1, 3]).toContain(idx);
    }
  });
});

describe("★되돌리기 재현 — 상태 저장·복원", () => {
  /**
   * 사용자 실기 앵커(2026-08-19): *"A가 B를 때려 miss가 나면 수백 번 되감아도 같은 결과.
   * 사이에 다른 캐릭터가 조금이라도 때리면 바뀐다."*
   * 이 두 문장이 곧 아래 두 테스트다 — 커서를 복원하면 같고, 사이에 소비가 끼면 밀린다.
   */
  it("복원하면 같은 수열이 다시 나온다(되감아도 같은 결과)", () => {
    const r = createRandom(2026);
    r.spin(5);
    const mark: RandomState = r.save();
    const first = [r.getValue(100), r.getValue(100), r.getValue(100)];
    r.restore(mark);
    expect([r.getValue(100), r.getValue(100), r.getValue(100)]).toEqual(first);
  });

  it("사이에 다른 소비가 끼면 결과가 달라진다(정본이 그렇다)", () => {
    const r = createRandom(2026);
    r.spin(5);
    const mark: RandomState = r.save();
    const first = r.getValue(1000);
    r.restore(mark);
    r.getValue(1000); // 다른 캐릭터가 한 대 때렸다
    expect(r.getValue(1000)).not.toBe(first);
  });

  it("복원은 4워드 전부를 되돌린다(한 워드만 되돌리면 수열이 어긋난다)", () => {
    const r = createRandom(9);
    const mark = r.save();
    r.spin(40);
    r.restore(mark);
    expect(r.save()).toEqual(mark);
  });
});

describe("RandomSource 계약 호환", () => {
  it("next(bound)는 getValue(bound)와 같다(엔진 주입구 그대로 물린다)", () => {
    const a = createRandom(4);
    const b = createRandom(4);
    expect(a.next(6)).toBe(b.getValue(6));
  });
});
