import { describe, expect, it } from "vitest";
import { carryover, type GameState, type UnitState } from "@fesim/engine";

/**
 * 챕터 인계(MP5) — 런은 챕터 기보의 사슬이다. 종료 국면의 자군 로스터를 뽑아
 * 다음 챕터의 setup으로 넣는다(키 = pid, 자군 한정 — SetupUnit 계약).
 *
 * 왜 위험한가: 뽑는 항목이 하나라도 새면 다음 챕터가 조용히 다른 판이 된다.
 * 특히 (1) 성장 누적기가 빠지면 레벨업 시점이 어긋나고, (2) 사망자를 안 적으면
 * 클래식에서 죽은 유닛이 다음 챕터에 기본 스탯으로 되살아난다.
 */
const stats = { hp: 30, str: 12, mag: 0, dex: 10, spd: 11, lck: 5, def: 7, res: 4, bld: 5 };

const unit = (over: Partial<UnitState> & { id: string; force: number }): UnitState => ({
  x: 0, y: 0, hp: 20, stats, level: 5, exp: 30, movePoints: 4, moveType: "foot",
  acted: false, dead: false, broken: false, ...over,
});

const state = (units: UnitState[]): GameState => ({
  turn: 3, phase: 0, difficulty: "l",
  map: { width: 4, height: 4, costs: {} },
  units, events: [],
});

describe("carryover — 챕터 종료 국면 → 다음 챕터 setup", () => {
  it("생존 자군만 pid 키로 뽑는다(적·우군은 인계 대상이 아니다)", () => {
    const roster = carryover(state([
      unit({ id: "u0", force: 0, pid: "PID_A" }),
      unit({ id: "u1", force: 1, pid: "PID_E" }),
      unit({ id: "u2", force: 2, pid: "PID_ALLY" }),
    ]));
    expect(Object.keys(roster)).toEqual(["PID_A"]);
  });

  it("레벨·경험·내부레벨·직업·스탯·성장 누적기를 그대로 나른다", () => {
    const roster = carryover(state([
      unit({
        id: "u0", force: 0, pid: "PID_A", level: 9, exp: 55,
        internalLevel: 4, jid: "JID_ソードファイター", growthAcc: { str: 70 },
      }),
    ]));
    expect(roster["PID_A"]).toMatchObject({
      level: 9, exp: 55, internalLevel: 4, jid: "JID_ソードファイター",
      stats, growthAcc: { str: 70 },
    });
  });

  it("현재 HP는 나르지 않는다 — 챕터 개시는 만HP 회복이 인게임 문법이다", () => {
    const roster = carryover(state([unit({ id: "u0", force: 0, pid: "PID_A", hp: 3 })]));
    expect(roster["PID_A"].hp).toBeUndefined();
  });

  it("사망 자군은 removed로 적는다 — 안 적으면 다음 챕터에서 기본 스탯으로 되살아난다", () => {
    const roster = carryover(state([
      unit({ id: "u0", force: 0, pid: "PID_A" }),
      unit({ id: "u1", force: 0, pid: "PID_DEAD", dead: true }),
    ]));
    expect(roster["PID_DEAD"]).toEqual({ removed: true });
  });

  it("pid 없는 자군은 건너뛴다 — 인계 키가 없으면 다음 챕터에서 해석할 수 없다", () => {
    const roster = carryover(state([unit({ id: "u0", force: 0 })]));
    expect(roster).toEqual({});
  });

  it("소지품 스냅숏(무기·지팡이·소모품)을 함께 나른다", () => {
    const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
    const roster = carryover(state([
      unit({ id: "u0", force: 0, pid: "PID_A", weapons: [sword], weapon: sword }),
    ]));
    expect(roster["PID_A"].weapons).toEqual([sword]);
  });
});
