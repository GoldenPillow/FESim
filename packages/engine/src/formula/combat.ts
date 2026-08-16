import type { Calculator } from "./calculator.js";
import type { FormulaEnv, FormulaValue } from "./evaluate.js";

/**
 * 전투 예보 파사드 — 유닛 스냅숏을 DSL 변수 환경으로 사상하고
 * 예보 패널이 쓰는 값(위력·명중·필살·공속·추격)을 원문 공식으로 계산한다.
 * 스탯 키는 인게임 순정 스탯의 영문 관례(str/mag/dex/spd/lck/def/res/bld).
 */
export interface CombatantStats {
  maxHp: number;
  hp: number;
  str: number;
  mag: number;
  dex: number;
  spd: number;
  lck: number;
  def: number;
  res: number;
  bld: number;
}

export interface CombatantWeapon {
  might: number;
  hit: number;
  crit: number;
  weight: number;
  avoid?: number;
  dodge?: number;
  magic?: boolean;
  /** 특효 배율(武器特効). 특효 발동 시 2, 평시 1. */
  effective?: number;
}

export interface Combatant {
  stats: CombatantStats;
  weapon?: CombatantWeapon;
  support?: { hit?: number; avoid?: number; crit?: number; dodge?: number };
  terrain?: { avoid?: number; def?: number };
}

export function combatEnv(self: Combatant, foe?: Combatant): FormulaEnv {
  const { stats, weapon, support, terrain } = self;
  const vars: Record<string, FormulaValue> = {
    力: stats.str,
    魔力: stats.mag,
    技: stats.dex,
    速さ: stats.spd,
    幸運: stats.lck,
    体格: stats.bld,
    守備: stats.def,
    魔防: stats.res,
    HP: stats.hp,
    MaxHP: stats.maxHp,
    攻撃属性: weapon?.magic ? "魔法属性" : "物理属性",
    武器攻撃力: weapon?.might ?? 0,
    武器命中: weapon?.hit ?? 0,
    武器必殺: weapon?.crit ?? 0,
    武器の重さ: weapon?.weight ?? 0,
    武器回避: weapon?.avoid ?? 0,
    武器必殺回避: weapon?.dodge ?? 0,
    武器特効: weapon?.effective ?? 1,
    支援命中: support?.hit ?? 0,
    支援回避: support?.avoid ?? 0,
    支援必殺: support?.crit ?? 0,
    支援必殺回避: support?.dodge ?? 0,
    地形回避: terrain?.avoid ?? 0,
    地形防御: terrain?.def ?? 0,
  };
  return {
    lookup: (name) => vars[name],
    opponent: foe ? () => combatEnv(foe, self) : undefined,
  };
}

export interface SideForecast {
  damage: number;
  /** 표시 명중률·필살률 — 인게임 예보처럼 0..100으로 클램프한 값. */
  hitRate: number;
  critRate: number;
  attackSpeed: number;
  followUp: boolean;
}

const displayClamp = (value: FormulaValue): number =>
  Math.min(Math.max(value as number, 0), 100);

export function forecastSide(calc: Calculator, self: Combatant, foe: Combatant): SideForecast {
  const env = combatEnv(self, foe);
  return {
    damage: calc.eval("威力計算", env) as number,
    hitRate: displayClamp(calc.eval("命中率計算", env)),
    critRate: displayClamp(calc.eval("必殺率計算", env)),
    attackSpeed: calc.eval("攻撃速度計算", env) as number,
    followUp: calc.eval("追撃条件", env) === 1,
  };
}
