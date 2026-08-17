/**
 * 표적 평가함수 — `AIBattleSimulator$$CalculateScore`(RVA 0x1928570) 이식.
 *
 * ☠**부동소수 가중합이 아니라 uint32 비트필드 사전식 비교**다(AI_ENGINE §5-1).
 * 격파확률이 항상 최상위 비트를 점유하므로 "죽일 수 있으면 죽인다"가 구조적으로 보장된다.
 * `AI_BattleRate`(突撃/攻撃/慎重)가 레이아웃을 **통째로** 바꾼다 — 세 식은 서로 다른 함수다.
 */
import { BATTLE_RATE, type BattleRate } from "./types.js";

/** C# `(uint)float` = 0 방향 절사. */
const toUint = (v: number): number => Math.trunc(v) >>> 0;

/** `KillScoreNormalize`(0x192A150) = `(uint)(kill * 100f)`. */
export function killScoreNormalize(kill: number): number {
  return toUint(kill * 100);
}

/**
 * `ExpectationScoreNormalize`(0x192A170).
 * max로 클램프 → `e * 2^(bit-7)` 절사 → **0으로 뭉개지면 바닥 1** → `(1<<bit)-1`로 포화.
 */
export function expectationScoreNormalize(e: number, bit: number, max = -1): number {
  let v = e;
  if (max >= 1 && max < v) v = max;
  const n = toUint(v * 2 ** (bit - 7));
  if (v > 0 && n === 0) return 1;
  const cap = 2 ** bit - 1;
  return n < 2 ** bit ? n : cap;
}

export interface BattleScoreInput {
  rate: BattleRate;
  /** `m_Kill` 격파 확률 0..1. */
  kill: number;
  /** `m_Dead` 피격파 확률 0..1. */
  dead: number;
  /** `m_Expectation` 기대 가한 데미지(연계 포함) — 대상 현재 HP로 클램프된다. */
  expect_: number;
  /** `m_ExpectationReceived` 기대 받은 데미지 — 자신 현재 HP로 클램프된다. */
  received: number;
  /** `m_aBreak[0].BreakAttack > 0` — ☠`ThinkBreak` 플래그가 꺼진 유닛은 항상 false다(§8-5). */
  breakable: boolean;
  /** 대상 현재 HP(`m_Defense.m_Hp`). */
  defHp: number;
  /** 자신 현재 HP(`m_Offense.m_Hp`). */
  offHp: number;
}

/**
 * 전투 스코어 uint32. ☠**표적 선택 전용** — 위치 선택은 `attackPositionScore`(§5-A)가 따로 한다.
 *
 * `isRemove || IsClever()`면 `AI_BattleRate`를 무시하고 慎重 레이아웃을 강제한다(0x1928A24) —
 * 호출측이 `rate`에 慎重을 넣어 표현한다(위임 국면 = 항상 慎重).
 */
export function battleScore(input: BattleScoreInput): number {
  const { kill: k, dead: d, expect_: e, received: r, breakable, defHp, offHp } = input;
  // ★0.3 미만 격파확률은 전부 0으로 버린다(세 레이아웃 공통 — 0x1928A4C/0x1928BC8/0x1928CB0).
  const kill = k >= 0.3 ? killScoreNormalize(k) : 0;
  const dead = killScoreNormalize(d);
  const brk = breakable ? 1 : 0;

  if (input.rate === BATTLE_RATE.chariness) {
    // ★慎重만 dead에 임계치가 없다(무조건 감점). E와 R을 같은 폭(14bit)으로 상쇄.
    const hi = ((127 - dead) << 7) + kill;
    const base = ((hi & 0x3fff) * 2 ** 18 + (brk << 17) + (1 << 16)) >>> 0;
    return (
      base + expectationScoreNormalize(e, 14, defHp) - expectationScoreNormalize(r, 14, offHp)
    );
  }
  if (input.rate === BATTLE_RATE.attack) {
    const band = d < 0.3 ? 2 : d < 0.7 ? 1 : 0;
    const hi = (kill << 2) | band;
    const base = ((hi & 0x1ff) * 2 ** 23 + (brk << 22) + (1 << 21)) >>> 0;
    // ★攻撃만 가한 기대 데미지에 x3 가중(0x1928DA8 add w10,w11,w11,lsl #1).
    return (
      base + 3 * expectationScoreNormalize(e, 19, defHp) - expectationScoreNormalize(r, 19, offHp)
    );
  }
  // 突撃 Rush(0) — 0x1928A3C
  const deadPart = d >= 0.5 ? 127 - dead : 127;
  const recvPart = 127 - expectationScoreNormalize(r, 7, offHp);
  return (
    kill * 2 ** 25 +
    brk * 2 ** 24 +
    expectationScoreNormalize(e, 10, defHp) * 2 ** 14 +
    (deadPart << 7) +
    recvPart
  );
}

/**
 * 한 타격의 명중 결과 분포 — `m_aIndication[side]`(§5-2).
 * ☠`prevent`(경감)·`skill`(스킬 발동)은 엔진이 아직 모델링하지 않는다 = 0 고정(장부 `ai.attack-scoring` assumed).
 */
export interface Indication {
  /** 확정 대미지 1회분(`m_Power`). */
  power: number;
  /** 빗맞을 확률 0..1(`m_Miss`). */
  miss: number;
  /** 필살이 아닌 명중 확률 0..1(`m_Hit`). */
  hit: number;
  /** 필살 확률 0..1(`m_Critical`). */
  critical: number;
  /** 라운드당 연속 타격 수(`BattleDetail.ActionCount`) — 1 이상. */
  actionCount: number;
  /** 최대 라운드 수(`Min(side[0xB0], 4)`) — 추격이 있으면 2. */
  battleTimes: number;
}

const MAX_SCENE_TIMES = 4;

/**
 * `CalculateKillProbabilityWithoutInterference`(0x19281F0/0x1928F10/0x1929180) 이식.
 * 반환 `[t]` = **t번째 라운드까지 누적** 격파확률(상대 반격을 무시한 자기 타격만의 확률).
 */
export function killProbability(ind: Indication, restHp: number): number[] {
  const acc = [0, 0, 0, 0];
  const times = Math.min(ind.battleTimes, MAX_SCENE_TIMES);
  if (times <= 0 || ind.actionCount < 1) return acc;

  const walk = (count: number, round: number, prob: number, hp: number, damage: number): void => {
    if (prob <= 0) return;
    const next = hp - damage;
    if (next >= 1) {
      let c = count + 1;
      let t = round;
      if (c >= ind.actionCount) {
        t += 1;
        if (t >= times) return;
        c = 0;
      }
      branch(c, t, prob, next);
      return;
    }
    acc[round] = (acc[round] ?? 0) + prob;
  };

  const branch = (count: number, round: number, prob: number, hp: number): void => {
    // 빗나감 · 명중 · 필살 (경감·스킬 분기는 엔진 미모델링 = 확률 0)
    walk(count, round, prob * ind.miss, hp, 0);
    walk(count, round, prob * ind.hit, hp, ind.power);
    walk(count, round, prob * ind.critical, hp, ind.power * 3);
  };

  branch(0, 0, 1, Math.max(restHp, 0));
  return [acc[0]!, acc[0]! + acc[1]!, acc[0]! + acc[1]! + acc[2]!, acc[0]! + acc[1]! + acc[2]! + acc[3]!];
}

export interface SimulationInput {
  offense: Indication;
  defense: Indication;
  offenseHp: number;
  defenseHp: number;
  /** 연계공격 기대 데미지 — ☠`ThinkChain`이 꺼져 있으면 0(§8-5). */
  chainExpectation?: number;
  /** 기습(수비측 선공) — 엔진 미모델링이면 false. */
  ambush?: boolean;
}

export interface SimulationResult {
  kill: number;
  dead: number;
  expectation: number;
  expectationReceived: number;
}

/**
 * `CalculateScore`의 확률 체인 누적 루프(§2.3, 0x1928814~0x19289D4) 이식.
 * 순서 테이블 = 기습이면 `[1,0,1,0]`, 아니면 `[0,1,0,1]`(연속공격 `[0,0,1,1]`은 엔진 미모델링).
 */
export function simulateBattle(input: SimulationInput): SimulationResult {
  const chain = input.chainExpectation ?? 0;
  // ★공격측 격파확률은 연계 기대 데미지를 목표 HP에서 미리 뺀 뒤 계산한다(0x1928458).
  const koOff = killProbability(input.offense, Math.max(input.defenseHp - chain, 0));
  const koDef = killProbability(input.defense, input.offenseHp);

  const order = input.ambush === true ? [1, 0, 1, 0] : [0, 1, 0, 1];
  let kill = 0;
  let dead = 0;
  let expectation = chain;
  let received = 0;
  let nOff = 0;
  let nDef = 0;
  const offTimes = Math.min(input.offense.battleTimes, MAX_SCENE_TIMES);
  const defTimes = Math.min(input.defense.battleTimes, MAX_SCENE_TIMES);
  const per = (ind: Indication): number =>
    ind.power * ind.hit + ind.power * 3 * ind.critical;

  for (const side of order) {
    const surv = (1 - kill) * (1 - dead);
    if (side === 1) {
      if (defTimes > nDef) {
        dead += surv * (koDef[nDef] ?? 0);
        received += surv * per(input.defense);
        nDef += 1;
      }
    } else if (offTimes > nOff) {
      kill += surv * (koOff[nOff] ?? 0);
      expectation += surv * per(input.offense);
      nOff += 1;
    }
  }
  return { kill, dead, expectation, expectationReceived: received };
}

/**
 * `AIThink$$GuardTo`(0x194CF60)의 params.xml 상수 3개(§5-3).
 * ☠`CalculateScore`의 즉치 0.3/0.5/0.7과는 **무관**하다 — 값이 겹쳐 보이는 것은 우연.
 */
export const AI_GUARD = { deadRate: 0.3, killRate: 0.5, expectationRate: 0.4 } as const;
