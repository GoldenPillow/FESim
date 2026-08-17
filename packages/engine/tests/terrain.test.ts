import { describe, expect, it } from "vitest";
import {
  moveBudgetOn,
  terrainBonusAt,
  toCombatant,
  warpDestinations,
  type BattleMap,
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
