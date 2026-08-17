/**
 * 적턴 AI — IL2CPP 판독(`~/fesim_data/extracted/il2cpp/AI_ENGINE.md`) 이식 검증.
 *
 * 여기 있는 수치는 전부 판독 문서의 식을 손으로 전개한 값이다(no-fiction —
 * 추정치 없음). 왜 위험했나 = AI 스코어는 **두 개**이고(표적 = §5-1 전투 비트필드 /
 * 위치 = §5-A 사전식) 섞으면 "죽일 수 있는데 안 죽이는" 오재현이 조용히 생긴다.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  BATTLE_RATE,
  aiHealCondition,
  aiPriorityKey,
  aiPriorityQueue,
  argsOf,
  attackPositionScore,
  battleScore,
  blowScoreAt,
  calcHealRodScore,
  createCalculator,
  enumerateRing,
  expectationScoreNormalize,
  AC,
  ACT,
  eachEnemyUnit,
  evaluateCause,
  guardTo,
  isEscapePosition,
  killScoreNormalize,
  mindBreakDown,
  mindTorch,
  mindTreasure,
  moveBreakDown,
  moveEscape,
  moveIdle,
  movePerson,
  movePosition,
  movePowerOf,
  targetFilter,
  type HandlerContext,
  parseMoveLimit,
  parsePos,
  processing,
  type ThinkRuntime,
  rodHealTo,
  terrainScoreAt,
  type BattleMap,
  type GameState,
  type StatBlock,
  type UnitState,
} from "@fesim/engine";

const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
void createCalculator(data);

const baseStats: StatBlock = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };

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

const flatMap = (width = 10, height = 10): BattleMap => ({
  width,
  height,
  costs: { foot: Array.from({ length: height }, () => Array.from({ length: width }, () => 1)) },
});

describe("표적 스코어 — uint32 비트필드 (AI_ENGINE §5-1)", () => {
  it("KillScoreNormalize = (uint)(kill*100)", () => {
    expect(killScoreNormalize(0.5)).toBe(50);
    expect(killScoreNormalize(0.999)).toBe(99); // C# float→uint = 절사
  });

  it("ExpectationScoreNormalize — max 클램프·바닥 1·bit폭 포화", () => {
    expect(expectationScoreNormalize(0, 10, -1)).toBe(0);
    expect(expectationScoreNormalize(0.5, 7, -1)).toBe(1); // 0으로 뭉개지지 않게 바닥 1
    expect(expectationScoreNormalize(10, 10, 5)).toBe(40); // max=5로 클램프 → 5*2^3
    expect(expectationScoreNormalize(1000, 10, -1)).toBe(1023); // (1<<10)-1 포화
    expect(expectationScoreNormalize(4, 19, 30)).toBe(16384); // 4*2^12
  });

  it("突撃 Rush(0) 레이아웃", () => {
    // kill=50 · BRK=1 · En(E=10,10,30)=80 · deadPart=127(D<0.5) · recv=127-4=123
    expect(battleScore({ rate: BATTLE_RATE.rush, kill: 0.5, dead: 0.2, expect_: 10, received: 4, breakable: true, defHp: 30, offHp: 30 }))
      .toBe((50 << 25) + (1 << 24) + (80 << 14) + (127 << 7) + 123);
  });

  it("慎重 Chariness(2) — dead에 임계치 없음, E와 R을 같은 폭으로 상쇄", () => {
    // (127-20)<<7 | 50 = 13746 → <<18 · BRK bit17 · 상수 bit16 · +En(E,14)=1280 · -En(R,14)=512
    expect(battleScore({ rate: BATTLE_RATE.chariness, kill: 0.5, dead: 0.2, expect_: 10, received: 4, breakable: true, defHp: 30, offHp: 30 }))
      .toBe(13746 * 2 ** 18 + 0x30000 + 1280 - 512);
  });

  it("攻撃 Attack(1) — 가한 기대 데미지 x3 가중", () => {
    // kill<<2|band(D<0.3 → 2) = 202 → <<23 · BRK bit22 · 상수 bit21 · +3*En(E,19)=122880 · -En(R,19)=16384
    expect(battleScore({ rate: BATTLE_RATE.attack, kill: 0.5, dead: 0.2, expect_: 10, received: 4, breakable: true, defHp: 30, offHp: 30 }))
      .toBe(202 * 2 ** 23 + 0x600000 + 122880 - 16384);
  });

  it("★격파확률 0.3 미만은 통째로 버려진다 — 세 레이아웃 공통", () => {
    for (const rate of [BATTLE_RATE.rush, BATTLE_RATE.attack, BATTLE_RATE.chariness]) {
      const lo = battleScore({ rate, kill: 0.29, dead: 0, expect_: 0, received: 0, breakable: false, defHp: 30, offHp: 30 });
      const zero = battleScore({ rate, kill: 0, dead: 0, expect_: 0, received: 0, breakable: false, defHp: 30, offHp: 30 });
      expect(lo).toBe(zero);
    }
  });
});

describe("위치 스코어 — 사전식 (AI_ENGINE §5-A-3)", () => {
  it("연계수 ≫ 밀치기 ≫ 반격사거리 밖 ≫ 지형 ≫ 이동코스트", () => {
    // hi = ((2<<2)|3)<<5 | 16 | 7 = 375 ; score = (375<<8) + (100-6)
    expect(attackPositionScore({ chainCount: 2, blow: 3, outOfTargetRange: true, terrain: 7, move: 6 }))
      .toBe((375 << 8) + 94);
  });

  it("Nearest 플래그면 지형·아웃레인지 항이 사라져 이동코스트가 지배한다", () => {
    expect(attackPositionScore({ chainCount: 2, blow: 3, outOfTargetRange: true, terrain: 7, move: 6, nearest: true }))
      .toBe((5 << 8) + 94);
  });

  it("★기대 대미지·격파확률은 위치 스코어에 들어가지 않는다 — 이동코스트만 다른 두 칸", () => {
    const near = attackPositionScore({ chainCount: 0, blow: 0, outOfTargetRange: false, terrain: 5, move: 2 });
    const far = attackPositionScore({ chainCount: 0, blow: 0, outOfTargetRange: false, terrain: 5, move: 9 });
    expect(near).toBeGreaterThan(far);
  });
});

describe("지형 스코어 (AI_ENGINE §5-A-6)", () => {
  const mapWith = (cell: Record<string, number>): BattleMap => ({
    ...flatMap(),
    terrain: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ avoid: 0, def: 0, ...cell }))),
  });

  it("방어 x1 · 회피 /5 · 회복 /10 · +5, 0..15 클램프", () => {
    const map = mapWith({ def: 3, avoid: 20, heal: 10 });
    expect(terrainScoreAt(map, unit({ id: "a", force: 1, x: 1, y: 1 }), 1, 1)).toBe(13);
  });

  it("상한 15로 포화", () => {
    const map = mapWith({ def: 20, avoid: 0 });
    expect(terrainScoreAt(map, unit({ id: "a", force: 1, x: 1, y: 1 }), 1, 1)).toBe(15);
  });

  it("★비행 병종은 항상 0", () => {
    const map = mapWith({ def: 3, avoid: 20, heal: 10 });
    expect(terrainScoreAt(map, unit({ id: "a", force: 1, x: 1, y: 1, moveType: "fly" }), 1, 1)).toBe(0);
  });
});

describe("밀치기 스코어 (AI_ENGINE §5-A-5)", () => {
  const map = flatMap();
  const target = unit({ id: "t", force: 0, x: 5, y: 5 });

  it("정상 밀림 = Blew(2)", () => {
    expect(blowScoreAt(map, [], target, 4, 5, 5, 5)).toBe(2);
  });

  it("맵 밖으로 처박으면 Wall(1)", () => {
    const t = unit({ id: "t", force: 0, x: 9, y: 5 });
    expect(blowScoreAt(map, [], t, 8, 5, 9, 5)).toBe(1);
  });

  it("★崩れた床으로 밀면 Hole(3) — Tid 문자열 하드코딩", () => {
    const holed: BattleMap = {
      ...map,
      terrain: Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, (_, x) => ({ avoid: 0, def: 0, ...(x === 6 && y === 5 ? { tid: "TID_崩れた床" } : {}) })),
      ),
    };
    expect(blowScoreAt(holed, [], target, 4, 5, 5, 5)).toBe(3);
  });
});

describe("후보 칸 열거 순서 (AI_ENGINE §5-A-2)", () => {
  it("z 내림차순 · 각 z 안에서 x 오름차순 · 맨해튼 거리 게이트", () => {
    expect(enumerateRing(5, 5, 1, 2, 10, 10)).toEqual([
      { x: 5, y: 7, d: 2 },
      { x: 4, y: 6, d: 2 }, { x: 5, y: 6, d: 1 }, { x: 6, y: 6, d: 2 },
      { x: 3, y: 5, d: 2 }, { x: 4, y: 5, d: 1 }, { x: 6, y: 5, d: 1 }, { x: 7, y: 5, d: 2 },
      { x: 4, y: 4, d: 2 }, { x: 5, y: 4, d: 1 }, { x: 6, y: 4, d: 2 },
      { x: 5, y: 3, d: 2 },
    ]);
  });

  it("플레이 영역으로 사각 클램프", () => {
    expect(enumerateRing(0, 0, 1, 1, 10, 10)).toEqual([
      { x: 1, y: 0, d: 1 },
      { x: 0, y: 1, d: 1 },
    ].sort((a, b) => b.y - a.y || a.x - b.x));
  });
});

describe("개시 조건 거리 인자 = 이동력 백분율 (AI_ENGINE §8-1)", () => {
  it("factor%가 이동력에 곱해진다 — 칸 수가 아니다", () => {
    expect(movePowerOf(10, 75)).toBe(7); // 10*75/100 정수 절사
    expect(movePowerOf(10, 100)).toBe(10);
    expect(movePowerOf(14, 7)).toBe(0); // ☠e005의 "7"은 7칸이 아니라 7% = 0칸
  });

  it("V_Default(-1)·V_Max(-2)는 factor 음수 → 맵 전역 100", () => {
    expect(movePowerOf(10, -1)).toBe(100);
    expect(movePowerOf(10, -2)).toBe(100);
  });

  it("이동력은 0..99로 클램프한 뒤 곱한다", () => {
    expect(movePowerOf(200, 50)).toBe(49); // clamp(200,0,99)=99 → 49
  });
});

describe("행동 순서 — AI_Priority (AI_ENGINE §7-3)", () => {
  it("가중 합성키 = 512*P + 256*enchant + 16 - clamp(removable,0,99)", () => {
    expect(aiPriorityKey(110, false, 0)).toBe(512 * 110 + 16);
    expect(aiPriorityKey(110, true, 0)).toBe(512 * 110 + 256 + 16);
    expect(aiPriorityKey(110, false, 30)).toBe(512 * 110 + 16 - 30);
    expect(aiPriorityKey(110, false, 200)).toBe(512 * 110 + 16 - 99); // clamp
  });

  it("★하위 항이 상위 티어를 절대 역전하지 못한다 (256 > 99+16)", () => {
    expect(aiPriorityKey(120, false, 99)).toBeGreaterThan(aiPriorityKey(119, true, 0));
  });

  it("☠AI_Priority < 100인 유닛은 Priority 페이즈에 아예 등록되지 않는다", () => {
    const units = [
      unit({ id: "lo", force: 1, x: 0, y: 0, ai: { priority: 90 } }),
      unit({ id: "hi", force: 1, x: 1, y: 0, ai: { priority: 110 } }),
      unit({ id: "none", force: 1, x: 2, y: 0 }),
    ];
    expect(aiPriorityQueue(units, 1).map((u) => u.id)).toEqual(["hi"]);
  });

  it("동점은 난수가 아니라 열거 순서로 갈린다 (안정 정렬)", () => {
    const units = [
      unit({ id: "a", force: 1, x: 0, y: 0, ai: { priority: 110 } }),
      unit({ id: "b", force: 1, x: 1, y: 0, ai: { priority: 110 } }),
      unit({ id: "c", force: 1, x: 2, y: 0, ai: { priority: 130 } }),
    ];
    expect(aiPriorityQueue(units, 1).map((u) => u.id)).toEqual(["c", "a", "b"]);
  });
});

describe("회복 판단 임계 (AI_ENGINE §9-1)", () => {
  it("★플레이어 진영(force 0)은 dispos 값을 무시하고 항상 75/30", () => {
    const u = unit({ id: "p", force: 0, x: 0, y: 0, hp: 20, ai: { healRateA: 10, healRateB: 5 } });
    expect(aiHealCondition(u)).toEqual({ askHealA: true, askHealB: false }); // 66% < 75, >= 30
  });

  it("적·동맹NPC는 dispos AI_HealRateA/B를 쓴다", () => {
    const u = unit({ id: "e", force: 1, x: 0, y: 0, hp: 20, ai: { healRateA: 50, healRateB: 40 } });
    expect(aiHealCondition(u)).toEqual({ askHealA: false, askHealB: false }); // 66% >= 50
    const hurt = unit({ id: "e2", force: 1, x: 0, y: 0, hp: 10, ai: { healRateA: 50, healRateB: 40 } });
    expect(aiHealCondition(hurt)).toEqual({ askHealA: true, askHealB: true }); // 33% < 50, < 40
  });

  it("HP 비율은 정수 나눗셈(내림)이다", () => {
    const u = unit({ id: "e", force: 1, x: 0, y: 0, hp: 22, ai: { healRateA: 74, healRateB: 0 } });
    expect(aiHealCondition(u).askHealA).toBe(true); // 22*100/30 = 73 (내림) < 74
  });
});

describe("AI_MoveLimit 파싱 (AI_ENGINE §9-2)", () => {
  it("(x1,z1),(x2,z2) → Rect{X,Z,W,H} 반개구간", () => {
    expect(parseMoveLimit("(3,4),(7,9)")).toEqual({ x: 3, y: 4, w: 5, h: 6 });
  });

  it("허용 = X <= x < X+W && Z <= z < Z+H — 원문 두 좌표를 양끝 포함", () => {
    const r = parseMoveLimit("(3,4),(7,9)")!;
    expect(r.x + r.w - 1).toBe(7);
    expect(r.y + r.h - 1).toBe(9);
  });

  it("빈 값·형식 불일치는 제약 없음(undefined)", () => {
    expect(parseMoveLimit(undefined)).toBeUndefined();
    expect(parseMoveLimit("")).toBeUndefined();
  });
});

describe("표적 필터 — IsAttackPermissionOnlyCommand (H_handlers §1-5)", () => {
  const t = (over: Partial<UnitState>) => unit({ id: "t", force: 0, x: 0, y: 0, ...over });

  it("★AT_Default(0)는 필터가 전혀 없다", () => {
    expect(targetFilter(ACT.attackDefault, [], t({ pid: "PID_誰か" }))).toBe(true);
  });

  it("AT_Person(4) = 인물 일치 · AT_ExcludePerson(5) = 불일치", () => {
    const target = t({ pid: "PID_リュール" });
    expect(targetFilter(ACT.attackPerson, ["PID_リュール"], target)).toBe(true);
    expect(targetFilter(ACT.attackPerson, ["PID_他"], target)).toBe(false);
    expect(targetFilter(ACT.attackExcludePerson, ["PID_リュール"], target)).toBe(false);
    expect(targetFilter(ACT.attackExcludePerson, ["PID_他"], target)).toBe(true);
  });

  it("AT_ExcludePerson2(14) = 두 인물 모두 배제", () => {
    const target = t({ pid: "PID_エル" });
    expect(targetFilter(ACT.attackExcludePerson2, ["PID_リュール", "PID_エル"], target)).toBe(false);
    expect(targetFilter(ACT.attackExcludePerson2, ["PID_リュール", "PID_他"], target)).toBe(true);
  });

  it("AT_ExcludeBand(6) = AI_BandNo 불일치 · AT_Force(9) = 진영 일치", () => {
    expect(targetFilter(ACT.attackExcludeBand, ["3"], t({ ai: { bandNo: 3 } }))).toBe(false);
    expect(targetFilter(ACT.attackExcludeBand, ["3"], t({ ai: { bandNo: 4 } }))).toBe(true);
    expect(targetFilter(ACT.attackForce, ["FORCE_PLAYER"], t({ force: 0 }))).toBe(true);
    expect(targetFilter(ACT.attackForce, ["FORCE_ENEMY"], t({ force: 0 }))).toBe(false);
  });

  it("☠판정에 필요한 사영이 없는 옵코드는 undefined = 정직 결손 (AT_Job — Job 미사영)", () => {
    expect(targetFilter(ACT.attackJob, ["JID_ソードマスター"], t({}))).toBeUndefined();
  });
});

describe("표적 열거 순서 — MapFor.EachEnemyUnit (H_handlers §1-4)", () => {
  it("★진영 0 → 1 → 2 순, 진영 안에서는 배치 순 · 동맹 진영은 통째로 제외", () => {
    const state = {
      turn: 1,
      phase: 1,
      map: flatMap(),
      units: [
        unit({ id: "ally", force: 2, x: 0, y: 0 }),
        unit({ id: "p1", force: 0, x: 1, y: 0 }),
        unit({ id: "e1", force: 1, x: 2, y: 0 }),
        unit({ id: "p0", force: 0, x: 3, y: 0 }),
      ],
      events: [],
    } as unknown as Parameters<typeof eachEnemyUnit>[0];
    // 적(force 1) 입장에서 비동맹 = 자군(0) + 우군(2). 기본 alliance [0,1,0]이라 0과 2는 같은 진영.
    const foes = eachEnemyUnit(state, unit({ id: "me", force: 1, x: 9, y: 9 }));
    expect(foes.map((u) => u.id)).toEqual(["p1", "p0", "ally"]);
  });

  it("자군 입장에서는 적(1)만 나온다 — 우군은 동맹이라 제외", () => {
    const state = {
      turn: 1,
      phase: 0,
      map: flatMap(),
      units: [
        unit({ id: "e0", force: 1, x: 0, y: 0 }),
        unit({ id: "ally", force: 2, x: 1, y: 0 }),
      ],
      events: [],
    } as unknown as Parameters<typeof eachEnemyUnit>[0];
    expect(eachEnemyUnit(state, unit({ id: "me", force: 0, x: 9, y: 9 })).map((u) => u.id)).toEqual(["e0"]);
  });
});

describe("MV_Idle · Guard 게이트 (H_handlers §3·§4)", () => {
  it("★MV_Idle은 제자리 대기를 행동으로 확정하지 않는다 — 항상 None", () => {
    expect(moveIdle()).toEqual({ kind: "none" });
  });

  it("체인가드 자격이 없으면 GuardTo는 None — 루틴의 다음 후보로 넘어간다", () => {
    const plain = unit({ id: "g", force: 1, x: 0, y: 0 });
    expect(guardTo({ unit: plain } as unknown as HandlerContext)).toEqual({ kind: "none" });
  });

  it("☠자격이 있으면 가드 위치 규칙이 미판독이라 정직 결손", () => {
    const guard = unit({ id: "g", force: 1, x: 0, y: 0, style: "気功スタイル" });
    const r = guardTo({ unit: guard } as unknown as HandlerContext);
    expect(r.kind).toBe("deficit");
  });
});

describe("AC_BandRange 계열 — 밴드 커버 인원 임계 (C_cause §AC_BandRange)", () => {
  const map = flatMap(14, 14);
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const band = (id: string, x: number, y: number, bandNo: number) =>
    unit({ id, force: 1, x, y, movePoints: 2, weapon: sword, weapons: [sword], ai: { bandNo } });
  const foe = (id: string, x: number, y: number) =>
    unit({ id, force: 0, x, y, weapon: sword, weapons: [sword] });
  const ask = (op: number, v1: number | undefined, units: UnitState[], turn = 1) =>
    evaluateCause(op, 100, v1, {
      state: { turn, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!,
      args: [],
    });

  // 나 = (5,5), 이동 2 + 사거리 1. 적(5,8)은 (5,7)에서 때릴 수 있어 **내 사정권 안**이다.
  // 커버 밴드원: coverer(8,8)은 (6,8) 경유로 그 적을 덮고, idler(0,0)은 못 덮는다.
  const me = () => band("me", 5, 5, 7);
  const coverer = () => band("coverer", 8, 8, 7);
  const idler = () => band("idler", 0, 0, 7);
  const target = () => foe("f", 5, 8);

  it("★v1은 반경이 아니라 '그 적을 덮어야 하는 밴드원 수 + 1'이다", () => {
    const us = [me(), coverer(), idler(), target()];
    expect(ask(AC.bandRange, 2, us)).toBe(true); // 임계 1 <= 커버 1
    expect(ask(AC.bandRange, 3, us)).toBe(false); // 임계 2 > 커버 1
  });

  it("★임계는 실제 밴드원 수로 클램프된다 — 밴드원이 없으면 사정권 판정만 남는다", () => {
    const solo = unit({ id: "me", force: 1, x: 5, y: 5, movePoints: 2, weapon: sword, weapons: [sword] });
    expect(ask(AC.bandRange, 3, [solo, target()])).toBe(true); // min(2, 0) = 0
  });

  it("☠다른 밴드 번호는 커버 카운터에 가담하지 않는다", () => {
    // third(5,11)도 (5,9) 경유로 그 적을 덮는다 — 같은 밴드일 때만 카운터가 2가 된다.
    const base = () => [me(), coverer(), idler(), target()];
    expect(ask(AC.bandRange, 3, [...base(), band("third", 5, 11, 7)])).toBe(true);
    expect(ask(AC.bandRange, 3, [...base(), band("third", 5, 11, 9)])).toBe(false);
  });

  it("EvenTurn(4)·OddTurn(5)는 턴 패리티 게이트가 가장 먼저다", () => {
    const us = [me(), foe("f", 5, 6)];
    expect(ask(AC.bandRangeEvenTurn, 2, us, 1)).toBe(false);
    expect(ask(AC.bandRangeEvenTurn, 2, us, 2)).toBe(true);
    expect(ask(AC.bandRangeOddTurn, 2, us, 1)).toBe(true);
    expect(ask(AC.bandRangeOddTurn, 2, us, 2)).toBe(false);
  });

  it("★ExcludeSelf(16)만 '내 사정권 안' 조건을 뗀다 — 밴드원이 덮으면 기동", () => {
    // 적(5,11)은 내 사정권 밖이지만 밴드원(5,9)이 덮는다.
    const us = [me(), band("mate", 5, 9, 7), foe("f", 5, 11)];
    expect(ask(AC.bandRangeExcludeSelf, -1, us)).toBe(true);
    expect(ask(AC.bandRange, 2, us)).toBe(false); // 통상 계열은 내 사정권도 요구한다
  });
});

describe("AC_AttackRange의 v1 = 기준 좌표 override (C_cause §AC_AttackRange)", () => {
  const map = flatMap(12, 12);
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const me = () => unit({ id: "me", force: 1, x: 0, y: 0, movePoints: 1, weapon: sword, weapons: [sword] });
  const st = (units: UnitState[]) => ({ turn: 1, phase: 1, map, units, events: [] }) as unknown as GameState;

  it("v1이 없으면 자기 좌표 기준 — 먼 적은 사정권 밖", () => {
    const us = [me(), unit({ id: "f", force: 0, x: 8, y: 8, weapon: sword, weapons: [sword] })];
    expect(evaluateCause(AC.attackRange, 100, undefined, { state: st(us), unit: us[0]!, args: [] })).toBe(false);
  });

  it("★v1이 pos(x,z)면 **그 좌표** 기준으로 사정권을 잡는다", () => {
    const us = [me(), unit({ id: "f", force: 0, x: 8, y: 8, weapon: sword, weapons: [sword] })];
    expect(
      evaluateCause(AC.attackRange, 100, undefined, { state: st(us), unit: us[0]!, args: ["100", "pos(8,7)"] }),
    ).toBe(true);
  });
});

describe("MI_Torch — 맵 조사 지점 기반 (ActionMindTorch 0x194CAF0)", () => {
  it("★None을 반환한다 — 근거: Torch 조사 지점(MapInspector.Kind.Torch=7) 미모델링", () => {
    // ☠근거 없는 대기 강하가 아니다. 코드상 None 경로가 세 개이고,
    // 그중 (3) '후보 칸 없음'이 FESim에서 항상 성립한다(파이프라인 interaction 종별에 torch 0건).
    expect(mindTorch()).toEqual({ kind: "none" });
  });

  it("★때릴 적이 있으면 횃불을 켜지 않는다 — 슬롯 순서(Mind→Attack)상 공격이 살아난다", () => {
    // IsAttackableEnemy(0x194CD10) 게이트의 귀결: MI_Torch가 Decide를 반환하지 않으므로
    // AI_MI_TorchAlways(Active=-1)를 단 유닛도 Attack 슬롯까지 내려간다.
    expect(mindTorch().kind).not.toBe("decide");
  });
});

describe("MV_Position — pos(x,z)로 이동 (ActionMovePosition 0x194F5A0)", () => {
  const map = flatMap(12, 12);
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const mover = (moveVal?: string) =>
    unit({
      id: "me", force: 1, x: 1, y: 1, movePoints: 3, weapon: sword, weapons: [sword],
      ai: { move: "AI_MV_Position", ...(moveVal !== undefined ? { moveVal } : {}) },
    });
  const ctx = (u: UnitState, args: string[]): HandlerContext =>
    ({
      state: { turn: 1, phase: 1, map, units: [u], events: [] } as unknown as GameState,
      unit: u, args, rng: { next: () => 1 }, think: 8, allowIdle: false, targeted: {},
    }) as unknown as HandlerContext;

  it("목표 좌표 쪽으로 이동하고 그 턴을 마친다", () => {
    const u = mover("pos(9,1)");
    const r = movePosition(ctx(u, ["pos(9,1)"]));
    expect(r.kind).toBe("decide");
    const acts = r.kind === "decide" ? r.actions : [];
    const move = acts.find((a) => a.type === "move");
    expect(move).toBeDefined();
    // 한 턴에 다 못 가므로 목표 쪽으로 가까워지기만 한다(MoveTo의 distB 최대화).
    if (move !== undefined && move.type === "move") expect(move.x).toBeGreaterThan(u.x);
    expect(acts.at(-1)?.type).toBe("wait");
  });

  it("좌표 인자가 없으면 정직 결손 — 조용히 대기시키지 않는다", () => {
    expect(movePosition(ctx(mover(), [])).kind).toBe("deficit");
  });
});

describe("RD_Heal — 회복 지팡이 (RodHealTo 0x1946A00)", () => {
  it("★CalcHealRodScore = damage + (max(heal,0)<<8) + (제자리<<16)", () => {
    // ☠AI_ENGINE §5-5과 에이전트 초판은 각 항을 8비트 높게 적었다.
    // 실제 꼬리 = `add w8, w19, w0, lsl #8`(w19 = damage 인자, 시프트 없음).
    expect(calcHealRodScore(10, 7, false, false)).toBe(7 + (10 << 8));
    expect(calcHealRodScore(10, 7, true, false)).toBe(7 + (10 << 8) + (1 << 16));
  });

  it("★제자리 보너스는 플레이어 진영에서 식에서 아예 빠진다", () => {
    expect(calcHealRodScore(10, 7, true, true)).toBe(calcHealRodScore(10, 7, false, true));
  });

  it("우선순위 = 제자리 ≫ 회복량 ≫ 부족 HP", () => {
    expect(calcHealRodScore(1, 0, true, false)).toBeGreaterThan(calcHealRodScore(99, 99, false, false));
    expect(calcHealRodScore(5, 0, false, false)).toBeGreaterThan(calcHealRodScore(4, 99, false, false));
  });
});

describe("dispos 인자 파싱 — 괄호 안 쉼표 (AIValue$$SetValue 0x27B2E80)", () => {
  it("★pos(x,z)는 한 토큰이다 — 괄호 안 쉼표는 구분자가 아니다", () => {
    expect(argsOf("pos(6,9)")).toEqual(["pos(6,9)"]);
    expect(argsOf("FLAG_A, pos(4,11), 100")).toEqual(["FLAG_A", "pos(4,11)", "100"]);
  });

  it("괄호 밖 쉼표는 정상 분리 · 빈 값은 빈 배열", () => {
    expect(argsOf("2, 100")).toEqual(["2", "100"]);
    expect(argsOf(undefined)).toEqual([]);
  });

  it("parsePos가 그 토큰을 좌표로 읽는다", () => {
    expect(parsePos(argsOf("pos(6,9)")[0])).toEqual({ x: 6, y: 9 });
  });
});

describe("RD_Heal 동작 — 다친 아군을 회복한다", () => {
  const map = flatMap(12, 12);
  const heal = { power: 10, rangeMin: 1, rangeMax: 1, uses: 5, rodType: 2, rodExp: 0 };
  const healer = () =>
    unit({ id: "healer", force: 1, x: 5, y: 5, movePoints: 3, staves: [heal], ai: { healRateA: 75, healRateB: 50 } });
  const hurt = (id: string, x: number, y: number, hp: number) =>
    unit({ id, force: 1, x, y, hp, ai: { healRateA: 75, healRateB: 50 } });
  const ctx = (units: UnitState[]): HandlerContext =>
    ({
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!, args: [], rng: { next: () => 1 }, think: 8, allowIdle: false, targeted: {},
    }) as unknown as HandlerContext;

  it("★다친 아군에게 이동 후 지팡이를 쓴다", () => {
    const us = [healer(), hurt("ally", 5, 8, 5)];
    const r = rodHealTo(ctx(us));
    expect(r.kind).toBe("decide");
    const acts = r.kind === "decide" ? r.actions : [];
    const staff = acts.find((a) => a.type === "staff");
    expect(staff).toMatchObject({ type: "staff", unit: "healer", target: "ally", staff: 0 });
  });

  it("만피 아군만 있으면 None — 회복할 대상이 없다", () => {
    expect(rodHealTo(ctx([healer(), hurt("ally", 5, 6, 30)])).kind).toBe("none");
  });

  it("☠AskHealA/B 임계를 넘지 않은 아군은 대상이 아니다 (IsHealRodPermission 5단)", () => {
    // healRateA 75 → 24/30 = 80% 는 임계 밖.
    expect(rodHealTo(ctx([healer(), hurt("ally", 5, 6, 24)])).kind).toBe("none");
    expect(rodHealTo(ctx([healer(), hurt("ally", 5, 6, 22)])).kind).toBe("decide"); // 73% < 75
  });

  it("회복 지팡이가 없으면 None (HasHealRod 게이트)", () => {
    const noRod = unit({ id: "healer", force: 1, x: 5, y: 5, movePoints: 3 });
    expect(rodHealTo(ctx([noRod, hurt("ally", 5, 6, 5)])).kind).toBe("none");
  });

  it("★제자리에서 닿는 대상을 우선한다 (제자리 항이 최상위)", () => {
    // near(5,6)은 안 움직이고 닿고, far(5,9)는 이동이 필요하다. 둘 다 같은 부족분.
    const us = [healer(), hurt("near", 5, 6, 5), hurt("far", 5, 9, 5)];
    const r = rodHealTo(ctx(us));
    const acts = r.kind === "decide" ? r.actions : [];
    expect(acts.some((a) => a.type === "move")).toBe(false);
    expect(acts.find((a) => a.type === "staff")).toMatchObject({ target: "near" });
  });
});

describe("MV_Escape · MI_Treasure — 조사 지점 이동 축 (I_handlers2 §5·§6)", () => {
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const board = (interactions: BattleMap["interactions"]): BattleMap => ({ ...flatMap(14, 14), interactions });
  const runner = (id: string, x: number, y: number) =>
    unit({ id, force: 1, x, y, movePoints: 3, weapon: sword, weapons: [sword] });
  const ctx = (map: BattleMap, units: UnitState[], args: string[] = []): HandlerContext =>
    ({
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!, args, rng: { next: () => 1 }, think: 8, allowIdle: false, targeted: {},
    }) as unknown as HandlerContext;

  it("★MV_Escape — 이탈 지점 쪽으로 이동한다", () => {
    // 14x14 → 플레이 영역 [1,12]. 내부(6,6)에서 출발하면 테두리로 향한다.
    const map = board(undefined);
    const me = runner("me", 6, 6);
    const r = moveEscape(ctx(map, [me]));
    expect(r.kind).toBe("decide");
    const acts = r.kind === "decide" ? r.actions : [];
    expect(acts.some((a) => a.type === "move")).toBe(true);
  });

  it("★조사 지점이 없어도 **플레이 영역 테두리**가 이탈 지점이라 결손이 아니다", () => {
    // ☠종전에는 "이탈점 미사영" 결손이었다 — PlayArea가 맵에서 바깥 1칸을 뺀 사각형임이
    //   판독으로 확정되면서(MapImage$$SetSize 0x1DE2BA0) 테두리 갈래를 배선할 수 있게 됐다.
    expect(moveEscape(ctx(board(undefined), [runner("me", 6, 6)])).kind).toBe("decide");
  });

  it("★대상 인물이 걸린 이탈점은 **다른 유닛이 그 칸을 쓰지 못한다** (S015 반지 소지 적)", () => {
    const map = board([{ kind: "escape", x: 6, y: 6, pid: "PID_반지" }]);
    // 제자리(6,6)가 반지 전용 이탈점이면 다른 유닛에겐 후보가 아니다 → 테두리로 나간다.
    const other = unit({ id: "me", force: 1, x: 6, y: 6, movePoints: 3, pid: "PID_다른놈" });
    const r = moveEscape(ctx(map, [other]));
    expect(r.kind).toBe("decide");
    expect((r.kind === "decide" ? r.actions : []).some((a) => a.type === "move")).toBe(true);
    // 반지 소지 적은 제자리가 곧 이탈점이라 움직일 필요가 없다.
    const ringer = unit({ id: "me", force: 1, x: 6, y: 6, movePoints: 3, pid: "PID_반지" });
    expect(moveEscape(ctx(map, [ringer])).kind).toBe("none");
  });

  it("★MI_Treasure — 상자 쪽으로 이동하되 개방은 결손으로 남는다", () => {
    const map = board([{ kind: "chest", x: 8, y: 1, iid: "IID_은의검" }]);
    const r = mindTreasure(ctx(map, [runner("me", 1, 1)]));
    expect(r.kind).toBe("decide");
    const acts = r.kind === "decide" ? r.actions : [];
    expect(acts.some((a) => a.type === "move")).toBe(true);
  });

  it("상자가 없으면 결손", () => {
    expect(mindTreasure(ctx(board([{ kind: "escape", x: 8, y: 1 }]), [runner("me", 1, 1)])).kind).toBe("deficit");
  });
});

describe("서브 AI 치환 — AI_ChangeSeq/ChangeValue/Retry (AI_ENGINE §4-4)", () => {
  // 실루틴 `AI_MV_TreasureToEscape`와 같은 형태: 활성(1) 상태에서 조건이 Trans=2를 스테이징하고,
  // 같은 패스에서 ChangeSeq가 **다른 슬롯**을 갈아끼운 뒤 Retry가 사고를 재시작한다.
  const routines = {
    SWAP: [
      { Active: 1, Code: 1, Mind: 0, StrValue0: "V_Default", StrValue1: "V_Default", Trans: 2 },
      { Active: 1, Code: 6, Mind: 1, StrValue0: "AI_SWAPPED", StrValue1: "V_Default", Trans: -128 },
      { Active: 1, Code: 7, Mind: 1, StrValue0: "0", StrValue1: "V_Default", Trans: -128 },
      { Active: 1, Code: 4, Mind: 0, StrValue0: "V_Default", StrValue1: "V_Default", Trans: -128 },
      { Active: 0, Code: 0, Mind: 0, StrValue0: "V_Default", StrValue1: "V_Default", Trans: -128 },
    ],
    AI_SWAPPED: [
      { Active: 2, Code: 3, Mind: 81, StrValue0: "V_Default", StrValue1: "V_Default", Trans: -128 },
      { Active: 0, Code: 0, Mind: 0, StrValue0: "V_Default", StrValue1: "V_Default", Trans: -128 },
    ],
    NOOP: [{ Active: 0, Code: 0, Mind: 0, StrValue0: "V_Default", StrValue1: "V_Default", Trans: -128 }],
  };
  const ai = (over: Record<string, unknown> = {}) =>
    ({ action: "NOOP", mind: "NOOP", attack: "NOOP", move: "SWAP", routines, ...over }) as never;

  it("★ChangeSeq는 **다른 슬롯**의 루틴을 갈아끼우고 Retry가 Cause부터 재시작한다", () => {
    const runtime: ThinkRuntime = { active: 1 };
    const seen: number[] = [];
    const out = processing({
      ai: ai(),
      runtime,
      think: 8,
      handlers: {
        cause: () => true,
        action: (opcode) => {
          seen.push(opcode);
          return { kind: "none" };
        },
      },
    });
    expect(out.deficits).toEqual([]);
    expect(runtime.active).toBe(2); // 조건 성공의 Trans=2가 Update에서 반영됐다
    expect(runtime.sequences).toEqual({ 1: "AI_SWAPPED" }); // Mind 슬롯이 갈렸다
    expect(seen).toContain(81); // 재시작 후 갈아끼운 루틴이 실제로 돌았다
  });

  it("☠갈아끼운 루틴 본문이 스냅숏에 없으면 정직 결손이 된다", () => {
    const { AI_SWAPPED: _drop, ...rest } = routines;
    const out = processing({
      ai: ai({ routines: rest }),
      runtime: { active: 1 },
      think: 8,
      handlers: { cause: () => true, action: () => ({ kind: "none" }) },
    });
    expect(out.deficits.some((d) => d.includes("루틴 미탑재"))).toBe(true);
  });
});

describe("AC_InterferenceRange(14/15) — 방해 지팡이 사정권 (IsEnemyInsideInterferenceArea 0x19457C0)", () => {
  const map = flatMap(14, 14);
  const rod = { power: 0, rangeMin: 1, rangeMax: 3, uses: 5, rodType: 3, rodExp: 0 };
  const caster = (over: Partial<UnitState> = {}) =>
    unit({ id: "me", force: 1, x: 2, y: 2, movePoints: 2, staves: [rod], ...over });
  const foe = (x: number, y: number, pid?: string) =>
    unit({ id: "f", force: 0, x, y, ...(pid !== undefined ? { pid } : {}) });
  const ask = (op: number, v0: number, units: UnitState[], args: string[] = []) =>
    evaluateCause(op, v0, undefined, {
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!,
      args,
    });

  it("★이동범위 + 방해 지팡이 사거리 안의 적을 잡는다", () => {
    // 이동 2 + 지팡이 사거리 3 → 최대 5칸
    expect(ask(AC.interferenceRange, 100, [caster(), foe(2, 7)])).toBe(true);
    expect(ask(AC.interferenceRange, 100, [caster(), foe(2, 9)])).toBe(false);
  });

  it("☠방해 지팡이가 없으면 사정권이 비어 항상 false", () => {
    expect(ask(AC.interferenceRange, 100, [caster({ staves: [] }), foe(2, 3)])).toBe(false);
  });

  it("회복 지팡이(rodType 2)는 방해 사정권을 만들지 않는다", () => {
    const heal = { ...rod, rodType: 2 };
    expect(ask(AC.interferenceRange, 100, [caster({ staves: [heal] }), foe(2, 3)])).toBe(false);
  });

  it("ExcludePerson(15)은 지정 인물을 제외한다", () => {
    expect(ask(AC.interferenceRangeExcludePerson, 100, [caster(), foe(2, 4, "PID_제외")], ["100", "PID_제외"]))
      .toBe(false);
    expect(ask(AC.interferenceRangeExcludePerson, 100, [caster(), foe(2, 4, "PID_다른")], ["100", "PID_제외"]))
      .toBe(true);
  });
});

describe("AT_Hero(3) — 주인공 지정 (PersonData.IsHero 0x1F2A0B0)", () => {
  const t = (over: Partial<UnitState>) => unit({ id: "t", force: 0, x: 0, y: 0, ...over });
  const hero = [{ Sid: "SID_主人公" }];

  it("★'보스'가 아니라 **주인공 스킬(SID_主人公) 보유**가 판별식이다", () => {
    expect(targetFilter(ACT.attackHero, [], t({ skills: hero }))).toBe(true);
    expect(targetFilter(ACT.attackHero, [], t({ skills: [{ Sid: "SID_必殺０" }] }))).toBe(false);
    expect(targetFilter(ACT.attackHero, [], t({}))).toBe(false);
  });

  it("☠보스 플래그와 무관하다 — boss여도 주인공 스킬이 없으면 대상 아님", () => {
    expect(targetFilter(ACT.attackHero, [], t({ boss: true }))).toBe(false);
  });
});

describe("이탈 지점 판정 (IsEscapePosition 0x195FDF0)", () => {
  const mapOf = (w: number, h: number, interactions?: BattleMap["interactions"]): BattleMap => ({
    width: w,
    height: h,
    costs: { foot: Array.from({ length: h }, () => Array.from({ length: w }, () => 1)) },
    ...(interactions !== undefined ? { interactions } : {}),
  });

  it("★플레이 영역 = 맵에서 바깥 1칸 테두리를 뺀 사각형 — 그 테두리가 이탈 지점이다", () => {
    const map = mapOf(12, 16); // 플레이 영역 = [1,10] x [1,14]
    expect(isEscapePosition(map, 1, 5, "foot")).toBe(true); // 왼쪽 테두리
    expect(isEscapePosition(map, 10, 5, "foot")).toBe(true); // 오른쪽 테두리
    expect(isEscapePosition(map, 5, 1, "foot")).toBe(true);
    expect(isEscapePosition(map, 5, 14, "foot")).toBe(true);
    expect(isEscapePosition(map, 5, 5, "foot")).toBe(false); // 내부
  });

  it("☠바깥 한 칸이 통행 불가면 이탈 지점이 아니다", () => {
    const map = mapOf(12, 16);
    map.costs.foot![5]![0] = 255; // (0,5) 진입 불가
    expect(isEscapePosition(map, 1, 5, "foot")).toBe(false);
  });

  it("조사 지점(escape)은 위치와 무관하게 이탈 지점이다", () => {
    const map = mapOf(12, 16, [{ kind: "escape", x: 5, y: 5 }]);
    expect(isEscapePosition(map, 5, 5, "foot")).toBe(true);
  });
});

describe("AT_Job(7) — 직업 지정 표적 (IsAttackPermissionOnlyCommand)", () => {
  const t = (over: Partial<UnitState>) => unit({ id: "t", force: 0, x: 0, y: 0, ...over });

  it("★대상의 jid가 인자와 일치해야 한다", () => {
    expect(targetFilter(ACT.attackJob, ["JID_ソードマスター"], t({ jid: "JID_ソードマスター" }))).toBe(true);
    expect(targetFilter(ACT.attackJob, ["JID_ソードマスター"], t({ jid: "JID_パラディン" }))).toBe(false);
  });

  it("☠jid가 사영되지 않은 유닛은 정직 결손 — 거짓으로 눌러 감추지 않는다", () => {
    expect(targetFilter(ACT.attackJob, ["JID_ソードマスター"], t({}))).toBeUndefined();
  });
});

describe("MV_Person(90) — 지정 인물 추적 (ActionMovePerson 0x194F2E0)", () => {
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const map = flatMap(14, 14);
  const chaser = () => unit({ id: "me", force: 1, x: 2, y: 2, movePoints: 3, weapon: sword, weapons: [sword] });
  const ctx = (units: UnitState[], args: string[]): HandlerContext =>
    ({
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!, args, rng: { next: () => 1 }, think: 8, allowIdle: false, targeted: {},
    }) as unknown as HandlerContext;

  it("★지정 PID 쪽으로 이동한다 — 진영을 가리지 않는다(EachUnit)", () => {
    const target = unit({ id: "t", force: 0, x: 10, y: 2, pid: "PID_모브" });
    const r = movePerson(ctx([chaser(), target], ["PID_모브"]));
    expect(r.kind).toBe("decide");
    const move = (r.kind === "decide" ? r.actions : []).find((a) => a.type === "move");
    if (move !== undefined && move.type === "move") expect(move.x).toBeGreaterThan(2);
  });

  it("대상이 없으면 아무것도 하지 않는다(None)", () => {
    expect(movePerson(ctx([chaser(), unit({ id: "t", force: 0, x: 10, y: 2, pid: "PID_다른" })], ["PID_모브"])).kind)
      .toBe("none");
  });

  it("☠인자가 없으면 정직 결손", () => {
    expect(movePerson(ctx([chaser()], [])).kind).toBe("deficit");
  });
});

describe("AC_HealRange(8) — 회복 지팡이 사정권 (ActiveCauseHealRange 0x1944A30)", () => {
  const map = flatMap(14, 14);
  const rod = { power: 10, rangeMin: 1, rangeMax: 2, uses: 5, rodType: 2, rodExp: 0 };
  const healer = (over: Partial<UnitState> = {}) =>
    unit({ id: "me", force: 1, x: 2, y: 2, movePoints: 2, staves: [rod], ai: { healRateA: 75, healRateB: 50 }, ...over });
  const ally = (x: number, y: number, hp: number) =>
    unit({ id: "a", force: 1, x, y, hp, ai: { healRateA: 75, healRateB: 50 } });
  const ask = (units: UnitState[]) =>
    evaluateCause(AC.healRange, 100, undefined, {
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!,
      args: [],
    });

  it("★이동범위 + 회복 지팡이 사거리 안에 **회복 자격 아군**이 있으면 기동", () => {
    expect(ask([healer(), ally(2, 6, 5)])).toBe(true); // 이동2 + 사거리2 = 4칸
    expect(ask([healer(), ally(2, 9, 5)])).toBe(false);
  });

  it("☠회복 자격이 없는(멀쩡한) 아군은 세지 않는다", () => {
    expect(ask([healer(), ally(2, 4, 30)])).toBe(false);
  });

  it("☠회복 지팡이가 없으면 항상 false (HasHealRod 게이트)", () => {
    expect(ask([healer({ staves: [] }), ally(2, 4, 5)])).toBe(false);
  });

  it("★자기 자신은 대상에서 제외된다", () => {
    expect(ask([healer({ hp: 5 })])).toBe(false);
  });
});

describe("MI/MV_BreakDown(65/100) — 방어 바닥 도달 (M_rod_breakdown §P2)", () => {
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const board = (interactions: BattleMap["interactions"]): BattleMap => ({ ...flatMap(14, 14), interactions });
  const me = () => unit({ id: "me", force: 1, x: 2, y: 2, movePoints: 3, weapon: sword, weapons: [sword] });
  const ctx = (map: BattleMap, units: UnitState[]): HandlerContext =>
    ({
      state: { turn: 1, phase: 1, map, units, events: [] } as unknown as GameState,
      unit: units[0]!, args: [], rng: { next: () => 1 }, think: 8, allowIdle: false, targeted: {},
    }) as unknown as HandlerContext;

  it("★대상은 BreakdownEnemy poke = 파이프라인의 defendArea(방어 바닥)다", () => {
    const map = board([{ kind: "defendArea", x: 4, y: 2 }]);
    const r = mindBreakDown(ctx(map, [me()]));
    expect(r.kind).toBe("decide");
    const acts0 = r.kind === "decide" ? r.actions : [];
    expect(acts0.find((a) => a.type === "move")).toMatchObject({ x: 4, y: 2 });
  });

  it("MI_BreakDown은 **이번 턴에 닿는** 칸만 고른다 — 멀면 None", () => {
    expect(mindBreakDown(ctx(board([{ kind: "defendArea", x: 12, y: 12 }]), [me()])).kind).toBe("none");
  });

  it("★MV_BreakDown은 맵 전역 도달성으로 목표를 잡고 접근한다", () => {
    const r = moveBreakDown(ctx(board([{ kind: "defendArea", x: 12, y: 2 }]), [me()]));
    expect(r.kind).toBe("decide");
    const move = (r.kind === "decide" ? r.actions : []).find((a) => a.type === "move");
    if (move !== undefined && move.type === "move") expect(move.x).toBeGreaterThan(2);
  });

  it("☠방어 바닥이 국면에 없으면 정직 결손", () => {
    expect(mindBreakDown(ctx(board(undefined), [me()])).kind).toBe("deficit");
    expect(moveBreakDown(ctx(board(undefined), [me()])).kind).toBe("deficit");
  });
});
