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
  attackPositionScore,
  battleScore,
  blowScoreAt,
  createCalculator,
  enumerateRing,
  expectationScoreNormalize,
  ACT,
  eachEnemyUnit,
  guardTo,
  killScoreNormalize,
  moveIdle,
  movePowerOf,
  targetFilter,
  type HandlerContext,
  parseMoveLimit,
  terrainScoreAt,
  type BattleMap,
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

  it("☠판정에 필요한 사영이 없는 옵코드는 undefined = 정직 결손 (AT_Hero·AT_Job)", () => {
    expect(targetFilter(ACT.attackHero, [], t({}))).toBeUndefined();
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
