import type { Calculator } from "./calculator.js";
import type { FormulaEnv, FormulaValue } from "./evaluate.js";
import { makeSkillModifier, type SkillRow } from "../skills.js";

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

import type { CombatantWeapon } from "@fesim/shared";
export type { CombatantWeapon } from "@fesim/shared";

export interface Combatant {
  stats: CombatantStats;
  weapon?: CombatantWeapon;
  support?: { hit?: number; avoid?: number; crit?: number; dodge?: number };
  terrain?: { avoid?: number; def?: number };
  /** 전투 시 계산값 보정 스킬(간파 등). 정적 보정(EnhanceValue)은 stats에 이미 반영돼 있어야 한다. */
  skills?: readonly SkillRow[];
  /** 이 전투를 건 쪽인가 — 스킬 Stand 게이트. 전투 내내 고정이다. */
  initiator?: boolean;
  /** 이번 타격에서 때리는 쪽인가 — 스킬 Action 게이트. 공격·반격마다 뒤집힌다. */
  striking?: boolean;
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
  const plain: FormulaEnv = {
    lookup: (name) => vars[name],
    opponent: foe ? () => combatEnv(foe, self) : undefined,
  };
  if (self.skills === undefined || self.skills.length === 0) return plain;
  return {
    ...plain,
    modify: makeSkillModifier(self.skills, plain, {
      initiator: self.initiator,
      striking: self.striking,
    }),
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

/** 표시 규칙(실측): 소수는 계산 내내 유지, 표시 직전에 내림 후 0..100 클램프. */
const displayClamp = (value: FormulaValue): number =>
  Math.min(Math.max(Math.floor(value as number), 0), 100);

export function forecastSide(calc: Calculator, self: Combatant, foe: Combatant): SideForecast {
  const env = combatEnv(self, foe);
  return {
    // 威力는 [0,999] 클램프 후 **정수 절사**가 정본이다(SimplePowerParam). 필살 3배는 이 정수에 곱해진다 —
    // 소수를 들고 가면 trunc(x)*3 과 trunc(x*3) 이 갈려 보정 스킬이 붙는 순간 대미지가 어긋난다.
    damage: Math.trunc(Math.min(Math.max(calc.eval("威力計算", env) as number, 0), 999)),
    hitRate: displayClamp(calc.eval("命中率計算", env)),
    critRate: displayClamp(calc.eval("必殺率計算", env)),
    attackSpeed: calc.eval("攻撃速度計算", env) as number,
    followUp: calc.eval("追撃条件", env) === 1,
  };
}
