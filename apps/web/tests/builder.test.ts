import { describe, expect, it } from "vitest";
import { STAT_KEYS, type GrowthPathJob, type SkillRow, type StatBlock } from "@fesim/engine";
import { builderRows, sortBuilderRows } from "../src/lib/builder";
import type { BuilderCharProp, BuilderJobProp } from "../src/lib/fe17";

/**
 * 캐릭터 빌더 표시층 — 정본 계산은 엔진 growthPath가 소유하고, 여기 테스트는 **표시 규약**을 박제한다:
 * 소수 1자리 표기 · 캡 도달은 정수 · 개인 캡 합성 · 정렬 토글 · 전용직 가능자 상단.
 * 합성 데이터로 짠다(실데이터는 파이프라인 산출물이라 값이 바뀌면 표시 규약과 무관하게 깨진다).
 */

const block = (over: Partial<StatBlock> = {}): StatBlock => {
  const out = {} as StatBlock;
  for (const key of STAT_KEYS) out[key] = over[key] ?? 0;
  return out;
};

/** 기본직(Rank 0) — 레벨 10까지 이 성장률로 오른다. */
const LOW: GrowthPathJob = {
  base: block({ hp: 20, str: 5 }),
  limit: block({ hp: 60, str: 30 }),
  diffGrow: block({ hp: 10 }),
  rank: 0,
};

const HIGH: BuilderJobProp = {
  jid: "JID_high",
  name: "상급직",
  nameEn: "High",
  base: block({ hp: 24, str: 7 }),
  limit: block({ hp: 80, str: 40 }),
  diffGrow: block({ hp: 10, str: 20 }),
  rank: 1,
};

const char = (pid: string, over: Partial<BuilderCharProp> = {}): BuilderCharProp => ({
  pid,
  name: pid,
  joinLevel: 1,
  internalOffset: 0,
  personGrowth: block({ hp: 60, str: 50 }),
  personOffset: block(),
  personLimit: block(),
  joinJid: "JID_low",
  ...over,
});

const propsOf = (chars: BuilderCharProp[]) => ({ chars, joinJobs: { JID_low: LOW } });

describe("표시치 — 정수 스탯 + 누적기/100", () => {
  /**
   * 왜 위험한가: 소수부는 "다음 레벨업에서 누가 먼저 +1을 받는가"라는 정보다.
   * 정수만 보이면 22.9와 22.0이 같은 22로 보여 비교표의 존재 이유가 사라진다.
   */
  it("미선택 = 합류 시점 값을 소수 1자리로 (누적기 초기값 = person.Grow 원본)", () => {
    const [row] = builderRows(propsOf([char("a")]), undefined, 40);
    expect(row?.cells.hp.text).toBe("20.6");
    expect(row?.cells.str.text).toBe("5.5");
    expect(row?.internal).toBe(0); // 0기점(성장 레벨 수) — 内部レベル計算 정본
    expect(row?.projected).toBe(false);
  });

  it("직업 선택 = 목표 내부 레벨까지 누적한 값", () => {
    const [row] = builderRows(propsOf([char("a")]), HIGH, 11);
    expect(row?.internal).toBe(11);
    expect(row?.projected).toBe(true);
    // 0기점: 합류 내부 0 → 기본직 9렙업 + 전직 + 2렙업 = 11회 누적.
    expect(row?.cells.hp.text).toBe("32.3");
    expect(row?.cells.str.text).toBe("13.4");
  });

  it("합류 내부 레벨이 목표보다 높으면 합류 상태 그대로(강등 없음)", () => {
    const late = char("late", { internalOffset: 20, joinLevel: 5 });
    const [row] = builderRows(propsOf([late]), HIGH, 10);
    expect(row?.internal).toBe(24); // 20 + 5 - 1
    expect(row?.projected).toBe(false);
  });
});

describe("캡 도달 — 정수 표기 + 개인 캡 합성", () => {
  /**
   * 왜 위험한가: 캡은 mergeStatCap(job.Limit + person.Limit)이 정본인데 job.Limit만 보면
   * 개인 보정이 음수인 캐릭터가 도달 불가능한 수치를 달고 표에 서게 된다 — 조용한 거짓말이다.
   * 캡에 닿은 값은 소수부가 무의미하므로(누적조차 멈춘다) 정수로 적는다.
   */
  it("개인 캡 보정이 상한을 끌어내리면 캡 정수로 표시된다", () => {
    const capped = char("capped", { personLimit: block({ hp: -60 }) });
    const [row] = builderRows(propsOf([capped]), HIGH, 40);
    expect(row?.cells.hp.capped).toBe(true);
    expect(row?.cells.hp.text).toBe("20");
    expect(row?.cells.str.capped).toBe(false);
  });

  it("같은 캐릭터가 개인 캡 보정 없이는 캡에 걸리지 않는다", () => {
    const [row] = builderRows(propsOf([char("a")]), HIGH, 40);
    expect(row?.cells.hp.capped).toBe(false);
    expect(row?.cells.hp.text).toContain(".");
  });
});

describe("정렬", () => {
  const roster = [
    char("a"),
    char("b", { personOffset: block({ hp: 5 }) }),
    char("c", { personOffset: block({ hp: 2 }) }),
  ];
  const rows = builderRows(propsOf(roster), undefined, 40);

  it("미지정 = 입력 순서(합류순) 유지", () => {
    expect(sortBuilderRows(rows, undefined).map((r) => r.pid)).toEqual(["a", "b", "c"]);
  });

  it("내림/오름 토글이 표시값 숫자 기준으로 뒤집힌다", () => {
    expect(sortBuilderRows(rows, { key: "hp", dir: "desc" }).map((r) => r.pid)).toEqual(["b", "c", "a"]);
    expect(sortBuilderRows(rows, { key: "hp", dir: "asc" }).map((r) => r.pid)).toEqual(["a", "c", "b"]);
  });
});

describe("전용직", () => {
  const UNIQUE: BuilderJobProp = { ...HIGH, jid: "JID_uniq", uniquePid: "b" };
  const roster = [char("a"), char("b"), char("c", { personOffset: block({ hp: 5 }) })];

  /**
   * 왜 위험한가: 전용직은 계승자 1명만 갈 수 있다. 불가 캐릭터에까지 그 직업 수치를 계산해 보이면
   * 표 전체가 "가능한 빌드"라는 거짓 전제를 판다. 불가 행은 합류 상태 값으로 남기고 표식만 단다.
   */
  it("가능자가 최상단, 불가 행은 하단에 합류 상태 값으로 남는다", () => {
    const rows = sortBuilderRows(builderRows(propsOf(roster), UNIQUE, 40), undefined);
    expect(rows.map((r) => r.pid)).toEqual(["b", "a", "c"]);
    expect(rows[0]?.ineligible).toBe(false);
    expect(rows[0]?.projected).toBe(true);
    expect(rows.slice(1).every((r) => r.ineligible)).toBe(true);
    expect(rows[1]?.internal).toBe(0);
    expect(rows[1]?.cells.hp.text).toBe("20.6");
  });

  it("정렬을 걸어도 가능자 그룹이 먼저다", () => {
    const rows = sortBuilderRows(builderRows(propsOf(roster), UNIQUE, 40), { key: "hp", dir: "desc" });
    expect(rows[0]?.pid).toBe("b");
    expect(rows.slice(1).map((r) => r.pid)).toEqual(["c", "a"]);
  });
});

describe("반올림 자리", () => {
  it("x.x5는 half-up으로 올린다 — ☠toFixed는 이진 오차로 6.35를 '6.3'으로 떨어뜨린다", () => {
    // str 성장 35 · 렙업 0 → 표시 = base 6 + 0.35 = 6.35 → "6.4" (정수 산술 반올림).
    const c = char("half", {
      personGrowth: block({ hp: 60, str: 35 }),
      joinJid: "JID_high6",
    });
    const high6: BuilderJobProp = { ...HIGH, jid: "JID_high6", base: block({ hp: 22, str: 6 }), rank: 0 };
    const rows = builderRows({ chars: [c], joinJobs: { JID_high6: high6 } }, undefined, 1);
    expect(rows[0]!.cells.str.text).toBe("6.4");
  });
});

describe("성옥의 가호(extraSkills)", () => {
  it("체커 스킬이 전 구간 rate에 +15를 얹는다(Work 3 = TotalGrowChange)", () => {
    const star = { Sid: "SID_星玉の加護", Work: 3, WorkOperation: "+", WorkValue: 15 } as SkillRow;
    const base = builderRows(propsOf([char("a")]), HIGH, 11)[0]!;
    const boosted = builderRows(propsOf([char("a")]), HIGH, 11, [star])[0]!;
    // str rate 50/70 → 65/85: acc0 50 + 65x9 + 85x2 = 805 → +8, 잔여 5 → 15.05 → "15.1".
    expect(base.cells.str.text).toBe("13.4");
    expect(boosted.cells.str.text).toBe("15.1");
  });
});
