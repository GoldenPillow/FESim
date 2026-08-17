import { describe, expect, it } from "vitest";
import {
  makeCostAt,
  moveBudgetOn,
  terrainBonusAt,
  toCombatant,
  warpDestinations,
  type BattleMap,
  type StructureState,
  type TerrainCell,
  type UnitState,
} from "@fesim/engine";

/**
 * 지형 1층(베이스) 소비 — MP3 3-1이 배선한 판정을 박제한다:
 * (1) 진영 비대칭 보정(CalcDefense/CalcAvoid 0x1E746C0/0x1E74900 — Player/Enemy 항, Ally 무가산),
 * (2) MoveFirst 출발 칸 보정(비행·용 면제, GetMovePowerImpl 경로),
 * (3) NotWarp(Flag bit17) 워프 목적지 제외.
 * 수기 상수가 아니라 terrain.json 실값(瘴気 −20/+20 · 流砂 −3 · 氷床 +2)을 그대로 쓴다.
 */

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 6,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

function flatMap(width: number, height: number, cell: TerrainCell): BattleMap {
  const cost = Array.from({ length: height }, () => Array.from({ length: width }, () => 1));
  return {
    width,
    height,
    costs: { foot: cost, fly: cost },
    terrain: Array.from({ length: height }, () => Array.from({ length: width }, () => ({ ...cell }))),
  };
}

describe("진영 비대칭 지형 보정 (瘴気: PlayerDefense −20 / EnemyDefense +20 / Ally 무가산)", () => {
  const miasma: TerrainCell = { avoid: 0, def: 0, playerDef: -20, enemyDef: 20 };

  it("terrainBonusAt: 자군 −20 · 적군 +20 · 우군 ±0", () => {
    // 왜 위험한가: 대칭 {avoid,def}만 보면 瘴気가 무보정 타일로 보인다 — 자군 방어 −20이
    // 소리 없이 사라져 예보·실결과가 실기보다 후하게 나온다(MOVE_TERRAIN.md FIX-3).
    const map = flatMap(3, 3, miasma);
    expect(terrainBonusAt(map, 1, 1, 0)).toEqual({ avoid: 0, def: -20 });
    expect(terrainBonusAt(map, 1, 1, 1)).toEqual({ avoid: 0, def: 20 });
    expect(terrainBonusAt(map, 1, 1, 2)).toEqual({ avoid: 0, def: 0 });
  });

  it("toCombatant가 비대칭 합산을 소비한다 (베이스 def와 가산 — 대체 아님)", () => {
    const forest: TerrainCell = { avoid: 20, def: 1, playerDef: -20, enemyDef: 20 };
    const map = flatMap(3, 3, forest);
    const me = unit({ id: "a", force: 0, x: 1, y: 1 });
    const foe = unit({ id: "e", force: 1, x: 2, y: 1 });
    expect(toCombatant(me, map).terrain).toEqual({ avoid: 20, def: -19 });
    expect(toCombatant(foe, map).terrain).toEqual({ avoid: 20, def: 21 });
  });
});

describe("MoveFirst 출발 칸 보정 (流砂 −3 · 氷床 +2 · 비행/용 면제)", () => {
  it("流砂(−3) 위 이동력 6 보병 = 3칸 · 비병 = 6칸 그대로", () => {
    const quicksand: TerrainCell = { avoid: 0, def: 0, moveFirst: -3 };
    const map = flatMap(8, 1, quicksand);
    const foot = unit({ id: "a", force: 0, x: 0, y: 0 });
    const fly = unit({ id: "b", force: 0, x: 0, y: 0, moveType: "fly" });
    expect(moveBudgetOn(map, foot)).toBe(3);
    expect(moveBudgetOn(map, fly)).toBe(6);
  });

  it("氷床(+2) 위 보병 = 이동력 +2 · 이동력 0이면 무보정", () => {
    const ice: TerrainCell = { avoid: 0, def: 0, moveFirst: 2 };
    const map = flatMap(10, 1, ice);
    expect(moveBudgetOn(map, unit({ id: "a", force: 0, x: 0, y: 0, movePoints: 4 }))).toBe(6);
    // movePower < 1이면 보정 없음(GetMovePowerImpl 분기) — 이동 소진 상태(0)에 +2가 붙으면 안 된다.
    expect(moveBudgetOn(map, unit({ id: "b", force: 0, x: 0, y: 0, moved: true }))).toBe(0);
  });
});

describe("오버레이 2층 — 전투 가산·이동 코스트 가산 (FIX-2·FIX-7)", () => {
  const plain: TerrainCell = { avoid: 0, def: 0 };

  it("베이스 + 오버레이 각각 비대칭 합산 — 대체가 아니라 가산", () => {
    // 왜 위험한가: 瘴気·炎上은 m_Overlaps라 밑의 베이스 지형 보정에 '덧붙는다'(CalcDefense가
    // Terrain(0x40)·OverlapTerrain(0x48) 두 슬롯을 순회). 오버레이가 베이스를 대체하면 森 위 瘴気에서
    // 森의 avoid 20이 사라진다(MOVE_TERRAIN.md FIX-2·§4-18).
    const forest: TerrainCell = { avoid: 20, def: 1 };
    const map = flatMap(3, 3, forest);
    map.overlays = [{ x: 1, y: 1, cell: { avoid: 0, def: 0, playerDef: -20, enemyDef: 20 } }];
    expect(terrainBonusAt(map, 1, 1, 0)).toEqual({ avoid: 20, def: -19 });
    expect(terrainBonusAt(map, 1, 1, 1)).toEqual({ avoid: 20, def: 21 });
    expect(terrainBonusAt(map, 0, 0, 0)).toEqual({ avoid: 20, def: 1 }); // 오버레이 밖은 베이스만
  });

  it("이동 코스트 가산: 평지(1) + 炎上(MoveCost 2) → 보병 3 · 비병 1(FlyCost 0)", () => {
    const map = flatMap(3, 1, plain);
    map.overlays = [{ x: 1, y: 0, cell: { avoid: 0, def: 0 }, moveCost: 2, flyCost: 0 }];
    expect(makeCostAt(map, undefined, "foot")(1, 0)).toBe(3);
    expect(makeCostAt(map, undefined, "fly")(1, 0)).toBe(1);
    expect(makeCostAt(map, undefined, "foot")(0, 0)).toBe(1);
  });

  it("ブロック(255) 오버레이 = 진입 불가 클램프(보행·비행 공통)", () => {
    const map = flatMap(3, 1, plain);
    map.overlays = [{ x: 1, y: 0, cell: { avoid: 0, def: 0 }, moveCost: 255, flyCost: 255 }];
    expect(makeCostAt(map, undefined, "foot")(1, 0)).toBe(255);
    expect(makeCostAt(map, undefined, "fly")(1, 0)).toBe(255);
  });

  it("오버레이 MoveFirst도 출발 보정에 가산된다 (氷床 오버레이 +2)", () => {
    const map = flatMap(10, 1, plain);
    map.overlays = [{ x: 0, y: 0, cell: { avoid: 0, def: 0, moveFirst: 2 } }];
    expect(moveBudgetOn(map, unit({ id: "a", force: 0, x: 0, y: 0, movePoints: 4 }))).toBe(6);
  });
});

describe("구조물 레이어 — 통행 치환·지붕 렌더 전용 (§2-13)", () => {
  const plain: TerrainCell = { avoid: 0, def: 0 };
  const door: StructureState = {
    x: 1, y: 0, w: 1, h: 1, tid: "TID_扉", group: 1, hp: 50,
    costs: { foot: 255, fly: 255 },
  };
  const roof: StructureState = {
    x: 2, y: 0, w: 1, h: 1, tid: "TID_屋根", group: 1, hp: 0, roof: true,
    costs: { foot: 255, fly: 255 },
  };

  it("살아있는 구조물 = 자기 TID 코스트로 치환(扉 255) · 지붕은 통행에 관여하지 않는다", () => {
    // 왜 위험한가: 屋根도 地形コスト가 255라 코스트를 그대로 쓰면 지붕 아래 실내가 전부 막힌다 —
    // 지붕은 렌더 전용 레이어(문 개방 시 걷힘)이고 통행 특례는 존재하지 않는다(코스트 환원, §2-13).
    const map = flatMap(4, 1, plain);
    const cost = makeCostAt(map, [door, roof], "foot");
    expect(cost(1, 0)).toBe(255); // 문 = 진입 불가
    expect(cost(2, 0)).toBe(1); // 지붕 아래 = 베이스 그대로
    expect(cost(0, 0)).toBe(1);
  });

  it("파괴된 구조물(hp 0)은 통행에서 사라진다 — ChangeTid로 자연 개방", () => {
    const map = flatMap(4, 1, plain);
    const cost = makeCostAt(map, [{ ...door, hp: 0 }], "foot");
    expect(cost(1, 0)).toBe(1);
  });
});

describe("NotWarp(Flag bit17) 워프 목적지 제외", () => {
  it("notWarp 타일은 반경 안이어도 목적지에서 빠진다 (NotTarget bit16과 별개)", () => {
    const plain: TerrainCell = { avoid: 0, def: 0 };
    const map = flatMap(3, 1, plain);
    (map.terrain as TerrainCell[][])[0][2] = { avoid: 0, def: 0, notWarp: true };
    const target = unit({ id: "t", force: 0, x: 1, y: 0 });
    const staff = { name: "워프", power: 0, uses: 1, rodType: 0, useType: 5, rangeMin: 1, rangeMax: 1, distance: 1, rodExp: 0 };
    const dests = warpDestinations(target, staff, map, [target]);
    expect(dests).toContainEqual({ x: 0, y: 0 });
    expect(dests).not.toContainEqual({ x: 2, y: 0 });
  });
});
