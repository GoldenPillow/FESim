import { describe, expect, it } from "vitest";
import { FIDELITY, FIDELITY_CATEGORIES, fidelityCategoryOf, fidelitySummary } from "@fesim/shared";

/**
 * 기전 장부의 구조 불변식 — 장부가 깨지면 "몰라서 못 잡는" 방어 자체가 무너진다:
 * (1) id 중복 = 같은 기전이 두 상태를 갖는 모순, (2) 미등록 카테고리 = UI 목록에서 누락(고아),
 * (3) anchored·assumed·deferred에 근거 없음 = 앵커/가정/선행 조건을 추적할 수 없는 허위 표기.
 */
describe("기전 장부(fidelity ledger)", () => {
  it("id는 전수 유일하다", () => {
    const ids = FIDELITY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 항목의 카테고리가 등록돼 있다", () => {
    const known = new Set(FIDELITY_CATEGORIES.map((c) => c.id));
    for (const e of FIDELITY) expect(known, e.id).toContain(fidelityCategoryOf(e));
  });

  it("anchored·assumed·deferred는 근거(evidence)가 필수다", () => {
    for (const e of FIDELITY) {
      if (e.status === "anchored" || e.status === "assumed" || e.status === "deferred") {
        expect(e.evidence, `${e.id}: ${e.status}인데 근거가 없다`).toBeTruthy();
      }
    }
  });

  it("요약 집계 = 전 항목 수", () => {
    const sum = Object.values(fidelitySummary()).reduce((a, b) => a + b, 0);
    expect(sum).toBe(FIDELITY.length);
  });
});
