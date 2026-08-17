import { describe, expect, it } from "vitest";
import { colLabel, coordLabel } from "../src/lib/grid";

/**
 * 좌표 인덱스 표기 정본(decisions 2026-08-18): 가로 = A,B,C… · 세로 = 1,2,3…
 * A1 = 데이터 (0,0) = 화면 좌하단 — 문자 = x, 숫자 = y+1이라 FLIP과 무관하게 데이터 좌표만 따른다.
 * 32×32 패딩 맵이 26열을 넘을 수 있어 Z 다음은 AA(스프레드시트식)여야 한다.
 */
describe("좌표 라벨", () => {
  it("colLabel: 0→A, 25→Z, 26→AA, 27→AB", () => {
    expect(colLabel(0)).toBe("A");
    expect(colLabel(25)).toBe("Z");
    expect(colLabel(26)).toBe("AA");
    expect(colLabel(27)).toBe("AB");
  });

  it("coordLabel: (0,0)→A1, (2,3)→C4", () => {
    expect(coordLabel(0, 0)).toBe("A1");
    expect(coordLabel(2, 3)).toBe("C4");
  });
});
