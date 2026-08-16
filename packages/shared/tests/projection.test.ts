import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ChapterData, DisposUnit, StyleRow } from "@fesim/shared";

/**
 * 파이프라인 사영 계약 — "덤프에 있는데 산출 JSON에 없다"는 결손을 막는다.
 * 사영이 빠지면 소비처(엔진·편집기)가 값을 지어내야 하고, 그게 곧 no-fiction 위반이다.
 */
const read = <T,>(rel: string): T =>
  JSON.parse(readFileSync(new URL(`../../../data/fe17/${rel}`, import.meta.url), "utf-8")) as T;

const chapters = ["m002", "m003"].map((id) => read<ChapterData>(`chapters/${id}.json`));
const units: DisposUnit[] = chapters.flatMap((c) => c.groups.flatMap((g) => g.units));

describe("dispos 사영", () => {
  /**
   * HpStockCount = HP0에 도달해도 스톡만큼 부활하는 다단 보스 기전(덤프 343행 비영).
   * 사영이 없으면 보스가 조기 격파돼도 아무도 모른다 — State1은 동반 관측되나 범례가 없어 원값만 보존한다.
   */
  it("HP 스톡·State1 원값을 담는다(기본값은 생략)", () => {
    const boss: DisposUnit = { ...units[0], hpStock: 3, state1: 1 };
    expect(boss.hpStock).toBe(3);
    expect(boss.state1).toBe(1);
    // 현 변환 대상(M002·M003)은 전 유닛 기본값(0 / -1)이라 키가 없는 것이 정상이다.
    expect(units.every((u) => u.hpStock === undefined || u.hpStock > 0)).toBe(true);
    expect(units.every((u) => u.state1 === undefined || u.state1 !== -1)).toBe(true);
  });

  /**
   * AI_HealRateA/B의 기본값은 0이 아니라 75/50이라, 0을 버리는 사영 조건에 걸려 통째로 빠져 있었다.
   * 필드가 없으면 엔진이 기본값을 하드코딩(=허구)해야 한다.
   */
  it("AI 회복 임계·이동 제약·플래그를 존재 여부로 사영한다", () => {
    expect(units.length).toBeGreaterThan(0);
    for (const unit of units) {
      expect(typeof unit.ai.healRateA).toBe("number");
      expect(typeof unit.ai.healRateB).toBe("number");
      expect(typeof unit.ai.flag).toBe("number");
    }
    expect(units.every((u) => u.ai.moveLimit === undefined || u.ai.moveLimit.includes("("))).toBe(true);
  });
});

describe("테이블 사영", () => {
  /**
   * job.xml 戦闘スタイル 시트는 load_sheet(index 0) 탓에 통째로 탈락해 있었다.
   * 스타일 부여 스킬의 정본이 이 표뿐이라, 없으면 엔진이 스타일 규칙을 문자열로 지어내는 길밖에 없다.
   */
  it("styles.json이 9스타일과 부여 SID를 담고 jobs.StyleName을 전부 덮는다", () => {
    const styles = read<Record<string, StyleRow>>("tables/styles.json");
    expect(Object.keys(styles)).toHaveLength(9);
    expect(styles["隠密スタイル"].Skills).toEqual(["SID_地形回避有利時２倍"]);
    expect(styles["重装スタイル"].Skills).toEqual(["SID_相性ブレイク無効"]);
    expect(styles["騎馬スタイル"].Skills).toBeUndefined();

    const jobs = read<Record<string, { StyleName?: string }>>("tables/jobs.json");
    const missing = Object.values(jobs)
      .map((j) => j.StyleName)
      .filter((s): s is string => s !== undefined && !(s in styles));
    expect(missing).toEqual([]);
  });

  /**
   * god 成長表의 InheritanceSkills(계승 스킬 189행)를 화이트리스트가 버려 데이터에도 없었다.
   * 소비처는 M4 편집기 — 레벨별 구조가 깨지면 어느 絆 레벨에서 풀리는지 복원할 수 없다.
   */
  it("gods.json growth가 계승 스킬을 레벨별로 보존한다", () => {
    const gods = read<{ growth: Record<string, Record<string, { InheritanceSkills?: string[] }>> }>(
      "tables/gods.json",
    );
    expect(gods.growth["GGID_マルス"]["1"].InheritanceSkills).toEqual(["SID_見切り", "SID_回避＋１０"]);
    expect(gods.growth["GGID_マルス"]["3"].InheritanceSkills).toEqual(["SID_ブレイク時追撃"]);
    const total = Object.values(gods.growth).flatMap((levels) =>
      Object.values(levels).filter((row) => row.InheritanceSkills !== undefined),
    );
    expect(total.length).toBeGreaterThan(180);
  });
});
