/**
 * FESim 룰 엔진 — 계약: (국면, 행동, 난수소스) → 다음 국면.
 * 순수 함수 라이브러리: 입력을 변이하지 않고, 난수는 항상 주입받는다
 * (기록 재생 = 리플레이 · 실굴림 = 샌드박스 · 열거 = 솔버가 같은 코어를 공유).
 */
export {
  canBreak,
  canDance,
  createReducer,
  canterPower,
  itemTargets,
  moveBudget,
  staffHealAmount,
  toCombatant,
  weaponAdvantage,
  type Advantage,
  type BattleAction,
  type BattleEvent,
  type BattleMap,
  type BattleWeapon,
  type Difficulty,
  type GameState,
  type RandomSource,
  type StrikeKind,
  type SupportEffects,
  type UnitState,
} from "./battle.js";

export {
  createReplayer,
  recordingSource,
  sequenceSource,
  toAddress,
  toCursor,
  ReplayDesyncError,
  RULE_VERSION,
  type PhaseName,
  type PhaseSpan,
  type RecordingSource,
  type Reduce,
  type StepAddress,
  type Timeline,
  type VerifyMismatch,
  type VerifyResult,
} from "./replay.js";

export {
  attackRange,
  movementPath,
  movementRange,
  IMPASSABLE,
  MOVE_TYPES,
  type MoveQuery,
  type MoveType,
  type ReachableTile,
  type Tile,
} from "./range.js";
export { makeSkillModifier, staticEnhances, type SkillRow } from "./skills.js";
export type { ConsumableItem, StaffItem } from "@fesim/shared";
export {
  deriveStats,
  grownLevels,
  STAT_KEYS,
  type DeriveStatsInput,
  type StatBlock,
  type StatKey,
} from "./stats.js";
export { parseFormula, type FormulaNode, type BinaryOp } from "./formula/parser.js";
export { evaluateFormula, type FormulaEnv, type FormulaValue } from "./formula/evaluate.js";
export { createCalculator, type Calculator } from "./formula/calculator.js";
export { hitThreshold10000, isHit, isProbability100 } from "./formula/probability.js";
export {
  combatEnv,
  forecastSide,
  type Combatant,
  type CombatantStats,
  type CombatantWeapon,
  type SideForecast,
} from "./formula/combat.js";
