import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeSkillModifier, type SkillRow } from "@fesim/engine";

/**
 * 독(毒/猛毒/劇毒) 원문 해석 고정 — 덤프를 눈으로 대조하지 않고 파싱해서 판정한다.
 *
 * 왜 필요한가: 독의 ActNames(`相手の威力 + N`)는 "보유자가 받는 대미지 +N"으로도, "보유자의 공격력 +N"
 * (=반전 표기)으로도 읽힐 수 있었고, gaps/B §7이 후자 가능성을 열어둔 채 방치됐다. 단어 대조로는 닫히지
 * 않아 이 테스트가 원문 데이터로 닫는다.
 *
 * 등급 구분(no-fiction):
 *  - 1스택 = +1 은 ★실기 실측 확정(치료 전후 5→4, 2026-08-17).
 *  - 猛毒 +3 / 劇毒 +5 는 실측 미완 — "1스택 실측 + 동일 필드 구조"의 연역이다.
 *    이 테스트가 그 연역을 고정해 두므로, 이후 실측이 어긋나면 여기가 먼저 붉어진다.
 *  - 승격(중첩 아님)은 원문 확정 — g002_gimmick.txt `毒ガスによる状態異常を付与する()`가
 *    스킬解除(하위) 후 스킬装備(상위)로 "上書きする"(개발자 주석). 저장소 밖 덤프라 여기선 결론만 박제하고,
 *    원문 대조는 스크래치 스크립트가 수행한다: `node /tmp/fesim_scratch/verify_poison_lua.mjs`.
 */

interface ItemRow {
  Iid: string;
  GiveSids?: string[];
}

const skills: Record<string, SkillRow> = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/skills.json", import.meta.url), "utf-8"),
);
const items: Record<string, ItemRow> = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/items.json", import.meta.url), "utf-8"),
);

const allSkills = Object.values(skills);
const POISON_LADDER = ["SID_毒", "SID_猛毒", "SID_劇毒"] as const;

/** ActNames[i]가 name인 항의 (연산, 값) — 원문 문자열 그대로. */
function actTerm(row: SkillRow, name: string): { op: string; value: string } | undefined {
  const i = row.ActNames?.indexOf(name) ?? -1;
  if (i < 0) return undefined;
  return { op: row.ActOperations?.[i] ?? "+", value: row.ActValues?.[i] ?? "0" };
}

describe("독 — 원문 구조(skills.json 파싱)", () => {
  it("3단이 동일 구조의 사다리다: 相手の威力 + 1/3/5 · Timing=10 · Action=2 · BadState 1/2/4", () => {
    const bonuses = POISON_LADDER.map((sid) => {
      const row = skills[sid];
      expect(row, `${sid}가 skills.json에 없다`).toBeDefined();
      expect(row.Timing, sid).toBe(10);
      expect(row.Action, sid).toBe(2);
      const term = actTerm(row, "相手の威力");
      expect(term, `${sid}: 相手の威力 항이 없다`).toBeDefined();
      expect(term!.op, sid).toBe("+");
      return Number(term!.value);
    });
    expect(bonuses).toEqual([1, 3, 5]);
    expect(POISON_LADDER.map((s) => skills[s].BadState)).toEqual([1, 2, 4]);
    expect(POISON_LADDER.map((s) => skills[s].Priority)).toEqual([1, 2, 3]);
  });

  it("지속은 무제한(Life=0)이고 Power는 효과 크기와 무관하다(3단 전부 5)", () => {
    expect(POISON_LADDER.map((s) => skills[s].Life)).toEqual([0, 0, 0]);
    // Power가 대미지값이었다면 1/3/5로 갈렸어야 한다 — 갈리지 않으므로 별 의미의 필드다.
    expect(new Set(POISON_LADDER.map((s) => skills[s].Power)).size).toBe(1);
  });
});

describe("독 — '반전 표기' 기각(相手の = 보유자가 받는 값)", () => {
  /**
   * 결정타: 개발자가 이름에 효과를 박아둔 대조군이 같은 훅을 쓴다.
   * 이름이 "받는 대미지 N% 감소"인데 구현이 `相手の威力 * 0.5`라면, 반전 해석은 이 스킬을
   * "자기 공격력 반감"이라는 자해 스킬로 만든다 — 성립 불가.
   */
  const reducers = ["SID_アイクエンゲージスキル_ダメージ50%減", "SID_確率被ダメ半減"];

  it("이름이 '감소/반감'인 스킬이 相手の威力에 1 미만을 곱한다", () => {
    for (const sid of reducers) {
      const term = actTerm(skills[sid], "相手の威力");
      expect(term, `${sid}: 相手の威力 항이 없다`).toBeDefined();
      expect(term!.op, sid).toBe("*");
      expect(Number(term!.value), sid).toBeLessThan(1);
      expect(skills[sid].Action, sid).toBe(2);
    }
  });

  it("Action=2 코호트 전수가 피격측 어휘만 쓴다(공격측 ActName 0건)", () => {
    // 피격측에서 의미가 서는 이름만 허용한다. 여기 없는 이름이 Action=2에 나타나면
    // "Action=2 = 피격 계산" 전제가 흔들린 것이므로 재조사 신호다.
    // ※`攻撃結果`는 최초 목록에서 빠뜨려 이 테스트가 붉었다 — 들어온 공격의 결과(ミス 등)를
    //   쓰는 방어 스킬(祈り·落星)의 어휘이므로 피격측이 맞다(아래 祈り 테스트가 근거).
    const receiving = new Set([
      "相手の威力", "相手のダメージ", "相手の命中率", "相手の必殺率", "相手のHP",
      "ダメージ", "攻撃結果", "一時変数",
    ]);
    const offenders: string[] = [];
    for (const row of allSkills) {
      if (row.Action !== 2) continue;
      for (const name of row.ActNames ?? []) {
        if (!receiving.has(name)) offenders.push(`${row.Sid}:${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * 독립 보강: `SID_祈り`(기도)의 발동 조건이 `HP <= ダメージ`다 — "들어오는 대미지가 나를 죽일 때"로만
   * 뜻이 서고, 이때 攻撃結果=ミス·ダメージ=0으로 무효화한다. 즉 Action=2 문맥의 `ダメージ`는
   * **보유자가 받는 대미지**다. 같은 코호트의 `相手の威力`을 "보유자의 공격력"으로 읽을 수 없는 이유가 하나 더 선다.
   */
  it("祈り: Action=2 문맥의 ダメージ가 '보유자가 받는 대미지'임을 조건식이 증언한다", () => {
    const prayer = skills.SID_祈り;
    expect(prayer.Action).toBe(2);
    expect(prayer.Condition).toContain("HP <= ダメージ");
    expect(actTerm(prayer, "ダメージ")).toEqual({ op: "=", value: "0" });
  });
});

describe("독 — Priority 사다리 관례(동일 계열은 상호배타 랭크)", () => {
  it("알려진 계열이 1..N 조밀 랭크를 이룬다 — 독 3단은 같은 관례를 따른다", () => {
    const families = [
      ["SID_ＨＰ＋３", "SID_ＨＰ＋５", "SID_ＨＰ＋７", "SID_ＨＰ＋１０", "SID_ＨＰ＋１２", "SID_ＨＰ＋１５"],
      ["SID_力＋１", "SID_力＋２", "SID_力＋３", "SID_力＋４", "SID_力＋５", "SID_力＋６"],
      [...POISON_LADDER],
    ];
    for (const family of families) {
      const ranks = family.map((sid) => {
        expect(skills[sid], `${sid} 없음`).toBeDefined();
        return skills[sid].Priority;
      });
      expect(ranks, family[0]).toEqual(family.map((_, i) => i + 1));
    }
  });
});

describe("독 — 부여·해제 경로 전수(파싱)", () => {
  const givers = (sid: string) => [
    ...allSkills.filter((r) => (r.GiveSids ?? []).includes(sid)).map((r) => r.Sid),
    ...Object.values(items).filter((r) => (r.GiveSids ?? []).includes(sid)).map((r) => r.Iid),
  ];

  it("SID_毒 = 단검 11 + 스킬 2 · SID_劇毒 = 탄환 스킬 1 · ☠SID_猛毒 = 0건", () => {
    const poison = givers("SID_毒");
    expect(poison.filter((id) => id.startsWith("IID_"))).toHaveLength(11);
    expect(poison.filter((id) => id.startsWith("SID_")).sort()).toEqual(
      ["SID_カウンター_隠密効果", "SID_計略_毒矢_効果"].sort(),
    );
    expect(givers("SID_劇毒")).toEqual(["SID_弾_毒付与"]);
    // 猛毒을 주는 경로가 데이터에 전무하다 = 승격이 데이터 밖(스크립트/엔진)에서 일어난다는 증거.
    expect(givers("SID_猛毒")).toEqual([]);
  });

  it("해제는 3단을 한꺼번에 지우는 경로 하나뿐이다(デトックス)", () => {
    const removers = allSkills.filter((r) =>
      POISON_LADDER.every((sid) => ((r.RemoveSids as string[] | undefined) ?? []).includes(sid)),
    );
    expect(removers.map((r) => r.Sid)).toEqual(["SID_デトックス"]);
  });
});

describe("독 — 누적 명중이 예측하는 값(실측이 판정할 고정점)", () => {
  /**
   * 승격 모델 = 원문 확정(g002_gimmick.txt: 하위 해제 후 상위 장비, 주석 "上書きする").
   * 劇毒에서 포화한다 — Lua의 if/elseif 사슬에 그 위 분기가 없다.
   * ☠엔진 배선이 아니라 "원문이 예측하는 값"을 고정하는 해석기다. 그래서 src/가 아니라 테스트에 산다
   *   — src/로 옮기는 순간 장부의 combat.status-effects=absent 표기가 거짓이 된다.
   */
  const tierAfter = (hits: number): string | undefined =>
    hits <= 0 ? undefined : POISON_LADDER[Math.min(hits, POISON_LADDER.length) - 1];

  const escalationBonus = (hits: number): number => {
    const sid = tierAfter(hits);
    return sid === undefined ? 0 : Number(actTerm(skills[sid], "相手の威力")!.value);
  };

  /** 기각 대상 대안 가설: SID_毒이 인스턴스로 겹쳐 +1씩 쌓인다. */
  const stackingBonus = (hits: number): number =>
    hits * Number(actTerm(skills.SID_毒, "相手の威力")!.value);

  it("1회 명중 = +1 (★실기 실측 확정 — 이 줄이 붉어지면 실측이 뒤집힌 것이다)", () => {
    expect(escalationBonus(1)).toBe(1);
  });

  it("2·3회 = +3·+5, 4회 이상은 劇毒에서 포화(연역 — 직접 실측 대기)", () => {
    expect([2, 3, 4, 9].map(escalationBonus)).toEqual([3, 5, 5, 5]);
    expect([1, 2, 3, 4].map(tierAfter)).toEqual([...POISON_LADDER, "SID_劇毒"]);
  });

  it("★2회 명중이 두 가설의 유일한 판별자다(승격 +3 vs 중첩 +2)", () => {
    expect(escalationBonus(1)).toBe(stackingBonus(1)); // 1회로는 구분 불가
    expect(escalationBonus(2)).toBe(3);
    expect(stackingBonus(2)).toBe(2);
    expect(escalationBonus(2)).not.toBe(stackingBonus(2));
  });

  it("蛇毒은 이 사다리가 아니다(BadState=0, %HP 감소형) — 같은 표에 넣지 말 것", () => {
    expect(skills.SID_蛇毒.BadState).toBe(0);
    expect(actTerm(skills.SID_蛇毒, "相手の威力")).toBeUndefined();
    expect(skills.SID_蛇毒.ActNames).toContain("相手のHP");
  });
});

describe("독 — 엔진 배선 부재를 실행으로 고정", () => {
  /**
   * makeSkillModifier는 ActNames를 정확 일치로만 본다 — `相手の威力`은 보유자 자신의 훅에 영원히
   * 미매칭이다(장부 skills.opponent-act = absent, 14종 공통 증상). 독은 그 훅의 첫 소비자이므로
   * 독만 특수 처리하는 것은 국소 해법이고, 상대측 훅 신설이 선행이다.
   * ★배선이 생기면 이 테스트가 실패한다 — 그때 장부(combat.status-effects)와 함께 갱신할 것.
   */
  it("독을 보유해도 자기 威力 훅은 꿈쩍하지 않는다(= 아직 미배선)", () => {
    const modify = makeSkillModifier([skills.SID_毒], {} as never);
    expect(modify("威力", 10)).toBe(10);
    expect(modify("相手の威力", 10)).toBe(11); // 훅 이름을 통째로 넘겨야만 반응한다 = 호출부가 없다
  });
});
