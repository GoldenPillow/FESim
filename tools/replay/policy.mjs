/**
 * 자군 정책 플레이어 — 기보 생성기의 "사람 자리".
 *
 * ☠이건 룰이 아니라 **전략 휴리스틱**이다. 합법성·판정은 전부 엔진이 소유하고(dispatch가 거부하면 그만),
 * 여기서는 "어느 칸에서 누구를 치면 좋은가"만 고른다. 그래서 no-fiction 대상이 아니다 —
 * 이 파일이 주장하는 수치는 하나도 없다(전부 engine forecastSide 산출).
 *
 * 방침(루나틱 정석의 최소형 — ma_walkthrough §1):
 *  1. 죽지 않는다 — 예상 피격 후 HP가 임계 밑으로 떨어지는 수는 두지 않는다.
 *  2. 확실한 격파 > 브레이크(반격 몰수) > 순대미지 순으로 점수.
 *  3. 힐러는 다친 아군이 있으면 먼저 회복(경험치·생존 둘 다 이득).
 *  4. 칠 것이 없으면 가장 가까운 적 쪽으로 전진하되, 적 사거리 안으로 혼자 들어가지 않는다.
 *
 * ★앞 몇 턴은 **오프닝 스크립트**가 소유할 수 있다(opening.mjs) — 사람이 적은 수순이 먼저 놓이고
 * 그 턴의 나머지 유닛만 이 휴리스틱이 둔다.
 */
import { runOpeningTurn } from "./opening.mjs";

/** 이 HP 비율 밑으로 떨어질 각오까지만 한다(그 이하 = 위험수로 보고 회피). */
const RISK_FLOOR = 0.45;

/** 전진 시 남겨 둘 여유(최대 HP 비율) — 증원·필살 한 방을 흘려보낼 몫. */
const ADVANCE_MARGIN = 0.25;

const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function reachable(engine, game, unit) {
  const budget = engine.moveBudgetOn(game.map, unit);
  if (budget === undefined) return [{ x: unit.x, y: unit.y, cost: 0 }];
  if (game.map.costs[unit.moveType] === undefined) return [{ x: unit.x, y: unit.y, cost: 0 }];
  return engine.movementRange({
    width: game.map.width,
    height: game.map.height,
    movePoints: budget,
    start: { x: unit.x, y: unit.y },
    costAt: engine.makeCostAt(game.map, game.structures, unit.moveType),
    ...engine.movePredicates(game.map, game.units, unit),
  });
}

/**
 * 한 발판에서 한 적을 쳤을 때의 예보 — BoardIsland 예보 패널과 같은 조립(공격 → 반격 → 추격).
 * 명중은 전탄 명중 가정(인게임 예보 문법)이라 낙관도 비관도 아니다.
 */
function forecast(engine, calculator, game, unit, at, weapon, foe) {
  const self = { ...unit, x: at.x, y: at.y, weapon };
  const a = engine.toCombatant(self, game.map, game.units);
  const d = engine.toCombatant(foe, game.map, game.units);
  const range = dist(at, foe);
  if (range < weapon.rangeMin || range > weapon.rangeMax) return undefined;
  const attack = engine.forecastSide(calculator, a, d);
  const counterable =
    foe.weapon !== undefined && !foe.broken && range >= foe.weapon.rangeMin && range <= foe.weapon.rangeMax;
  const counter = counterable ? engine.forecastSide(calculator, d, a) : undefined;
  const brk = attack.damage >= 1 && engine.canBreak(self, foe);
  let foeHp = foe.hp;
  let selfHp = unit.hp;
  const counters = counter !== undefined && !brk;
  foeHp -= attack.damage;
  if (counters && foeHp > 0) selfHp -= counter.damage;
  if (attack.followUp && foeHp > 0) foeHp -= attack.damage;
  if (counters && counter.followUp && foeHp > 0 && selfHp > 0) selfHp -= counter.damage;
  return {
    attack,
    brk,
    kill: foeHp <= 0,
    foeHp: Math.max(foeHp, 0),
    selfHp: Math.max(selfHp, 0),
    hitRate: attack.hitRate,
  };
}

/**
 * 위험지대 — 적이 **실제 이동력·지형 코스트로** 닿는 칸 집합(맨해튼 근사 금지: 벽·강을 무시하면
 * 안전한 칸을 위험으로 오판해 전선이 안 나간다). 이동 범위는 엔진 movementRange 그대로 쓴다.
 */
function threatZones(engine, game, foes) {
  return foes.map((foe) => {
    const weapon = foe.weapon;
    const tiles = new Set();
    if (weapon === undefined) return { foe, tiles };
    const stand = reachable(engine, game, foe);
    for (const t of engine.attackRange(stand, weapon.rangeMin, weapon.rangeMax, game.map.width, game.map.height)) {
      tiles.add(t.y * game.map.width + t.x);
    }
    return { foe, tiles };
  });
}

/**
 * 이 칸에 서서 턴을 마치면 적 페이즈에 얼마를 맞는가 — 전탄 명중 가정의 **비관 합계**.
 * 낙관하면 유닛이 죽는다. 실제로는 명중·표적 분산으로 이보다 덜 맞는다.
 */
function incoming(engine, calculator, game, unit, at, zones) {
  const self = { ...unit, x: at.x, y: at.y };
  const d = engine.toCombatant(self, game.map, game.units);
  let total = 0;
  let hits = 0;
  // ☠**필살 1회분을 최악으로 얹는다**(2026-08-18). 필살은 위력 3배라, 전탄 명중만 보고 잔여 HP 1로
  // 턴을 마치면 한 방에 죽는다 — m004 클로에가 시드 8개 중 6개에서 그렇게 죽었다(운이 아니라 계통 결함).
  // 전 공격을 필살로 보면 너무 보수적이라 유닛이 아예 못 움직이므로, **가장 아픈 한 방만** 필살로 본다.
  let worstCrit = 0;
  let worstBlow = 0;
  for (const { foe, tiles } of zones) {
    if (!tiles.has(at.y * game.map.width + at.x)) continue;
    const a = engine.toCombatant(foe, game.map, game.units);
    const fc = engine.forecastSide(calculator, a, d);
    const blows = fc.followUp ? 2 : 1;
    total += fc.damage * blows;
    // 필살률 0이면 여지가 없다. 아니면 그 타격 하나가 3배가 되는 만큼(= 위력 2배)이 추가 위험이다.
    if (fc.critRate > 0 && fc.damage * 2 > worstCrit) worstCrit = fc.damage * 2;
    if (fc.damage * blows > worstBlow) worstBlow = fc.damage * blows;
    hits++;
  }
  // ⚠증원(적 페이즈 중 등장)은 위협 구역에 안 잡힌다 — m004 클로에 사망 6/6의 원인이지만,
  // "한 명 더"를 예비로 두는 근사는 과보수라 전진 자체가 막혀 오히려 패배가 늘었다(2026-08-18 실측).
  // 미채택으로 남기고 worstBlow는 계산만 해 둔다(다음 시도의 재료).
  void worstBlow;
  return { total: total + worstCrit, hits };
}

/**
 * 상처약류 — 소모품 회복(AddType 2 = 자신 중심 반경 내 아군 일괄). 행동을 소모하므로 **칠 게 없거나
 * 자신이 위험할 때만** 쓴다. 사용자 지적(2026-08-18): "바깥타일로 도망치고 상처약을 이용하고있는지 확인".
 * ☠회복량은 아이템 고정값(AddPower)이라 능력치와 무관하다 — 넘치는 회복은 낭비이므로 손상량으로 점수를 낸다.
 */
function bestItem(engine, game, unit, mine) {
  const list = unit.consumables ?? [];
  let best;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it === undefined || it.addType !== 2 || (it.uses ?? 0) < 1) continue;
    const targets = engine.itemTargets(unit, game.units, it);
    if (targets.length === 0) continue;
    // 실제로 채워지는 양의 합 — 상한을 넘는 몫은 세지 않는다.
    const gain = targets.reduce((a, t) => a + Math.min(it.power ?? 0, t.stats.hp - t.hp), 0);
    if (gain <= 0) continue;
    if (best === undefined || gain > best.gain) best = { gain, item: i };
  }
  void mine;
  return best;
}

/** 아직 안 쓴 민가 중 이번 턴에 설 수 있는 칸 — 방문은 행동을 소모하므로 격파가 있으면 뒤로 밀린다. */
function bestVisit(engine, game, unit) {
  const spots = (game.map.interactions ?? []).filter((i) => i.kind === "visit");
  if (spots.length === 0) return undefined;
  const taken = new Set(game.units.filter((u) => !u.dead && u.id !== unit.id).map((u) => u.y * game.map.width + u.x));
  const reach = new Set(reachable(engine, game, unit).map((t) => t.y * game.map.width + t.x));
  for (const i of spots) {
    const x = i.stand?.x ?? i.x;
    const y = i.stand?.y ?? i.y;
    const k = y * game.map.width + x;
    if (taken.has(k) || !reach.has(k)) continue;
    if ((game.visited ?? []).some((v) => v.x === x && v.y === y)) continue; // 이미 연 민가
    return { x, y };
  }
  return undefined;
}

function bestAttack(engine, calculator, game, unit, foes, zones) {
  const weapons = engine.effectiveWeapons(unit) ?? (unit.weapon !== undefined ? [unit.weapon] : []);
  if (weapons.length === 0) return undefined;
  let best;
  for (const at of reachable(engine, game, unit)) {
    const threat = incoming(engine, calculator, game, unit, at, zones);
    for (const foe of foes) {
      for (let wi = 0; wi < weapons.length; wi++) {
        const fc = forecast(engine, calculator, game, unit, at, weapons[wi], foe);
        if (fc === undefined || fc.attack.damage <= 0) continue;
        // 안전 게이트 — 반격으로 죽거나, 반격 뒤 잔여 HP로 적 페이즈를 못 버티는 수는 후보에서 뺀다.
        // 격파하면 그 적의 위협은 사라지므로 그만큼 빼고 본다.
        if (fc.selfHp <= 0) continue;
        const relief = fc.kill ? (zones.find((z) => z.foe.id === foe.id)?.tiles.has(at.y * game.map.width + at.x) ? incoming(engine, calculator, game, unit, at, zones.filter((z) => z.foe.id === foe.id)).total : 0) : 0;
        const after = fc.selfHp - Math.max(threat.total - relief, 0);
        if (after <= 0) continue;
        if (fc.selfHp < unit.stats.hp * RISK_FLOOR && !fc.kill) continue;
        const score =
          (fc.kill ? 1000 : 0) +
          (fc.brk ? 120 : 0) +
          (unit.hp - fc.selfHp) * -6 +
          (foe.hp - fc.foeHp) * 8 +
          fc.hitRate * 0.4 -
          Math.max(threat.total - relief, 0) * 4;
        if (best === undefined || score > best.score) best = { score, at, foe, weapon: wi, fc };
      }
    }
  }
  return best;
}

/** 회복 지팡이 — 가장 많이 잃은 아군을 사거리 안에서 회복. */
function bestHeal(engine, game, unit, allies) {
  const staves = (unit.staves ?? []).map((s, i) => ({ s, i })).filter(({ s }) => s.uses > 0 && s.rodType === 2);
  if (staves.length === 0) return undefined;
  let best;
  for (const at of reachable(engine, game, unit)) {
    for (const { s, i } of staves) {
      for (const ally of allies) {
        if (ally.id === unit.id) continue;
        const lost = ally.stats.hp - ally.hp;
        if (lost <= 0) continue;
        const range = dist(at, ally);
        if (range < s.rangeMin || range > s.rangeMax) continue;
        const score = lost * 10 - range;
        if (best === undefined || score > best.score) best = { score, at, ally, staff: i };
      }
    }
  }
  return best;
}

/**
 * 전진 — 가장 가까운 적 쪽으로 붙되, **버틸 수 있는 칸**까지만 나간다.
 * 죽을 칸은 아예 후보에서 빼고, 남은 칸 중에서 (거리 ↓ · 예상 피해 ↓)로 고른다.
 */
function bestAdvance(engine, calculator, game, unit, foes, zones) {
  if (foes.length === 0) return undefined;
  let best;
  for (const at of reachable(engine, game, unit)) {
    const threat = incoming(engine, calculator, game, unit, at, zones);
    // ☠**여유를 남긴다**(2026-08-18 사용자 지적 "지나친 공격위치에 있는지도 확인").
    //   "죽지만 않으면 간다"로 두면 잔여 HP 1로 적진 앞에 서고, 증원 한 명이면 그대로 끝난다.
    if (threat.total >= unit.hp - Math.floor(unit.stats.hp * ADVANCE_MARGIN)) continue;
    const near = Math.min(...foes.map((f) => dist(at, f)));
    const score = -near * 10 - threat.total * 6 - threat.hits * 4;
    if (best === undefined || score > best.score) best = { score, at };
  }
  // 전부 위험하면 가장 덜 맞는 칸으로 물러난다(제자리 포함).
  if (best === undefined) {
    for (const at of reachable(engine, game, unit)) {
      const threat = incoming(engine, calculator, game, unit, at, zones);
      const score = -threat.total * 10 - threat.hits;
      if (best === undefined || score > best.score) best = { score, at };
    }
  }
  return best;
}

/**
 * 인게이지를 지금 켤 것인가 — 발동 조건(만충·미발동·미행동·교환 안 함)에 더해
 * **이번 턴에 실제로 싸울 수 있는가**를 본다. 지속이 유한하므로 빈 턴에 켜면 그대로 낭비다.
 */
function canEngageNow(game, unit, foes) {
  const g = unit.engage;
  if (g === undefined || g.engaging === true) return false;
  if (g.limit < 1 || g.count < g.limit) return false;
  if (unit.acted || unit.traded === true) return false;
  const reach = (unit.movePoints ?? 0) + (unit.weapon?.rangeMax ?? 1);
  return foes.some((f) => dist(unit, f) <= reach);
}

/**
 * 인게이지 기술 시도 — 성공하면 true. 리워프형은 착지 칸(대상 사거리 링 중 빈 칸)을 골라 함께 싣는다.
 * ☠엔진이 심판이라 여기서 합법성을 다시 재지 않는다 — 거부되면 국면이 그대로라 false로 돌려준다.
 */
function dispatchEngageArt({ engine, calculator, dispatch, state, unit, art, target, zones }) {
  const before = state();
  const rangeMin = art.rangeMin ?? unit.weapon?.rangeMin ?? 1;
  const rangeMax = art.rangeMax ?? unit.weapon?.rangeMax ?? 1;
  if ((art.rewarp ?? 0) > 0) {
    const map = before.map;
    const taken = new Set(before.units.filter((u) => !u.dead && u.id !== unit.id).map((u) => u.y * map.width + u.x));
    // ★착지 칸은 **가장 안전한 칸**을 고른다 — 순간이동은 적진 한복판으로도 가므로 첫 합법 칸을 쓰면
    //   그대로 죽는다. 인게임 정석도 회복 타일(砦: 회피 30·회복 10) 위로 내려서는 것이다.
    const cands = [];
    for (let y = Math.max(target.y - rangeMax, 0); y <= Math.min(target.y + rangeMax, map.height - 1); y++) {
      for (let x = Math.max(target.x - rangeMax, 0); x <= Math.min(target.x + rangeMax, map.width - 1); x++) {
        const d = Math.abs(x - target.x) + Math.abs(y - target.y);
        if (d < rangeMin || d > rangeMax) continue;
        if (taken.has(y * map.width + x)) continue;
        const cell = map.terrain?.[y]?.[x];
        if (cell?.notTarget === true) continue;
        const threat = incoming(engine, calculator, before, unit, { x, y }, zones ?? []);
        cands.push({ x, y, score: -threat.total * 10 + (cell?.avoid ?? 0) * 0.2 + (cell?.heal ?? 0) });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    for (const c of cands) {
      dispatch({ type: "engageAttack", unit: unit.id, target: target.id, x: c.x, y: c.y });
      if (state() !== before) return true;
    }
    return false;
  }
  const d = Math.abs(unit.x - target.x) + Math.abs(unit.y - target.y);
  if (d < rangeMin || d > rangeMax) return false;
  dispatch({ type: "engageAttack", unit: unit.id, target: target.id });
  return state() !== before;
}

export function playerPhase({ engine, calculator, dispatch, state, log, opening, cid, openingVerbose }) {
  // ★오프닝 스크립트가 먼저다 — 사람이 적은 정석 수순은 국소 최적으로는 안 나온다(design/opening_script.md).
  //   실패는 던진다(조용한 휴리스틱 강하 금지) — 잘못된 수순으로 만든 기보가 정본이 되면 안 된다.
  const owned =
    opening === undefined
      ? new Set()
      : runOpeningTurn({ engine, dispatch, state, opening, cid, log, verbose: openingVerbose });

  for (let guard = 0; guard < 300; guard++) {
    const game = state();
    if (game.outcome !== undefined || game.phase !== 0) return;
    const mine = game.units.filter((u) => u.force === 0 && !u.dead);
    const foes = game.units.filter((u) => u.force !== 0 && !u.dead && game.map.alliance?.[u.force] !== game.map.alliance?.[0]);
    const enemies = foes.length > 0 ? foes : game.units.filter((u) => u.force === 1 && !u.dead);
    const actor = mine.find((u) => !u.acted && !owned.has(u.id));
    if (actor === undefined) {
      dispatch({ type: "endPhase" });
      return;
    }

    const before = game;
    // ★인게이지 — 게이지가 만충이고 이번 턴에 싸울 수 있으면 먼저 발동한다(2026-08-18 사용자 지적:
    //   "인게이지를 활용안하는듯하다"). **행동을 소모하지 않으므로**(CanEngageImpl 0x1A26F70 계약)
    //   발동 후 그대로 이동·공격한다. ☠지속 턴이 유한하니 **싸울 수 있을 때만** 켠다 —
    //   적이 (이동력 + 사거리) 안에 없으면 그냥 켜 두다가 빈 턴으로 흘려보낸다.
    if (canEngageNow(game, actor, enemies)) {
      dispatch({ type: "engage", unit: actor.id });
    }
    // 인게이지가 스탯·무기·스킬을 바꾼다 — 이후 평가는 **갱신된 국면**으로 한다.
    const cur = state();
    const self = cur.units.find((u) => u.id === actor.id) ?? actor;
    const zones = threatZones(engine, cur, enemies);
    // ★민가 방문 — 방문 칸에 설 수 있으면 우선한다(사용자 지적: "인접 민가에서 아이템을 얻어도").
    //   보상은 스크립트가 주므로 여기서는 "그 칸에 서서 visit"만 하면 된다.
    const visit = bestVisit(engine, cur, self);
    const heal = bestHeal(engine, cur, self, mine);
    const atk = bestAttack(engine, calculator, cur, self, enemies, zones);
    // 상처약 — 칠 게 없고 자신이 다쳐 있으면 쓴다(행동 소모). 확실한 격파가 있으면 격파가 먼저다.
    const item = atk?.fc.kill === true || heal !== undefined ? undefined : bestItem(engine, cur, self, mine);

    // 다친 아군이 있으면 힐 우선 — 단 확실한 격파가 있으면 격파가 먼저다(적 화력 자체를 줄인다).
    if (visit !== undefined && (atk === undefined || !atk.fc.kill)) {
      if (visit.x !== self.x || visit.y !== self.y) dispatch({ type: "move", unit: actor.id, x: visit.x, y: visit.y });
      dispatch({ type: "visit", unit: actor.id });
    } else if (heal !== undefined && (atk === undefined || !atk.fc.kill)) {
      if (heal.at.x !== actor.x || heal.at.y !== actor.y) dispatch({ type: "move", unit: actor.id, x: heal.at.x, y: heal.at.y });
      dispatch({ type: "staff", unit: actor.id, target: heal.ally.id, staff: heal.staff });
    } else if (item !== undefined && atk === undefined && self.hp < self.stats.hp * 0.7) {
      dispatch({ type: "item", unit: actor.id, item: item.item });
    } else if (atk !== undefined) {
      if (atk.at.x !== actor.x || atk.at.y !== actor.y) dispatch({ type: "move", unit: actor.id, x: atk.at.x, y: atk.at.y });
      // ★인게이지 기술 — 인게이지 중이고 게이지가 기술 코스트를 감당하면 통상 공격 대신 기술을 쓴다.
      //   리워프형(세리카 ワープライナ)은 착지 칸을 함께 실어야 한다(엔진이 좌표를 요구한다).
      const art = self.engage?.engaging === true ? self.engageArt : undefined;
      const usedArt =
        art !== undefined && (self.engage?.count ?? 0) >= (art.cost ?? 0)
          ? dispatchEngageArt({ engine, calculator, dispatch, state, unit: self, art, target: atk.foe, zones })
          : false;
      if (!usedArt) dispatch({ type: "attack", unit: actor.id, target: atk.foe.id, weapon: atk.weapon });
    } else {
      const go = bestAdvance(engine, calculator, cur, self, enemies, zones);
      if (go !== undefined && (go.at.x !== actor.x || go.at.y !== actor.y)) {
        dispatch({ type: "move", unit: actor.id, x: go.at.x, y: go.at.y });
      }
      dispatch({ type: "wait", unit: actor.id });
    }

    if (state() === before) {
      // 이 유닛으로는 아무것도 못 했다 — 대기로 소진시켜 페이즈가 멈추지 않게 한다.
      if (dispatch({ type: "wait", unit: actor.id }) === before) {
        log?.(`  ☠자군 ${actor.id} 진행 불가 — 페이즈 종료로 탈출`);
        dispatch({ type: "endPhase" });
        return;
      }
    }
  }
  log?.("  ☠자군 정책이 수렴하지 않았다(300 액션 초과)");
  dispatch({ type: "endPhase" });
}
