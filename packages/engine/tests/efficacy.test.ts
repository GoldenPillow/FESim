import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  effectiveSkills,
  forecastSide,
  toCombatant,
  type BattleMap,
  type SkillRow,
  type UnitState,
} from "@fesim/engine";

/**
 * 특효(特効) — ★정본 = BattleDetail.CalcAttack(0x1E744E8~, shared CombatantWeapon.effective 독스트링):
 * (1) 판정 = 공격자 스킬 Efficacy 마스크 ∩ (대상 person|job Attrs) ∖ (대상 스킬 EfficacyIgnore 합집합),
 * (2) 배율 = 걸린 스킬 EfficacyValue **최댓값**(합산 아님, 평시 1 · 특효 3 · 邪竜特効만 2),
 * (3) 적용 = 攻撃力計算의 武器攻撃力에만 곱한다(유닛 공격력엔 안 곱함).
 * 특효 스킬의 원천 = 무기 EquipSids(아머킬러 → SID_鎧特効) — 장비 중에만 유효.
 */

const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const ARMOR_SLAYER: SkillRow = { Sid: "SID_鎧特効", Efficacy: 4, EfficacyValue: 3, EfficacyIgnore: 0 };
const NULL_EFFICACY: SkillRow = { Sid: "SID_特効無効_効果", EfficacyIgnore: 127 };
const killer = { might: 6, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1, sids: [ARMOR_SLAYER] };

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

const map: BattleMap = { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } };

describe("특효 판정·배율", () => {
  it("아머킬러 vs 중장(Attrs 4) = 무기 위력만 ×3 · 비중장은 ×1", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: killer });
    const armor = unit({ id: "k", force: 1, x: 1, y: 0, attrs: 4 | 1 });
    const foot = unit({ id: "f", force: 1, x: 2, y: 0, attrs: 1 });
    const hitArmor = forecastSide(calc, toCombatant(a, map), toCombatant(armor, map));
    const hitFoot = forecastSide(calc, toCombatant(a, map), toCombatant(foot, map));
    // 위력 = (힘10 + 6×3) − 수5 = 23 (무기 위력에만 ×3 — 힘까지 곱하면 33으로 어긋난다)
    expect(hitArmor.damage).toBe(23);
    expect(hitFoot.damage).toBe(11); // 10 + 6 − 5
  });

  it("대상의 특効無効(EfficacyIgnore 127)는 특효를 지운다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: killer });
    const guarded = unit({ id: "g", force: 1, x: 1, y: 0, attrs: 4, skills: [NULL_EFFICACY] });
    const f = forecastSide(calc, toCombatant(a, map), toCombatant(guarded, map));
    expect(f.damage).toBe(11);
  });

  it("무기 EquipSids는 장비 중에만 유효 스킬에 합류한다", () => {
    const withKiller = unit({ id: "a", force: 0, x: 0, y: 0, weapon: killer });
    const bare = unit({ id: "b", force: 0, x: 0, y: 0 });
    expect(effectiveSkills(withKiller)?.some((s) => s.Sid === "SID_鎧特効")).toBe(true);
    expect(effectiveSkills(bare)?.some((s) => s.Sid === "SID_鎧特効")).not.toBe(true);
  });

  it("스냅숏이 effective를 명시하면 그 값이 우선한다(주입 계약 유지)", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: { ...killer, effective: 1 } });
    const armor = unit({ id: "k", force: 1, x: 1, y: 0, attrs: 4 });
    const f = forecastSide(calc, toCombatant(a, map), toCombatant(armor, map));
    expect(f.damage).toBe(11);
  });
});
