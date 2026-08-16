import type { BattleAction, BattleEvent, Difficulty, StrikeKind } from "@fesim/shared";
import type { Calculator } from "./formula/calculator.js";
import { combatEnv, forecastSide, type Combatant, type CombatantWeapon } from "./formula/combat.js";
import type { FormulaEnv } from "./formula/evaluate.js";
import { movementRange, type MoveType } from "./range.js";
import type { SkillRow } from "./skills.js";
import { STAT_KEYS, type StatBlock } from "./stats.js";

/**
 * 전투 해결·턴 진행 — 계약: (국면, 행동, 난수소스) → 국면. 순수·불변.
 * 난수 소비 순서(리플레이 재현 계약): 타격마다 명중 롤 → 명중 시에만 필살 롤,
 * 레벨업 시 STAT_KEYS 순서로 스탯당 1롤. 이 순서가 바뀌면 기록 재생이 깨진다.
 * 타격 순서 = 본공격 → 체인어택 → 반격 → 공격측 추격 → 방어측 추격 (체인 위치는 가정 — 실기 반증 시 갱신).
 */
export interface RandomSource {
  /** [0, 100) 정수 — FE 판정 문법. */
  roll(): number;
}

export interface BattleWeapon extends CombatantWeapon {
  rangeMin: number;
  rangeMax: number;
  /** items.json Kind — 상성 판정의 입력. */
  kind: number;
  name?: string;
}

export interface UnitState {
  id: string;
  name?: string;
  force: number;
  x: number;
  y: number;
  hp: number;
  /** stats.hp = 최대 HP. */
  stats: StatBlock;
  weapon?: BattleWeapon;
  skills?: SkillRow[];
  /** 레벨업 확률 성장률(%) — 없으면 레벨업 시 스탯 상승 없음. */
  growth?: StatBlock;
  level: number;
  internalLevel?: number;
  exp: number;
  movePoints: number;
  moveType: MoveType;
  /** 직업 StyleName 원문 — 連携スタイル = 체인어택, 重装スタイル = 브레이크 면역. */
  style?: string;
  acted: boolean;
  dead: boolean;
  broken: boolean;
}

export interface BattleMap {
  width: number;
  height: number;
  costs: Partial<Record<MoveType, number[][]>>;
  terrain?: { avoid: number; def: number }[][];
}

export type { BattleAction, BattleEvent, Difficulty, StrikeKind } from "@fesim/shared";

export interface GameState {
  turn: number;
  /** 현재 페이즈의 군 (0 자군 · 1 적군 · 2 우군). */
  phase: number;
  difficulty?: Difficulty;
  map: BattleMap;
  units: UnitState[];
  outcome?: "victory" | "defeat";
  /** 직전 행동의 이벤트(휘발) — 리플레이 정본은 행동 로그다. */
  events: BattleEvent[];
}

export type Advantage = 1 | 0 | -1;

/** 상성 정본: 검(1)>도끼(3)>창(2)>검 · 체술(8)>활(4)/단검(5)/마도서(6), 역방향 없음. */
const BEATS: Record<number, number[]> = { 1: [3], 3: [2], 2: [1], 8: [4, 5, 6] };

export function weaponAdvantage(aKind: number, bKind: number): Advantage {
  if (BEATS[aKind]?.includes(bKind)) return 1;
  if (BEATS[bKind]?.includes(aKind)) return -1;
  return 0;
}

const DIFFICULTY_SYMBOL: Record<Difficulty, string> = { n: "ノーマル", h: "ハード", l: "ルナティック" };

const manhattan = (a: UnitState, b: UnitState) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const inWeaponRange = (u: UnitState, distance: number): boolean =>
  u.weapon !== undefined && distance >= u.weapon.rangeMin && distance <= u.weapon.rangeMax;

function toCombatant(u: UnitState, map: BattleMap): Combatant {
  const tile = map.terrain?.[u.y]?.[u.x];
  return {
    stats: { ...u.stats, maxHp: u.stats.hp, hp: u.hp },
    weapon: u.weapon,
    terrain: { avoid: tile?.avoid ?? 0, def: tile?.def ?? 0 },
    skills: u.skills,
  };
}

export function createReducer(calc: Calculator) {
  function expEnv(self: UnitState, foe: UnitState, chainCount: number, difficulty: Difficulty): FormulaEnv {
    const varsOf = (u: UnitState): Record<string, number | string> => ({
      レベル: u.level,
      内部レベル: u.internalLevel ?? 0,
      与戦闘経験累積数: 0,
      MaxHP: u.stats.hp,
      難易度: DIFFICULTY_SYMBOL[difficulty],
      闘技場中: 0,
      クリア済み: 0,
      チェインアタック回数: chainCount,
    });
    const selfVars = varsOf(self);
    const foeVars = varsOf(foe);
    const foeEnv: FormulaEnv = { lookup: (n) => foeVars[n] };
    return { lookup: (n) => selfVars[n], opponent: () => foeEnv };
  }

  return function reduce(state: GameState, action: BattleAction, rng: RandomSource): GameState {
    const events: BattleEvent[] = [];
    const units = state.units.map((u) => ({ ...u }));
    const byId = new Map(units.map((u) => [u.id, u]));
    const require = (id: string): UnitState => {
      const u = byId.get(id);
      if (u === undefined || u.dead) throw new Error(`유닛 없음/사망: ${id}`);
      return u;
    };
    const assertActable = (u: UnitState): void => {
      if (u.force !== state.phase) throw new Error(`페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다`);
      if (u.acted) throw new Error(`행동 완료 유닛: ${u.id}`);
    };

    switch (action.type) {
      case "move": {
        const u = require(action.unit);
        assertActable(u);
        const grid = state.map.costs[u.moveType];
        if (grid === undefined) throw new Error(`이동타입 코스트 없음: ${u.moveType}`);
        const reachable = movementRange({
          width: state.map.width,
          height: state.map.height,
          movePoints: u.movePoints,
          start: { x: u.x, y: u.y },
          costAt: (x, y) => grid[y]?.[x] ?? 255,
          blocked: (x, y) => {
            const o = units.find((v) => !v.dead && v.x === x && v.y === y);
            return o !== undefined && o.force !== u.force;
          },
          occupied: (x, y) => {
            const o = units.find((v) => !v.dead && v.x === x && v.y === y && v !== u);
            return o !== undefined && o.force === u.force;
          },
        });
        if (!reachable.some((t) => t.x === action.x && t.y === action.y)) {
          throw new Error(`불법 이동: (${action.x}, ${action.y})는 이동 범위 밖`);
        }
        u.x = action.x;
        u.y = action.y;
        break;
      }

      case "wait": {
        const u = require(action.unit);
        assertActable(u);
        u.acted = true;
        break;
      }

      case "attack": {
        const attacker = require(action.unit);
        const defender = require(action.target);
        assertActable(attacker);
        if (attacker.force === defender.force) throw new Error("같은 군은 공격할 수 없다");
        const distance = manhattan(attacker, defender);
        if (!inWeaponRange(attacker, distance)) throw new Error("사거리 밖 공격");

        const attackerC = toCombatant(attacker, state.map);
        const defenderC = toCombatant(defender, state.map);
        const atkF = forecastSide(calc, attackerC, defenderC);
        const defF = forecastSide(calc, defenderC, attackerC);
        const advantage =
          attacker.weapon !== undefined && defender.weapon !== undefined
            ? weaponAdvantage(attacker.weapon.kind, defender.weapon.kind)
            : 0;

        // 체인어택: 공격측 군의 연계 스타일 유닛 중 대상이 자기 무기 사거리 안인 유닛.
        const chainUnits = units.filter(
          (u) =>
            !u.dead &&
            u.force === attacker.force &&
            u !== attacker &&
            u.style === "連携スタイル" &&
            inWeaponRange(u, manhattan(u, defender)),
        );

        const strike = (
          from: UnitState,
          to: UnitState,
          kind: StrikeKind,
          numbers: { damage: number; hitRate: number; critRate: number },
        ): void => {
          if (from.dead || to.dead) return;
          const hit = rng.roll() < numbers.hitRate;
          // 명중 시에만 필살 롤 — 롤 소비 순서는 리플레이 계약.
          const crit = hit && numbers.critRate > 0 ? rng.roll() < numbers.critRate : false;
          const damage = hit ? numbers.damage * (crit ? 3 : 1) : 0;
          to.hp = Math.max(to.hp - damage, 0);
          events.push({ type: "strike", attacker: from.id, defender: to.id, kind, hit, crit, damage, hpAfter: to.hp });
          if (hit && kind === "attack" && advantage === 1 && from === attacker) {
            // 브레이크: 개시측 상성 유리 + 명중. 중장·브레이크무효 스킬 면역. 무기 없으면 무의미.
            const immune =
              to.style === "重装スタイル" || to.skills?.some((s) => s.Sid === "SID_相性ブレイク無効") === true;
            if (!immune && to.weapon !== undefined && !to.broken) {
              to.broken = true;
              events.push({ type: "break", unit: to.id });
            }
          }
          if (to.hp === 0 && !to.dead) {
            to.dead = true;
            events.push({ type: "death", unit: to.id });
          }
        };

        strike(attacker, defender, "attack", atkF);
        const chainNumbers = (backup: UnitState) => {
          const env = combatEnv(toCombatant(backup, state.map), defenderC);
          return {
            damage: Math.floor(calc.eval("チェインアタック威力計算", env) as number),
            hitRate: calc.eval("チェインアタック命中率計算", env) as number,
            critRate: calc.eval("チェインアタック必殺率計算", env) as number,
          };
        };
        for (const backup of chainUnits) strike(backup, defender, "chain", chainNumbers(backup));
        const canCounter = () =>
          !defender.dead && !defender.broken && inWeaponRange(defender, distance);
        if (canCounter()) strike(defender, attacker, "counter", defF);
        if (atkF.followUp) strike(attacker, defender, "followUp", atkF);
        if (defF.followUp && canCounter()) strike(defender, attacker, "counterFollowUp", defF);

        attacker.acted = true;

        // 경험치: 자군만(적/우군 성장은 재현 대상 아님 — 인게임 문법).
        if (attacker.force === 0 && !attacker.dead) {
          const difficulty = state.difficulty ?? "n";
          const formula = defender.dead ? "撃破経験計算" : "戦闘経験計算";
          const gained = Math.floor(
            calc.eval(formula, expEnv(attacker, defender, 0, difficulty)) as number,
          );
          if (gained > 0) {
            attacker.exp += gained;
            events.push({ type: "exp", unit: attacker.id, amount: gained, total: attacker.exp });
            while (attacker.exp >= 100) {
              attacker.exp -= 100;
              attacker.level += 1;
              const gains: Partial<StatBlock> = {};
              const stats = { ...attacker.stats };
              for (const key of STAT_KEYS) {
                const grow = attacker.growth?.[key] ?? 0;
                if (rng.roll() < grow) {
                  stats[key] += 1;
                  gains[key] = 1;
                }
              }
              attacker.stats = stats;
              if (gains.hp !== undefined) attacker.hp += gains.hp; // 최대 HP 상승분은 현재 HP에도
              events.push({ type: "levelUp", unit: attacker.id, level: attacker.level, gains });
            }
          }
        }
        break;
      }

      case "endPhase": {
        const forces = [...new Set(units.filter((u) => !u.dead).map((u) => u.force))].sort();
        if (forces.length > 0) {
          const idx = forces.indexOf(state.phase);
          const nextForce = forces[(idx + 1) % forces.length] ?? forces[0];
          const wrapped = forces.indexOf(nextForce) <= idx || idx < 0;
          const next: GameState = {
            ...state,
            phase: nextForce,
            turn: wrapped && nextForce === forces[0] ? state.turn + 1 : state.turn,
            units: units.map((u) =>
              u.force === nextForce ? { ...u, acted: false, broken: false } : u,
            ),
            events: [{ type: "phase", phase: nextForce, turn: state.turn }],
          };
          return next;
        }
        break;
      }
    }

    // 승패 판정: 적군 전멸 = 승리, 자군 전멸 = 패배 (챕터 고유 조건은 후속 — Lua 이벤트 엔진 몫).
    let outcome = state.outcome;
    if (outcome === undefined) {
      const alive = (force: number) => units.some((u) => u.force === force && !u.dead);
      if (!alive(1) && units.some((u) => u.force === 1)) outcome = "victory";
      else if (!alive(0) && units.some((u) => u.force === 0)) outcome = "defeat";
      if (outcome !== undefined) events.push({ type: "outcome", outcome });
    }

    return { ...state, units, events, outcome };
  };
}
