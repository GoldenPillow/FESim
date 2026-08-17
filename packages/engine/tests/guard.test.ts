import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  canChainGuard,
  chainGuardFor,
  createCalculator,
  createReducer,
  createReplayer,
  hasChainGuardSkill,
  type BattleAction,
  type BattleWeapon,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 체인가드 지정(MP1-6) — 인게임 재현의 위험 지점을 박제한다:
 * (1) 지정 게이트 = 만HP && HP≥2 (GetGuardType 0x1A34F50 판독) — 손상 유닛 지정을 허용하면 과대 재현.
 * (2) 가드 치환 = 대상 무피해·가드 trunc(현재HP*0.2) 손실·하한 없음 (GetChainGuardDamage 0x24720C0).
 * (3) 가드가 서면 필살 롤을 굴리지 않는다(CalcAttackHit 자체를 건너뜀 — CalcAttack 0x24716BC) = 난수 소비 계약.
 * (4) 체인어택·인게이지 기술은 못 막는다(CalcChainGuardSide 0x246F3C0 게이트) — 막으면 과대 재현.
 * (5) 경험치 = チェインガード経験計算 원문(가드 기본값 + 레벨차 감쇠, clamp 1..100) — 수기 상수 금지.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const noRolls: RandomSource = {
  next: () => {
    throw new Error("체인가드 지정은 난수를 소비하지 않는다");
  },
};

/** 굴림 값을 순서대로 먹이고 소비 개수를 세는 소스 — 필살 롤 스킵(난수 계약) 검증용. */
function counting(values: number[]): RandomSource & { consumed: () => number } {
  let i = 0;
  return {
    next: () => {
      if (i >= values.length) throw new Error(`준비된 롤 ${values.length}개 소진`);
      return values[i++];
    },
    consumed: () => i,
  };
}

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword: BattleWeapon = { might: 5, hit: 200, crit: 50, weight: 5, rangeMin: 1, rangeMax: 1, kind: 1 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: partial.stats?.hp ?? baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

function state(units: UnitState[], phase = 0, difficulty: GameState["difficulty"] = "n"): GameState {
  return {
    turn: 1,
    phase,
    difficulty,
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

const guardAction = (id: string): BattleAction => ({ type: "guard", unit: id });
const monk = (partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState =>
  unit({ style: "気功スタイル", ...partial });

describe("체인가드 지정 — guard 액션", () => {
  it("기공 스타일 만HP 유닛: 스탠스 진입 + 행동 완료, guard 이벤트, 난수 무소비", () => {
    const g = monk({ id: "g", force: 0, x: 0, y: 0 });
    const next = reduce(state([g]), guardAction("g"), noRolls);
    expect(next.units[0].guarding).toBe(true);
    expect(next.units[0].acted).toBe(true);
    expect(next.events).toContainEqual({ type: "guard", unit: "g" });
  });

  it("SID_チェインガード許可 스킬 직접 보유로도 지정 가능(스타일 무관)", () => {
    const g = unit({ id: "g", force: 0, x: 0, y: 0, skills: [{ Sid: "SID_チェインガード許可" }] });
    const next = reduce(state([g]), guardAction("g"), noRolls);
    expect(next.units[0].guarding).toBe(true);
  });

  it("거부 — 자격 없음·손상 HP·HP 1(만HP여도 2 미만)", () => {
    const plain = unit({ id: "p", force: 0, x: 0, y: 0 });
    const hurt = monk({ id: "h", force: 0, x: 1, y: 0, hp: 29 });
    const frail = monk({ id: "f", force: 0, x: 2, y: 0, hp: 1, stats: { ...baseStats, hp: 1 } });
    const st = state([plain, hurt, frail]);
    expect(() => reduce(st, guardAction("p"), noRolls)).toThrow(/자격/);
    expect(() => reduce(st, guardAction("h"), noRolls)).toThrow(/HP/);
    expect(() => reduce(st, guardAction("f"), noRolls)).toThrow(/HP/);
    expect(canChainGuard(hurt)).toBe(false);
    expect(canChainGuard(frail)).toBe(false);
    expect(hasChainGuardSkill(plain)).toBe(false);
  });

  it("스탠스 수명 — 자기 군 페이즈 복귀 시 해제", () => {
    const g = monk({ id: "g", force: 0, x: 0, y: 0 });
    const e = unit({ id: "e", force: 1, x: 5, y: 5, weapon: sword });
    let s = reduce(state([g, e]), guardAction("g"), noRolls);
    s = reduce(s, { type: "endPhase" }, noRolls); // 자군 → 적군: 스탠스 유지
    expect(s.units[0].guarding).toBe(true);
    s = reduce(s, { type: "endPhase" }, noRolls); // 적군 → 자군: 해제
    expect(s.units[0].guarding).toBeUndefined();
  });
});

describe("체인가드 치환 — 전투 해결", () => {
  const battlefield = () => {
    const attacker = unit({ id: "e", force: 1, x: 0, y: 0, weapon: sword });
    // 반격 봉쇄(무기 없음) — 가드 치환만 보기 위한 구성.
    const defender = unit({ id: "d", force: 0, x: 1, y: 0 });
    const guard = monk({ id: "g", force: 0, x: 1, y: 1, guarding: true, acted: true });
    return { attacker, defender, guard };
  };

  it("명중 시 대상 무피해·가드 trunc(HP*0.2) 손실 + guardBlock 이벤트, 필살 롤은 굴리지 않는다", () => {
    const { attacker, defender, guard } = battlefield();
    const rng = counting([0]); // 명중 롤 1개만 — 필살 롤을 청하면 소진 에러로 실패한다
    const next = reduce(state([attacker, defender, guard], 1), { type: "attack", unit: "e", target: "d" }, rng);
    expect(next.units[1].hp).toBe(30); // 대상 무피해
    expect(next.units[2].hp).toBe(24); // trunc(30*0.2) = 6
    expect(next.events).toContainEqual({ type: "guardBlock", unit: "g", target: "d", damage: 6, hpAfter: 24 });
    expect(rng.consumed()).toBe(1);
  });

  it("하한 없음 — 가드 현재 HP 4면 손실 0(무피해 방패)", () => {
    const { attacker, defender, guard } = battlefield();
    guard.hp = 4;
    const next = reduce(state([attacker, defender, guard], 1), { type: "attack", unit: "e", target: "d" }, counting([0]));
    expect(next.units[2].hp).toBe(4);
    expect(next.events).toContainEqual({ type: "guardBlock", unit: "g", target: "d", damage: 0, hpAfter: 4 });
  });

  it("빗나가면 가드 무발동(스탠스는 유지)", () => {
    const { attacker, defender, guard } = battlefield();
    attacker.weapon = { ...sword, hit: 0 }; // 명중률 0
    const next = reduce(state([attacker, defender, guard], 1), { type: "attack", unit: "e", target: "d" }, counting([9999]));
    expect(next.units[2].hp).toBe(30);
    expect(next.units[2].guarding).toBe(true);
    expect(next.events.some((ev) => ev.type === "guardBlock")).toBe(false);
  });

  it("체인어택은 못 막는다 — chain 타격은 대상에 그대로, 본공격만 치환", () => {
    const { attacker, defender, guard } = battlefield();
    const backup = unit({ id: "b", force: 1, x: 0, y: 1, style: "連携スタイル", weapon: { ...sword, rangeMax: 2 } });
    const rng = counting([0, 0]); // chain 명중 롤 + 본공격 명중 롤(필살 없음: chain 필살 0 고정·본공격은 가드 치환)
    const next = reduce(state([attacker, defender, guard, backup], 1), { type: "attack", unit: "e", target: "d" }, rng);
    const chainDamage = Math.max(Math.trunc(baseStats.hp * 0.1), 1); // max(相手のMaxHP*0.1, 1) = 3
    expect(next.units[1].hp).toBe(30 - chainDamage);
    expect(next.units[2].hp).toBe(24); // 본공격은 가드가 받았다
  });

  it("인게이지 기술은 못 막는다 — engageAttack 대미지는 대상에 그대로", () => {
    const { attacker, defender, guard } = battlefield();
    attacker.engage = { count: 5, limit: 5, turnLimit: 3, turn: 0, engaging: true };
    attacker.engageArt = { sid: "EID_테스트", skills: [], cost: 0 };
    const next = reduce(
      state([attacker, defender, guard], 1),
      { type: "engageAttack", unit: "e", target: "d" },
      counting([0, 99999]), // 명중 + 필살(불발)
    );
    expect(next.units[1].hp).toBeLessThan(30);
    expect(next.units[2].hp).toBe(30);
  });

  it("가드 경험치 — チェインガード経験計算: 노멀 레벨1·레벨차0 = 13, 공격측(적)은 무경험", () => {
    const { attacker, defender, guard } = battlefield();
    const next = reduce(state([attacker, defender, guard], 1), { type: "attack", unit: "e", target: "d" }, counting([0]));
    expect(next.events).toContainEqual({ type: "exp", unit: "g", amount: 13, total: 13 });
    expect(next.units[0].exp).toBe(0);
  });

  it("가드 경험치 감쇠 — 루나틱 레벨 20 가드가 레벨 1을 지키면 clamp 하한 1, 다타격이어도 전투당 1회", () => {
    const { attacker, defender, guard } = battlefield();
    guard.level = 20;
    attacker.stats = { ...baseStats, spd: 20 }; // 추격 발생 — 가드가 두 번 받아도 경험은 1건
    const rng = counting([0, 0]);
    const next = reduce(state([attacker, defender, guard], 1, "l"), { type: "attack", unit: "e", target: "d" }, rng);
    expect(next.events.filter((ev) => ev.type === "exp")).toEqual([{ type: "exp", unit: "g", amount: 1, total: 1 }]);
    expect(next.units[2].hp).toBe(30 - 6 - Math.trunc(24 * 0.2)); // 두 번째 블록은 줄어든 현재 HP 기준
  });

  it("chainGuardFor — 인접 1·같은 군·생존·스탠스만 (UI 예보 공용)", () => {
    const d = unit({ id: "d", force: 0, x: 1, y: 0 });
    const near = monk({ id: "n", force: 0, x: 1, y: 1, guarding: true });
    const far = monk({ id: "f", force: 0, x: 3, y: 0, guarding: true });
    const foe = monk({ id: "x", force: 1, x: 0, y: 0, guarding: true });
    const idle = monk({ id: "i", force: 0, x: 2, y: 0 }); // 스탠스 아님
    expect(chainGuardFor(d, [d, far, foe, idle, near])?.id).toBe("n");
    expect(chainGuardFor(d, [d, far, foe, idle])).toBeUndefined();
  });
});

describe("체인가드 재생(절대 적용)", () => {
  it("attack events의 guardBlock으로 가드 HP·경험이 복원된다", () => {
    const attacker = unit({ id: "e", force: 1, x: 0, y: 0, weapon: sword });
    const defender = unit({ id: "d", force: 0, x: 1, y: 0 });
    const guard = monk({ id: "g", force: 0, x: 1, y: 1, guarding: true, acted: true });
    const initial = state([attacker, defender, guard], 1);
    const recorded = reduce(initial, { type: "attack", unit: "e", target: "d" }, counting([0]));
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(initial, { action: { type: "attack", unit: "e", target: "d" }, events: recorded.events });
    expect(replayed.units[2].hp).toBe(24);
    expect(replayed.units[2].exp).toBe(13);
    expect(replayed.units[1].hp).toBe(30);
  });
});
