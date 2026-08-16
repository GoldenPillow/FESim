import { describe, expect, it } from "vitest";
import { attackRange, movementRange, type MoveQuery } from "@fesim/engine";

/**
 * 이동/공격 범위 — FE 문법의 위험 지점 세 가지를 박제한다:
 * (1) 코스트 255 = 진입 불가(정본 = 地形コスト, Prohibition 아님 — 전수 반증 이력),
 * (2) 적군은 통과도 불가, 아군은 통과 가능·정지 불가,
 * (3) 공격 범위는 "정지 가능한 타일"에서만 뻗는다(통과 중 공격 불가).
 */
function grid(rows: string[], movePoints: number, start: { x: number; y: number }): MoveQuery {
  // 문자 코드: '.'=1, 'f'=2(숲), '#'=255(벽), 'E'=적(통과 불가), 'A'=아군(정지 불가)
  const height = rows.length;
  const width = rows[0].length;
  const at = (x: number, y: number) => rows[y][x];
  return {
    width,
    height,
    movePoints,
    start,
    costAt: (x, y) => (at(x, y) === "#" ? 255 : at(x, y) === "f" ? 2 : 1),
    blocked: (x, y) => at(x, y) === "E",
    occupied: (x, y) => at(x, y) === "A",
  };
}

const key = (t: { x: number; y: number }) => `${t.x},${t.y}`;
const keys = (tiles: { x: number; y: number }[]) => new Set(tiles.map(key));

describe("이동 범위 (Dijkstra, 4방향)", () => {
  it("평지 이동력 2 = 맨해튼 거리 2 다이아몬드", () => {
    const tiles = movementRange(grid([".....", ".....", ".....", ".....", "....."], 2, { x: 2, y: 2 }));
    expect(tiles.length).toBe(13); // 1 + 4 + 8
    const set = keys(tiles);
    expect(set.has("2,0")).toBe(true);
    expect(set.has("0,0")).toBe(false); // 거리 4
  });

  it("숲(코스트 2)은 잔여 이동력을 더 깎는다", () => {
    const tiles = movementRange(grid(["...", "ff.", "..."], 2, { x: 1, y: 0 }));
    const set = keys(tiles);
    expect(set.has("1,1")).toBe(true); // 숲 진입: 코스트 2
    expect(set.has("1,2")).toBe(false); // 숲 넘어 아래: 2+1 > 2
    expect(set.has("2,1")).toBe(true); // 오른쪽 평지 우회: 1+1
  });

  it("코스트 255 = 진입 불가, 우회는 가능", () => {
    const tiles = movementRange(grid([".#.", ".#.", "..."], 3, { x: 0, y: 0 }));
    const set = keys(tiles);
    expect(set.has("1,0")).toBe(false);
    expect(set.has("1,1")).toBe(false);
    expect(set.has("2,2")).toBe(false); // 우회 거리 4 > 3
    expect(set.has("1,2")).toBe(true); // 아래로 우회 (0,1)→(0,2)→(1,2) = 3
  });

  it("적군 타일은 통과조차 불가", () => {
    const tiles = movementRange(grid([".E.", "###", "###"], 3, { x: 0, y: 0 }));
    expect(keys(tiles).has("2,0")).toBe(false);
  });

  it("아군 타일은 통과 가능하지만 정지 불가", () => {
    const tiles = movementRange(grid([".A.", "###", "###"], 3, { x: 0, y: 0 }));
    const set = keys(tiles);
    expect(set.has("1,0")).toBe(false); // 정지 불가
    expect(set.has("2,0")).toBe(true); // 통과는 가능
  });

  it("시작 타일은 항상 포함(코스트 0), 반환에 도달 코스트 동봉", () => {
    const tiles = movementRange(grid(["..", ".."], 0, { x: 0, y: 0 }));
    expect(tiles).toEqual([{ x: 0, y: 0, cost: 0 }]);
  });
});

describe("공격 범위 (사거리 링 합집합)", () => {
  it("사거리 1-1: 정지 타일의 상하좌우", () => {
    const stand = [{ x: 1, y: 1 }];
    const set = keys(attackRange(stand, 1, 1, 3, 3));
    expect(set).toEqual(new Set(["1,0", "0,1", "2,1", "1,2"]));
  });

  it("사거리 1-2(마도서): 맨해튼 1..2 링, 정지 타일 자신은 제외", () => {
    const set = keys(attackRange([{ x: 2, y: 2 }], 1, 2, 5, 5));
    expect(set.has("2,2")).toBe(false);
    expect(set.has("2,0")).toBe(true); // 거리 2
    expect(set.has("3,3")).toBe(true); // 대각 = 거리 2
    expect(set.size).toBe(12); // 4 + 8
  });

  it("사거리 2-2(투척): 거리 1 구멍", () => {
    const set = keys(attackRange([{ x: 2, y: 2 }], 2, 2, 5, 5));
    expect(set.has("1,2")).toBe(false);
    expect(set.has("0,2")).toBe(true);
  });

  it("여러 정지 타일의 합집합이고 맵 밖은 잘린다", () => {
    const set = keys(attackRange([{ x: 0, y: 0 }, { x: 1, y: 0 }], 1, 1, 2, 2));
    expect(set).toEqual(new Set(["0,0", "1,0", "0,1", "1,1"]));
  });
});
