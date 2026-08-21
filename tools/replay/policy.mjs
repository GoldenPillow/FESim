/**
 * 자군 정책 플레이어 — 기보 생성기의 "사람 자리".
 *
 * ☠이건 룰이 아니라 **전략 휴리스틱**이다. 합법성·판정은 전부 엔진이 소유하고(dispatch가 거부하면 그만),
 * 여기서는 "어느 칸에서 누구를 치면 좋은가"만 고른다. 그래서 no-fiction 대상이 아니다 —
 * 이 파일이 주장하는 수치는 하나도 없다(전부 engine battlePlan 산출).
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
import { openingAvoid, runOpeningTurn } from "./opening.mjs";

/** 이 HP 비율 밑으로 떨어질 각오까지만 한다(그 이하 = 위험수로 보고 회피). */
const RISK_FLOOR = 0.45;

/** 전진 시 남겨 둘 여유(최대 HP 비율) — 증원·필살 한 방을 흘려보낼 몫. */
const ADVANCE_MARGIN = 0.25;

/**
 * ★물몸은 더 보수적으로(2026-08-18 사용자 지시: "유난히 잘 죽는 캐릭터는 좀더 보수적으로").
 * 판별 = 맷집(최대HP + 수비×2 + 마방)이 자군 중앙값의 85%에 못 미치는가 —
 * 절대 수치가 아니라 **그 판의 상대치**라 챕터가 바뀌어도 기준이 따라 움직인다.
 * 물몸은 전진 여유를 두 배 가까이 남기고, 확실한 격파가 아니면 적 페이즈에 반 이상을 남긴다.
 */
const FRAIL_MARGIN = 0.45;
const FRAIL_AFTER = 0.35;

/**
 * ★탱커 선봉(2026-08-19 사용자 실기 관측: "뤼에르의 적극성이 떨어지고 힐러나 마도사의 위험 전진이 많았다").
 * 맷집 상위는 **여유를 줄여 앞에 세운다** — 맞아 주는 것이 그 유닛의 일이다.
 */
const STURDY_MARGIN = 0.10;

const bulkOf = (u) => u.stats.hp + u.stats.def * 2 + u.stats.res;

/** 회복 지팡이 보유 = 후열 역할. 맷집과 무관하게 보수적으로 둔다(죽으면 판이 회복 수단을 잃는다). */
const isHealer = (u) => (u.staves ?? []).some((st) => st.uses > 0 && st.rodType === 2);

/**
 * 자군을 **물몸 / 보통 / 탱커** 3단으로 가른다 — 그 판의 상대치라 챕터가 바뀌어도 기준이 따라 움직인다.
 *
 * ☠종전 물몸 기준 `맷집 < 중앙값 x 0.85`는 **너무 빡빡해 아무도 안 걸렸다**(m002 실측:
 * 맷집 [34,34,36,68] · 중앙값 36 · 물몸선 30.6 ⇒ 마도사 34·힐러 34가 물몸으로 안 잡혀
 * 보수화 없이 전진했다). 그리고 **탱커 항이 아예 없어**(설계 §4-3이 이미 지적) 68짜리 탱커가
 * 선봉을 안 서니, 그만큼 나머지가 맞을 자리를 대신 떠안았다.
 * ⇒ 물몸 = **중앙값 미만이거나 회복 지팡이 보유** · 탱커 = 중앙값의 1.4배 이상.
 */
function tiersOf(mine) {
  const bulks = mine.map(bulkOf).sort((a, b) => a - b);
  if (bulks.length === 0) return { frail: new Set(), sturdy: new Set() };
  const median = bulks[Math.floor(bulks.length / 2)];
  const frail = new Set();
  const sturdy = new Set();
  for (const u of mine) {
    const b = bulkOf(u);
    if (b >= median * 1.4) sturdy.add(u.id);
    else if (b < median || isHealer(u)) frail.add(u.id);
  }
  return { frail, sturdy };
}

function frailSet(mine) {
  return tiersOf(mine).frail;
}


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
 * 한 발판에서 한 적을 쳤을 때의 예보 — ★엔진 공용 오더 목록(`battlePlan`)만 소비한다.
 * 리듀서·예보 패널과 **같은 목록**이라 오더별 배율(신속의 威力 * 0.5)이 그대로 실린다.
 * ☠종전엔 `damage x battleTimes`로 근사해 과대평가 위에서 수를 골랐다 — 생성 기보 자체가 오염된다.
 * 명중은 전탄 명중 가정(인게임 예보 문법)이라 낙관도 비관도 아니다.
 */
function forecast(engine, calculator, game, unit, at, weapon, foe) {
  const self = { ...unit, x: at.x, y: at.y, weapon };
  const a = engine.toCombatant(self, game.map, game.units);
  const d = engine.toCombatant(foe, game.map, game.units);
  const range = dist(at, foe);
  if (range < weapon.rangeMin || range > weapon.rangeMax) return undefined;
  const counterable =
    foe.weapon !== undefined && !foe.broken && range >= foe.weapon.rangeMin && range <= foe.weapon.rangeMax;
  // 브레이크는 첫 오더에서 서고 그 자리에서 반격 슬롯을 닫는다 — 그래서 게이트가 콜백이다.
  let brk = false;
  const plan = engine.battlePlan(calculator, a, d, { counter: () => counterable && !brk });
  let attack;
  let foeHp = foe.hp;
  let selfHp = unit.hp;
  let over = false;
  for (const order of plan.orders) {
    if (order.side === 0) {
      if (attack === undefined) attack = { ...order, battleTimes: plan.battleTimes[0] };
      if (order.damage >= 1 && engine.canBreak(self, foe)) brk = true;
      if (over) continue;
      foeHp -= order.damage;
    } else {
      if (over) continue;
      selfHp -= order.damage;
    }
    if (foeHp <= 0 || selfHp <= 0) over = true;
  }
  if (attack === undefined) return undefined; // 手番回数 0 = 칠 수 없는 국면(후보에서 뺀다)
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
 * 위험지대 — 적이 닿는 칸 집합. ★**엔진 `threatTiles`에 위임한다**(정본 1개).
 *
 * ☠**층이 갈렸던 자리다**: 종전엔 여기가 자기 구현(장비 무기 사거리 + `moveBudgetOn`)을 썼고 UI
 * 「위험 범위」(`apps/web/src/lib/threat.ts`)는 엔진 `threatTiles`를 썼다 — 같은 국면에서 **화면과 정책이
 * 서로 다른 위험**을 봤다(m017 7유닛/811칸 · g001 133유닛/3386칸 차 — 적대적 검증 2026-08-22 보고).
 * 두 구현이 갈리면 "화면은 위험한데 기보는 들어간다"가 되고, 어느 쪽도 틀렸다고 말해 주지 않는다.
 *
 * ★위임이 실제로 고친 것 = **행동을 마친 적을 부동으로 보던 과소평가**(2026-08-22 실측). 종전 `reachable()`은
 * `moveBudgetOn`이 `undefined`(행동 완료)면 **발밑 한 칸**만 돌려줬는데, `acted`는 `endPhase`에서
 * **다음 페이즈 진영만** 리셋된다 ⇒ 자군 페이즈의 적은 *직전 적 페이즈에 움직였다는 이유로* 전부 부동 취급됐다.
 * 실측 첫 발현 = m001 턴2(38칸 → 125칸) · m002 턴3(4 → 59) · m003 턴2(386 → 819).
 * ☠**대가**: 정책이 진짜 위험을 보게 되자 보수화돼 사슬 성적이 떨어졌다. 실측(2026-08-22, seed 1 사슬 전건
 * 재생성 후 저장분과 `meta` 제외 대조) = m000 동일 · m001 47→52스텝 · **m002 승→패**(뤼에르·프랑 전사) ·
 * **m003 승→패**(뤼에르·알프레드 전사) · m004는 그 사슬로는 **전멸**. 위험 상수(RISK_FLOOR·ADVANCE_MARGIN·
 * FRAIL_*)가 **과소평가 위에서 튜닝된 값**이라 재튜닝이 선행이다.
 * ★**그래서 `data/fe17/replays/`의 m000~m003은 재생성하지 않았다**(지는 기보를 게시하게 된다). 부수 근거 =
 * 그 사슬의 m002는 뤼에르가 죽어 §10-6 실기 앵커(인게이지 8 + 4)가 판에서 사라지고, `corpus.test.ts`의
 * 절대 앵커 테스트가 갈 곳을 잃는다.
 * ☠**예외 = m004 1장은 재생성했다**(2026-08-22) — 격리 실행(이 위임만 되돌리고 엔진 변경은 그대로)에서도
 * 저장분과 갈렸다(297 → 272스텝) ⇒ 원인이 정책이 아니라 **엔진 AI 정합 수리**이고, 저장분이 이미 낡아
 * 있었다는 뜻이다. 재생성 결과 = 패배 11턴 297스텝 → **승리 25턴 532스텝**(자군 손실 5 → 6).
 * ★해제 조건 = 위험 상수 재튜닝 후 **사슬 전건**으로 판정(시드 손질 금지) — 등재 = MP8 §10-5-a · §10-7-(19).
 *
 * ⚠위임으로 넘어오는 **정본 쪽 과대평가** 1건(별건 — 여기서 고치지 않는다): `attackAreaFrom`은 소지 무기
 * 전체의 `min(rangeMin)..max(rangeMax)`를 **한 구간**으로 칠한다. 검(1-1) + 장궁(3-10)을 함께 들면
 * 어느 무기로도 못 닿는 2칸이 위험으로 칠해진다(무기별 합집합이 아니다). 결손 = `ai.attack-position` 장부.
 * 실측 m000~m004에서는 발현 0건(혼합 사거리 소지 적이 없다).
 *
 * ☠**알려진 과소평가(2026-08-20 실측, MP8 §10-7-(16))** — 위임 후에도 그대로다:
 * `movePredicates(map, units, unit)`가 **자군 유닛을 통행 차단으로** 넣는다. 자군 페이즈에는
 * 그 아군이 *아직 안 움직였을 뿐*이고 적 페이즈에는 거기 없다 ⇒ 적 도달 범위가 실제보다 **좁게** 나온다.
 * 발현 = m003 seed 13 뤼에르 전사(정책은 `threat 6 / hits 1`로 보고 들어갔는데 적 페이즈에 2기에게 14).
 * ★**미채택 사유 = 순효과 불명**: 미행동 아군을 막이에서 빼는 실험이 seed 1 패배→승리 · seed 2 승리→패배 ·
 * seed 13 불변으로 부호가 안 갈렸다. ★제거 조건 = §C 전략 엔진(적 페이즈 예지·적턴 반격 계산)이 설 때
 * 함께 교체하고, 판정은 시드 3개가 아니라 **기보 사슬 전건**으로 한다.
 */
export function threatZones(engine, game, foes) {
  return foes.map((foe) => {
    const tiles = new Set();
    // factor 100 = 이동력 그대로(`GetMovePower`의 백분율). UI 색인도 같은 값을 쓴다.
    for (const t of engine.threatTiles(game, foe, 100)) tiles.add(t.y * game.map.width + t.x);
    return { foe, tiles };
  });
}

/**
 * 이 칸에 서서 턴을 마치면 적 페이즈에 얼마를 맞는가 — 전탄 명중 가정의 **비관 합계**.
 * 낙관하면 유닛이 죽는다. 실제로는 명중·표적 분산으로 이보다 덜 맞는다.
 */
export function incoming(engine, calculator, game, unit, at, zones) {
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
    // 오더 목록 = 그 적이 실제로 내는 타격열. 반격은 받는 대미지를 줄이지 않으므로 슬롯을 닫아 둔다.
    let sum = 0;
    let crit = 0;
    const add = ({ damage, critRate }) => {
      sum += damage;
      // 필살률 0이면 여지가 없다. 아니면 그 타격 하나가 3배가 되는 만큼(= 위력 2배)이 추가 위험이다.
      if (critRate > 0 && damage * 2 > crit) crit = damage * 2;
    };
    for (const order of engine.battlePlan(calculator, a, d, { counter: () => false }).orders) add(order);
    // ☠체인어택은 **오더 목록 밖**이다(리듀서가 따로 굴린다) — 오더만 세면 그 몫이 통째로 안 보인다.
    //   정책은 잔여 HP 1까지 허용하므로 안 보이는 대미지는 곧 사망인데, 기보는 되읽으면 정상이라
    //   결손 목록에도 안 잡힌다(실측 m003 시드 13·7: 뤼에르가 오더 합계로는 살 칸에서 죽었다).
    for (const backup of engine.chainAttackers(foe, self, game.units)) {
      add(engine.chainNumbers(calculator, engine.toCombatant(backup, game.map, game.units), d));
    }
    total += sum;
    if (crit > worstCrit) worstCrit = crit;
    if (sum > worstBlow) worstBlow = sum;
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

/**
 * 아직 안 쓴 민가 중 이번 턴에 설 수 있는 칸 — 방문은 행동을 소모하므로 격파가 있으면 뒤로 밀린다.
 * ☠**위협을 본다**: 종전에는 도달만 보고 갔다가 m004 1턴에 리월이 민가 앞에서 죽었다(2026-08-18).
 * 아이템 하나와 주인공의 목숨을 바꾸지 않는다 — 살아서 다음 턴에 열면 된다.
 */
function bestVisit(engine, calculator, game, unit, zones, frail = false) {
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
    if (deadly(engine, calculator, game, unit, { x, y }, zones, frail)) continue;
    return { x, y };
  }
  return undefined;
}

/**
 * 선봉 기준 — **가장 튼튼한 아군이 지금 적과 얼마나 떨어져 있는가**.
 * 물몸이 이보다 더 앞으로 나가면 진형이 뒤집힌다(탱커가 뒤, 물몸이 앞).
 * ☠노출을 직접 벌하지 않는 이유 = 접근로가 통째로 위협권인 맵에서는 판만 늘어진다(실측 15턴·손실).
 */
function vanguardOf(mine, foes, sturdy) {
  if (foes.length === 0) return undefined;
  const tank = mine.filter((u) => sturdy.has(u.id) && !u.dead)[0];
  if (tank === undefined) return undefined;
  const foe = foes.reduce((a, b) => (dist(tank, a) <= dist(tank, b) ? a : b));
  return { foe, gap: dist(tank, foe) };
}

function bestAttack(engine, calculator, game, unit, foes, zones, frail = false, sturdy = false, vanguard = undefined) {
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
        // 물몸은 "죽지만 않으면 간다"를 못 쓴다 — 한 방 더 맞을 몫을 남긴다.
        if (frail && !fc.kill && after < unit.stats.hp * FRAIL_AFTER) continue;
        // ★탱커는 더 깊이 들어간다 — 맞아 주는 것이 그 유닛의 일이다(§4-3 탱커 선봉).
        if (fc.selfHp < unit.stats.hp * (sturdy ? RISK_FLOOR * 0.5 : RISK_FLOOR) && !fc.kill) continue;
        // ★노출 가중은 **역할마다 다르다**(2026-08-19 사용자 실기 관측: "힐러나 마도사의 위험 전진이 많았다").
        //   종전엔 전 유닛이 같은 계수(4)를 써서, 실측상 **마도사가 탱커보다 더 노출됐다**
        //   (m002 자군턴 10 중 노출: 클랜 9 · 반드레 8 — 맞아야 할 쪽과 피해야 할 쪽이 뒤바뀌어 있었다).
        //   물몸은 같은 대미지를 위해 **훨씬 안전한 칸**을 요구하고, 탱커는 노출을 싸게 친다(맞는 게 일이다).
        const exposureWeight = frail ? 6 : sturdy ? 2 : 4;
        const score =
          (fc.kill ? 1000 : 0) +
          (fc.brk ? 120 : 0) +
          // ★추격을 노린다(2026-08-19 사용자 지시: "속도가 유리한 무기와 유리 국면을 이용하라").
          //   총 대미지로는 이미 반영되지만, 그것만으로는 **한 방이 큰 무기**에 밀린다 —
          //   추격은 명중 판정이 두 번이라 기대 대미지가 같아도 분산이 낮고, 브레이크·처치 확률이 높다.
          //   실기 앵커 = 인게이지 중 레이피어(무게 3)로 추가타가 서는 국면(사용자 스크린샷).
          (fc.attack.battleTimes > 1 ? 60 : 0) +
          (unit.hp - fc.selfHp) * -6 +
          (foe.hp - fc.foeHp) * 8 +
          fc.hitRate * 0.4 -
          Math.max(threat.total - relief, 0) * exposureWeight -
          // ★진형 — **물몸은 탱커보다 앞서지 않는다**. 노출 자체를 벌하면 판만 늘어지고(실측: 15턴·손실)
          //   노출 비율은 그대로다. 막을 것은 노출이 아니라 **선봉이 뒤바뀌는 것**이다.
          (frail && vanguard !== undefined && dist(at, vanguard.foe) < vanguard.gap ? 60 : 0);
        if (best === undefined || score > best.score) best = { score, at, foe, weapon: wi, fc };
      }
    }
  }
  return best;
}

/**
 * 그 칸에 서면 이번 적 페이즈에 죽는가 — 이동을 동반하는 비전투 행동(방문·회복)의 공용 게이트.
 * ★공방의 안정 = "이득을 취하러 사지에 들어가지 않는다". 여유는 전진과 같은 몫(ADVANCE_MARGIN).
 */
function deadly(engine, calculator, game, unit, at, zones, frail = false) {
  if (zones === undefined || zones.length === 0) return false;
  const threat = incoming(engine, calculator, game, unit, at, zones);
  return threat.total >= unit.hp - Math.floor(unit.stats.hp * (frail ? FRAIL_MARGIN : ADVANCE_MARGIN));
}

/** 회복 지팡이 — 가장 많이 잃은 아군을 사거리 안에서 회복. ☠술자도 사지에는 안 선다. */
function bestHeal(engine, calculator, game, unit, allies, zones, frail = false) {
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
        if (deadly(engine, calculator, game, unit, at, zones, frail)) continue;
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
function bestAdvance(engine, calculator, game, unit, foes, zones, aggressive = false, frail = false, sturdy = false) {
  if (foes.length === 0) return undefined;
  let best;
  for (const at of reachable(engine, game, unit)) {
    const threat = incoming(engine, calculator, game, unit, at, zones);
    // ☠**여유를 남긴다**(2026-08-18 사용자 지적 "지나친 공격위치에 있는지도 확인").
    //   "죽지만 않으면 간다"로 두면 잔여 HP 1로 적진 앞에 서고, 증원 한 명이면 그대로 끝난다.
    // ★단 **교착이면 여유를 접는다** — 양쪽 다 대기만 하면 판이 안 끝난다(m002 61턴 미결 실측).
    const margin = aggressive
      ? 0
      : Math.floor(unit.stats.hp * (frail ? FRAIL_MARGIN : sturdy ? STURDY_MARGIN : ADVANCE_MARGIN));
    if (threat.total >= unit.hp - margin) continue;
    const near = Math.min(...foes.map((f) => dist(at, f)));
    // ☠**맞기만 하는 자리는 고르지 않는다**(2026-08-19 사용자 실기 관측: "맞는 위치에 가서 대기만 한다 —
    //   생존도 공격도 이유가 타당하지 않다"). 종전 점수는 근접(10)이 위협(6)보다 무거워서,
    //   **때리지도 못하는데 사거리 안으로 걸어 들어가** 공짜로 맞았다. 전진은 *때리러 가는 것*이지
    //   *맞으러 가는 것*이 아니다 — 이 갈래는 공격 후보가 하나도 없을 때만 오므로 노출은 순손실이다.
    // ★단 교착(aggressive)이면 노출을 감수한다 — 양쪽이 서로 안 움직이면 판이 안 끝난다(m002 61턴 실측).
    const exposed = aggressive || threat.total === 0 ? 0 : 1;
    const score = -exposed * 1e6 - near * 10 - threat.total * 6 - threat.hits * 4;
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

export function playerPhase({ engine, calculator, dispatch, state, log, opening, cid, openingVerbose, aggressive = false }) {
  // ★오프닝 스크립트가 먼저다 — 사람이 적은 정석 수순은 국소 최적으로는 안 나온다(design/opening_script.md).
  //   실패는 던진다(조용한 휴리스틱 강하 금지) — 잘못된 수순으로 만든 기보가 정본이 되면 안 된다.
  const owned =
    opening === undefined
      ? new Set()
      : runOpeningTurn({ engine, dispatch, state, opening, cid, log, verbose: openingVerbose });

  /**
   * ★이번 페이즈에 **한 번 미뤄 둔** 유닛(2026-08-19 사용자 실기 관측:
   * "맞는 위치에 가서 대기만 한다 — 생존도 공격도 이유가 타당하지 않다").
   * 원인은 **낡은 위협 평가**다: 칠 곳이 없는 유닛이 먼저 움직이면 아직 살아 있는 적까지 전부
   * 자기를 노린다고 계산해(m002 실측 = 도달 칸 전부 위협합 20) 맞을 자리로 걸어가 대기했는데,
   * 바로 뒤에 아군이 그 적을 죽였다. 그 적이 죽은 뒤였다면 위협이 반으로 줄어 공격이 섰다.
   * ⇒ 그런 유닛은 **딱 한 번 뒤로 미룬다**. 전역 재정렬은 하지 않는다 — m003에서 무손실이 깨졌다(실측).
   */
  const deferred = new Set();

  for (let guard = 0; guard < 300; guard++) {
    const game = state();
    if (game.outcome !== undefined || game.phase !== 0) return;
    const mine = game.units.filter((u) => u.force === 0 && !u.dead);
    const foes = game.units.filter((u) => u.force !== 0 && !u.dead && game.map.alliance?.[u.force] !== game.map.alliance?.[0]);
    const enemies = foes.length > 0 ? foes : game.units.filter((u) => u.force === 1 && !u.dead);
    // 오프닝이 이번 턴에 "건드리지 말라"고 한 유닛 — 표적에서만 뺀다(위협 계산에는 그대로 든다).
    const avoid = openingAvoid(opening, game.turn);
    const targets = avoid.size === 0 ? enemies : enemies.filter((f) => !avoid.has(f.pid));
    // ★행동 순서 = **확실한 격파를 가진 유닛부터**(2026-08-18). 위협을 먼저 지우면 뒤에 두는 유닛의
    //   피격 예상이 그만큼 줄어 물몸이 설 자리가 생긴다 — 배치 순서대로 두면 물몸이 먼저 나가 죽는다.
    //   ☠적 AI는 정본을 따르지만 자군 정책은 그럴 의무가 없다(사용자 확정) — 여기서는 잘 두는 게 목적이다.
    let ready = mine.filter((u) => !u.acted && !owned.has(u.id));
    if (ready.length === 0) {
      dispatch({ type: "endPhase" });
      return;
    }
    // ★한 번 미뤄 둔 유닛은 뒤로 돌린다 — 전부 미뤄졌으면 그대로 진행한다(교착 금지).
    const waiting = ready.filter((u) => !deferred.has(u.id));
    if (waiting.length > 0) ready = waiting;
    const tiers = tiersOf(mine);
    const vanguard = vanguardOf(mine, enemies, tiers.sturdy);
    const preZones = threatZones(engine, game, enemies);
    const preTargets = avoid.size === 0 ? enemies : enemies.filter((f) => !avoid.has(f.pid));
    const killer = ready.find((u) => {
      if (canEngageNow(game, u, enemies)) return false; // 발동은 국면을 바꾼다 — 예측으로 앞세우지 않는다
      const best = bestAttack(engine, calculator, game, u, preTargets, preZones, tiers.frail.has(u.id), tiers.sturdy.has(u.id), vanguard);
      return best?.fc.kill === true;
    });
    const actor = killer ?? ready[0];

    const before = game;
    // ★인게이지 — 게이지가 만충이고 이번 턴에 싸울 수 있으면 먼저 발동한다(2026-08-18 사용자 지적:
    //   "인게이지를 활용안하는듯하다"). **행동을 소모하지 않으므로**(CanEngageImpl 0x1A26F70 계약)
    //   발동 후 그대로 이동·공격한다. ☠지속 턴이 유한하니 **싸울 수 있을 때만** 켠다 —
    //   적이 (이동력 + 사거리) 안에 없으면 그냥 켜 두다가 빈 턴으로 흘려보낸다.
    if (canEngageNow(game, actor, enemies)) {
      // ☠**인게이지는 자원이다**(지속 턴·게이지). 켜 놓고 안 싸우면 그냥 태운 것이다 —
      //   실측(2026-08-19 사용자): m002 뤼미에르 2차전부터 뤼에르가 **인게이지 → 이동 → 대기**를 반복했다.
      //   원인 = `canEngageNow`가 "적이 이동력+사거리 안에 있는가"만 보고 **공격이 실제로 서는지는 안 봤다**.
      //   ⇒ 켠 상태를 **투영**해 공격 후보가 서는지 먼저 확인하고, 안 서면 켜지 않는다(자원 예약, MP8 §4-7).
      const projected = { ...actor, engage: { ...actor.engage, engaging: true } };
      const zonesNow = threatZones(engine, game, enemies);
      const worth =
        bestAttack(engine, calculator, game, projected, targets, zonesNow, tiers.frail.has(actor.id), tiers.sturdy.has(actor.id), vanguard) !== undefined;
      if (worth) dispatch({ type: "engage", unit: actor.id });
    }
    // 인게이지가 스탯·무기·스킬을 바꾼다 — 이후 평가는 **갱신된 국면**으로 한다.
    const cur = state();
    const self = cur.units.find((u) => u.id === actor.id) ?? actor;
    const zones = threatZones(engine, cur, enemies);
    // ★민가 방문 — 방문 칸에 설 수 있으면 우선한다(사용자 지적: "인접 민가에서 아이템을 얻어도").
    //   보상은 스크립트가 주므로 여기서는 "그 칸에 서서 visit"만 하면 된다.
    const frail = tiers.frail.has(self.id);
    const sturdy = tiers.sturdy.has(self.id);
    const visit = bestVisit(engine, calculator, cur, self, zones, frail);
    const heal = bestHeal(engine, calculator, cur, self, mine, zones, frail);
    const atk = bestAttack(engine, calculator, cur, self, targets, zones, frail, sturdy, vanguard);
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
      // ☠맞을 자리에 서면서 때리지도 않는 수 — 아직 안 움직인 아군 중 칠 수 있는 쪽이 있으면
      //   그쪽을 먼저 보내고 이 유닛은 **한 번만** 미룬다(위협이 걷힌 뒤 다시 판단한다).
      const others = ready.filter((u) => u.id !== actor.id);
      if (
        !deferred.has(actor.id) &&
        others.length > 0 &&
        others.some((u) => bestAttack(engine, calculator, cur, u, targets, zones, tiers.frail.has(u.id), tiers.sturdy.has(u.id), vanguard) !== undefined)
      ) {
        deferred.add(actor.id);
        continue;
      }
      const go = bestAdvance(engine, calculator, cur, self, enemies, zones, aggressive, frail, sturdy);
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
