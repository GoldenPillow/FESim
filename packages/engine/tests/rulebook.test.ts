import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIDELITY, ACTION_TYPES } from "@fesim/shared";
import { ACT, AI_THINK, BAD_STATE, BLOW_SCORE, INIT_SPIN, RULE_VERSION } from "@fesim/engine";

/**
 * 룰북 자기검증 (MP8 B3) — **룰북이 인용한 값이 코드의 실값과 같은가**.
 *
 * 왜 위험한가: 룰북은 타 LLM·전략 엔진이 **기초 룰로 먹는** 문서다. 여기서 어긋나면
 * 그 위에 쓰인 기보가 전부 조용히 틀린다 — 게다가 문서는 그럴듯해서 눈으로는 안 걸린다.
 * ☠**낡은 룰북은 없는 룰북보다 나쁘다**(틀린 근거를 주니까).
 *
 * 신선도(재생성분과 바이트 일치)는 `./dev rulebook --check`가 게이트에서 본다.
 * 이 테스트는 그것과 **독립**이다 — 생성기가 상수를 하드코딩해 버리는 종류의 결함을 잡는다.
 */

const book = JSON.parse(
  readFileSync(new URL("../../../data/fe17/rulebook/rulebook.json", import.meta.url), "utf-8"),
) as {
  ruleVersion: string;
  sections: { id: string; generated: boolean; ungeneratedReason?: string; [k: string]: unknown }[];
};

const section = (id: string) => book.sections.find((s) => s.id === id)!;

describe("룰북 자기검증 — 인용값이 코드 실값과 같은가", () => {
  it("룰 버전이 엔진과 같다", () => {
    expect(book.ruleVersion).toBe(RULE_VERSION);
  });

  it("상수 절이 엔진 실값을 그대로 싣는다", () => {
    const c = section("constants").constants as Record<string, unknown>;
    expect(c.RULE_VERSION).toBe(RULE_VERSION);
    expect(c.INIT_SPIN).toBe(INIT_SPIN);
    expect(c.BAD_STATE).toEqual(BAD_STATE);
    expect(c.BLOW_SCORE).toEqual(BLOW_SCORE);
    expect(c.AI_THINK).toEqual(AI_THINK);
    expect(c.ACT).toEqual(ACT);
  });

  /** ☠액션이 늘었는데 룰북이 모르면, 룰북을 읽고 쓴 기보가 그 액션을 영영 안 쓴다. */
  it("액션 전수가 .eph 계약(ACTION_TYPES)과 정확히 일치한다", () => {
    expect((section("actions").types as string[]).slice().sort()).toEqual(Object.keys(ACTION_TYPES).sort());
  });

  it("결손 목록이 장부 전건을 싣는다", () => {
    const entries = section("deficits").entries as { id: string; status: string }[];
    expect(entries).toHaveLength(FIDELITY.length);
    expect(entries.map((e) => e.id).sort()).toEqual(FIDELITY.map((e) => e.id).sort());
    for (const e of entries) {
      expect(e.status).toBe(FIDELITY.find((f) => f.id === e.id)!.status);
    }
  });

  /**
   * ☠못 뽑은 절을 산문으로 채우면 이중화이고, 조용히 빼면 룰북이 거짓말을 한다.
   * 미생성은 **사유와 함께 드러나 있어야** 한다 — 룰북의 절반이 "어디를 믿으면 안 되는가"다.
   */
  it("미생성 절은 사유를 달고 드러나 있다", () => {
    const ungenerated = book.sections.filter((s) => !s.generated);
    expect(ungenerated.length).toBeGreaterThan(0);
    for (const s of ungenerated) {
      expect(s.ungeneratedReason ?? "").not.toBe("");
    }
  });

  it("전투 식은 calculator 원문을 옮겨 적지 않고 전건 싣는다", () => {
    const calc = JSON.parse(
      readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
    ) as { formulas: Record<string, unknown> };
    expect(section("numbers").formulaCount).toBe(Object.keys(calc.formulas).length);
  });
});
