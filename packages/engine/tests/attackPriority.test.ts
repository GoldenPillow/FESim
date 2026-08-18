import { describe, expect, it } from "vitest";
import { BAD_STATE, betterAttack, compareBlow, rejectsLowKill, AI_THINK, type AttackEvaluation } from "@fesim/engine";

/**
 * 표적 우선권 사다리 — `CheckAttackPriorityImpl`(0x1955ED0) 확정판 회귀.
 *
 * 왜 위험했나: 이 사다리는 §5 예지선의 **우선권 배지**가 화면에 그대로 그리는 값이다.
 * 근거가 추측이면 배지는 가장 비싼 종류의 거짓말이 된다 — 사용자가 그걸 믿고 수를 둔다.
 * 특히 S1 Decoy는 **다른 비교자보다 앞에서 즉시 return**하는 하드 게이트라,
 * 사다리 중간에 끼워 넣으면 스코어가 높은 후보에게 밀려 조용히 틀린다.
 *
 * 정본 판독 = ~/fesim_data/extracted/il2cpp/ATTACK_PRIORITY.md §1 (S0~S8) · 대조표 = _mp8/A1_s5_port_diff.md
 */

const evaluation = (over: Partial<AttackEvaluation> = {}): AttackEvaluation => ({
  moveX: 0,
  moveY: 0,
  attackX: 0,
  attackY: 0,
  score: 0,
  blow: 0,
  chainCount: 0,
  weapon: 0,
  target: "t",
  battle: 100,
  kill: 0.5,
  dead: 0,
  expectation: 0,
  decoy: false,
  ...over,
});

/** 코인플립까지 가면 실패시킨다 — 게이트가 난수를 먹으면 소비 순서가 어긋난다(A6 계약). */
const noRng = { next: (): number => { throw new Error("이 경로는 난수를 소비하면 안 된다"); } };

describe("BadState 비트", () => {
  it("Decoy = 4096 (SkillData.States, SID_囮)", () => {
    expect(BAD_STATE.decoy).toBe(4096);
  });
});

describe("S1 — Decoy 하드 게이트 (0x1955F54-F7C)", () => {
  it("새 후보만 Decoy면 다른 전부가 열세여도 채택한다", () => {
    const next = evaluation({ decoy: true, chainCount: 0, battle: 1 });
    const cur = evaluation({ decoy: false, chainCount: 5, battle: 999999 });
    expect(betterAttack(next, cur, noRng)).toBe(true);
  });

  it("기존만 Decoy면 새 후보가 전부 우세여도 기각한다", () => {
    const next = evaluation({ decoy: false, chainCount: 5, battle: 999999 });
    const cur = evaluation({ decoy: true, chainCount: 0, battle: 1 });
    expect(betterAttack(next, cur, noRng)).toBe(false);
  });

  it("둘 다 Decoy면 통과해서 일반 사다리로 간다", () => {
    const next = evaluation({ decoy: true, battle: 200 });
    const cur = evaluation({ decoy: true, battle: 100 });
    expect(betterAttack(next, cur, noRng)).toBe(true);
  });

  it("둘 다 Decoy가 아니면 게이트가 침묵한다(기존 거동 보존)", () => {
    const next = evaluation({ battle: 50 });
    const cur = evaluation({ battle: 100 });
    expect(betterAttack(next, cur, noRng)).toBe(false);
  });

  /** ☠게이트가 S3 체인보다 **앞**이어야 한다 — 뒤에 두면 체인 수가 많은 쪽에 먹힌다. */
  it("체인 수가 적어도 Decoy가 이긴다(게이트가 체인보다 앞)", () => {
    const next = evaluation({ decoy: true, chainCount: 0 });
    const cur = evaluation({ decoy: false, chainCount: 3 });
    expect(betterAttack(next, cur, noRng)).toBe(true);
  });
});

describe("S3~S8 — 기존 사다리 회귀", () => {
  it("체인 수가 많으면 스코어를 안 보고 채택한다(S6)", () => {
    expect(betterAttack(evaluation({ chainCount: 2, battle: 1 }), evaluation({ chainCount: 1, battle: 999 }), noRng)).toBe(true);
  });

  it("체인 수가 적으면 즉시 기각한다(S3 조기 반환)", () => {
    expect(betterAttack(evaluation({ chainCount: 1 }), evaluation({ chainCount: 2 }), noRng)).toBe(false);
  });

  it("S7은 battle 단일 필드 비교다(다필드 사전식이 아니다 — 정정 C3)", () => {
    expect(betterAttack(evaluation({ battle: 2, kill: 0 }), evaluation({ battle: 1, kill: 1 }), noRng)).toBe(true);
    expect(betterAttack(evaluation({ battle: 1, kill: 1 }), evaluation({ battle: 2, kill: 0 }), noRng)).toBe(false);
  });

  it("S8 동점에서만 코인플립을 소비한다 — 0이면 새 후보", () => {
    let calls = 0;
    const rng = { next: (): number => { calls += 1; return 0; } };
    expect(betterAttack(evaluation({ battle: 7 }), evaluation({ battle: 7 }), rng)).toBe(true);
    expect(calls).toBe(1);
    expect(betterAttack(evaluation({ battle: 7 }), evaluation({ battle: 7 }), { next: () => 1 })).toBe(false);
  });
});

describe("S4 — compareBlow (0x19552D0) 진리표", () => {
  it("Wall(1)과 Blew(2)는 서로 무승부다", () => {
    expect(compareBlow(1, 0.5, 2, 0.5)).toBe(0);
    expect(compareBlow(2, 0.5, 1, 0.5)).toBe(0);
  });

  it("Hole(3)만 다른 밀치기보다 우월하다", () => {
    expect(compareBlow(3, 0.5, 1, 0.5)).toBe(-1);
    expect(compareBlow(1, 0.5, 3, 0.5)).toBe(1);
  });

  it("못 미는 쪽이라도 킬레이트 0.95 이상이면 이긴다(양방향 대칭)", () => {
    expect(compareBlow(0, 0.95, 3, 0.5)).toBe(-1);
    expect(compareBlow(3, 0.5, 0, 0.95)).toBe(1);
    expect(compareBlow(0, 0.94, 3, 0.5)).toBe(1);
  });
});

describe("AttackHigh 저확률 기각 — Decoy 면제 (0x1956664 / 0x19566A0)", () => {
  it("AttackHigh에서 격파확률 0.3 미만은 기각한다", () => {
    expect(rejectsLowKill(AI_THINK.attackHigh, 0.29, false)).toBe(true);
    expect(rejectsLowKill(AI_THINK.attackHigh, 0.3, false)).toBe(false);
  });

  /** ☠유인 대상은 저확률이어도 후보로 남는다 — 면제가 없으면 유인이 통째로 탈락한다. */
  it("Decoy 대상은 그 기각을 면제받는다", () => {
    expect(rejectsLowKill(AI_THINK.attackHigh, 0.01, true)).toBe(false);
  });

  it("AttackHigh가 아니면 기각 자체가 없다", () => {
    expect(rejectsLowKill(AI_THINK.attack, 0.01, false)).toBe(false);
  });
});
