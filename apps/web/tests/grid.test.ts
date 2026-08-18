import { describe, expect, it } from "vitest";
import { colLabel, coordLabel, rawCoord, rowLabel } from "../src/lib/grid";

/**
 * 화면 좌표 표기(2026-08-18 사용자 지정): **좌하단 기준 · 가로 1,2,3… · 세로 A,B,C…** · 표기는 `C3`.
 * 32×32 패딩 맵이 26줄을 넘을 수 있어 Z 다음은 AA(스프레드시트식)여야 한다.
 */
describe("좌표 라벨 — 좌하단 기준 세로 A·가로 1", () => {
  /**
   * 왜 위험한가: 화면 표기와 **인게임 (X, Z)**는 서로 다른 수다. 게임 자신은 좌표로 말한다 —
   * `UnitMovePos(pid, 5, 4)` · `pos(7,4)` · dispos `DisposX/DisposY` · IL2CPP `x | z<<5`.
   * 그래서 화면 라벨을 바꾸더라도 **원문 표기를 잃으면 안 된다**(툴팁이 둘 다 싣는다) —
   * 그 대조가 끊기면 판독 문서와 화면이 다른 수로 말하게 되고 그것이 오독의 자리다.
   */
  it("colLabel = 가로 1부터 — x+1", () => {
    expect(colLabel(0)).toBe("1");
    expect(colLabel(7)).toBe("8");
    expect(colLabel(22)).toBe("23");
  });

  it("rowLabel = 세로 A부터 · 26줄을 넘으면 AA(스프레드시트식)", () => {
    expect(rowLabel(0)).toBe("A");
    expect(rowLabel(25)).toBe("Z");
    expect(rowLabel(26)).toBe("AA");
    expect(rowLabel(31)).toBe("AF");
  });

  it("coordLabel: (0,0)→A1 · (7,4)→E8 — 세로 글자를 먼저 읽는다", () => {
    expect(coordLabel(0, 0)).toBe("A1");
    expect(coordLabel(7, 4)).toBe("E8");
  });

  it("rawCoord는 인게임 (X, Z) 원문 — 스크립트와 같은 수", () => {
    expect(rawCoord(7, 4)).toBe("(7,4)");
  });
});
