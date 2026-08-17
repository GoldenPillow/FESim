import { describe, expect, it } from "vitest";
import { visibleStructures } from "../src/lib/boards";
import type { BoardStructureProp } from "../src/lib/fe17";
import type { StructureState } from "@fesim/engine";

/**
 * 구조물 렌더 가시성 — 보드·리플레이·/s/ SSR이 공용하는 단일 판별(visibleObjects와 동형 문법).
 * 왜 위험한가: (1) 파괴된 구조물이 계속 그려지면 열린 통로가 벽으로 보인다,
 * (2) 지붕(TID_屋根)은 같은 group의 문이 파괴되면 함께 걷혀야 실내가 드러난다(m015 실측 근거).
 */

const prop = (p: Partial<BoardStructureProp> & { tid: string; group: number }): BoardStructureProp => ({
  x: 0, y: 0, w: 1, h: 1, name: p.tid, color: "#888", hp: { n: 30, h: 30, l: 30 }, ...p,
});
const state = (s: Partial<StructureState> & { tid: string; group: number; hp: number }): StructureState => ({
  x: 0, y: 0, w: 1, h: 1, ...s,
});

describe("visibleStructures", () => {
  const props: BoardStructureProp[] = [
    prop({ tid: "TID_扉", group: 1, x: 1 }),
    prop({ tid: "TID_屋根", group: 1, x: 2, roof: true, hp: { n: 0, h: 0, l: 0 } }),
    prop({ tid: "TID_破壊可能_HP50", group: 0, x: 3 }),
    prop({ tid: "TID_屋根", group: 0, x: 4, roof: true, hp: { n: 0, h: 0, l: 0 } }),
  ];

  it("전부 생존 = 전부 표시", () => {
    const live = [
      state({ tid: "TID_扉", group: 1, hp: 50, x: 1 }),
      state({ tid: "TID_屋根", group: 1, hp: 0, roof: true, x: 2 }),
      state({ tid: "TID_破壊可能_HP50", group: 0, hp: 50, x: 3 }),
      state({ tid: "TID_屋根", group: 0, hp: 0, roof: true, x: 4 }),
    ];
    expect(visibleStructures(props, live).map((s) => s.x)).toEqual([1, 2, 3, 4]);
  });

  it("파괴된 구조물은 사라지고, 같은 group의 지붕이 함께 걷힌다 (group 0 지붕은 무연동 = 유지)", () => {
    const doorDown = [
      state({ tid: "TID_扉", group: 1, hp: 0, x: 1 }),
      state({ tid: "TID_屋根", group: 1, hp: 0, roof: true, x: 2 }),
      state({ tid: "TID_破壊可能_HP50", group: 0, hp: 0, x: 3 }),
      state({ tid: "TID_屋根", group: 0, hp: 0, roof: true, x: 4 }),
    ];
    expect(visibleStructures(props, doorDown).map((s) => s.x)).toEqual([4]);
  });

  it("상태 부재(비구조물 맵) = 전부 표시 · props 부재 = 빈 목록", () => {
    expect(visibleStructures(props, undefined).length).toBe(4);
    expect(visibleStructures(undefined, undefined)).toEqual([]);
  });
});
