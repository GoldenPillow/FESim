import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  battleTimesOf,
  combatEnv,
  createCalculator,
  evaluateFormula,
  forecastSide,
  makeSkillModifier,
  parseFormula,
  plainCombatEnv,
  SkillRecursionError,
  staticEnhances,
  strictIdents,
  type Combatant,
  type FormulaEnv,
  type SkillRow,
} from "@fesim/engine";

/**
 * 스킬 엔진 — skills.json DSL 직접 실행 (수기 이식 금지 원칙은 calculator와 동일).
 * 실기 검증 근거: M003 코퍼스 — 간파(15+速さ*0.25)가 소수를 유지한 채 회피값에 더해지고
 * 최종 명중률 표시에서 내림된다 (108 - 57.25 → 50). corpus NOTES.md 참조.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

/** 정본 행을 그대로 실행한다 — 손으로 옮겨 적으면 데이터가 바뀔 때 테스트만 옛 값을 붙든다. */
const SKILLS: Record<string, SkillRow> = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/skills.json", import.meta.url), "utf-8"),
);
const dataRow = (sid: string): SkillRow => ({ ...SKILLS[sid], Sid: sid });

const MIGIRI: SkillRow = {
  Sid: "SID_見切り",
  Timing: 5,
  ActNames: ["回避値"],
  ActOperations: ["+"],
  ActValues: ["15 + 速さ * 0.25"],
};

const alear: Combatant = {
  stats: { maxHp: 24, hp: 21, str: 8, mag: 0, dex: 8, spd: 9, lck: 5, def: 6, res: 3, bld: 4 },
  weapon: { might: 7, hit: 95, crit: 0, weight: 3, avoid: 20 },
  skills: [MIGIRI],
};

const swordFighter: Combatant = {
  stats: { maxHp: 23, hp: 8, str: 7, mag: 1, dex: 9, spd: 10, lck: 0, def: 4, res: 4, bld: 5 },
  weapon: { might: 5, hit: 90, crit: 0, weight: 5, avoid: 0 },
};

describe("파서 확장", () => {
  it("문자열 리터럴과 심볼 인자 호출을 파스한다", () => {
    const node = parseFormula('スキル所持("追撃不可") == 0');
    const value = evaluateFormula(node, {
      lookup: () => undefined,
      call: (name, args) => (name === "スキル所持" && args[0] === "追撃不可" ? 0 : undefined),
    });
    expect(value).toBe(1);
  });

  it("cond(조건, 참, 거짓) 내장 함수", () => {
    expect(evaluateFormula(parseFormula("cond(3 > 2, 10, 20)"), { lookup: () => undefined })).toBe(10);
  });
});

describe("정적 보정 (EnhanceValue.*)", () => {
  it("싱크로 힘+1·기+2를 스탯에 합산한다", () => {
    const base = { hp: 22, str: 6, mag: 0, dex: 5, spd: 7, lck: 5, def: 5, res: 3, bld: 4 };
    const out = staticEnhances(base, [
      { Sid: "a", "EnhanceValue.Str": 1 } as SkillRow,
      { Sid: "b", "EnhanceValue.Tech": 2 } as SkillRow,
    ]);
    expect(out.str).toBe(7);
    expect(out.dex).toBe(7);
    expect(out.hp).toBe(22);
  });
});

describe("값 보정 Acts — 실기 코퍼스 재현", () => {
  it("간파: 회피값 +15+속도*0.25 소수 유지 (40 + 17.25 = 57.25)", () => {
    expect(calc.eval("回避値計算", combatEnv(alear))).toBe(57.25);
  });

  it("적 명중률 표시 = floor(108 - 57.25) = 50 (실기 일치)", () => {
    const f = forecastSide(calc, swordFighter, alear);
    expect(f.hitRate).toBe(50);
  });

  it("미지 식별자 조건은 미적용으로 강하한다 — 논리 단항의 truthy 오적용 방지", () => {
    // 왜 위험한가: 평가기가 미지 식별자를 이름 심볼로 돌려주면 문자열은 truthy라
    // `配置除去可能`·`生存 && …` 같은 조건이 항상 참이 되어 조건 스킬이 상시 발동한다(C축 §6-3, 6건).
    // 미지 "함수"는 이미 예외 → 미적용인데 식별자만 강하되지 않아 강하 규칙이 갈라져 있었다.
    const jimyaku: SkillRow = {
      Sid: "SID_地脈吸収", Timing: 26, Condition: "配置除去可能",
      ActNames: ["HP"], ActOperations: ["+"], ActValues: ["10"],
    };
    expect(makeSkillModifier([jimyaku], combatEnv(alear))("HP", 21)).toBe(21);
  });

  it("미지 식별자 비교식도 같은 규칙으로 미적용 — 어휘 결손은 항상 과소, 절대 과대가 아니다", () => {
    // 왜 위험한가: `武器の種類`가 env에 없으면 심볼끼리 비교라 == 는 거짓(과소)이지만
    // != ·심볼 대 심볼은 참이 되어 과대 적용으로 뒤집힌다. 강하를 하나로 통일해 방향을 고정한다.
    const kessatsu: SkillRow = {
      Sid: "SID_必殺剣", Timing: 3, Condition: "武器の種類 == 剣",
      ActNames: ["必殺値"], ActOperations: ["+"], ActValues: ["10"],
    };
    const negated: SkillRow = { ...kessatsu, Sid: "SID_필살검_부정", Condition: "武器の種類 != 剣" };
    const modify = (skill: SkillRow) => makeSkillModifier([skill], combatEnv(alear))("必殺値", 4);
    expect(modify(kessatsu)).toBe(4);
    expect(modify(negated)).toBe(4);
  });

  it("열거 상수 비교는 계속 산다 — 月の腕輪(攻撃属性 == 物理属性)", () => {
    // 왜 위험한가: 강하를 "미지 식별자 전부"로 잡으면 정본의 열거 상수(物理属性·魔法属性)까지 죽어
    // 지금 정상 적용되는 조건부 스킬 7건이 통째로 꺼진다. 강하 대상은 열거 상수를 제외한 미지 식별자다.
    const tsuki: SkillRow = {
      Sid: "SID_月の腕輪", Timing: 3, Condition: "攻撃属性 == 物理属性",
      ActNames: ["威力"], ActOperations: ["+"], ActValues: ["相手の守備 * 0.2"],
    };
    expect(makeSkillModifier([tsuki], combatEnv(alear, swordFighter))("威力", 50)).toBeCloseTo(50.8);
  });

  it("조건 불성립이면 미적용, 지원 불가 조건은 안전하게 무시된다", () => {
    const conditional: Combatant = {
      ...alear,
      skills: [
        { ...MIGIRI, Condition: "HP < 10" }, // 21 < 10 거짓
        { Sid: "x", Condition: '攻撃結果(ブレイク) && スキル所持("追撃不可") == 0',
          ActNames: ["回避値"], ActOperations: ["+"], ActValues: ["99"] } as SkillRow,
      ],
    };
    expect(calc.eval("回避値計算", combatEnv(conditional))).toBe(40);
  });
});

/**
 * 발동 필터(Stand·Action) — 인게임 정본(IL2CPP 판독, BattleInfoSide.IsEnableSkill RVA 0x1E8CDCC~0x1E8CE24).
 *
 * 왜 위험했나: 엔진이 이 필드를 아예 읽지 않아 한쪽 입장에서만 켜져야 할 큰 보정이 반대 입장에서도 켜졌다.
 * 간파(회피 +15+속도*0.25)·달의 팔찌(위력 +상대수비*0.3) 등 8종이 과대 적용 = 예보 수치가 조용히 틀어졌다.
 *
 * 두 필드는 축이 다르다:
 *   Stand  = 이 전투를 건 쪽인가(전투 단위, BattleSide.Type: Offense=0 / Defense=1)
 *   Action = 이번 타격에서 때리는 쪽인가(타격 단위)
 * ☠실기 실측("선공 예보와 피격 예보의 적 명중 동일")은 Stand를 반증하지 않는다 —
 *   그 둘은 같은 전투의 공격행·반격행이라 Stand가 양쪽 다 참이었다(M003 코퍼스도 같은 구조다).
 */
describe("발동 필터 — Stand(전투 주도권)·Action(타격 역할)", () => {
  const migiriStand: SkillRow = { ...MIGIRI, Stand: 1 }; // 실데이터의 SID_見切り가 Stand=1이다
  const avoid = (c: Combatant) => calc.eval("回避値計算", combatEnv(c));

  it("Stand=1(내가 건 전투)은 걸린 쪽일 때 발동하지 않는다", () => {
    expect(avoid({ ...alear, skills: [migiriStand], initiator: true })).toBe(57.25);
    expect(avoid({ ...alear, skills: [migiriStand], initiator: false })).toBe(40);
  });

  it("Stand=2(내가 걸린 전투)는 반대다", () => {
    const guard: SkillRow = { ...MIGIRI, Sid: "SID_明鏡の構え", Stand: 2 };
    expect(avoid({ ...alear, skills: [guard], initiator: false })).toBe(57.25);
    expect(avoid({ ...alear, skills: [guard], initiator: true })).toBe(40);
  });

  it("Action=1(때리는 타격)은 맞는 타격에서 발동하지 않는다", () => {
    const offence: SkillRow = { ...MIGIRI, Sid: "SID_命中１００", Action: 1 };
    expect(avoid({ ...alear, skills: [offence], striking: true })).toBe(57.25);
    expect(avoid({ ...alear, skills: [offence], striking: false })).toBe(40);
  });

  it("Stand·Action이 0이면 어느 입장에서도 발동한다(독처럼 Stand=0인 스킬)", () => {
    expect(avoid({ ...alear, skills: [MIGIRI], initiator: false, striking: false })).toBe(57.25);
  });

  it("두 축은 독립이다 — 하나라도 어긋나면 발동하지 않는다", () => {
    const both: SkillRow = { ...MIGIRI, Sid: "SID_必殺０_オフェンス時", Stand: 1, Action: 1 };
    const on = { ...alear, skills: [both], initiator: true, striking: true };
    expect(avoid(on)).toBe(57.25);
    expect(avoid({ ...on, striking: false })).toBe(40);
    expect(avoid({ ...on, initiator: false })).toBe(40);
  });

  it("역할이 미지정이면 게이트를 걸지 않는다(예보 밖 단독 평가 무회귀)", () => {
    expect(avoid({ ...alear, skills: [migiriStand] })).toBe(57.25);
  });
});

/**
 * 스킬 보정 합성 — 인게임 정본(BattleParam.GetResult RVA 0x1E8DA30,
 * BattleParamCommand.Add/Scale/SetImpl 0x1B45D60/0x1B45DA0/0x1B45DE0).
 *
 * 왜 위험했나: 엔진은 보정을 순차 즉시 반영해서 `+5`와 `*1.3`이 **스킬 순서에 따라** 다른 값을 냈다.
 * 게임은 훅마다 base·add·scale 세 레지스터를 따로 모아 마지막에 `(base + add) * scale` 한 번으로 합성한다 —
 * 순서 무관이고, 결과는 파라미터 종류별로 클램프된다(값계 0..999 · 율계 0..100).
 * ☠이 규칙은 전투 12훅(BattleParam)에만 적용된다. 원시 스탯(力·守備…)은 즉시 반영이 맞다.
 */
describe("보정 합성 — (base + add) * scale, 순서 무관", () => {
  const act = (sid: string, name: string, op: string, value: string): SkillRow => ({
    Sid: sid, ActNames: [name], ActOperations: [op], ActValues: [value],
  });
  const apply = (skills: SkillRow[], name: string, base: number) =>
    makeSkillModifier(skills, combatEnv(alear))(name, base);

  it("가산과 승산의 순서가 결과를 바꾸지 않는다", () => {
    const plus = act("a", "威力", "+", "5");
    const times = act("b", "威力", "*", "1.3");
    expect(apply([plus, times], "威力", 10)).toBeCloseTo(19.5); // (10+5)*1.3
    expect(apply([times, plus], "威力", 10)).toBeCloseTo(19.5); // 순서를 뒤집어도 같다
  });

  it("율계 훅은 0..100으로 클램프된다", () => {
    const big = act("a", "命中率", "+", "80");
    expect(apply([big, { ...big, Sid: "b" }], "命中率", 30)).toBe(100);
  });

  it("값계 훅은 0..999로 클램프된다", () => {
    expect(apply([act("a", "威力", "*", "100")], "威力", 50)).toBe(999);
    expect(apply([act("a", "威力", "-", "500")], "威力", 10)).toBe(0);
  });

  it("=(대입)은 기저만 덮고 가산·승산은 살아남는다", () => {
    const set = act("a", "必殺値", "=", "20");
    const plus = act("b", "必殺値", "+", "5");
    expect(apply([set, plus], "必殺値", 3)).toBe(25); // (20+5)*1
    expect(apply([plus, set], "必殺値", 3)).toBe(25);
  });

  it("원시 스탯은 합성 규칙 밖이다(즉시 반영·클램프 없음)", () => {
    const plus = act("a", "力", "+", "5");
    const times = act("b", "力", "*", "2");
    expect(apply([plus, times], "力", 10)).toBe(30); // (10+5)*2 가 아니라 순차 = 30
    expect(apply([times, plus], "力", 10)).toBe(25); // 순서 의존이 정본이다
  });
});

/**
 * 대미지 정수화 — 인게임 정본(SimplePowerParam + BattleCalculator.CalcAttackHit 0x24726E4).
 * 게임은 威力를 [0,999]로 클램프하고 **정수로 절사한 뒤** 필살 3배를 곱한다.
 * 엔진은 소수를 그대로 들고 있다가 3배를 곱해서, 보정 스킬이 붙는 순간 HP에서 소수가 빠지고
 * `trunc(x)*3`과 `trunc(x*3)`이 갈렸다(威力 10.6 → 정본 30 · 현행 31.8).
 */
describe("威力 정수화", () => {
  it("소수 위력은 절사된 뒤에 필살 배수가 곱해진다", () => {
    const attacker: Combatant = {
      ...alear,
      stats: { ...alear.stats, str: 10 },
      weapon: { might: 0, hit: 100, crit: 0, weight: 0 },
      skills: [{ Sid: "SID_소수", ActNames: ["威力"], ActOperations: ["+"], ActValues: ["0.6"] }],
    };
    const foe: Combatant = { ...swordFighter, stats: { ...swordFighter.stats, def: 0 } };
    expect(forecastSide(calc, attacker, foe).damage).toBe(10); // 10.6 → 10
  });

  it("위력은 0..999로 클램프된다", () => {
    const attacker: Combatant = {
      ...alear,
      skills: [{ Sid: "SID_감산", ActNames: ["威力"], ActOperations: ["-"], ActValues: ["999"] }],
    };
    expect(forecastSide(calc, attacker, swordFighter).damage).toBe(0); // 음수 위력 금지
  });
});

/**
 * 手番回数 파이프라인의 어휘층 — 조건·ActValues·정렬만. 타격 순서(오더 큐)는 전투 해결 층이 따로 소유한다.
 * 정본 사슬(skill.xml 454/880행 · CalcBattleTimesImpl 0x1E88840 → Timing 3 → Timing 4):
 *   SID_カウンター(신속) `手番回数 += 1`, 조건 `手番回数 > 0 && スキル所持("追撃不可") == 0`
 *   SID_追撃不可 `手番回数 = min(手番回数, 1)`
 *
 * 왜 위험했나: `手番回数`가 modify 훅 이름으로만 있고 **lookup 변수로는 없어서** 조건이 던졌고,
 * catch가 삼켜 신속은 발현 0이었다 — 실기(뤼에르 인게이지 8+4)와 어긋나는데 오류가 안 났다.
 */
describe("手番回数 어휘 — 신속·추격불가", () => {
  const withFlow = (skills: SkillRow[], battleTimes = 1): Combatant => ({
    ...alear,
    skills,
    flow: { battleTimes, totalOrder: 0 },
  });

  it("신속(SID_カウンター)이 手番回数를 1 → 2로 올린다", () => {
    expect(combatEnv(withFlow([dataRow("SID_カウンター")]), swordFighter).lookup("手番回数")).toBe(2);
  });

  it("追撃不可를 함께 들면 신속 조건이 거짓이 되어 1로 남는다(데이터가 조건으로 막는다)", () => {
    // 왜 위험한가: 이 가드는 정렬이 아니라 `スキル所持("追撃不可") == 0`이라는 **조건**이 건다.
    // 술어가 미지 함수로 던지던 시절엔 신속과 추격불가가 둘 다 죽어 결과만 우연히 맞았다.
    const both = [dataRow("SID_カウンター"), dataRow("SID_追撃不可")];
    expect(combatEnv(withFlow(both), swordFighter).lookup("手番回数")).toBe(1);
  });

  it("문맥이 없으면 신속도 걸리지 않는다 — 예보 패널은 조용히 과대되지 않는다", () => {
    expect(combatEnv({ ...alear, skills: [dataRow("SID_カウンター")] }, swordFighter).lookup("手番回数")).toBeUndefined();
  });
});

/**
 * 실행 순서 = **Timing 오름차순**. 정본은 타이밍마다 패스를 따로 돌리고(CalcBranch → CalcActiveSkill
 * 0x246D7C0), 그 패스 안에서는 마스크 리스트 삽입 순서 그대로다 — **그 함수에 정렬이 없다**
 * (_mp8/G1_giveskill_layer.md §1-1). `Order`(0x9C)를 소비하는 자리는 HitSkillPool(Timing 12 HitAffect)뿐이고
 * 우리는 그 훅 자체가 없다.
 *
 * 왜 위험했나: 종전 엔진은 `Order` 오름차순으로 정렬했는데 **정본에 그 경로의 정렬이 없다**.
 * 그 가정은 값을 조용히 갈랐다 — 같은 국면에서 접힌 층(combatEnv)은 1, 패스를 실제로 도는 층
 * (battleTimesOf)은 2를 냈다. 층이 갈리면 예보와 실행이 어긋나고, 오류도 경고도 안 뜬다.
 */
describe("Timing 정렬 — 즉시 경로는 순서가 값을 정한다", () => {
  const flow = { battleTimes: 1, totalOrder: 0 };
  const turns = (skills: SkillRow[]) => combatEnv({ ...alear, skills, flow }, swordFighter).lookup("手番回数");

  it("배열 순서를 뒤집어도 정본 순서(Timing 오름차순)로 값이 정해진다", () => {
    // SID_火炎砲台(Timing 3, `手番回数 = 1`) → SID_カウンター(Timing 4, `+1`) 순이 정본이라 결과는 2다.
    // 정렬이 없으면 [カウンター, 砲台] 배열에서 2 → 1이 나와 같은 국면이 두 값을 갖는다.
    const counter = dataRow("SID_カウンター");
    const turret = dataRow("SID_火炎砲台");
    expect(turns([counter, turret])).toBe(2);
    expect(turns([turret, counter])).toBe(2);
  });

  it("★관통 — 접힌 층(combatEnv)과 패스를 도는 층(battleTimesOf)이 같은 수를 낸다", () => {
    // 이 두 층이 갈리는 것이 종전 Order 정렬의 실제 피해였다. 어느 쪽이 맞는지가 아니라
    // **둘이 다르다는 사실 자체**가 결함이다 — 예보와 실행이 조용히 갈린다.
    const skills = [dataRow("SID_カウンター"), dataRow("SID_火炎砲台")];
    expect(battleTimesOf(calc, { ...alear, skills, initiator: true }, swordFighter)).toBe(2);
    expect(turns(skills)).toBe(2);
  });
});

/**
 * 재진입 가드 — `combatEnv`의 훅 달린 env는 `opponent()`가 다시 훅 달린 env를 돌려준다.
 *
 * 왜 위험했나: 양쪽이 `相手の~`를 읽는 조건을 들면 두 보정자가 서로를 무한히 부르는데,
 * 그때 나는 RangeError를 보정자 안의 `catch { continue }`가 **삼킨다** — 스택이 터진 자리가
 * 오류가 아니라 "스킬 하나가 조용히 미적용된 국면"으로 나타난다. 어휘가 늘수록 도달 확률이 오르는데
 * 결손 목록에도 안 잡힌다. ⇒ 전용 오류로 터뜨리고 catch가 그것만은 되던진다.
 */
describe("재진입 가드 — 조용한 미적용 대신 명시적 오류", () => {
  /** 양쪽이 상대의 같은 이름을 읽는 조건 — 훅끼리 서로를 부른다. */
  const mirror = (sid: string): SkillRow => ({
    Sid: sid,
    Timing: 5,
    Condition: "相手の守備 > 0",
    ActNames: ["守備"],
    ActOperations: ["+"],
    ActValues: ["1"],
  });

  it("서로를 부르는 교차 조건은 SkillRecursionError로 터진다", () => {
    const a: Combatant = { ...alear, skills: [mirror("SID_TEST_MIRROR_A")], initiator: true };
    const b: Combatant = { ...swordFighter, skills: [mirror("SID_TEST_MIRROR_B")], initiator: false };
    expect(() => combatEnv(a, b).lookup("守備")).toThrow(SkillRecursionError);
  });

  it("한쪽만 들면 정상 동작한다 — 가드가 멀쩡한 판을 막지 않는다", () => {
    const a: Combatant = { ...alear, skills: [mirror("SID_TEST_MIRROR_A")], initiator: true };
    expect(combatEnv(a, swordFighter).lookup("守備")).toBe(alear.stats.def + 1);
  });
});

/**
 * 교차측 소환(`相手の~` ActName) — 정본은 훅 121종을 정방향/Reverse 두 벌로 등록해 **같은 레지스터**에 쓴다
 * (GameCalculator.AddCommandWithReverse · Reverse() 0x22791B0 = 대상 전환이지 부호 반전이 아니다).
 *
 * 왜 위험했나: `相手の威力`처럼 상대가 내 값을 고치는 행 37건은 **그 이름으로 modify를 부르는 호출자가
 * 아예 없어서** 죽어 있었다(처리 코드는 있는데 소환자가 없었다). 기보 m001~m004에 실제로 실린
 * SID_神竜の結束_被ダメ軽減(相手の威力 -1)이 무발현이라 대미지가 실기보다 1 높게 나왔다.
 */
describe("교차측 소환 — 相手の~ ActName", () => {
  const attacker: Combatant = { ...alear, skills: undefined, initiator: true };
  const defender: Combatant = { ...swordFighter, initiator: false };

  it("상대의 `相手の威力 -1`이 내 위력에 걸린다", () => {
    expect(forecastSide(calc, attacker, defender).damage).toBe(11);
    const guarded = { ...defender, skills: [dataRow("SID_神竜の結束_被ダメ軽減")] };
    expect(forecastSide(calc, attacker, guarded).damage).toBe(10);
  });

  it("☠이중 적용 금지 — 상대의 **자기 이름** 행은 지금도 공식 유도값으로만 한 번 도달한다", () => {
    // 왜 위험한가: 교차측을 "상대 보정자를 통째로 합성"으로 열면 SID_金剛の構え(守備 +6)가
    // opponent env 경유(이미 도달)와 새 경로로 **두 번** 걸려 위력이 5가 아니라 0이 된다.
    // 새로 여는 것은 `相手の` 접두 행뿐이다.
    const braced = { ...defender, skills: [dataRow("SID_金剛の構え")] };
    expect(forecastSide(calc, attacker, braced).damage).toBe(5); // 15 - (4 + 6)
  });
});

/**
 * 원시 스탯 훅 — 정본은 이름마다 커맨드를 등록하므로 守備·魔防도 보정 대상이다.
 *
 * 왜 위험했나: `combat.ts`의 lookup이 vars를 그대로 돌려주고 `calculator.ts`가 modify 분기 **앞에서**
 * 반환해, SID_鉄壁(守備 * 1.3) 같은 행이 영원히 훅을 못 탔다 — 조건도 ActName도 맞는데 값만 안 변했다.
 */
describe("원시 스탯 보정 — 守備·魔防", () => {
  it("鉄壁(守備·魔防 * 1.3)이 스탯 lookup에 걸린다", () => {
    const braced: Combatant = { ...swordFighter, initiator: false, skills: [dataRow("SID_鉄壁")] };
    const env = combatEnv(braced, alear);
    expect(env.lookup("守備")).toBeCloseTo(5.2); // 4 * 1.3
    expect(env.lookup("魔防")).toBeCloseTo(5.2);
  });

  it("보정자의 env는 훅 없는 순정이라 재귀하지 않는다 — 자기 이름 참조도 유한하다", () => {
    // 왜 위험한가: 훅 달린 env를 보정자에게 주면 `守備`를 계산하려고 `守備`를 다시 부른다(스택 폭주).
    const selfRef: SkillRow = {
      Sid: "SID_자기참조", Timing: 3, ActNames: ["守備"], ActOperations: ["="], ActValues: ["守備 + 1"],
    };
    expect(combatEnv({ ...alear, skills: [selfRef] }, swordFighter).lookup("守備")).toBe(7); // 6 + 1, 한 번만
  });
});

/**
 * Timing 게이트 — 전투 파라미터 산출 구간은 1 Always · 2 BattleBefore ~ 16 BattleEnd뿐이다.
 *
 * 왜 위험했나: 어휘를 채우자 전투 **밖** 층의 행까지 조건이 통과하기 시작했다.
 * SID_回復(Timing 0 None, `HP < MaxHP` → `HP = min(HP+5, MaxHP)`)은 페이즈 층 회복인데
 * 게이트가 없으면 예보를 부를 때마다 발동해 대미지가 조용히 어긋난다 — 결손보다 나쁜 과대적용이다.
 */
describe("Timing 게이트 — 전투 밖 층은 전투 계산에 섞이지 않는다", () => {
  it("Timing 0(SID_回復)은 전투 env에서 HP를 건드리지 않는다", () => {
    const healer: Combatant = { ...alear, skills: [dataRow("SID_回復")] };
    expect(combatEnv(healer, swordFighter).lookup("HP")).toBe(21); // 순정 HP 그대로
  });

  it("게이트는 combatEnv가 거는 것 — makeSkillModifier 직접 호출은 현행대로 검사하지 않는다", () => {
    // 전투 밖 층(맵 스킬·페이즈 처리)이 같은 보정자를 쓰므로 기본값은 무검사여야 한다.
    expect(makeSkillModifier([dataRow("SID_回復")], combatEnv(alear))("HP", 21)).toBe(24);
  });
});

/**
 * スキル所持()는 Condition 밖에서도 쓰인다 — ActValues(SID_剣殺し)·SyncConditions(SID_月の腕輪)·
 * AroundCondition(SID_手助け)·AroundValue(SID_チキ_ブレス_通常).
 *
 * 왜 위험했나: call 훅을 조건 평가 env에만 달면 이 경로들은 그대로 미지 함수로 던지고 catch가 삼킨다 —
 * 조건은 통과했는데 값만 0으로 흘러 "발동했는데 효과가 없다"는 가장 찾기 어려운 형태가 된다.
 */
describe("スキル所持 — Condition 밖(ActValues)에서도 산다", () => {
  const probe: SkillRow = {
    Sid: "SID_ActValues술어", Timing: 3,
    ActNames: ["守備"], ActOperations: ["+"], ActValues: ['cond(スキル所持("追撃不可") == 0, 0, 10)'],
  };
  /** ActNames가 없는 순수 표지 — 자기 행이 값에 끼어들지 않으므로 술어만 갈린다. */
  const marker: SkillRow = { Sid: "SID_追撃不可", Timing: 3 };

  it("ActValues 안의 술어가 보유 여부로 갈린다", () => {
    expect(combatEnv({ ...alear, skills: [probe] }, swordFighter).lookup("守備")).toBe(6);
    expect(combatEnv({ ...alear, skills: [probe, marker] }, swordFighter).lookup("守備")).toBe(16);
  });
});

/**
 * 어휘 계수기(래칫) — 조용한 실패를 수치로 드러낸다.
 *
 * 왜 위험했나: 어휘가 빠져도 오류·경고·결손 등록이 하나도 없어 아무도 모른다(전역 규약이 말하는 조용한 실패).
 * 배선 전 실측 = Condition 보유 416행 중 평가 성공 **46행**. 어휘를 되돌리면 이 수가 떨어져 레드가 난다.
 * ※조건 평가 env는 skills.ts strictIdents와 같은 규칙을 **의도적으로 복제**한다 —
 *   여기서 재는 것은 그 함수의 구현이 아니라 combatEnv가 아는 어휘의 넓이다.
 */
describe("조건 어휘 계수기 — 배선 전 46행에서 되돌아가지 않는다", () => {
  const strict = (env: FormulaEnv): FormulaEnv => ({
    lookup: (name) => {
      const value = env.lookup(name);
      if (value === undefined && !ENUM_LIKE.has(name)) throw new Error(`미지 식별자 ${name}`);
      return value;
    },
    call: env.call?.bind(env),
    opponent: env.opponent ? () => strict(env.opponent!()) : undefined,
  });
  const ENUM_LIKE = new Set(["物理属性", "魔法属性", "剣", "槍", "斧", "弓", "短剣", "魔道書", "杖", "拳", "特殊"]);
  // 무기 종류는 조건식 132행이 읽는 어휘라 계수기 픽스처는 반드시 kind를 든다(items.json Kind 1 = 剣).
  const armed = (c: Combatant): Combatant => ({ ...c, weapon: { ...c.weapon!, kind: 1 } });
  const evaluable = (flow?: { battleTimes: number; totalOrder: number }) => {
    const env = strict(combatEnv({ ...armed(alear), flow }, { ...armed(swordFighter), flow }));
    let ok = 0;
    for (const r of Object.values(SKILLS)) {
      if (typeof r.Condition !== "string" || r.Condition === "") continue;
      try {
        evaluateFormula(parseFormula(r.Condition), env);
        ok++;
      } catch {
        /* 미지 어휘 — 세지 않는다 */
      }
    }
    return ok;
  };

  it("문맥 없이도 182행, 흐름 문맥이 있으면 215행이 평가된다", () => {
    expect(evaluable()).toBeGreaterThanOrEqual(182);
    expect(evaluable({ battleTimes: 1, totalOrder: 0 })).toBeGreaterThanOrEqual(215);
  });
});

/**
 * ★관통 — 엔진의 조건 게이트와 **사용자에게 나가는 산출물**(rulebook.json)이 같은 답을 하는가.
 *
 * ☠왜 위험했나: 룰북의 `wired` 판정은 ActNames만 봤다. 그래서 조건식이 미지 식별자로 던져
 *   `makeSkillModifier`가 **한 번도 적용하지 않는 행**이 `wired: true` · `deficit: false`로 실렸다
 *   (SID_慧眼·SID_力まかせ·SID_武器相性激化 등 13종). 장부(skills.condition-fallback)는 조건 보유
 *   416행 중 201행이 죽은 것을 이미 아는데 산출물만 "결손 없음"이라고 **반대말**을 한 것이다 —
 *   오류도 경고도 없어 결손 목록에도 안 잡힌 채 잠드는 자리다. 층별 테스트로는 영원히 안 보인다.
 * ★한쪽만 고치면 다시 갈리므로 판정은 `strictIdents` **하나**를 통과해야 한다(그래서 공개했다).
 */
describe("★관통 — 룰북 비결손 행은 조건식이 실제로 평가된다", () => {
  interface RulebookSkill {
    sid: string;
    condition?: string;
    deficit: boolean;
  }
  const PROBE: Combatant = {
    stats: { maxHp: 30, hp: 30, str: 1, mag: 1, dex: 1, spd: 1, lck: 1, def: 1, res: 1, bld: 1 },
    weapon: { might: 1, hit: 1, crit: 0, weight: 1, kind: 1 },
    flow: { battleTimes: 1, totalOrder: 0 },
  };
  // 상대가 있어야 `相手の~`가 풀린다 — 없으면 멀쩡한 행이 통째로 미지 식별자가 된다.
  const evaluable = (condition: string): boolean => {
    try {
      evaluateFormula(parseFormula(condition), strictIdents(plainCombatEnv(PROBE, PROBE)));
      return true;
    } catch {
      return false;
    }
  };

  const rulebook = JSON.parse(
    readFileSync(new URL("../../../data/fe17/rulebook/rulebook.json", import.meta.url), "utf-8"),
  ) as {
    sections: {
      id: string;
      emblems?: { levels: { synchro?: RulebookSkill[]; engaged?: RulebookSkill[] }[] }[];
    }[];
  };
  const rows: RulebookSkill[] = (
    rulebook.sections.find((s) => s.id === "emblems")?.emblems ?? []
  ).flatMap((e) => e.levels.flatMap((lv) => [...(lv.synchro ?? []), ...(lv.engaged ?? [])]));

  it("산출물이 '결손 없음'이라고 쓴 행 중 조건식이 던지는 것은 하나도 없다", () => {
    expect(rows.length).toBeGreaterThan(0); // 룰북이 비면 이 테스트는 아무것도 안 지킨다
    const lying = rows.filter((r) => !r.deficit && r.condition !== undefined && !evaluable(r.condition));
    expect(lying.map((r) => r.sid)).toEqual([]);
  });

  it("실물 앵커 — 어휘가 없는 조건(SID_武器相性激化)은 지금도 죽어 있다(테스트가 공회전하지 않는다)", () => {
    expect(evaluable(SKILLS.SID_武器相性激化!.Condition!)).toBe(false);
    expect(rows.some((r) => r.sid === "SID_武器相性激化" && r.deficit)).toBe(true);
  });
});
