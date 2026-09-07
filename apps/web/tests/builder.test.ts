import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STAT_KEYS, type SkillRow, type StatBlock, type StatKey } from "@fesim/engine";
import {
  applyEmblemBonus,
  applyStatBonus,
  builderRowGroups,
  builderRows,
  canEquip,
  carriedEquip,
  combatOf,
  COMBAT_KEYS,
  dropCardKeys,
  effectiveWeaponRanks,
  entryExportRows,
  fmtCombat,
  inheritOptions,
  lockedDisplayRows,
  moveLock,
  nextSort,
  patchCardClass,
  penalizedText,
  rankValue,
  resetEntryLock,
  skillStatDelta,
  sortRowGroups,
  STAT_EN,
  upgradeTargets,
  waitingRowGroups,
  weaponAt,
  weightPenalty,
  type ExportRow,
} from "../src/features/builder/lib";
import { layoutCard, type Measure, type PaintOp } from "../src/features/builder/card/layout";
import { renderShareHtml, shareHtmlBudget, type ShareLabels } from "../src/features/builder/share";
import { emptySnapshot, readPreset, writePreset, type BuilderSnapshot } from "../src/lib/guestSave";
import { memoryStorage, use } from "./fixtures";
import type { BuilderCharProp, BuilderEmblemProp, BuilderEngraveProp, BuilderJobProp, BuilderWeaponProp, JoinJobProp } from "../src/lib/fe17";

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
const LOW: JoinJobProp = {
  base: block({ hp: 20, str: 5 }),
  limit: block({ hp: 60, str: 30 }),
  diffGrow: block({ hp: 10 }),
  rank: 0,
  weaponRanks: {},
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
  aptitude: 0,
  personalSkills: [],
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
  it("잠긴 캐릭터도 유령 카드로 남는다 — ghost 표시, 정렬은 전체를 지난다(2026-08-31 엔트리 비교분석)", () => {
    const out = waitingRowGroups(groups, [{ pid: "c", internal: 0 }], { key: "hp", dir: "desc" });
    expect(out.map((g) => g.rows[0]!.pid)).toEqual(["b", "c", "a"]);
    expect(out.map((g) => g.ghost)).toEqual([false, true, false]);
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

  it("반지(gid·bond)는 스냅샷에 실려도 본스탯 행을 오염시키지 않는다 — 최종스탯은 반지 행 소유(2026-08-31)", () => {
    const entry = { pid: "a", internal: 11, jid: "JID_high", gid: "GID_M", bond: 2 };
    const out = lockedDisplayRows(propsOf([char("a")]), [HIGH], [entry])[0]!;
    expect(out.row.cells.str.text).toBe("13.4");
    expect(out.row.cells.str.buffed).toBeUndefined();
    expect(out.row.emblemDelta).toBeUndefined();
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

describe("문장사 보너스 (applyEmblemBonus)", () => {
  /**
   * 왜 위험한가: 絆 보너스는 성장 경로 밖 평면 가산(EnhanceValue 층)이라 셀 재조립이 틀려도
   * 오류가 없다 — 표시·정렬값·상승 표식(buffed)이 함께 움직여야 정렬과 블루 표기가 성립한다.
   */
  it("델타 합산 — 소수 표시 유지·정렬값 동기·상승 셀만 buffed", () => {
    const [row] = builderRows(propsOf([char("a")]), HIGH, 40);
    const out = applyEmblemBonus(row!, { str: 2 });
    expect(out.cells.str.value).toBeCloseTo(row!.cells.str.value + 2, 5);
    expect(parseFloat(out.cells.str.text)).toBeCloseTo(parseFloat(row!.cells.str.text) + 2, 5);
    expect(out.cells.str.text).toContain(".");
    expect(out.cells.str.buffed).toBe(true);
    expect(out.cells.hp.buffed).toBeUndefined();
    expect(out.emblemDelta).toEqual({ str: 2 }); // 반지 행("+N"·최종스탯)의 데이터원
    expect(row!.cells.str.buffed).toBeUndefined(); // 원본 불변
  });

  /** 왜 위험한가: 정본 `Unit.GetCapability` 0x1A2DD80 = Clamp(Clamp(base,0,Limit)+Enhance, min, 255) — 강화치는 캡 뒤 가산.
      캡에서 자르면 캡 근처 캐릭터가 문장사·스킬 보너스를 조용히 잃는다(2026-09-05 사용자 관측 — 2026-09-01 클램프 대체). */
  it("보너스는 상한을 넘는다 — 캡 도달 셀에도 정수로 가산, 255만 상한", () => {
    const [row] = builderRows(propsOf([char("a")]), HIGH, 11);
    expect(row!.cells.str.text).toBe("13.4");
    const out = applyEmblemBonus(row!, { str: 30 });
    expect(out.cells.str.text).toBe("43.4");
    expect(out.cells.str.value).toBeCloseTo(43.4, 5);
    expect(out.cells.str.buffed).toBe(true);
    // 이미 캡 도달(hp cap 20, 정수 표기) — 델타가 그대로 얹힌다.
    const capped = char("b", { personLimit: block({ hp: -60 }) });
    const [row2] = builderRows(propsOf([capped]), HIGH, 40);
    expect(row2!.cells.hp.capped).toBe(true);
    const out2 = applyEmblemBonus(row2!, { hp: 3 });
    expect(out2.cells.hp.text).toBe(String(Number(row2!.cells.hp.text) + 3));
    expect(out2.cells.hp.buffed).toBe(true);
    expect(out2.cells.hp.parts).toEqual([{ source: "emblem", value: 3 }]);
  });
});

describe("잠금 재정렬 (moveLock)", () => {
  /** 왜 위험한가: 드래그 커밋이 원본을 변이하면 React 상태·저장분이 어긋난다 — 순수 이동이어야 한다. */
  it("from → to 이동, 원본 불변", () => {
    const locked = [
      { pid: "a", internal: 0 },
      { pid: "b", internal: 0 },
      { pid: "c", internal: 0 },
    ];
    expect(moveLock(locked, 0, 2).map((e) => e.pid)).toEqual(["b", "c", "a"]);
    expect(moveLock(locked, 2, 0).map((e) => e.pid)).toEqual(["c", "a", "b"]);
    expect(locked.map((e) => e.pid)).toEqual(["a", "b", "c"]);
  });
});

describe("카드 개별 클래스·In.Lv 패치 (patchCardClass)", () => {
  /** 왜 위험한가: 직업 변경 때 글로벌 In.Lv를 숫자로 박으면 그 카드는 이후 글로벌 In.Lv를 영원히 못 따라간다
      (미지정 = 글로벌 추종이 설계인데 조용히 고정 — 2026-09-05 실사고). */
  it("직업만 바꾸면 internal은 미지정으로 남는다(글로벌 추종 유지)", () => {
    expect(patchCardClass(undefined, "g", { jid: "x" })).toEqual({ jid: "x" });
    expect(patchCardClass(undefined, undefined, { jid: "x" })).toEqual({ jid: "x" });
  });
  it("In.Lv만 바꾸면 글로벌 직업을 분기하고 그 값만 박는다", () => {
    expect(patchCardClass(undefined, "g", { internal: 20 })).toEqual({ jid: "g", internal: 20 });
    expect(patchCardClass(undefined, undefined, { internal: 20 })).toEqual({ internal: 20 });
  });
  it("직접 고른 In.Lv는 직업을 바꿔도 유지, 미선택('')은 jid 제거", () => {
    expect(patchCardClass({ jid: "g", internal: 20 }, "g", { jid: "x" })).toEqual({ jid: "x", internal: 20 });
    expect(patchCardClass({ jid: "x", internal: 20 }, "g", { jid: "" })).toEqual({ internal: 20 });
  });
});

describe("카드 리셋 (resetEntryLock·dropCardKeys)", () => {
  /** 왜 위험한가: 리셋이 필드 하나라도 남기면 "완전 초기화"가 조용히 거짓이 된다(장비만 빠지고 반지가 남는 식). */
  it("잠금 리셋 = 영입 상태(내부 0·직업 없음) + 성옥 체커만 보존", () => {
    const e = { pid: "a", internal: 19, jid: "j", star: true, iid: "w", plus: 3, engrave: "g", gid: "r", bond: 12, skills: ["s1", ""] as [string, string] };
    expect(resetEntryLock(e)).toEqual({ pid: "a", internal: 0, star: true });
    expect(resetEntryLock({ pid: "b", internal: 5, jid: "j" })).toEqual({ pid: "b", internal: 0 });
  });
  it("dropCardKeys는 그 pid 키만 걷고 다른 카드는 그대로", () => {
    expect(dropCardKeys({ "a:0": 1, "a:1": 2, "ab:0": 3, "b:0": 4 }, "a")).toEqual({ "ab:0": 3, "b:0": 4 });
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

  /**
   * 왜 위험한가: 직업 변경 시 장비를 무조건 리셋하면 멀티클래스 비교가 매번 재장착 노동이 되고,
   * 반대로 게이트 없이 승계하면 "불가능한 빌드"(활 못 드는 직업에 활)를 판다(2026-09-01 사용자 지시).
   */
  it("carriedEquip — 새 직업이 들 수 있으면 강화·각인 동반 승계, 못 들면 미장착", () => {
    const seed = { iid: iron.iid, plus: 2, engrave: "GID_マルス" };
    expect(carriedEquip(jobOf({ 1: "C" }), seed, [iron])).toEqual(seed);
    expect(carriedEquip(jobOf({ 2: "A" }), seed, [iron])).toBeUndefined(); // 무기군 밖
    expect(carriedEquip(undefined, seed, [iron])).toBeUndefined(); // 직업 미선택
    expect(carriedEquip(jobOf({ 1: "C" }), {}, [iron])).toBeUndefined(); // 씨드 무장비
    expect(carriedEquip(jobOf({ 1: "C" }), seed, [])).toBeUndefined(); // 목록 밖 iid
  });

  /**
   * 왜 위험한가: 전파가 넓으면 다른 무기의 비교 슬롯을 조용히 덮고(값 오염), 좁으면 같은 무기가
   * 메인과 다른 업그레이드로 남아 "동일 장비 비교"라는 전제가 어긋난다(2026-09-01 사용자 지시).
   */
  it("upgradeTargets — 메인 변경은 같은 무기 비교 슬롯까지, 비교 슬롯 변경은 그 슬롯만", () => {
    const slots = [{ iid: "a" }, { iid: "a" }, { iid: "b" }, {}];
    expect([...upgradeTargets(slots, 0)].sort()).toEqual([0, 1]);
    expect([...upgradeTargets(slots, 1)]).toEqual([1]);
    expect([...upgradeTargets(slots, 2)]).toEqual([2]);
    expect([...upgradeTargets([{}, { iid: "a" }], 0)]).toEqual([0]); // 메인 맨손 = 전파 없음
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
  /** 왜 위험한가: 페널티를 색으로만 알리면 표의 SPD가 인게임 상태 화면보다 높게 읽힌다(2026-09-05 사용자 관측 — 붉게만 되고 안 빠짐). */
  it("weightPenalty·penalizedText — 무게 > 체격만큼 SPD 표시가 빠진다(정본 攻撃速度計算 감산항)", () => {
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const heavy = { ...iron, weight: row!.cells.bld.value + 3 };
    expect(weightPenalty(row!, undefined)).toBe(0);
    expect(weightPenalty(row!, { weapon: iron, plus: 0 })).toBe(Math.max(0, 5 - row!.cells.bld.value));
    expect(weightPenalty(row!, { weapon: heavy, plus: 0 })).toBeCloseTo(3);
    expect(penalizedText({ text: "22.4", value: 22.4, capped: false, cap: 40 }, 3)).toBe("19.4");
    expect(penalizedText({ text: "40", value: 40, capped: true, cap: 40 }, 2)).toBe("38");
    expect(penalizedText({ text: "40", value: 40, capped: true, cap: 40 }, 1.5)).toBe("38.5");
    expect(penalizedText({ text: "22.4", value: 22.4, capped: false, cap: 40 }, 0)).toBe("22.4");
  });

  it("철의 검 장착 — 명중·회피(공속 하락)·물공이 정본 식대로 움직인다", () => {
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const c = combatOf(row!, { weapon: iron, plus: 0 });
    expect(c.patk).toBeCloseTo(10.5); // 힘 5.5 + 위력 5
    expect(c.matk).toBe(0); // 마공 = 순수 마력(물리 무기)
    expect(c.hit).toBe(112); // 10x2 + 2 + 90
    expect(c.avoid).toBe(6); // 공속 = 7 - max(5-0, 0) = 2 → 2x2 + 2 (공속 자체는 미표시 — 인게임에 없다)
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

describe("각인(engrave) — 무기 실효치 직접 가산 (2026-08-31)", () => {
  const iron: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
    refine: [{ power: 2, weight: 0, hit: 0, crit: 0 }],
  };
  const marth: BuilderEngraveProp = {
    gid: "GID_マルス", name: "시작의 문장", power: 1, weight: 0, hit: 10, crit: 10, avoid: 5, dodge: 5,
  };

  /**
   * 왜 위험한가: 각인은 전투 계산 단계 보정이 아니라 무기 스탯 게터 안 직접 가산이다
   * (UnitItem.GetPower 계열 — fidelity weapons.forge-engrave §11). 계산 단계에서 따로 더하면
   * 공속(무게) 게이트를 지나지 않아 회피가 어긋난다 — weaponAt 한 곳만 가산 지점이어야 한다.
   */
  it("weaponAt — 위력·명중·필살·회피·필살회피 가산, 강화와 중첩", () => {
    const eff = weaponAt(iron, 1, marth);
    expect(eff.might).toBe(8); // 5 + 錬成 2 + 각인 1
    expect(eff.hit).toBe(100);
    expect(eff.crit).toBe(10);
    expect(eff.avoid).toBe(5);
    expect(eff.dodge).toBe(5);
  });

  it("weaponAt — 각인 감량으로 음수가 될 무게는 0 하한(공속 max 게이트와 결과 동일)", () => {
    const micaiah: BuilderEngraveProp = {
      gid: "GID_ミカヤ", name: "새벽의 문장", power: -3, weight: -1, hit: 0, crit: 0, avoid: 40, dodge: 20,
    };
    expect(weaponAt({ ...iron, weight: 0 }, 0, micaiah).weight).toBe(0);
    expect(weaponAt(iron, 0, micaiah).weight).toBe(4);
  });

  it("combatOf 관통 — 각인 명중·회피(무게 경유)가 정본 식으로 흘러든다", () => {
    const roster = [
      char("a", {
        personOffset: block({ dex: 10, spd: 7, lck: 5 }),
        personLimit: block({ dex: 40, spd: 40, lck: 40 }),
      }),
    ];
    const [row] = builderRows(propsOf(roster), undefined, 0);
    const c = combatOf(row!, { weapon: iron, plus: 0, engrave: marth });
    expect(c.hit).toBe(122); // 10x2 + 2 + (90+10)
    expect(c.patk).toBeCloseTo(11.5); // 힘 5.5 + (5+1)
    expect(c.avoid).toBe(11); // 공속 2x2 + 2 + 각인 회피 5
    expect(c.ddg).toBe(10); // 행운 5 + 각인 필살회피 5
  });

  it("잠금 스냅샷 — 각인 gid를 되살리고, 목록 밖 gid는 무각인으로 강하한다", () => {
    const armed = { pid: "a", internal: 0, iid: iron.iid, plus: 0, engrave: "GID_マルス" };
    const rows = lockedDisplayRows(propsOf([char("a")]), [], [armed], undefined, [iron], [marth]);
    expect(rows[0]!.equipped?.engrave?.gid).toBe("GID_マルス");
    const hidden = lockedDisplayRows(propsOf([char("a")]), [], [armed], undefined, [iron], []);
    expect(hidden[0]!.equipped?.engrave).toBeUndefined();
    expect(hidden[0]!.equipped?.weapon.iid).toBe(iron.iid);
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

describe("고유 적성 실효 랭크 (effectiveWeaponRanks·canEquip aptitude)", () => {
  const iron: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
  };
  const jobOf = (weaponRanks: Record<number, string>): BuilderJobProp => ({ ...HIGH, weaponRanks });
  const SWORD = 1 << 1;
  const AXE = 1 << 3;

  /**
   * 왜 위험한가: 인게임 JobData.GetMaxWeaponLevel(index, originalAptitude)(RVA 0x2056C30)은
   * 직업 랭크 '+'(WeaponLevelPlusMask)와 캐릭터 고유 적성(person.Aptitude, 비트 = 1<<kind)이 둘 다
   * 맞을 때만 한 단계 올린다. 반 단계 근사(rankValue)로 표시하면 제너럴 검 A+가 유나카에겐 S가 아니라
   * "A+"로 보여 실기와 어긋난다 — 반대로 '+' 없는 B(신룡의 아이)를 적성만 보고 올리면 없는 빌드를 판다.
   */
  it("'+' 랭크는 고유 적성이 맞을 때만 한 단계 승격, S 상한, '+' 없으면 불변", () => {
    expect(effectiveWeaponRanks({ 1: "A+", 3: "A+" }, SWORD)).toEqual([
      { kind: 1, rank: "S", innate: true },
      { kind: 3, rank: "A", innate: false },
    ]);
    expect(effectiveWeaponRanks({ 1: "B+" }, 0)).toEqual([{ kind: 1, rank: "B", innate: false }]);
    expect(effectiveWeaponRanks({ 1: "S" }, SWORD)).toEqual([{ kind: 1, rank: "S", innate: true }]);
    expect(effectiveWeaponRanks({ 1: "B" }, SWORD)).toEqual([{ kind: 1, rank: "B", innate: true }]);
  });

  /**
   * 왜 위험한가: 고유 적성은 클래스와 일치할 때만 표시한다(2026-09-02 사용자 지시) —
   * 클래스에 없는 무기군이 적성만으로 목록에 끼면 "들 수 있는 무기"로 오독된다.
   */
  it("클래스에 없는 무기군은 고유 적성이 있어도 목록에 없다", () => {
    expect(effectiveWeaponRanks({ 3: "A" }, SWORD)).toEqual([{ kind: 3, rank: "A", innate: false }]);
  });

  /**
   * 왜 위험한가: 장착 게이트가 실효 랭크를 안 보면 A+ 직업의 고유 적성자가 S 무기를 못 드는 것으로
   * 표시된다(사용자 발단: 용사의 검 같은 상위 무기 장착 가능 여부).
   */
  it("canEquip — '+' 직업은 고유 적성이 있을 때만 상위 무기 허용, 없는 승계는 미장착", () => {
    const braveA = { ...iron, rank: "A" };
    expect(canEquip(jobOf({ 1: "B+" }), braveA, SWORD)).toBe(true);
    expect(canEquip(jobOf({ 1: "B+" }), braveA, AXE)).toBe(false);
    expect(canEquip(jobOf({ 1: "B+" }), braveA)).toBe(false);
    expect(canEquip(jobOf({ 1: "B" }), braveA, SWORD)).toBe(false);
    expect(carriedEquip(jobOf({ 1: "B+" }), { iid: braveA.iid }, [braveA], SWORD)).toEqual({ iid: braveA.iid });
    expect(carriedEquip(jobOf({ 1: "B+" }), { iid: braveA.iid }, [braveA])).toBeUndefined();
  });
});

describe("계승 스킬 (applyStatBonus·skillStatDelta·combatOf skills·inheritOptions)", () => {
  const rowOf = () => builderRows(propsOf([char("A")]), undefined, 20, undefined)[0]!;
  const strPlus1: SkillRow = { Sid: "SID_力＋１", Timing: 1, "EnhanceValue.Str": 1 } as SkillRow;
  const hitPlus10: SkillRow = {
    Sid: "SID_命中＋１０", Timing: 3, ActNames: ["命中値"], ActOperations: ["+"], ActValues: ["10"],
  } as SkillRow;

  /**
   * 왜 위험한가: 문장사 絆와 계승 스킬이 같은 셀에 겹치면 "+N"의 출처가 사라진다 — 오버레이가 층별 내역(parts)을
   * 못 보면 사용자는 어느 값이 스킬 때문인지 알 수 없고, emblemDelta가 스킬 호출에 덮이면 반지 행 +N이 틀린다.
   */
  it("정적 스탯 = staticEnhances 축, 두 층이 parts에 누적되고 emblemDelta는 문장사만", () => {
    const base = rowOf();
    const withEmblem = applyEmblemBonus(base, { str: 2 });
    const both = applyStatBonus(withEmblem, skillStatDelta([strPlus1]), "skill");
    expect(skillStatDelta([strPlus1])).toEqual({ str: 1 });
    expect(both.cells.str.value).toBeCloseTo(base.cells.str.value + 3, 6);
    expect(both.cells.str.buffed).toBe(true);
    expect(both.cells.str.parts).toEqual([
      { source: "emblem", value: 2 },
      { source: "skill", value: 1 },
    ]);
    expect(both.emblemDelta).toEqual({ str: 2 });
    expect(base.cells.str.parts).toBeUndefined();
  });

  /**
   * 왜 위험한가: 명중+10 같은 식 보정은 EnhanceValue가 아니라 Act* 층이다 — 스탯 합산만 하면 조용히 0이 된다.
   * 맨손(무기 없음)에서도 명중값 식은 평가되므로 스킬 항이 그대로 실려야 한다.
   */
  it("전투력 = combatEnv(skills)로 식 보정 적용 — 맨손·무장 모두 명중 +10", () => {
    const row = rowOf();
    expect(combatOf(row, undefined, [hitPlus10]).hit).toBeCloseTo(combatOf(row).hit + 10, 6);
    const iron: BuilderWeaponProp = {
      iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
      weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
    };
    const eq = { weapon: iron, plus: 0 };
    expect(combatOf(row, eq, [hitPlus10]).hit).toBeCloseTo(combatOf(row, eq).hit + 10, 6);
  });

  /**
   * 왜 위험한가: 목록 순서 = 문장사 영입 순서(2026-09-02 사용자 지시)이고 헤더는 선택 불가여야 한다 —
   * 헤더가 옵션으로 새면 "마르스"를 스킬로 장착하는 유령 상태가 생긴다. 같은 sid 2칸 장착도 막는다.
   */
  it("드롭다운 옵션 = 빈 칸 → [문장사 헤더][스킬 들여쓰기]… 순, 다른 칸 sid는 비활성", () => {
    const emblem = (gid: string, name: string, sids: string[]): BuilderEmblemProp => ({
      gid, name, bonuses: [], levels: [],
      inherits: sids.map((sid, i) => ({ sid, name: sid.slice(4), bond: i + 1, row: { Sid: sid } as SkillRow })),
    });
    const opts = inheritOptions([emblem("GID_A", "마르스", ["SID_회피10", "SID_간파"]), emblem("GID_B", "시구르드", ["SID_명중10"])], "없음", "SID_간파");
    expect(opts.map((o) => o.value)).toEqual(["", "#GID_A", "SID_회피10", "SID_간파", "#GID_B", "SID_명중10"]);
    expect(opts[1]).toMatchObject({ header: true, label: "마르스" });
    expect(opts[2]).toMatchObject({ indent: true });
    expect(opts[3]!.disabled).toBe(true);
    expect(opts[5]!.disabled).toBeUndefined();
  });
});

/**
 * 엔트리 프리셋 ↔ 빌더 상태 이음매 (2026-09-05, 정본 = design/entry_preset.md).
 *
 * ☠왜 위험한가: 빌더 상태가 하나 늘었는데 BuilderSnapshot에 안 담기면, 프리셋을 전환해도 그 값만
 * 앞 프리셋 것이 그대로 남는다. 오류도 경고도 없고 타입도 통과하며, 사용자가 프리셋을 갈아탄
 * 순간에만 "값이 안 따라온다"로 드러난다 — 그때는 원인이 UI로 보이므로 저장층을 아무도 안 본다.
 * 2026-09-05 설계 시점의 상태 12종이 전부 이 성질이었다.
 *
 * ★배치 규약: 자식 컴포넌트(PresetBar 포함)는 반드시 `export default function BuilderIsland` **앞**에
 *   정의한다. 뒤에 두면 그 로컬 상태가 여기 걸려 오탐이 난다.
 * 이 검사가 못 보는 것: useReducer · useRef로 든 상태 · 아일랜드 앞 자식의 로컬 상태 ·
 *   정규식을 피해 쓴 구조분해. ☠못 보는 것을 안 적으면 다음에도 모른다.
 * ☠아일랜드를 렌더하는 수단이 이 저장소에 없다(jsdom·testing-library 부재) — 하이드레이션 게이트와
 *   자동 저장 의존성은 **소스 텍스트**로만 박제하고, 실동작은 헤드리스 실측이 본다.
 */
/**
 * 공유 UI 이음매 — ☠아일랜드를 렌더할 수단이 없어(jsdom 부재) **소스 텍스트로** 박제한다.
 * 여기 걸린 셋은 전부 "실동작에서만 드러나고, 드러날 때는 이미 늦은" 종류다.
 */
describe("엔트리 공유 UI 이음매", () => {
  const ISLAND = readFileSync(join(__dirname, "..", "src", "features", "builder", "BuilderIsland.tsx"), "utf8");

  /**
   * ☠왜 위험한가: 드롭다운 루트마다 onPointerDown 전파를 끊는다(행 잠금 오발 방지). 그래서 **버블**
   * 리스너는 바깥 클릭을 영영 못 본다 — 팝업이 안 닫히는 실사고가 2026-08-31에 있었다.
   * 캡처 단계(세 번째 인자 true)만이 그 위를 지난다.
   */
  it("☠SharePanel의 바깥클릭은 캡처 단계다", () => {
    const panel = ISLAND.slice(ISLAND.indexOf("function SharePanel"), ISLAND.indexOf("인연 레벨 드롭다운"));
    expect(panel).toMatch(/addEventListener\("pointerdown",\s*onDoc,\s*true\)/);
  });

  /**
   * ☠왜 위험한가: 원시 `locked`에는 문장사 絆·계승 스킬 보너스가 안 얹혀 있다. 그것을 공유에 넘기면
   * 화면보다 낮은 스탯이 공유물에만 나가고, 오류도 경고도 없다.
   */
  it("★공유 입력은 lockedRows(보너스 얹힌 표시행)를 소비한다", () => {
    const call = ISLAND.slice(ISLAND.indexOf("entryExportRows("), ISLAND.indexOf("entryExportRows(") + 200);
    expect(call).toContain("lockedRows");
  });

  /**
   * ☠왜 위험한가: 펼침 모드 규약(rules/feature-ui.md)은 "표 헤더만 top 0 고정"이다. 공유 바에 sticky를
   * 주면 상단에 눌어붙어 그 규약이 깨진다 — 실브라우저에서만 보이는 종류의 회귀다.
   */
  it("공유 바는 sticky가 아니다(펼침 모드 규약)", () => {
    const i = ISLAND.indexOf("공유 바 — 엔트리 목록(표) 우측 상단");
    expect(i).toBeGreaterThan(0);
    // 주석에는 "sticky를 주지 않는다"가 적혀 있다 — 검사 대상은 주석 뒤 JSX다(*/ 이후).
    const bar = ISLAND.slice(ISLAND.indexOf("*/", i), ISLAND.indexOf("builder-scroll", i));
    expect(bar).not.toMatch(/\bsticky\b/);
    expect(bar).toContain("justify-end");
  });
});

describe("엔트리 프리셋 이음매", () => {
  const ISLAND = readFileSync(join(__dirname, "..", "src", "features", "builder", "BuilderIsland.tsx"), "utf8");
  const BODY = ISLAND.slice(ISLAND.indexOf("export default function BuilderIsland"));

  /** 스냅샷 필드 → 아일랜드 상태 이름. ★Record<keyof BuilderSnapshot, string>이라 스냅샷에 필드를
      넣으면 이 테이블이 컴파일 에러가 된다 = 저장·수집 양방향이 다 막힌다. */
  const SNAP_FIELDS: Record<keyof Required<BuilderSnapshot>, string> = {
    slots: "slots", internal: "internal", sort: "sort", locked: "locked",
    overrides: "overrides", cardClass: "cardClass", rings: "rings", inherits: "inherits",
    star: "star", showGrowth: "showGrowth", showSpoilers: "showSpoilers", showDlc: "showDlc",
  };

  /** 담지 않는 상태와 그 이유. ☠빈 이유 금지 — 이유 없는 제외는 다음 사람이 되돌릴 수 없다. */
  const EXCLUDED: Record<string, string> = {
    hoverRow: "포인터 흔적", focusRow: "포인터 흔적", lockHover: "포인터 흔적",
    pulsePid: "1회 충격파", emblemOpen: "팝업", bondPreview: "호버 미리보기",
    foldPid: "폴딩", classDrop: "열린 드롭다운", skillPop: "팝업", drag: "드래그 중",
    row1H: "sticky top 실측 높이", jobRowH: "sticky top 실측 높이",
    presets: "프리셋 목록 봉투 자체", presetBroken: "활성 슬롯 복원 실패(파생)",
    saveFailed: "저장 실패 표식(파생)", undo: "삭제 되돌리기(세션 한정)",
    notice: "첫 저장 안내 1회(표시 취향 — fesim:ui:presetnotice가 소유)",
    slotEl: "포털 대상 DOM 참조",
    shareOpen: "팝업",
  };

  it("☠빌더의 모든 useState는 프리셋에 담기거나 제외 사유가 적히거나 — 둘 중 하나다", () => {
    const names = [...BODY.matchAll(/const \[(\w+), set\w+\] = useState/g)].map((m) => m[1]!);
    expect(names.length).toBeGreaterThan(12);
    const covered = new Set([...Object.values(SNAP_FIELDS), ...Object.keys(EXCLUDED)]);
    expect(names.filter((n) => !covered.has(n))).toEqual([]);
  });

  it("스냅샷 키 목록과 팩토리가 어긋나지 않는다", () => {
    // sort는 선택 필드라 emptySnapshot()에 없다 — 그래서 따로 더한다.
    expect(Object.keys(SNAP_FIELDS).sort()).toEqual([...Object.keys(emptySnapshot()), "sort"].sort());
  });

  /**
   * ☠왜 위험한가: 자동 저장 effect의 의존성 배열에서 상태 하나가 빠지면 그 값만 저장되지 않는다.
   * 저장소에는 옛 값이 남고 화면은 새 값이라, 새로고침해야 소실이 드러난다. 이 저장소엔 ESLint가
   * 없어서(exhaustive-deps 미집행) 의존성 배열을 **소스 텍스트로** 박는 것이 유일한 방벽이다.
   */
  it("☠자동 저장 effect가 스냅샷 12종을 전부 구독하고, 하이드레이션 전에는 쓰지 않는다", () => {
    const effect = /const idx = presetsRef\.current;\s*if \(idx === null \|\| presetBroken\) return;[\s\S]*?\}, \[([^\]]*)\]\);/.exec(BODY);
    expect(effect).not.toBeNull();
    const deps = (effect![1] ?? "").split(",").map((d) => d.trim());
    for (const name of Object.values(SNAP_FIELDS)) expect(deps).toContain(name);
    // 방금 적용분 되쓰기 금지 가드 — 없으면 열기만 해도 updated가 갱신된다(M4 병합에서 기기 B가 A를 이긴다).
    expect(BODY).toContain("justApplied.current");
    // ★활성 번호는 거울 ref로 읽는다(의존성에 presets를 넣으면 엔트리 수 갱신이 슬롯을 두 번 쓴다).
    expect(deps).not.toContain("presets");
  });

  /**
   * ☠왜 위험한가: 거울 ref 동기 effect가 자동 저장 effect **뒤**로 밀리면, 프리셋을 전환한 커밋에서
   * 자동 저장이 낡은 활성 번호를 읽어 **직전 프리셋 슬롯에 새 화면을 덮어쓴다**. 값은 전부 저장되고
   * 오류도 없어서, 사용자가 옛 프리셋으로 돌아가 보기 전까지 아무도 모른다. 선언 순서가 곧 계약이다.
   */
  it("☠presetsRef 동기 effect가 자동 저장 effect보다 먼저 선언된다", () => {
    const mirror = BODY.indexOf("presetsRef.current = presets;");
    const autosave = BODY.indexOf("const idx = presetsRef.current;");
    expect(mirror).toBeGreaterThan(0);
    expect(autosave).toBeGreaterThan(mirror);
  });

  /**
   * ☠왜 위험한가: 캐릭터 순번은 별도 상태가 아니라 locked **배열 순서**다(2026-09-05 사용자 지시로
   * 프리셋에 포함). 드래그로 맞춘 순서가 왕복에서 흐트러져도 값은 전부 맞아서 아무 테스트도 안 깨진다.
   */
  it("★순번 관통 — 드래그 재정렬(moveLock) 결과가 저장·복원을 통과해도 그대로다", () => {
    use(memoryStorage());
    const locked = [
      { pid: "PID_a", internal: 1 },
      { pid: "PID_b", internal: 2 },
      { pid: "PID_c", internal: 3 },
    ];
    // 마지막 블록을 맨 위로 끌어올린 상태 = 사용자가 만든 순번.
    const moved = moveLock(locked, 2, 0);
    expect(moved.map((e) => e.pid)).toEqual(["PID_c", "PID_a", "PID_b"]);
    expect(writePreset(3, { ...emptySnapshot(), locked: moved }, "")).toBe(true);
    expect(readPreset(3)?.locked).toEqual(moved);
  });

  /**
   * ☠왜 위험한가: 잠긴 pid는 세션 맵에서 걷힌 상태가 정본이다(잠금 스냅샷이 소유). 둘 다 살아 있으면
   * 카드가 정본을 둘 갖고, 어느 쪽이 이기는지가 렌더 순서에 달린다. 방어(normalizeSnapshot)만 있고
   * 불변식 테스트가 없으면 위반이 정상으로 굳는다.
   */
  it("잠금 불변식 — 저장·복원을 지나면 잠긴 pid가 세션 맵 4종에 없다", () => {
    use(memoryStorage());
    writePreset(4, {
      ...emptySnapshot(),
      locked: [{ pid: "PID_a", internal: 5 }],
      overrides: { "PID_a:0": { plus: 1 } },
      cardClass: { PID_a: { jid: "JID_x" } },
      rings: { PID_a: { gid: "GID_x", bond: 5 } },
      inherits: { PID_a: ["SID_x", ""] },
    }, "");
    const back = readPreset(4)!;
    expect(Object.keys(back.overrides)).toEqual([]);
    expect(Object.keys(back.cardClass)).toEqual([]);
    expect(Object.keys(back.rings)).toEqual([]);
    expect(Object.keys(back.inherits)).toEqual([]);
  });
});

/**
 * 엔트리 공유(내보내기) — 표와 산출물 사이의 이음매.
 *
 * ☠**왜 위험한가**: 산출물(HTML·카드 이미지)이 값을 스스로 계산하면 표와 다른 숫자를 말하는데
 * **오류도 경고도 안 난다**. 사용자는 자기 화면을 믿고 남에게 공유하므로, 갈림이 발견되는 것은
 * 남이 그 표를 보고 "이거 틀렸는데"라고 말할 때뿐이다.
 * 그래서 `entryExportRows`가 **표가 쓰는 함수를 그대로 통과**시키는지를 여기서 박제한다
 * (설계 = design/builder_export.md §6-a, 규약 = rules/seams.md).
 */
describe("엔트리 공유(내보내기) — entryExportRows", () => {
  const roster = [
    char("a", {
      name: "알파",
      personOffset: block({ dex: 10, spd: 7, lck: 5 }),
      personLimit: block({ dex: 40, spd: 40, lck: 40 }),
    }),
    char("b", { name: "베타" }),
  ];
  const iron: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
    refine: [{ power: 2, weight: 0, hit: 0, crit: 0 }],
  };
  const ctx = { chars: roster, emblems: [] as BuilderEmblemProp[] };

  it("열 순서 = STAT_KEYS — ☠순서가 정본이라 표와 산출물이 같은 축을 써야 한다", () => {
    const display = lockedDisplayRows(propsOf(roster), [HIGH], [{ pid: "a", internal: 11, jid: "JID_high" }]);
    const out = entryExportRows(display, [{ pid: "a", internal: 11, jid: "JID_high" }], ctx);
    expect(out[0]!.stats.map((s) => s.key)).toEqual([...STAT_KEYS]);
  });

  it("스탯 문자열은 표의 셀 텍스트 그대로 — 계산을 다시 하지 않는다", () => {
    const locked = [{ pid: "a", internal: 11, jid: "JID_high" }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked);
    const out = entryExportRows(display, locked, ctx)[0]!;
    for (const s of out.stats) expect(s.text).toBe(display[0]!.row.cells[s.key].text);
  });

  /** 왜 위험한가: 무게 페널티는 인게임 상태 화면이 실제로 빼는 값이다(2026-09-05 사용자 관측).
      산출물이 원본 SPD를 그대로 실으면 공유받은 사람이 더 빠른 유닛으로 오해한다. */
  it("무게 페널티가 SPD 표기에 반영되고 tone이 down이 된다", () => {
    const locked = [{ pid: "a", internal: 11, jid: "JID_high", iid: "IID_鉄の剣" }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked, undefined, [iron]);
    const out = entryExportRows(display, locked, ctx)[0]!;
    const spd = out.stats.find((s) => s.key === "spd")!;
    const row = display[0]!.row;
    const penalty = weightPenalty(row, display[0]!.equipped);
    expect(penalty).toBeGreaterThan(0);
    expect(spd.text).toBe(penalizedText(row.cells.spd, penalty));
    expect(spd.tone).toBe("down");
  });

  /**
   * ★★관통 테스트 — 이 피쳐의 핵심 1건.
   * 표(CombatCells)와 산출물이 **같은 함수·같은 포맷터**를 지나는지 자릿수까지 대조한다.
   * ☠갈리면 화면과 공유물이 다른 숫자를 말하고, 오류도 경고도 없다.
   */
  it("★관통 — 산출물의 전투력 = combatOf(row, equipped, skills)와 자릿수까지 같다", () => {
    const locked = [{ pid: "a", internal: 11, jid: "JID_high", iid: "IID_鉄の剣", plus: 1 }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked, undefined, [iron]);
    const out = entryExportRows(display, locked, ctx)[0]!;
    const expected = combatOf(display[0]!.row, display[0]!.equipped, []);
    for (const key of COMBAT_KEYS) expect(out.combat[key]).toBe(fmtCombat(expected[key]));
    // 소수 1자리 표기가 실제로 걸렸는지(포맷터를 안 지나면 "10.5"가 아니라 "10.5000001"류가 샌다)
    expect(out.combat.patk).toMatch(/^\d+\.\d$/);
  });

  /** 왜 위험한가: 계승 스킬의 전투 보정은 식 평가 안에서 걸린다 — 산출물이 skills를 안 넘기면
      명중 +10 같은 층이 조용히 빠진 채 "정상적으로" 렌더된다. */
  it("★관통 — 계승 스킬이 전투력에 실린다(skills 인자를 넘기는지)", () => {
    // 전투 보정은 식 평가 안에서 걸린다(Timing 3 + ActNames) — 정적 EnhanceValue 층과 다른 경로다.
    const skill: SkillRow = {
      Sid: "SID_命中＋１０", Timing: 3, ActNames: ["命中値"], ActOperations: ["+"], ActValues: ["10"],
    } as SkillRow;
    const emblems: BuilderEmblemProp[] = [
      {
        gid: "GID_M", name: "마르스", bonuses: [], levels: [],
        inherits: [{ sid: "SID_命中＋１０", name: "명중+10", bond: 1, row: skill } as never],
      },
    ];
    const locked = [{ pid: "a", internal: 11, jid: "JID_high", skills: ["SID_命中＋１０", ""] as [string, string] }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked);
    const out = entryExportRows(display, locked, { chars: roster, emblems })[0]!;
    const withSkill = combatOf(display[0]!.row, undefined, [skill]);
    const without = combatOf(display[0]!.row, undefined, []);
    expect(withSkill.hit).not.toBe(without.hit); // 전제: 이 스킬이 실제로 명중을 움직인다
    expect(out.combat.hit).toBe(fmtCombat(withSkill.hit));
    expect(out.inherits.map((s) => s.name)).toEqual(["명중+10"]);
  });

  /** 왜 위험한가: 사용자 지시(2026-09-07) = "쉐어의 기준은 현재 엔트리에 포함된 부분".
      대기 목록이 섞이면 공유물이 사용자가 고르지 않은 캐릭터를 싣는다. */
  it("범위 — 잠긴 엔트리만, 순서 그대로. 대기 목록은 섞이지 않는다", () => {
    const locked = [{ pid: "b", internal: 0 }, { pid: "a", internal: 0 }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked);
    const out = entryExportRows(display, locked, ctx);
    expect(out.map((r) => r.pid)).toEqual(["b", "a"]);
    expect(entryExportRows([], [], ctx)).toEqual([]);
  });

  /** 왜 위험한가: 絆·계승 보너스는 표시층(applyEmblemBonus·applyStatBonus)이 얹는다.
      산출물이 원시 lockedDisplayRows를 소비하면 보너스가 통째로 빠진다. */
  it("보너스가 얹힌 행을 소비한다 — buffed tone이 산출물에 전달된다", () => {
    const locked = [{ pid: "a", internal: 11, jid: "JID_high" }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked);
    const boosted = display.map((d) => ({ ...d, row: applyEmblemBonus(d.row, { str: 3 }) }));
    const out = entryExportRows(boosted, locked, ctx)[0]!;
    const str = out.stats.find((s) => s.key === "str")!;
    expect(str.tone).toBe("buffed");
    expect(str.text).toBe(boosted[0]!.row.cells.str.text);
  });

  it("표시 내부 레벨은 1기점 — 표의 클래스 행과 같은 값", () => {
    const locked = [{ pid: "a", internal: 11, jid: "JID_high" }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked);
    expect(entryExportRows(display, locked, ctx)[0]!.internal).toBe(display[0]!.row.internal + 1);
  });

  /** 왜 위험한가: 특효 표기는 로케일 사전을 지난다(표 = labels.efficacyNames[kind] ?? kind).
      산출물이 사전을 안 지나면 공유물에만 일본어 IconLabel 원문이 뜬다. */
  it("특효 명칭은 표와 같은 폴백 규칙(사전 우선, 없으면 kind 원문)", () => {
    const eff: BuilderWeaponProp = { ...iron, efficacies: [{ kind: "Dragon", help: "" }] };
    const locked = [{ pid: "a", internal: 11, jid: "JID_high", iid: "IID_鉄の剣" }];
    const display = lockedDisplayRows(propsOf(roster), [HIGH], locked, undefined, [eff]);
    expect(entryExportRows(display, locked, ctx)[0]!.efficacies[0]!.name).toBe("Dragon");
    const named = entryExportRows(display, locked, { ...ctx, efficacyNames: { Dragon: "용 특효" } });
    expect(named[0]!.efficacies[0]!.name).toBe("용 특효");
  });
});

/* ── 게시판 붙여넣기 HTML (share.ts) — 제약의 근거는 design/builder_export.md §2-1(디시 실측)이고,
   여기 테스트는 그 제약이 **산출물에 실제로 걸렸는지**를 박제한다. 생성기는 순수 문자열 함수라
   DOM 없이 소스 텍스트로만 검증한다. ── */

const SHARE_LABELS: ShareLabels = {
  combat: { patk: "물공", matk: "마공", hit: "명중", avoid: "회피", crit: "필살", ddg: "필살회피" },
  might: "위력",
  weight: "무게",
  efficacy: "특효",
  item: "무기",
  engrave: "각인",
  ring: "반지",
  inherit: "계승",
  personalSkill: "고유",
};

const shareRow = (over: Partial<ExportRow> = {}): ExportRow => ({
  pid: "PID_alfred",
  name: "알프레드",
  face: "/fe17/assets/faces/Alfred.webp",
  job: "로열 나이트",
  internal: 21,
  ineligible: false,
  stats: STAT_KEYS.map((key) => ({ key, text: "41.7", tone: "ink" as const })),
  combat: { patk: "41.3", matk: "6.0", hit: "135.6", avoid: "51.6", crit: "21.4", ddg: "22.6" },
  might: "17",
  weight: "11",
  weapon: { name: "은의 창", plus: 3, icon: "/fe17/assets/items/SilverLance.webp" },
  engrave: { name: "마르스", icon: "/fe17/assets/engraves/Marth.webp" },
  ring: { name: "시구르드", bond: 20, icon: "/fe17/assets/rings/Siglud.webp" },
  inherits: [{ name: "속도+4" }, { name: "회피+20" }],
  ownSkill: { name: "왕자의 자질" },
  ranks: [],
  efficacies: [{ name: "중갑" }],
  ...over,
});

const shareOpts = { title: "엔트리 12인 — 하드 클래식", statLabels: STAT_EN, labels: SHARE_LABELS };

/** 엔티티 되돌리기 — ☠`&amp;`를 **마지막에** 푼다(먼저 풀면 `&amp;lt;`가 `<`로 접혀 이중 이스케이프를 못 본다). */
const decode = (s: string): string =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("게시판 공유 HTML (renderShareHtml·shareHtmlBudget)", () => {
  /** 왜 위험한가: ko 이름표에 `<` `>`가 42종, en에 `'` 292종·`"` 20종·`&` 3종 실재한다.
      ☠`&`를 먼저 치환하지 않으면 방금 만든 `&lt;`가 `&amp;lt;`가 되어 본문에 엔티티가 글자로 뜬다. */
  it("이스케이프 — < > & \" 가 원문 텍스트로 살아남고 이중 이스케이프가 없다", () => {
    const name = '지도<전> & "특"';
    const html = renderShareHtml([shareRow({ name, job: "용맥<호>" })], shareOpts);
    expect(html).toContain("&lt;전&gt;");
    expect(html).toContain("&amp;");
    expect(html).not.toContain("&amp;lt;");
    expect(html).not.toContain("&amp;amp;");
    expect(decode(html)).toContain(name);
    expect(decode(html)).toContain("용맥<호>");
  });

  /** 왜 위험한가: 속성 자리에서 `"`가 안 막히면 속성이 조기 종료돼 **뒷부분이 통째로 사라진다**
      (본문 자리와 달리 브라우저가 관대하지 않다 — 설계 문서의 alt 실증). */
  it("속성 자리는 \" 까지 치환한다 — href가 조기 종료되지 않는다", () => {
    const html = renderShareHtml([], { ...shareOpts, origin: 'https://x.example/a"b' });
    expect(html).toContain("&quot;");
    expect(html).not.toContain('href="https://x.example/a"b"');
  });

  /** 왜 위험한가: h1~h3·hr·pre는 모바일 렌더에서 **태그째 소실**되고, `<style>`은 에디터가 등록 전에
      태그만 벗겨 CSS를 본문에 글자로 남긴다. title·bgcolor·cellspacing·cellpadding·face는 모바일 속성
      화이트리스트 밖이라 조용히 사라진다. */
  it("금지 태그·속성이 0건 — 모바일에서 살아남는 것만 쓴다", () => {
    const html = renderShareHtml([shareRow()], { ...shareOpts, icons: true, origin: "https://x.example" });
    for (const banned of [/<h[1-3][\s>]/i, /<hr[\s/>]/i, /<pre[\s>]/i, /<style[\s>]/i, /<script[\s>]/i]) {
      expect(html).not.toMatch(banned);
    }
    for (const attr of [/\stitle=/i, /\sbgcolor=/i, /\scellspacing=/i, /\scellpadding=/i, /\sface=/i]) {
      expect(html).not.toMatch(attr);
    }
  });

  /** 왜 위험한가: colspan/rowspan은 모바일 생존 속성 목록에 없다. 죽으면 2·3줄이 한 칸씩 밀려
      ☠**스탯 열이 틀어진 채 그럴듯하게** 렌더된다 — 오류도 경고도 없는 조용한 실패다. */
  it("spanFree 기본값에서 colspan·rowspan이 0건이고, 세 줄이 모두 10칸이다", () => {
    const html = renderShareHtml([shareRow()], shareOpts);
    expect(html).not.toMatch(/colspan/i);
    expect(html).not.toMatch(/rowspan/i);
    for (const tr of html.match(/<tr[^>]*>.*?<\/tr>/g) ?? []) {
      expect(tr.match(/<td/g)?.length).toBe(STAT_KEYS.length + 1);
    }
  });

  /** 왜 위험한가: span 판을 옵션으로만 남기기로 했는데(설계 §6-a-4) 옵션이 죽어 있으면
      모바일 판정 왕복 자체가 불가능해진다. */
  it("spanFree: false는 span 판을 낸다(판정용 보험 — 정본이 아니다)", () => {
    const html = renderShareHtml([shareRow()], { ...shareOpts, spanFree: false });
    expect(html).toMatch(/rowspan="3"/);
    expect(html).toMatch(/colspan="9"/);
  });

  /** 왜 위험한가: 열 순서가 표와 갈리면 숫자는 다 맞는데 **어느 칸이 무엇인지가 틀린다**.
      헤더 라벨은 statLabels(STAT_EN)를 지나야 한다 — 안 지나면 키 원문이 그대로 뜬다. */
  it("열 순서 = STAT_KEYS, 헤더 라벨 = STAT_EN", () => {
    const html = renderShareHtml([shareRow()], shareOpts);
    const head = html.slice(html.indexOf("<tr"), html.indexOf("</tr>"));
    const cells = [...head.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
    expect(cells).toEqual(["Character", ...STAT_KEYS.map((key) => STAT_EN[key])]);
  });

  /** 왜 위험한가: 디시 본문 상한은 65,535이고 안전선이 55,000이다. 아이콘판이 예산을 넘으면
      글이 등록 단계에서 잘려 나가므로 회귀를 여기서 잡는다(설계 실측 = 12엔트리 아이콘판 20,823자). */
  it("예산 — 12엔트리 아이콘판이 안전선(55,000) 아래", () => {
    const rows = Array.from({ length: 12 }, (_v, i) => shareRow({ pid: `PID_${i}` }));
    const html = renderShareHtml(rows, { ...shareOpts, icons: true, origin: "https://builder.example" });
    const budget = shareHtmlBudget(html);
    expect(budget.chars).toBeLessThan(55_000);
    expect(budget.overSafe).toBe(false);
    expect(budget.overHard).toBe(false);
    // 바이트가 글자보다 크다(한글 3바이트) — 단위 미확정이라 판정은 둘 중 큰 쪽으로 간다.
    expect(budget.bytes).toBeGreaterThan(budget.chars);
  });

  it("예산 — 안전선을 넘기면 overSafe가 선다", () => {
    expect(shareHtmlBudget("가".repeat(60_000)).overSafe).toBe(true);
    expect(shareHtmlBudget("a".repeat(56_000)).overHard).toBe(false);
    expect(shareHtmlBudget("a".repeat(70_000)).overHard).toBe(true);
  });

  /** 왜 위험한가: 상대경로 아이콘은 게시판에서 죽는다(우리 도메인이 아니다) — origin 없이 icons를 켜면
      깨진 이미지 12장이 나가는 대신 텍스트로 물러선다. */
  it("origin 없는 icons는 img를 내지 않는다(텍스트로 물러선다)", () => {
    const html = renderShareHtml([shareRow()], { ...shareOpts, icons: true });
    expect(html).not.toContain("<img");
    expect(html).toContain("은의 창");
  });

  /** 왜 위험한가: skills·efficacy·weapontypes 자산은 파일명이 일본어라 URL 인코딩에서 1자가 9자로 부푼다
      — 아이콘 몇 장이 65,535 예산을 혼자 태운다. ASCII 파일명만 통과시킨다. */
  it("비ASCII 파일명 자산은 아이콘으로 나가지 않는다", () => {
    const row = shareRow({ weapon: { name: "철의 검", plus: 0, icon: "/fe17/assets/skills/速さ＋４.webp" } });
    const html = renderShareHtml([row], { ...shareOpts, icons: true, origin: "https://x.example" });
    expect(html).not.toContain("速さ");
    expect(html).toContain("철의 검");
    expect(html).not.toMatch(/<img[^>]*items|<img[^>]*skills/);
  });

  /** 왜 위험한가: 전용직 대상 밖 행의 값은 **합류 상태 값**이다 — 목표 직업이 적용된 것처럼 그리면
      공유받은 사람이 갈 수 없는 빌드를 읽는다(표는 흐림·괄호로 구분한다). */
  it("ineligible 엔트리의 직업명은 괄호로 감싼다", () => {
    const html = renderShareHtml([shareRow({ ineligible: true })], shareOpts);
    expect(html).toContain("(로열 나이트)");
    expect(renderShareHtml([shareRow()], shareOpts)).not.toContain("(로열 나이트)");
  });

  /** 왜 위험한가: 스탯 문자열은 표시 규약을 이미 지난 값이다 — 생성기가 손대면 표와 산출물이 갈린다. */
  it("스탯·전투력 문자열을 그대로 옮긴다(색조만 인라인 style로)", () => {
    const stats = STAT_KEYS.map((key) => ({ key, text: key === "spd" ? "25.8" : "41.7", tone: key === "spd" ? ("down" as const) : ("ink" as const) }));
    const html = renderShareHtml([shareRow({ stats })], shareOpts);
    expect(html).toContain('<td style="color:#c62f35">25.8</td>');
    expect(html).toContain("<td>41.7</td>");
    expect(html).toContain("135.6");
  });
});

/**
 * 카드 이미지(PNG) 레이아웃 — `layoutCard`는 canvas·DOM 없이 좌표만 낸다.
 *
 * ☠**왜 순수 함수로 갈랐나**: 카드는 게시판에 박히면 되돌릴 수 없는 산출물인데 이 저장소엔
 * jsdom·canvas가 없어 실렌더를 못 돈다. 그래서 규격(폭 840·정수 좌표·열 순서)과 **넘침 보고**를
 * 좌표 층에서 박제한다 — 여기가 무너지면 흐릿하거나 글자가 잘린 그림이 조용히 나간다
 * (설계 = design/builder_export.md §2-1b·§6-a(5)).
 */
describe("카드 이미지 레이아웃 (layoutCard)", () => {
  /** 고정 measure — 결정성 판정의 전제(실폰트를 쓰면 CI 폰트에 따라 값이 흔들린다).
      CJK를 라틴의 2배로 치는 것은 실측이 아니라 재현성 장치다. */
  const measure: Measure = (text) => [...text].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) > 0x2000 ? 14 : 7), 0);

  const LABELS = {
    combat: { patk: "물공", matk: "마공", hit: "명중", avoid: "회피", crit: "필살", ddg: "필살회피" },
    might: "위력",
    weight: "무게",
    internalShort: "In.lv",
    jobNone: "미선택",
    unavailable: "전용직 불가",
  };
  const opts = { labels: LABELS };

  const IRON: BuilderWeaponProp = {
    iid: "IID_鉄の剣", name: "철의 검", kind: 1, might: 5, hit: 90, crit: 0,
    weight: 5, avoid: 0, dodge: 0, magic: false, rank: "D",
  };

  /** n엔트리 산출물 — 표가 쓰는 경로(lockedDisplayRows → entryExportRows)를 그대로 지난다. */
  const cardRows = (n: number, jobName = "상급직"): ExportRow[] => {
    const roster = Array.from({ length: n }, (_, i) => char(`p${i}`, { name: `캐릭${i}`, face: `/f${i}.webp` }));
    const job = { ...HIGH, name: jobName };
    const locked = roster.map((c) => ({ pid: c.pid, internal: 11, jid: "JID_high", iid: "IID_鉄の剣" }));
    const display = lockedDisplayRows(propsOf(roster), [job], locked, undefined, [IRON]);
    return entryExportRows(display, locked, { chars: roster, emblems: [] });
  };

  const nums = (op: PaintOp): number[] => (op.op === "text" ? [op.x, op.y] : [op.x, op.y, op.w, op.h]);

  /**
   * ☠왜 위험한가: 840은 디시 기본 리사이즈 폭 850의 **경계 아래**라 리샘플 분기를 아예 안 탄다
   * (§0-b). 폭이 한 번이라도 851이 되면 0.44~0.53배 축소가 걸려 12px 글자가 5~6px로 죽는데,
   * 그림은 "그럴듯하게" 나오므로 아무도 못 잡는다.
   * 좌표가 정수여야 하는 것도 같은 축이다 — 반픽셀에 걸린 1px 괘선은 2px 회색이 된다.
   */
  it("폭은 항상 840이고 모든 op 좌표·크기가 정수다", () => {
    for (const n of [0, 1, 12]) {
      const layout = layoutCard(cardRows(n), opts, measure);
      expect(layout.width).toBe(840);
      expect(layout.ops.length).toBeGreaterThan(0);
      for (const op of layout.ops) for (const v of nums(op)) expect(Number.isInteger(v)).toBe(true);
      expect(Number.isInteger(layout.height)).toBe(true);
    }
  });

  /** 왜 위험한가: 12엔트리를 열 선별·분할로 담으려 들면 정보가 빠진다 — 위험 축은 가로 하나뿐이라
      세로는 공짜다(§6-a(5)). 폭이 따라 늘면 무손실 전제가 그 자리에서 깨진다. */
  it("12엔트리는 세로로만 늘어난다 — 폭은 불변", () => {
    const one = layoutCard(cardRows(1), opts, measure);
    const many = layoutCard(cardRows(12), opts, measure);
    expect(many.width).toBe(one.width);
    expect(many.height).toBeGreaterThan(one.height * 6);
  });

  /**
   * ★☠왜 위험한가: 신분 열 150px은 en 클래스명 최악값(125.7px)이 정한 폭이다. 그보다 긴 이름이
   * 들어오면 **말없이 `…`로 자르는 것이 가장 나쁜 실패**다 — 공유받은 사람은 잘렸다는 사실 자체를
   * 모르고, 결손 목록에도 안 잡힌다. 그래서 자르되 반드시 overflow로 보고한다("못 찾으면 드러내라").
   */
  it("★긴 클래스명은 잘리되 overflow에 보고된다 — 조용히 사라지지 않는다", () => {
    const plain = layoutCard(cardRows(1), opts, measure);
    expect(plain.overflow.filter((o) => o.field === "job")).toEqual([]);

    const longName = "Wolf Knight of the Eastern Kingdom";
    const over = layoutCard(cardRows(1, longName), opts, measure);
    const note = over.overflow.find((o) => o.field === "job");
    expect(note).toBeDefined();
    expect(note!.pid).toBe("p0");
    expect(note!.text).toBe(longName);
    expect(note!.width).toBeGreaterThan(note!.max);
    // 자른 결과가 실제로 칸 안에 들어갔는지 — 보고만 하고 넘치게 그리면 스탯 열을 침범한다.
    const drawn = over.ops.find((op) => op.op === "text" && op.text.startsWith("Wolf"));
    expect(drawn).toBeDefined();
    expect((drawn as { text: string }).text.endsWith("…")).toBe(true);
    expect(measure((drawn as { text: string }).text, "meta")).toBeLessThanOrEqual(note!.max);
  });

  /** ☠왜 위험한가: 열 순서가 표(STAT_KEYS)와 갈리면 숫자는 전부 맞는데 **다른 스탯 밑에** 선다.
      값 검증만 하는 테스트는 이 어긋남을 영원히 못 본다. */
  it("스탯 열 x좌표가 STAT_KEYS 순서와 같다", () => {
    const layout = layoutCard(cardRows(1), opts, measure);
    const heads = layout.ops.flatMap((op) => (op.op === "text" && op.font === "colHead" ? [op] : []));
    expect(heads.map((h) => h.text)).toEqual(STAT_KEYS.map((k) => STAT_EN[k]));
    // 신분 열 150 + 스탯 열 74 x 9 = 콘텐츠 816(패딩 12) — 규격이 어긋나면 layoutCard가 스스로 보고한다.
    expect(layout.overflow.filter((o) => o.field === "columns")).toEqual([]);
    heads.forEach((h, i) => {
      expect(h.x).toBe(12 + 150 + i * 74 + Math.round((74 - measure(h.text, "colHead")) / 2));
    });
  });

  /** 왜 위험한가: 결정적이지 않으면 회귀 테스트가 성립하지 않는다 — 카드가 언제 어떻게 달라졌는지
      아무도 증명 못 한다. 그래서 layoutCard는 시각·난수·getComputedStyle을 안 만진다. */
  it("결정성 — 같은 입력·같은 measure면 같은 ops", () => {
    const rows = cardRows(3);
    expect(JSON.stringify(layoutCard(rows, opts, measure))).toBe(JSON.stringify(layoutCard(rows, opts, measure)));
  });
});
