import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  createCalculator,
  forecastSide,
  toCombatant,
  type BattleMap,
  type UnitState,
} from "@fesim/engine";

/**
 * 장비 아이템의 능력치 강화(`ItemData.Enhance`) — 무기가 스탯을 올린다.
 *
 * 왜 위험했나: `Enhance.*`를 **도핑 아이템(약·깃털) 전용**이라고 오해하고 사영조차 하지 않았다.
 * 실제로는 **무기 35종**이 이 열을 든다 — 티르핑 마방+5 · 봉인의 검 수비/마방+5 ·
 * 빛의 검 행운+10 · 호신 체술 수비+5. `m004`에 `GID_シグルド`가 있으므로 **이미 발현 중인 결손**이었다
 * (엠블렘 무기를 드는 순간 실기와 방어 수치가 갈린다). 오류도 경고도 없어 화면으로는 안 보인다.
 *
 * 정본 = `UnitEnhanceCalculator.Commit1st`(0x1F74B40)가 **0x1F74C44에서 장착 아이템의 `Enhance`(0xB0)**를
 * 직접 읽는다(사슬 = `Unit.UpdateStateImpl` → `Unit.CommitEnhance` → `Commit1st`).
 * ☠**`u.stats`에 직접 더하지 않는다** — 레벨업 상한 판정(battle.ts rollGrowth)이 오염된다.
 * 전투 입력을 만드는 `toCombatant` 한 곳에서만 얹는다(예보와 reduce가 같은 사상을 쓴다).
 */

const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const calc = createCalculator(data);

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const plain = { might: 6, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
/** 시구르드 티르핑 계열 — 마방 +5. */
const tyrfing = { ...plain, enhance: { res: 5 } };
/** 뮤르그레 계열 — 속도 +5(추격 임계를 넘기는 자리). */
const mulagir = { ...plain, enhance: { spd: 5 } };

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

describe("장비 Enhance — toCombatant 한 곳에서만 얹는다", () => {
  it("무기의 enhance가 전투 입력 스탯에 더해진다", () => {
    const bare = toCombatant(unit({ id: "a", force: 0, x: 0, y: 0, weapon: plain }), map);
    const armed = toCombatant(unit({ id: "b", force: 0, x: 0, y: 0, weapon: tyrfing }), map);
    expect(bare.stats.res).toBe(5);
    expect(armed.stats.res).toBe(10);
  });

  it("enhance가 없는 무기·맨손은 스탯을 안 건드린다", () => {
    const withPlain = toCombatant(unit({ id: "a", force: 0, x: 0, y: 0, weapon: plain }), map);
    const bare = toCombatant(unit({ id: "b", force: 0, x: 0, y: 0 }), map);
    expect(withPlain.stats).toEqual(bare.stats);
  });

  /** ☠유닛 상태를 오염시키면 레벨업 상한 판정이 틀린다 — 얹는 것은 전투 입력뿐이다. */
  it("원본 UnitState.stats는 변하지 않는다", () => {
    const u = unit({ id: "a", force: 0, x: 0, y: 0, weapon: tyrfing });
    toCombatant(u, map);
    expect(u.stats.res).toBe(5);
  });

  it("마방 강화가 마법 피해를 실제로 줄인다(예보 관통)", () => {
    const mage = unit({ id: "m", force: 1, x: 1, y: 0, stats: { ...baseStats, mag: 12 },
      weapon: { might: 8, hit: 100, crit: 0, weight: 5, kind: 6, rangeMin: 1, rangeMax: 2, magic: true } });
    const bare = unit({ id: "a", force: 0, x: 0, y: 0, weapon: plain });
    const warded = unit({ id: "b", force: 0, x: 0, y: 0, weapon: tyrfing });
    const vsBare = forecastSide(calc, toCombatant(mage, map), toCombatant(bare, map));
    const vsWarded = forecastSide(calc, toCombatant(mage, map), toCombatant(warded, map));
    expect(vsBare.damage - vsWarded.damage).toBe(5);
  });

  /** ★속도 강화는 추격 임계를 넘긴다 — MP8 §4-8이 말하는 "화력은 계단"의 실물. */
  it("속도 강화가 추격 성립을 바꾼다", () => {
    const slowFoe = unit({ id: "e", force: 1, x: 1, y: 0, stats: { ...baseStats, spd: 7 }, weapon: plain });
    const bare = unit({ id: "a", force: 0, x: 0, y: 0, weapon: plain });
    const fast = unit({ id: "b", force: 0, x: 0, y: 0, weapon: mulagir });
    expect(forecastSide(calc, toCombatant(bare, map), toCombatant(slowFoe, map)).followUp).toBe(false);
    expect(forecastSide(calc, toCombatant(fast, map), toCombatant(slowFoe, map)).followUp).toBe(true);
  });
});
