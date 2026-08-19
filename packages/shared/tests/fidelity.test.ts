import { describe, expect, it } from "vitest";
import { FIDELITY } from "@fesim/shared";

/**
 * 기전 장부의 **내용 정합** 불변식 — 구조 불변식(id 유일·카테고리 등록·근거 필수)은
 * `packages/engine/tests/fidelity.test.ts`가 소유하고, 여기는 **항목끼리 모순되지 않는가**를 본다.
 *
 * ☠**왜 위험한가**: 이 장부는 `/[locale]/fe17/fidelity`로 **사용자에게 공개**된다.
 * 2026-08-20 적대적 재검증 실측 — `combat.skill-sort-key`는 *"Order 정렬 가정 철회 · 소비처 0"*으로
 * `absent`까지 내려갔는데, 같은 배열의 `skills.timing-filter`는 라벨에 *"Order 준수"*,
 * 근거에 *"Order는 makeSkillModifier 정렬로"*라고 `anchored`로 적고 있었다.
 * **한 페이지가 정반대를 말하는데 코드는 전부 그린**이었다 — 두 값 다 문자열이라 층별 테스트는
 * 이 경계를 영원히 못 본다. 철회된 가정이 공개 장부에 정본처럼 남으면 다음 세션도 사용자도 그것을 믿는다.
 */
const entry = (id: string) => {
  const e = FIDELITY.find((x) => x.id === id);
  if (e === undefined) throw new Error(`장부에 ${id}가 없다`);
  return e;
};

describe("기전 장부 내용 정합", () => {
  it("Order 소비처가 없는 동안 다른 항목이 Order를 배선된 축으로 광고하지 않는다", () => {
    const sortKey = entry("combat.skill-sort-key");
    const filter = entry("skills.timing-filter");
    if (sortKey.status !== "absent") return; // Timing 11/12 훅이 서면 이 불변식은 해제된다
    expect(filter.label.ko, "라벨이 Order를 준수 축으로 세운다").not.toMatch(/Order/);
    expect(filter.label.en, "라벨이 Order를 준수 축으로 세운다").not.toMatch(/Order/);
    expect(filter.evidence ?? "", "Order가 이 경로에서 미소비임을 명시해야 한다").toContain("미소비");
  });
});
