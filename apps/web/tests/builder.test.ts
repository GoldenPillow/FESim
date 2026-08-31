import { describe, expect, it } from "vitest";
import { STAT_KEYS, type GrowthPathJob, type SkillRow, type StatBlock } from "@fesim/engine";
import {
  builderRowGroups,
  builderRows,
  canEquip,
  combatOf,
  lockedDisplayRows,
  nextSort,
  rankValue,
  sortRowGroups,
  waitingRowGroups,
} from "../src/features/builder/lib";
import type { BuilderCharProp, BuilderJobProp, BuilderWeaponProp } from "../src/lib/fe17";

/**
 * 엔트리 빌더 표시층 — 정본 계산은 엔진 growthPath가 소유하고, 여기 테스트는 **표시 규약**을 박제한다:
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
  base: block({ hp: 24, str: 7 }),
  limit: block({ hp: 80, str: 40 }),
  diffGrow: block({ hp: 10, str: 20 }),
  rank: 1,
  weaponRanks: {},
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
  const groups = builderRowGroups(propsOf(roster), []);

  it("미지정 = 입력 순서(합류순) 유지", () => {
    expect(sortRowGroups(groups, undefined).map((g) => g[0]!.pid)).toEqual(["a", "b", "c"]);
  });

  it("내림/오름 토글이 표시값 숫자 기준으로 뒤집힌다", () => {
    expect(sortRowGroups(groups, { key: "hp", dir: "desc" }).map((g) => g[0]!.pid)).toEqual(["b", "c", "a"]);
    expect(sortRowGroups(groups, { key: "hp", dir: "asc" }).map((g) => g[0]!.pid)).toEqual(["a", "c", "b"]);
  });

  /** 2단 토글(내림↔오름)에는 "정렬 풀기"가 없었다 — 합류순으로 돌아올 길은 새로고침뿐이었다. */
  it("헤더 클릭 3단 순환 — 내림 → 오름 → 초기화(합류순), 다른 열은 내림부터 (2026-08-31 사용자 지시)", () => {
    const first = nextSort(undefined, "hp");
    expect(first).toEqual({ key: "hp", dir: "desc" });
    const second = nextSort(first, "hp");
    expect(second).toEqual({ key: "hp", dir: "asc" });
    expect(nextSort(second, "hp")).toBeUndefined();
    expect(nextSort(second, "str")).toEqual({ key: "str", dir: "desc" });
  });
});

describe("잠금 — 엔트리 스냅샷 (waitingRowGroups·lockedDisplayRows)", () => {
  const roster = [
    char("a"),
    char("b", { personOffset: block({ hp: 5 }) }),
    char("c", { personOffset: block({ hp: 2 }) }),
  ];
  const groups = builderRowGroups(propsOf(roster), []);

  /**
   * 왜 위험한가: 잠금은 "비교 기준을 붙들어 두는" 기능이다 — 잠긴 캐릭터가 정렬·슬롯 변경에 딸려
   * 움직이면 기준이 사라진다. 잠금 당시 (직업, 레벨, 성옥)만 소비하는 스냅샷이어야 고정이 성립한다.
   */
  it("잠긴 캐릭터는 대기 목록에서 빠지고 남은 묶음만 정렬을 지난다", () => {
    expect(
      waitingRowGroups(groups, [{ pid: "c", internal: 0 }], { key: "hp", dir: "desc" }).map((g) => g[0]!.pid),
    ).toEqual(["b", "a"]);
  });

  it("스냅샷 표시행 — 잠근 순서 그대로, 잠금 당시 직업·레벨을 박제한다", () => {
    const rows = lockedDisplayRows(propsOf(roster), [HIGH], [
      { pid: "c", internal: 11, jid: "JID_high" },
      { pid: "a", internal: 0 },
    ]);
    expect(rows.map((r) => r.row.pid)).toEqual(["c", "a"]);
    expect(rows[0]!.job?.name).toBe("상급직");
    expect(rows[0]!.row.projected).toBe(true);
    expect(rows[0]!.row.internal).toBe(11);
    expect(rows[1]!.job).toBeUndefined(); // 직업 미선택 잠금 = 합류 상태
    expect(rows[1]!.row.projected).toBe(false);
  });

  it("로스터에 없는 pid는 건너뛰고, 사라진 jid는 합류 상태로 강하한다", () => {
    const rows = lockedDisplayRows(propsOf(roster), [HIGH], [
      { pid: "ghost", internal: 5, jid: "JID_high" },
      { pid: "a", internal: 11, jid: "JID_gone" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.row.projected).toBe(false);
    expect(rows[0]!.job).toBeUndefined();
  });

  it("성옥 스냅샷 — 잠금 당시 체커만 반영한다(현재 체커와 무관)", () => {
    const star = { Sid: "SID_星玉の加護", Work: 3, WorkOperation: "+", WorkValue: 15 } as SkillRow;
    const entry = { pid: "a", internal: 11, jid: "JID_high" };
    const on = lockedDisplayRows(propsOf([char("a")]), [HIGH], [{ ...entry, star: true }], star)[0]!;
    const off = lockedDisplayRows(propsOf([char("a")]), [HIGH], [entry], star)[0]!;
    expect(off.row.cells.str.text).toBe("13.4");
    expect(on.row.cells.str.text).toBe("15.1");
  });
});

describe("장착 게이트 (canEquip·rankValue)", () => {
  const iron: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
  };
  const jobOf = (weaponRanks: Record<number, string>): BuilderJobProp => ({ ...HIGH, weaponRanks });

  /**
   * 왜 위험한가: 게이트가 새면 "가능한 빌드"라는 거짓 전제를 판다(전용직 회색 처리와 같은 축).
   * 랭크 서열은 N<E<D<C<B<A<S, '+'는 반 단계 — 인게임 무기 레벨 표기 정본.
   */
  it("무기군 + 랭크 게이트 — '+'는 반 단계, Flag 256은 랭크 무시", () => {
    expect(rankValue("C+")).toBe(3.5);
    expect(canEquip(jobOf({ 1: "C" }), iron)).toBe(true);
    expect(canEquip(jobOf({ 1: "C" }), { ...iron, rank: "B" })).toBe(false);
    expect(canEquip(jobOf({ 1: "C" }), { ...iron, rank: "B", ignoreRank: true })).toBe(true);
    expect(canEquip(jobOf({ 2: "A" }), iron)).toBe(false);
  });
});

describe("전투력 사영 (combatOf) — 무기 합산", () => {
  const roster = [
    char("a", {
      personOffset: block({ dex: 10, spd: 7, lck: 5 }),
      personLimit: block({ dex: 40, spd: 40, lck: 40 }),
    }),
  ];
  const iron: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
    refine: [{ power: 2, weight: 0, hit: 0, crit: 0 }],
  };

  /**
   * 왜 위험한가: 무기 항이 식 밖에서 더해지면 공속(무게-체격) 게이트가 빠져 회피가 과대해진다.
   * 정본 식에 무기 변수를 채우는 것만이 합산이다(명중 = 기x2+int(행/2)+무기명중,
   * 회피 = (속도-max(무게-체격,0))x2+int(행/2), 물공 = 힘+위력).
   */
  it("철의 검 장착 — 명중·회피(공속 하락)·물공이 정본 식대로 움직인다", () => {
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const c = combatOf(row!, { weapon: iron, plus: 0 });
    expect(c.patk).toBeCloseTo(10.5); // 힘 5.5 + 위력 5
    expect(c.matk).toBe(0); // 마공 = 순수 마력(물리 무기)
    expect(c.hit).toBe(112); // 10x2 + 2 + 90
    expect(c.avoid).toBe(6); // 공속 = 7 - max(5-0, 0) = 2 → 2x2 + 2
    expect(c.crit).toBe(5);
  });

  it("강화 +1 = 錬成 누적 보정 합산, 마법 무기는 마공 쪽에 합산", () => {
    const [row] = builderRows(propsOf(roster), undefined, 0);
    expect(combatOf(row!, { weapon: iron, plus: 1 }).patk).toBeCloseTo(12.5);
    const tome: BuilderWeaponProp = { ...iron, magic: true, might: 4, weight: 0 };
    const c = combatOf(row!, { weapon: tome, plus: 0 });
    expect(c.matk).toBeCloseTo(4); // 마력 0 + 위력 4
    expect(c.patk).toBeCloseTo(5.5); // 물공 = 순수 힘
  });

  it("Enhance 스탯 강화가 스탯에 합산된 뒤 전투력이 선다", () => {
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const buffed: BuilderWeaponProp = { ...iron, enhance: { dex: 4 } };
    expect(combatOf(row!, { weapon: buffed, plus: 0 }).hit).toBe(120); // (10+4)x2 + 2 + 90
  });
});

describe("전투력 사영 (combatOf) — 정본 self-only 식 · 맨손(무기 항 0)", () => {
  /**
   * 왜 위험한가: 전투력을 우리 손으로 다시 짜면 정본(calculator.json)과 갈린다 —
   * 같은 식을 평균 스탯으로 평가한 값임을 수치로 박제한다(명중=기x2+int(행/2) ·
   * 회피=공속x2+int(행/2), 맨손 공속=속도 · 필살=int(기/2) · 필살회피=행운).
   */
  it("맨손 전투 능력 — 인게임 유닛 단면 식 그대로", () => {
    // ☠LOW.limit은 hp·str만 캡이 있다 — 다른 스탯은 personLimit으로 캡을 열어야 오프셋이 산다.
    const roster = [
      char("a", {
        personOffset: block({ dex: 10, spd: 7, lck: 5 }),
        personLimit: block({ dex: 40, spd: 40, lck: 40 }),
      }),
    ];
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const c = combatOf(row!);
    expect(c.patk).toBeCloseTo(5.5); // 물공 = 순수 힘(맨손) — 장비 피쳐가 서면 무기 항이 합산된다
    expect(c.matk).toBe(0); // 마공 = 순수 마력 — 같은 식을 마법 속성으로 평가
    expect(c.hit).toBe(22);
    expect(c.avoid).toBe(16);
    expect(c.crit).toBe(5);
    expect(c.ddg).toBe(5);
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
    const rows = sortRowGroups(builderRowGroups(propsOf(roster), [{ job: UNIQUE, internal: 40 }]), undefined).map((g) => g[0]!);
    expect(rows.map((r) => r.pid)).toEqual(["b", "a", "c"]);
    expect(rows[0]?.ineligible).toBe(false);
    expect(rows[0]?.projected).toBe(true);
    expect(rows.slice(1).every((r) => r.ineligible)).toBe(true);
    expect(rows[1]?.internal).toBe(0);
    expect(rows[1]?.cells.hp.text).toBe("20.6");
  });

  it("정렬을 걸어도 가능자 그룹이 먼저다", () => {
    const rows = sortRowGroups(builderRowGroups(propsOf(roster), [{ job: UNIQUE, internal: 40 }]), { key: "hp", dir: "desc" }).map((g) => g[0]!);
    expect(rows[0]?.pid).toBe("b");
    expect(rows.slice(1).map((r) => r.pid)).toEqual(["c", "a"]);
  });
});

describe("멀티클래스 비교 (builderRowGroups)", () => {
  const HIGH2: BuilderJobProp = {
    ...HIGH,
    jid: "JID_high2",
    name: "상급직2",
    base: block({ hp: 30, str: 5 }),
    diffGrow: block({ hp: 0, str: 0 }),
  };

  /**
   * 왜 위험한가: 직업별 계산을 zip으로 묶으므로 라인 순서가 직업 선택 순서와 어긋나면
   * 헤더의 성장률 행과 본문 라인이 조용히 뒤바뀐 채 그럴듯한 수치를 보인다.
   */
  it("캐릭터당 직업 수만큼 라인, 순서는 선택 순서 그대로", () => {
    const groups = builderRowGroups(propsOf([char("a"), char("b")]), [{ job: HIGH, internal: 11 }, { job: HIGH2, internal: 11 }]);
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      expect(g).toHaveLength(2);
      expect(g[0]!.pid).toBe(g[1]!.pid);
    }
    // 라인 i = 그 직업 단독 계산과 동치 — 헤더 성장률 행과 본문 라인의 정렬이 이 동치에 걸려 있다.
    expect(groups[0]![0]!.cells.hp.text).toBe("32.3");
    expect(groups[0]![1]).toEqual(builderRows(propsOf([char("a"), char("b")]), HIGH2, 11)[0]);
    expect(groups[0]![1]!.cells.hp.text).not.toBe(groups[0]![0]!.cells.hp.text);
  });

  /** 슬롯마다 내부 레벨 선택기(2026-08-31) — 라인 i는 슬롯 i의 내부 레벨을 따라야 한다. */
  it("슬롯별 내부 레벨 — 같은 직업이라도 슬롯 레벨이 다르면 라인 값이 갈린다", () => {
    const groups = builderRowGroups(propsOf([char("a")]), [{ job: HIGH, internal: 11 }, { job: HIGH, internal: 39 }]);
    expect(groups[0]![0]!.internal).toBe(11);
    expect(groups[0]![1]!.internal).toBe(39);
    expect(groups[0]![1]).toEqual(builderRows(propsOf([char("a")]), HIGH, 39)[0]);
  });

  it("직업 미선택(빈 배열) = 합류 상태 1라인", () => {
    const groups = builderRowGroups(propsOf([char("a")]), []);
    expect(groups).toEqual([[expect.objectContaining({ pid: "a", projected: false })]]);
  });

  it("정렬·전용직 상단 규칙은 첫 직업 라인이 정한다", () => {
    const roster = [char("a"), char("b", { personOffset: block({ hp: 5 }) })];
    // HIGH2 라인(둘째)에서는 a와 b의 차이가 없어도 첫 라인(HIGH) hp 내림차순 = b 먼저.
    const sorted = sortRowGroups(builderRowGroups(propsOf(roster), [{ job: HIGH, internal: 11 }, { job: HIGH2, internal: 11 }]), { key: "hp", dir: "desc" });
    expect(sorted.map((g) => g[0]!.pid)).toEqual(["b", "a"]);
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
