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
 */

/** 이 HP 비율 밑으로 떨어질 각오까지만 한다(그 이하 = 위험수로 보고 회피). */
const RISK_FLOOR = 0.45;

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
  for (const { foe, tiles } of zones) {
    if (!tiles.has(at.y * game.map.width + at.x)) continue;
    const a = engine.toCombatant(foe, game.map, game.units);
    const fc = engine.forecastSide(calculator, a, d);
    total += fc.damage * (fc.followUp ? 2 : 1);
    hits++;
  }
  return { total, hits };
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
    if (threat.total >= unit.hp) continue; // 이 칸에서 턴을 마치면 죽는다
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

export function playerPhase({ engine, calculator, dispatch, state, log }) {
  for (let guard = 0; guard < 300; guard++) {
    const game = state();
    if (game.outcome !== undefined || game.phase !== 0) return;
    const mine = game.units.filter((u) => u.force === 0 && !u.dead);
    const foes = game.units.filter((u) => u.force !== 0 && !u.dead && game.map.alliance?.[u.force] !== game.map.alliance?.[0]);
    const enemies = foes.length > 0 ? foes : game.units.filter((u) => u.force === 1 && !u.dead);
    const actor = mine.find((u) => !u.acted);
    if (actor === undefined) {
      dispatch({ type: "endPhase" });
      return;
    }

    const before = game;
    const zones = threatZones(engine, game, enemies);
    const heal = bestHeal(engine, game, actor, mine);
    const atk = bestAttack(engine, calculator, game, actor, enemies, zones);

    // 다친 아군이 있으면 힐 우선 — 단 확실한 격파가 있으면 격파가 먼저다(적 화력 자체를 줄인다).
    if (heal !== undefined && (atk === undefined || !atk.fc.kill)) {
      if (heal.at.x !== actor.x || heal.at.y !== actor.y) dispatch({ type: "move", unit: actor.id, x: heal.at.x, y: heal.at.y });
      dispatch({ type: "staff", unit: actor.id, target: heal.ally.id, staff: heal.staff });
    } else if (atk !== undefined) {
      if (atk.at.x !== actor.x || atk.at.y !== actor.y) dispatch({ type: "move", unit: actor.id, x: atk.at.x, y: atk.at.y });
      dispatch({ type: "attack", unit: actor.id, target: atk.foe.id, weapon: atk.weapon });
    } else {
      const go = bestAdvance(engine, calculator, game, actor, enemies, zones);
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
