import { describe, expect, it } from "vitest";
import { movementPath, type MoveQuery } from "@fesim/engine";

/**
 * 경로 화살표의 정확성 조건: (1) 최소 코스트 경로여야 하고 (2) 같은 코스트면 꺾임이 적어야
 * 인게임 화살표처럼 읽힌다(지그재그 화살표는 오독을 부른다). 코스트가 규칙, 꺾임 최소화는 표시 품질.
 */
function grid(rows: string[], movePoints: number, start: { x: number; y: number }): MoveQuery {
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

function turns(path: { x: number; y: number }[]): number {
  let count = 0;
  for (let i = 2; i < path.length; i++) {
    const a = { x: path[i - 1].x - path[i - 2].x, y: path[i - 1].y - path[i - 2].y };
    const b = { x: path[i].x - path[i - 1].x, y: path[i].y - path[i - 1].y };
    if (a.x !== b.x || a.y !== b.y) count++;
  }
  return count;
}

describe("이동 경로 재구성", () => {
  it("직선 목적지는 꺾임 0", () => {
    const path = movementPath(grid(["....", "....", "...."], 3, { x: 0, y: 0 }), { x: 3, y: 0 });
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("대각 목적지는 꺾임 1 (지그재그 금지)", () => {
    const path = movementPath(grid(["...", "...", "..."], 4, { x: 0, y: 0 }), { x: 2, y: 2 })!;
    expect(path.length).toBe(5);
    expect(turns(path)).toBe(1);
  });

  it("숲을 우회하는 편이 싸면 우회한다", () => {
    // (0,0)→(2,0): 직진은 f 통과 1+2+1... 아니라 (1,0)=f 코스트2 → 총 3. 아래 우회도 3칸 = 3.
    // mp 2에서는 어느 쪽도 불가, mp 3에서 도달 — 경로 코스트는 3이어야 한다.
    const q = grid([".f.", "...", "..."], 3, { x: 0, y: 0 });
    const path = movementPath(q, { x: 2, y: 0 })!;
    expect(path).not.toBeNull();
    const cost = path.slice(1).reduce((acc, t) => acc + q.costAt(t.x, t.y), 0);
    expect(cost).toBe(3);
  });

  it("이동력 밖·차단 목적지는 null", () => {
    const q = grid([".E.", "###", "###"], 1, { x: 0, y: 0 });
    expect(movementPath(q, { x: 2, y: 0 })).toBeNull(); // 적 뒤
    expect(movementPath(q, { x: 1, y: 0 })).toBeNull(); // 적 타일 자체
  });

  it("아군 타일은 경유할 수 있지만 목적지는 될 수 없다", () => {
    const q = grid([".A.", "###", "###"], 3, { x: 0, y: 0 });
    expect(movementPath(q, { x: 1, y: 0 })).toBeNull();
    expect(movementPath(q, { x: 2, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("시작 = 목적지면 시작 타일 하나", () => {
    const q = grid(["..", ".."], 2, { x: 1, y: 1 });
    expect(movementPath(q, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }]);
  });
});
