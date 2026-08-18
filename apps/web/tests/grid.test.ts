import { describe, expect, it } from "vitest";
import { colLabel, coordLabel } from "../src/lib/grid";

/**
 * 좌표 인덱스 표기 정본(decisions 2026-08-18): 가로 = A,B,C… · 세로 = 1,2,3…
 * A1 = 데이터 (0,0) = 화면 좌하단 — 문자 = x, 숫자 = y+1이라 FLIP과 무관하게 데이터 좌표만 따른다.
 * 32×32 패딩 맵이 26열을 넘을 수 있어 Z 다음은 AA(스프레드시트식)여야 한다.
 */
describe("좌표 라벨 — 인게임 (X, Z) 그대로", () => {
  /**
   * 왜 위험한가: 종전 체스식 `A1`은 **우리만 쓰는 표기**였다. 게임 자신은 좌표로 말한다 —
   * `UnitMovePos(pid, 5, 4)` · `pos(7,4)` · `EventEntryVisit(fn, 7, 4)` · dispos `DisposX/DisposY` ·
   * IL2CPP `x | z<<5`. 표기가 갈리면 스크립트·판독 문서와 대조할 때마다 머릿속 변환이 끼고
   * 그 변환이 곧 오독의 자리다(2026-08-18 사용자 확정으로 정본 교체).
   */
  it("colLabel은 X 그대로 — 알파벳 변환 없음", () => {
    expect(colLabel(0)).toBe("0");
    expect(colLabel(7)).toBe("7");
    expect(colLabel(22)).toBe("22");
  });

  it("coordLabel: (0,0)→0,0 · (7,4)→7,4 — 스크립트가 쓰는 수와 같다", () => {
    expect(coordLabel(0, 0)).toBe("0,0");
    expect(coordLabel(7, 4)).toBe("7,4");
  });
});
