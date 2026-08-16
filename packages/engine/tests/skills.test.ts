import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  combatEnv,
  createCalculator,
  evaluateFormula,
  forecastSide,
  makeSkillModifier,
  parseFormula,
  staticEnhances,
  type Combatant,
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
