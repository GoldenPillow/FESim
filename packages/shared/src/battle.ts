/**
 * 전투 어휘 — 엔진이 아니라 shared가 소유한다: .eph 기보 스키마가 행동·이벤트를 담으므로
 * 여기 두지 않으면 shared → engine 역방향 의존이 생긴다(의존은 단방향으로 유지).
 * 엔진(packages/engine)은 이 타입들을 재수출하므로 소비자 import 경로는 바뀌지 않는다.
 */
export interface StatBlock {
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

export const STAT_KEYS = ["hp", "str", "mag", "dex", "spd", "lck", "def", "res", "bld"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type Difficulty = "n" | "h" | "l";

export type StrikeKind = "attack" | "counter" | "followUp" | "counterFollowUp" | "chain";

export type BattleEvent =
  | { type: "strike"; attacker: string; defender: string; kind: StrikeKind; hit: boolean; crit: boolean; damage: number; hpAfter: number }
  | { type: "break"; unit: string }
  | { type: "breakRelease"; unit: string }
  | { type: "death"; unit: string }
  | { type: "exp"; unit: string; amount: number; total: number }
  | { type: "levelUp"; unit: string; level: number; gains: Partial<StatBlock> }
  | { type: "phase"; phase: number; turn: number }
  | { type: "outcome"; outcome: "victory" | "defeat" };

export type BattleAction =
  | { type: "move"; unit: string; x: number; y: number }
  | { type: "attack"; unit: string; target: string }
  | { type: "wait"; unit: string }
  | { type: "endPhase" };
