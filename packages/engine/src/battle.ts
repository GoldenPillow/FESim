import type {
  BattleAction,
  BattleEvent,
  BattleWeapon,
  ConsumableItem,
  Difficulty,
  StaffItem,
  StrikeKind,
  SupportEffect,
  SupportLevel,
} from "@fesim/shared";
import type { Calculator } from "./formula/calculator.js";
import { combatEnv, forecastSide, type Combatant } from "./formula/combat.js";
import type { FormulaEnv } from "./formula/evaluate.js";
import { isHit, isProbability100 } from "./formula/probability.js";
import { movementRange, type MoveType } from "./range.js";
import type { SkillRow } from "./skills.js";
import { STAT_KEYS, type StatBlock } from "./stats.js";

/**
 * 전투 해결·턴 진행 — 계약: (국면, 행동, 난수소스) → 국면. 순수·불변.
 * 난수 소비 순서(리플레이 재현 계약): 타격마다 명중 롤 → 명중 시에만 필살 롤,
 * 레벨업 시 STAT_KEYS 순서로 스탯당 1롤. 이 순서가 바뀌면 기록 재생이 깨진다.
 * 타격 순서 = 체인어택 → 본공격 → 반격 → 공격측 추격 → 방어측 추격 (체인이 먼저인 것은 코드 확정, il2cpp/SEQUENCE_BREAK).
 */
export interface RandomSource {
  /**
   * `[0, bound)` 정수 — 게임의 `Random.GetValue(bound)`에 대응한다.
   * 판정마다 해상도가 다르다(명중 10000 · 일반 확률 100000 · 성장 100)는 것이 인게임 사실이라
   * 상한을 호출부가 넘긴다. 기보에는 굴린 값이 그대로 박히므로 이 상한 규약이 곧 리플레이 계약이다.
   */
  next(bound: number): number;
}

export type { BattleWeapon } from "@fesim/shared";

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
  /** 소지 공격 무기 목록 — attack.weapon 인덱스의 해석 대상. 부재 = 장비 무기 고정. */
  weapons?: BattleWeapon[];
  /** 소지 지팡이 목록 — staff.staff 인덱스의 해석 대상. 잔여 사용 횟수는 국면 상태다(사용마다 감소). */
  staves?: StaffItem[];
  /** 사용형 아이템 목록 — item.item 인덱스의 해석 대상. 잔여 횟수는 국면 상태다. */
  consumables?: ConsumableItem[];
  skills?: SkillRow[];
  /** 레벨업 확률 성장률(%) — 없으면 레벨업 시 스탯 상승 없음. */
  growth?: StatBlock;
  /** 스탯 상한(job.Limit + person.Limit). 지정 시 성장이 여기서 막힌다 — 미지정이면 무제한. */
  cap?: StatBlock;
  level: number;
  internalLevel?: number;
  exp: number;
  movePoints: number;
  moveType: MoveType;
  /** 직업 StyleName 원문 — 連携スタイル = 체인어택, 重装スタイル = 브레이크 면역. */
  style?: string;
  /** person.xml SupportCategory 원문(デフォルト·バランス·命中·必殺·回避·必殺回避) — 支援効果 표의 행 키. */
  supportCategory?: string;
  /**
   * 파트너 유닛 id → 현재 支援レベル. 랭크 진행은 덤프에 없다(진행 소유) — 여기가 주입 통로다.
   * 없으면 지원 보정 없음(무회귀).
   */
  supports?: Record<string, SupportLevel>;
  acted: boolean;
  dead: boolean;
  broken: boolean;
  /**
   * 이 창(행동 전/후 각각)에서 이미 이동했는가 — 부재 = false.
   * 행동(공격·대기)이 false로 리셋해 재이동(시구르드) 창을 열고, 페이즈 복귀 시에도 리셋.
   */
  moved?: boolean;
}

/**
 * 재이동(시구르드 싱크로) 이동 칸수 — 행동 후에만 유효, 없으면 undefined.
 * 거리 정본 = skills.json Power(재이동=2·재이동+=3, 공식 도움말 실측 일치). 지형 코스트 적용은 가정(실기 반증 시 갱신).
 */
export function canterPower(u: UnitState): number | undefined {
  let best: number | undefined;
  for (const s of u.skills ?? []) {
    if (!s.Sid.startsWith("SID_再移動")) continue;
    if (typeof s.Power === "number" && (best === undefined || s.Power > best)) best = s.Power;
  }
  return best;
}

/**
 * 이 창에서 남은 이동 예산 — 행동 전 = 이동력(이동 후 0 = 제자리 행동만) ·
 * 행동 후 = 재이동 Power 1회 · 불가 = undefined. ☠UI 중복 구현 금지 — reduce와 UI가 이 함수만 소비한다
 * (중복이 2026-08-16 베타 이동 결함의 원인 — design/verification.md C4).
 */
export function moveBudget(u: UnitState): number | undefined {
  if (!u.acted) return u.moved === true ? 0 : u.movePoints;
  if (u.moved === true) return undefined;
  return canterPower(u);
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

/**
 * 브레이크 면역 SID. 相性 한정판 외에 汎用 SID_ブレイク無効(41 인물 LunaticSids)과
 * 그 부여 효과 SID_ブレイク無効_効果(熟練者·ヘクトルエンゲージ技가 SyncSids로 부여)가 별개로 실재한다.
 */
const BREAK_IMMUNE_SIDS = new Set([
  "SID_相性ブレイク無効",
  "SID_ブレイク無効",
  "SID_ブレイク無効_効果",
  "SID_EN_技の薬_効果_ブレイク無効",
]);

const manhattan = (a: UnitState, b: UnitState) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * 브레이크 가능 판정(명중·대미지 조건 제외) — 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 * 코드 확정 조건: 상성 유리 + 대상 무장 + 미브레이크, 중장 스타일·브레이크무효 SID 면역.
 */
export function canBreak(from: UnitState, to: UnitState): boolean {
  if (from.weapon === undefined || to.weapon === undefined || to.broken) return false;
  if (weaponAdvantage(from.weapon.kind, to.weapon.kind) !== 1) return false;
  if (to.style === "重装スタイル") return false;
  return to.skills?.some((s) => BREAK_IMMUNE_SIDS.has(s.Sid)) !== true;
}

const inWeaponRange = (u: UnitState, distance: number): boolean =>
  u.weapon !== undefined && distance >= u.weapon.rangeMin && distance <= u.weapon.rangeMax;

/** 한 레벨에 이만큼도 못 올리면 다시 굴린다 — Unit.GrowAbortCount. */
const GROW_ABORT = 2;
/** 재굴림 포함 최대 시도 수 — Unit.LevelUpRetryMax. */
const GROW_ATTEMPTS = 4;

/**
 * 레벨업 성장 롤 — 정본 = App.Unit.LevelUp(RVA 0x1A3A040) GrowMode.Random 경로.
 *
 * 게임은 "획득 스탯이 abort 미만이면 최대 4시도까지 다시 굴리고 최선 시도를 채택"한다.
 * 난수는 시도 사이에 이어지므로(같은 Random 인스턴스) 소비 개수가 결과에 따라 달라진다 —
 * 기보 재생이 이 소비 순서에 걸려 있으니 시도 구조를 그대로 옮긴다.
 * 증가 1회마다 상한을 다시 확인하는 것도 원본 그대로다(확정 가산분도 캡을 못 뚫는다).
 */
function rollGrowth(unit: UnitState, rng: RandomSource): Partial<StatBlock> {
  let best: Partial<StatBlock> = {};
  let bestCount = 0;
  for (let attempt = 0; attempt < GROW_ATTEMPTS; attempt++) {
    const gains: Partial<StatBlock> = {};
    let count = 0;
    for (const key of STAT_KEYS) {
      // 성장률 상한은 255다 — 100 절사가 아니다(person.Grow 실측 최대 105).
      let grow = Math.min(Math.max(unit.growth?.[key] ?? 0, 0), 255);
      if (grow === 0) continue;
      const cap = unit.cap?.[key];
      const room = (): boolean => cap === undefined || unit.stats[key] + (gains[key] ?? 0) < cap;
      const grant = (): void => {
        if (!room()) return;
        gains[key] = (gains[key] ?? 0) + 1;
        count += 1;
      };
      while (grow > 99) {
        grow -= 100;
        grant();
      }
      // 잔여가 0이면 게임도 난수를 보지 않는다(IsProbability100이 percent<=0에서 즉시 false).
      if (grow > 0 && isProbability100(grow, rng.next(100000))) grant();
    }
    if (count > bestCount) {
      best = gains;
      bestCount = count;
    }
    if (bestCount >= GROW_ABORT) break;
  }
  return best;
}

/**
 * 지팡이 회복량 = 위력 + floor(마력/2), 잃은 HP 상한 — CalcRodHit 0x2473E10 판독(il2cpp/EXP_CHAIN_ENGAGE §7).
 * 예보 UI와 reduce가 같은 판정을 써야 한다(중복 구현 금지).
 */
export function staffHealAmount(healer: UnitState, target: UnitState, staff: StaffItem): number {
  const missing = Math.max(target.stats.hp - target.hp, 0);
  return Math.min(staff.power + Math.floor(healer.stats.mag / 2), missing);
}

/**
 * 아이템 범위 회복 대상 — 자신 포함, 같은 군, 반경(맨해튼) 내, 손상 유닛만.
 * 傷薬 = "자신과 주위 2칸 아군 회복"(공식 도움말 원문). 예보 UI와 reduce가 같은 판정을 쓴다(중복 구현 금지).
 */
export function itemTargets(
  user: UnitState,
  units: readonly UnitState[],
  item: ConsumableItem,
): UnitState[] {
  return units.filter(
    (u) => !u.dead && u.force === user.force && manhattan(u, user) <= item.range && u.hp < u.stats.hp,
  );
}

/** supports.json effects — [SupportCategory][支援レベル]. 수치의 정본은 이 표뿐이다(엔진 박제 금지). */
export type SupportEffects = Record<string, Record<string, SupportEffect>>;

/**
 * 인접 아군 지원(絆) 보정 — 表 = reliance.xml 支援効果(archetype × Level 1~4 = C/B/A/A+).
 * 아래 넷은 전부 실행파일 코드로 확정됐다(il2cpp/SUPPORT.md) — 더는 가정이 아니다:
 *  - 거리 = 맨해튼 1. SupportCalculator.Range=1 + MapFor.EachRange(near=1,far=1)의 |dx|+|dz| 게이트라 대각은 미발동.
 *  - archetype = 파트너의 SupportCategory. TryGetSupportData가 파트너 쪽만 인덱싱한다(수혜자 아님).
 *  - 복수 파트너 = 단순 합산, 상한 없음(MaxShowUnits=4는 UI 표시 슬롯일 뿐 보정과 무관).
 *  - 파트너 자격 = 엄격 동일 세력. ☠동맹(우군)까지 넓히는 것은 반증된 변경이다.
 */
function supportOf(
  u: UnitState,
  units: readonly UnitState[],
  effects: SupportEffects | undefined,
): Combatant["support"] {
  if (effects === undefined || u.supports === undefined) return undefined;
  const total = { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  let found = false;
  for (const partner of units) {
    // id 비교 — 예보는 잠정 위치의 사본을 넘기므로 참조 동일성을 믿을 수 없다.
    if (partner.id === u.id || partner.dead || partner.force !== u.force) continue;
    const level = u.supports[partner.id];
    if (level === undefined || manhattan(u, partner) !== 1) continue;
    const row = effects[partner.supportCategory ?? ""]?.[String(level)];
    if (row === undefined) continue;
    total.hit += row.Hit;
    total.avoid += row.Avoid;
    total.crit += row.Critical;
    total.dodge += row.Secure;
    found = true;
  }
  return found ? total : undefined;
}

/** 유닛 스냅숏 → 전투 계산 입력. 예보 UI와 reduce가 같은 사상을 써야 한다(중복 구현 금지). */
export function toCombatant(
  u: UnitState,
  map: BattleMap,
  units: readonly UnitState[] = [],
  supportEffects?: SupportEffects,
): Combatant {
  const tile = map.terrain?.[u.y]?.[u.x];
  return {
    stats: { ...u.stats, maxHp: u.stats.hp, hp: u.hp },
    weapon: u.weapon,
    terrain: { avoid: tile?.avoid ?? 0, def: tile?.def ?? 0 },
    skills: u.skills,
    support: supportOf(u, units, supportEffects),
  };
}

export function createReducer(calc: Calculator, supportEffects?: SupportEffects) {
  function expEnv(
    self: UnitState,
    foe: UnitState,
    chainCount: number,
    difficulty: Difficulty,
    extra?: Record<string, number>,
  ): FormulaEnv {
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
    const selfVars = { ...varsOf(self), ...extra };
    const foeVars = varsOf(foe);
    const foeEnv: FormulaEnv = { lookup: (n) => foeVars[n] };
    return { lookup: (n) => selfVars[n], opponent: () => foeEnv };
  }

  /** 경험치 가산 + 100 단위 레벨업(성장 롤 소비) — 전투·지팡이가 같은 경로를 쓴다(중복 구현 금지). */
  function grantExp(u: UnitState, gained: number, events: BattleEvent[], rng: RandomSource): void {
    if (gained <= 0) return;
    u.exp += gained;
    events.push({ type: "exp", unit: u.id, amount: gained, total: u.exp });
    while (u.exp >= 100) {
      u.exp -= 100;
      u.level += 1;
      const gains = rollGrowth(u, rng);
      const stats = { ...u.stats };
      for (const key of STAT_KEYS) {
        const gain = gains[key];
        if (gain !== undefined) stats[key] += gain;
      }
      u.stats = stats;
      if (gains.hp !== undefined) u.hp += gains.hp; // 최대 HP 상승분은 현재 HP에도
      events.push({ type: "levelUp", unit: u.id, level: u.level, gains });
    }
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
        if (u.force !== state.phase) throw new Error(`페이즈 위반: ${u.id}는 지금 군의 유닛이 아니다`);
        if (u.moved === true) throw new Error(`재이동 불가: ${u.id}는 이 창에서 이미 이동했다`);
        const budget = moveBudget(u);
        if (budget === undefined) throw new Error(`행동 완료 유닛: ${u.id}`);
        const grid = state.map.costs[u.moveType];
        if (grid === undefined) throw new Error(`이동타입 코스트 없음: ${u.moveType}`);
        const reachable = movementRange({
          width: state.map.width,
          height: state.map.height,
          movePoints: budget,
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
        u.moved = true;
        break;
      }

      case "wait": {
        const u = require(action.unit);
        assertActable(u);
        u.acted = true;
        u.moved = false; // 행동이 재이동(시구르드) 창을 연다
        break;
      }

      case "attack": {
        const attacker = require(action.unit);
        const defender = require(action.target);
        assertActable(attacker);
        if (attacker.force === defender.force) throw new Error("같은 군은 공격할 수 없다");
        if (action.weapon !== undefined) {
          const chosen = attacker.weapons?.[action.weapon];
          if (chosen === undefined) throw new Error(`불법 무기 인덱스: ${action.weapon}`);
          attacker.weapon = chosen; // 무기 선택 = 장비 전환(인게임 문법) — 이후 피격 반격도 이 무기
        }
        const distance = manhattan(attacker, defender);
        if (!inWeaponRange(attacker, distance)) throw new Error("사거리 밖 공격");

        // 스킬 발동 필터: 전투를 건 쪽(Stand)은 전투 내내 고정이고, 때리는 쪽(Action)은 타격마다 뒤집힌다.
        const attackerC = { ...toCombatant(attacker, state.map, units, supportEffects), initiator: true };
        const defenderC = { ...toCombatant(defender, state.map, units, supportEffects), initiator: false };
        const striking = (c: Combatant, value: boolean): Combatant => ({ ...c, striking: value });
        const atkF = forecastSide(calc, striking(attackerC, true), striking(defenderC, false));
        const defF = forecastSide(calc, striking(defenderC, true), striking(attackerC, false));

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
          const hit = isHit(numbers.hitRate, rng.next(10000));
          // 명중 시에만 필살 롤 — 롤 소비 순서는 리플레이 계약.
          const crit = hit && numbers.critRate > 0 ? isProbability100(numbers.critRate, rng.next(100000)) : false;
          const damage = hit ? numbers.damage * (crit ? 3 : 1) : 0;
          to.hp = Math.max(to.hp - damage, 0);
          events.push({ type: "strike", attacker: from.id, defender: to.id, kind, hit, crit, damage, hpAfter: to.hp });
          // 브레이크 조건(코드 확정) = 명중 + 확정 대미지 1 이상 + 개시측(반격·체인으로는 발생하지 않는다).
          if (hit && damage >= 1 && kind === "attack" && from === attacker && canBreak(from, to)) {
            to.broken = true;
            events.push({ type: "break", unit: to.id });
          }
          if (to.hp === 0 && !to.dead) {
            to.dead = true;
            events.push({ type: "death", unit: to.id });
          }
        };

        // 브레이크 해제 = (A) 그 유닛이 참여한 다음 전투의 커밋 시점 또는 (B) 페이즈 종료, 먼저 오는 쪽
        // (코드 확정: CommitUnit 0x2477B70 · ResetPhaseEnd 0x1A19EF0, SID_気絶 Cycle=3=PhaseAfter).
        // kr 원문 "한 번 전투를 하거나 다음 턴이 되기 전까지"가 정확히 이 둘이다 — 아래가 (A)에 해당한다.
        const defenderEnteredBroken = defender.broken;
        const chainNumbers = (backup: UnitState) => {
          const env = combatEnv(toCombatant(backup, state.map, units, supportEffects), defenderC);
          return {
            damage: Math.floor(calc.eval("チェインアタック威力計算", env) as number),
            hitRate: calc.eval("チェインアタック命中率計算", env) as number,
            critRate: calc.eval("チェインアタック必殺率計算", env) as number,
          };
        };
        // 체인어택은 공격측 첫 오더 슬롯 직전 = 본공격보다 먼저다(코드 확정 — 종전 '본공격 뒤'는 가정이었다).
        for (const backup of chainUnits) strike(backup, defender, "chain", chainNumbers(backup));
        strike(attacker, defender, "attack", atkF);
        const canCounter = () =>
          !defender.dead && !defender.broken && inWeaponRange(defender, distance);
        if (canCounter()) strike(defender, attacker, "counter", defF);
        if (atkF.followUp) strike(attacker, defender, "followUp", atkF);
        if (defF.followUp && canCounter()) strike(defender, attacker, "counterFollowUp", defF);
        if (defenderEnteredBroken && !defender.dead) {
          defender.broken = false;
          events.push({ type: "breakRelease", unit: defender.id });
        }

        attacker.acted = true;
        attacker.moved = false; // 행동이 재이동(시구르드) 창을 연다

        // 경험치: 자군만(적/우군 성장은 재현 대상 아님 — 인게임 문법).
        if (attacker.force === 0 && !attacker.dead) {
          const difficulty = state.difficulty ?? "n";
          const formula = defender.dead ? "撃破経験計算" : "戦闘経験計算";
          const chainCount = events.filter((e) => e.type === "strike" && e.kind === "chain").length;
          const gained = Math.floor(
            calc.eval(formula, expEnv(attacker, defender, chainCount, difficulty)) as number,
          );
          grantExp(attacker, gained, events, rng);
        }
        break;
      }

      case "staff": {
        const healer = require(action.unit);
        const target = require(action.target);
        assertActable(healer);
        if (healer.force !== target.force) throw new Error("지팡이 회복은 같은 군만 대상이다");
        if (healer === target) throw new Error("자기 자신은 지팡이 대상이 아니다");
        const idx = action.staff ?? 0;
        const staff = healer.staves?.[idx];
        if (staff === undefined) throw new Error(`불법 지팡이 인덱스: ${idx}`);
        // ☠회복(RodType 2)만 배선 — 방해·워프는 결손인 채 정직하게 거부한다(과대 재현 금지, MP1 몫).
        if (staff.rodType !== 2) throw new Error("미배선 지팡이 종류(회복만 배선)");
        if (staff.uses < 1) throw new Error("지팡이 사용 횟수 소진");
        const distance = manhattan(healer, target);
        if (distance < staff.rangeMin || distance > staff.rangeMax) throw new Error("사거리 밖 지팡이");
        if (target.stats.hp - target.hp < 1) throw new Error("회복 대상 아님(무손상)");
        // 위력의 연성·각인 합산은 스냅숏(power) 소관. 전량 회복 축복(bit5)·ItemHealScale 스킬 훅은 미배선.
        const amount = staffHealAmount(healer, target, staff);
        target.hp += amount;
        events.push({ type: "heal", unit: healer.id, target: target.id, amount, hpAfter: target.hp });
        healer.staves = healer.staves?.map((s, i) => (i === idx ? { ...s, uses: s.uses - 1 } : s));
        healer.acted = true;
        healer.moved = false; // 행동이 재이동(시구르드) 창을 연다
        if (healer.force === 0) {
          const difficulty = state.difficulty ?? "n";
          // 杖経験計算 = clamp(杖経験値 + 자기 레벨 감쇠 + 레벨차 감쇠, 1, 100) — 杖経験値 = item RodExp.
          const gained = Math.floor(
            calc.eval("杖経験計算", expEnv(healer, target, 0, difficulty, { 杖経験値: staff.rodExp })) as number,
          );
          grantExp(healer, gained, events, rng);
        }
        break;
      }

      case "item": {
        const user = require(action.unit);
        assertActable(user);
        const idx = action.item ?? 0;
        const item = user.consumables?.[idx];
        if (item === undefined) throw new Error(`불법 아이템 인덱스: ${idx}`);
        // ☠범위 회복(AddType 2)만 배선 — 인게이지 충전·상태 해제·스킬 부여는 선행 시스템별 후속(정직 거부).
        if (item.addType !== 2) throw new Error("미배선 아이템 종류(범위 회복만 배선)");
        if (item.uses < 1) throw new Error("아이템 소진");
        const targets = itemTargets(user, units, item);
        if (targets.length === 0) throw new Error("사용 대상 없음(범위 내 무손상)");
        // 회복량 = AddPower 고정(능력치 무관 — 지팡이의 마력 반감 가산과 다른 규칙), 잃은 HP 상한.
        for (const t of targets) {
          const amount = Math.min(item.power, t.stats.hp - t.hp);
          t.hp += amount;
          events.push({ type: "heal", unit: user.id, target: t.id, amount, hpAfter: t.hp });
        }
        user.consumables = user.consumables?.map((c, i) => (i === idx ? { ...c, uses: c.uses - 1 } : c));
        user.acted = true;
        user.moved = false; // 행동이 재이동(시구르드) 창을 연다
        // 경험치 없음 — calculator에 아이템 경험식이 없다(杖·踊り·チェインガード만 존재).
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
              u.force === nextForce ? { ...u, acted: false, broken: false, moved: false } : u,
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
