/**
 * 오프닝 스크립트 해석기 — 사람이 적은 정석 수순을 이 판의 액션으로 옮긴다.
 *
 * ☠정본 설계 = design/opening_script.md. 이 파일이 소유하는 것은 **해석**뿐이다:
 * 합법성은 엔진이, 실행 순서는 policy.mjs가 소유한다. 해석이 대상을 못 고르면
 * 추측하지 않고 던진다(OpeningError) — 조용히 다른 유닛을 치면 기보가 소리 없이 어긋난다.
 *
 * 방향 어휘(설계 §6-D 확정) = **화면 기준**이다. 사용자는 "위쪽 궁병"이라고 말하고,
 * 데이터 좌표(y+ = 화면 위, FLIP_Y=true)로의 변환은 이 파일이 한다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export class OpeningError extends Error {}

/**
 * 화면 방향 → 데이터 좌표 델타(화면 위 = y+, MP0a 좌표계).
 * 대각도 받는다 — 사람은 "왼쪽 아래에서 추가공격"처럼 말한다(2026-08-18 사용자 수순).
 */
const DIRS = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  upLeft: { x: -1, y: 1 },
  upRight: { x: 1, y: 1 },
  downLeft: { x: -1, y: -1 },
  downRight: { x: 1, y: -1 },
};
const DIR_NAMES = Object.keys(DIRS).join("/");

const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** `data/fe17/openings/{cid}.json` — 없으면 undefined(오프닝 없는 챕터가 정상이다). */
export function loadOpening(root, cid) {
  const path = resolve(root, `data/fe17/openings/${cid}.json`);
  if (!existsSync(path)) return undefined;
  const opening = JSON.parse(readFileSync(path, "utf-8"));
  if (opening.cid !== undefined && opening.cid !== cid) {
    throw new OpeningError(`오프닝 파일의 cid가 다르다 — 파일 ${opening.cid} ≠ 요청 ${cid}`);
  }
  return opening;
}

/** 그 턴의 수순(없으면 빈 배열 — 부분 지시가 정상이다). */
export function openingSteps(opening, turn) {
  return opening?.turns?.find((t) => t.turn === turn)?.steps ?? [];
}

/**
 * 그 턴에 **정책이 건드리면 안 되는 pid** — "지금은 저놈을 깨우지 마라".
 * ☠오프닝의 절반은 두는 수가 아니라 **안 두는 수**다: m002는 정책이 2턴에 뤼미에르를 먼저 잡아
 * 3턴 스타 러시가 통째로 사라졌다(스크립트가 1회전 종료로 기공까지 0으로 만든다).
 * 위협 계산에서는 빼지 않는다 — 안 때릴 뿐 무서운 건 그대로다(안 그러면 자군이 사거리 안으로 걸어간다).
 */
export function openingAvoid(opening, turn) {
  return new Set(opening?.turns?.find((t) => t.turn === turn)?.avoid ?? []);
}

/** 사람이 읽을 유닛 표기 — 사유 문자열용(pid는 길고 좌표가 있어야 판이 보인다). */
const label = (u) => `${u.pid ?? u.id}(${u.x},${u.y})`;

/**
 * pid + pick → 이 판의 유닛 하나.
 * ☠같은 pid가 여럿인데 pick이 없으면 **실패**다 — 임의로 첫 유닛을 고르면 수순이 조용히 딴 데를 친다.
 */
export function resolveUnit(game, spec, self) {
  if (spec === undefined || spec.pid === undefined) {
    throw new OpeningError("대상 지정에 pid가 없다");
  }
  const live = game.units.filter((u) => !u.dead);
  let cands = live.filter((u) => u.pid === spec.pid);
  if (cands.length === 0) throw new OpeningError(`대상 없음 — ${spec.pid}(생존 유닛에 그 pid가 없다)`);

  const pick = spec.pick;
  // ☠pick은 후보가 하나여도 **거른다** — 안 그러면 "at으로 못박은 칸"과 다른 유닛이 조용히 통과한다
  //   (m002 실사례: 1회전 뤼미에르가 죽고 2회전 뤼미에르만 남았는데 at(10,3) 지정이 그대로 먹혔다).
  if (cands.length === 1 && pick === undefined) return cands[0];
  if (pick === undefined) {
    throw new OpeningError(
      `대상 모호 — ${spec.pid}가 ${cands.length}명이다(${cands.map(label).join(" ")}). pick으로 가려라`,
    );
  }
  if (pick.at !== undefined) {
    cands = cands.filter((u) => u.x === pick.at.x && u.y === pick.at.y);
    if (cands.length === 0) throw new OpeningError(`대상 없음 — ${spec.pid} @(${pick.at.x},${pick.at.y})`);
    return cands[0];
  }
  if (pick.index !== undefined) {
    const sorted = [...cands].sort((a, b) => Number(String(a.id).slice(1)) - Number(String(b.id).slice(1)));
    const got = sorted[pick.index];
    if (got === undefined) throw new OpeningError(`대상 없음 — ${spec.pid} index ${pick.index}(${sorted.length}명)`);
    return got;
  }
  // 기준 유닛 — of/nearestTo가 없으면 행동 주체가 기준이다("내 위쪽 검병").
  const refPid = pick.of ?? pick.nearestTo;
  const ref = refPid === undefined ? self : resolveUnit(game, { pid: refPid }, self);
  if (ref === undefined) throw new OpeningError(`기준 유닛 없음 — ${refPid ?? "(행동 주체)"}`);
  if (pick.dir !== undefined) {
    const d = DIRS[pick.dir];
    if (d === undefined) throw new OpeningError(`방향 어휘가 아니다 — ${pick.dir}(${DIR_NAMES})`);
    const along = (u) => (u.x - ref.x) * d.x + (u.y - ref.y) * d.y;
    const side = cands.filter((u) => along(u) > 0);
    if (side.length === 0) {
      throw new OpeningError(`대상 없음 — ${label(ref)} 기준 ${pick.dir} 쪽에 ${spec.pid}가 없다`);
    }
    // ☠"바로 위쪽"은 **옆으로 덜 벗어난 쪽**이 먼저다 — 맨해튼 거리로만 고르면 대각으로 멀찍이
    //   떨어진 유닛이 이겨서 사람이 가리킨 것과 다른 대상을 친다(m003 검병 2인 실사례).
    const perp = (u) => Math.abs((u.x - ref.x) * d.y - (u.y - ref.y) * d.x);
    return [...side].sort((a, b) => perp(a) - perp(b) || along(a) - along(b) || a.y - b.y || a.x - b.x)[0];
  }
  return [...cands].sort((a, b) => dist(a, ref) - dist(b, ref) || a.y - b.y || a.x - b.x)[0];
}

/** 맵 전체 칸(코스트 0 대역) — 워프 착지처럼 이동 범위와 무관한 지정의 후보. */
function allTiles(game) {
  const out = [];
  for (let y = 0; y < game.map.height; y++) for (let x = 0; x < game.map.width; x++) out.push({ x, y, cost: 0 });
  return out;
}

function inBounds(game, x, y) {
  return x >= 0 && y >= 0 && x < game.map.width && y < game.map.height;
}

/** 그 유닛이 이번 턴에 설 수 있는 칸(policy.reachable과 같은 엔진 경로). */
export function reachableTiles(engine, game, unit) {
  const budget = engine.moveBudgetOn(game.map, unit);
  if (budget === undefined || game.map.costs[unit.moveType] === undefined) {
    return [{ x: unit.x, y: unit.y, cost: 0 }];
  }
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
 * `to`·`land` 값 → 좌표. 좌표 직접 지정은 마지막 수단이고, 정본은 대상 상대 지정이다
 * (인계 사슬로 로스터가 바뀌면 절대 좌표가 흔들린다 — 설계 §1-3).
 */
export function resolveTile(engine, game, spec, self, opts) {
  if (spec === undefined) throw new OpeningError("칸 지정이 없다");
  if (spec.x !== undefined && spec.y !== undefined) {
    if (!inBounds(game, spec.x, spec.y)) throw new OpeningError(`맵 밖 좌표 — (${spec.x},${spec.y})`);
    return { x: spec.x, y: spec.y };
  }
  const anchorPid = spec.near ?? spec.of;
  if (spec.tid !== undefined && anchorPid !== undefined) {
    // "그 궁병 밑의 요새 칸" — 지형으로 고르되 **기준은 다른 유닛**이다(워프 착지의 정상 어법).
    const anchor = resolveUnit(game, { pid: anchorPid, pick: spec.pick }, self);
    const tiles = (opts?.anywhere === true ? allTiles(game) : reachableTiles(engine, game, self)).filter(
      (t) => game.map.terrain?.[t.y]?.[t.x]?.tid === spec.tid,
    );
    if (tiles.length === 0) throw new OpeningError(`${spec.tid} 칸이 없다 — ${label(anchor)} 기준`);
    const t = [...tiles].sort((a, b) => dist(a, anchor) - dist(b, anchor) || a.y - b.y || a.x - b.x)[0];
    return { x: t.x, y: t.y };
  }
  if (anchorPid !== undefined) {
    const ref = resolveUnit(game, { pid: anchorPid, pick: spec.pick }, self);
    const d = DIRS[spec.dir ?? "up"];
    if (d === undefined) throw new OpeningError(`방향 어휘가 아니다 — ${spec.dir}(${DIR_NAMES})`);
    const n = spec.steps ?? 1;
    const at = { x: ref.x + d.x * n, y: ref.y + d.y * n };
    if (!inBounds(game, at.x, at.y)) throw new OpeningError(`맵 밖 좌표 — ${label(ref)} ${spec.dir} ${n}칸`);
    return at;
  }
  if (spec.toward !== undefined) {
    // "최대전진" — 그 유닛 쪽으로 이번 턴 갈 수 있는 만큼(거리 최소 → 코스트 최소 → 칸 순번).
    const goal = resolveUnit(game, { pid: spec.toward, pick: spec.pick }, self);
    const tiles = reachableTiles(engine, game, self);
    const t = [...tiles].sort(
      (a, b) => dist(a, goal) - dist(b, goal) || a.cost - b.cost || a.y - b.y || a.x - b.x,
    )[0];
    if (t === undefined) throw new OpeningError(`갈 칸이 없다 — ${label(self)}`);
    return { x: t.x, y: t.y };
  }
  if (spec.tid !== undefined) {
    // 지형 지정("가장 가까운 요새 칸") — 갈 수 있는 칸 중에서만 고른다. 못 가면 실패다.
    // ★워프 착지(anywhere)는 이동이 아니므로 맵 전체가 후보다 — 사거리 게이트는 호출자가 건다.
    const tiles =
      opts?.anywhere === true
        ? allTiles(game).filter((t) => game.map.terrain?.[t.y]?.[t.x]?.tid === spec.tid)
        : reachableTiles(engine, game, self).filter((t) => game.map.terrain?.[t.y]?.[t.x]?.tid === spec.tid);
    if (tiles.length === 0) {
      throw new OpeningError(
        opts?.anywhere === true ? `${spec.tid} 칸이 맵에 없다` : `${spec.tid} 칸에 이번 턴 도달 불가 — ${label(self)}`,
      );
    }
    const t = [...tiles].sort((a, b) => a.cost - b.cost || dist(a, self) - dist(b, self) || a.y - b.y || a.x - b.x)[0];
    return { x: t.x, y: t.y };
  }
  throw new OpeningError(`칸 지정 문법이 아니다 — ${JSON.stringify(spec)}`);
}

/** 유닛의 유효 무기 목록(인게이지 증설분 포함) — attack.weapon 인덱스의 해석 대상. */
function weaponsOf(engine, unit) {
  return engine.effectiveWeapons(unit) ?? (unit.weapon !== undefined ? [unit.weapon] : []);
}

function weaponIndex(engine, unit, want) {
  const list = weaponsOf(engine, unit);
  if (want === undefined) return undefined;
  if (typeof want === "number") {
    if (list[want] === undefined) throw new OpeningError(`무기 인덱스 밖 — ${want}(${list.length}점)`);
    return want;
  }
  const i = list.findIndex((w) => w?.name === want || w?.iid === want);
  if (i < 0) throw new OpeningError(`무기 없음 — ${want}(소지 ${list.map((w) => w?.name ?? "?").join("/")})`);
  return i;
}

/**
 * 사거리 안으로 **최소 이동** — 같은 코스트면 먼 칸(반격을 덜 받는 쪽)을 고르고,
 * 그래도 같으면 칸 순번으로 확정한다(같은 오프닝이 항상 같은 기보를 낳아야 한다).
 */
function approach(engine, game, self, foe, rangeMin, rangeMax, forced) {
  const tiles = reachableTiles(engine, game, self);
  const ok = tiles.filter((t) => {
    const d = dist(t, foe);
    return d >= rangeMin && d <= rangeMax;
  });
  if (forced !== undefined) {
    const hit = ok.find((t) => t.x === forced.x && t.y === forced.y);
    if (hit === undefined) {
      throw new OpeningError(`지정 발판에서 못 친다 — (${forced.x},${forced.y}) → ${label(foe)} 사거리 ${rangeMin}~${rangeMax}`);
    }
    return hit;
  }
  if (ok.length === 0) {
    // 사유에 **도달 칸 수와 최단 거리**를 싣는다 — "사거리 밖"만으로는 이동력 부족인지 길이 막힌 건지 못 가린다.
    const near = tiles.reduce((m, t) => Math.min(m, dist(t, foe)), Infinity);
    throw new OpeningError(
      `사거리 밖 — ${label(self)}가 ${label(foe)}를 이번 턴에 못 친다(사거리 ${rangeMin}~${rangeMax} · 도달 칸 ${tiles.length}개 · 최단 거리 ${near})`,
    );
  }
  return [...ok].sort(
    (a, b) => a.cost - b.cost || dist(b, foe) - dist(a, foe) || a.y - b.y || a.x - b.x,
  )[0];
}

const moveTo = (unit, at) =>
  unit.x === at.x && unit.y === at.y ? [] : [{ type: "move", unit: unit.id, x: at.x, y: at.y }];

/**
 * 한 수(step) → 액션 목록.
 *
 * `terminal`이 false인 수(engage·move)는 **행동을 소진하지 않는다** — 그 유닛은 오프닝이 끝난 뒤
 * 정책이 이어받는다(이동한 유닛은 엔진 이동 예산이 0이라 정책이 다시 옮길 수 없다 = 수순이 안 뒤집힌다).
 */
export function resolveStep(engine, game, step) {
  const self = resolveUnit(game, { pid: step.unit, pick: step.pick }, undefined);
  if (self.force !== 0) throw new OpeningError(`자군이 아니다 — ${label(self)} force ${self.force}`);
  if (self.acted === true) throw new OpeningError(`이미 행동을 마쳤다 — ${label(self)}`);

  if (step.engage === true) {
    // 발동 조건을 여기서 먼저 읽는다 — 엔진 거부는 사유를 안 준다(검수 도구는 "왜 안 되는지"가 본체다).
    const g = self.engage;
    if (g === undefined) throw new OpeningError(`엠블렘이 없다 — ${label(self)}`);
    if (g.engaging === true) throw new OpeningError(`이미 인게이지 중이다 — ${label(self)}`);
    if (g.limit < 1 || g.count < g.limit) {
      throw new OpeningError(`기공 미충전 — ${label(self)} ${g.count}/${g.limit}`);
    }
    if (self.traded === true) throw new OpeningError(`교환 후에는 발동 불가 — ${label(self)}`);
    return { self, actions: [{ type: "engage", unit: self.id }], terminal: false, note: "인게이지 발동" };
  }
  if (step.wait === true) {
    return { self, actions: [{ type: "wait", unit: self.id }], terminal: true, note: "대기" };
  }
  if (step.move !== undefined) {
    const at = resolveTile(engine, game, step.move.to ?? step.move, self);
    const reach = reachableTiles(engine, game, self).some((t) => t.x === at.x && t.y === at.y);
    if (!reach) throw new OpeningError(`도달 불가 — ${label(self)} → (${at.x},${at.y})`);
    return { self, actions: moveTo(self, at), terminal: false, note: `이동 (${at.x},${at.y})` };
  }
  if (step.visit === true || step.visit?.to !== undefined) {
    const at =
      step.visit?.to !== undefined
        ? resolveTile(engine, game, step.visit.to, self)
        : nearestVisit(engine, game, self);
    return {
      self,
      actions: [...moveTo(self, at), { type: "visit", unit: self.id }],
      terminal: true,
      note: `민가 방문 (${at.x},${at.y})`,
    };
  }
  if (step.item !== undefined) {
    const list = self.consumables ?? [];
    const i =
      step.item.index ?? list.findIndex((c) => c.iid === step.item.iid || c.name === step.item.iid);
    if (list[i] === undefined) {
      throw new OpeningError(`소모품 없음 — ${step.item.iid ?? step.item.index}(소지 ${list.map((c) => c.iid ?? c.name).join("/")})`);
    }
    return { self, actions: [{ type: "item", unit: self.id, item: i }], terminal: true, note: `아이템 ${list[i].iid ?? list[i].name}` };
  }
  if (step.attack !== undefined) {
    const foe = resolveUnit(game, step.attack, self);
    const wi = weaponIndex(engine, self, step.attack.weapon);
    const w = weaponsOf(engine, self)[wi ?? 0];
    if (w === undefined) throw new OpeningError(`무기 없음 — ${label(self)}`);
    const forced = step.attack.from === undefined ? undefined : resolveTile(engine, game, step.attack.from, self);
    const at = approach(engine, game, self, foe, w.rangeMin ?? 1, w.rangeMax ?? 1, forced);
    return {
      self,
      actions: [
        ...moveTo(self, at),
        { type: "attack", unit: self.id, target: foe.id, ...(wi === undefined ? {} : { weapon: wi }) },
      ],
      terminal: true,
      note: `공격 ${label(foe)} ← (${at.x},${at.y})${wi === undefined ? "" : ` [${w.name ?? wi}]`}`,
    };
  }
  if (step.art !== undefined) {
    const foe = resolveUnit(game, step.art, self);
    if (self.engage?.engaging !== true) throw new OpeningError(`인게이지 중이 아니다 — ${label(self)}(engage 수순이 먼저다)`);
    const art = self.engageArt;
    if (art === undefined) throw new OpeningError(`인게이지 기술이 없다 — ${label(self)}`);
    if ((self.engage.count ?? 0) < (art.cost ?? 0)) {
      throw new OpeningError(`기공 부족 — ${label(self)} ${self.engage.count}/${art.cost}`);
    }
    const rangeMin = art.rangeMin ?? self.weapon?.rangeMin ?? 1;
    const rangeMax = art.rangeMax ?? self.weapon?.rangeMax ?? 1;
    if ((art.rewarp ?? 0) > 0) {
      // 리워프형 — 착지 칸이 곧 발판이라 이동이 없다. 사람이 칸을 지정해야 한다(설계 §2-1).
      if (step.art.land === undefined) throw new OpeningError(`리워프형 기술은 land(착지 칸)가 필수다 — ${art.name ?? "기술"}`);
      const land = resolveTile(engine, game, step.art.land, self, { anywhere: true });
      const d = dist(land, foe);
      if (d < rangeMin || d > rangeMax) {
        throw new OpeningError(`착지 칸에서 못 친다 — (${land.x},${land.y}) → ${label(foe)} 사거리 ${rangeMin}~${rangeMax}`);
      }
      return {
        self,
        actions: [{ type: "engageAttack", unit: self.id, target: foe.id, x: land.x, y: land.y }],
        terminal: true,
        note: `${art.name ?? "인게이지 기술"} ${label(foe)} ← 착지 (${land.x},${land.y})`,
      };
    }
    const at = approach(engine, game, self, foe, rangeMin, rangeMax, undefined);
    return {
      self,
      actions: [...moveTo(self, at), { type: "engageAttack", unit: self.id, target: foe.id }],
      terminal: true,
      note: `${art.name ?? "인게이지 기술"} ${label(foe)} ← (${at.x},${at.y})`,
    };
  }
  throw new OpeningError(`수순 문법이 아니다 — ${JSON.stringify(step)}`);
}

/** 가장 가까운 미방문 민가(정책 bestVisit과 같은 판별 — 점유 칸 제외). */
function nearestVisit(engine, game, self) {
  const spots = (game.map.interactions ?? []).filter((i) => i.kind === "visit");
  const taken = new Set(game.units.filter((u) => !u.dead && u.id !== self.id).map((u) => u.y * game.map.width + u.x));
  const reach = reachableTiles(engine, game, self);
  const ok = [];
  for (const s of spots) {
    // ☠서는 칸은 `stand`다 — 민가 본체(x,y)는 통행 불가라 그 칸을 노리면 영영 도달 못 한다(엔진 visit 계약).
    const x = s.stand?.x ?? s.x;
    const y = s.stand?.y ?? s.y;
    if ((game.visited ?? []).some((v) => v.x === x && v.y === y)) continue;
    if (taken.has(y * game.map.width + x)) continue;
    const t = reach.find((r) => r.x === x && r.y === y);
    if (t !== undefined) ok.push(t);
  }
  if (ok.length === 0) {
    // 사유를 민가별로 남긴다 — "없다"만으로는 다 열린 건지 못 간 건지 못 가린다.
    const why = spots.map((s) => {
      const x = s.stand?.x ?? s.x;
      const y = s.stand?.y ?? s.y;
      if ((game.visited ?? []).some((v) => v.x === x && v.y === y)) return `(${x},${y})=이미 방문`;
      if (taken.has(y * game.map.width + x)) return `(${x},${y})=칸 점유`;
      return `(${x},${y})=도달 불가`;
    });
    throw new OpeningError(`방문 가능한 민가가 없다 — ${label(self)} · ${why.join(" ")}`);
  }
  return [...ok].sort((a, b) => a.cost - b.cost || a.y - b.y || a.x - b.x)[0];
}

/**
 * 그 턴의 수순을 판에 둔다 — 실패는 던진다(설계 §6-A 확정: 조용한 휴리스틱 강하 금지).
 * 반환 = 오프닝이 소유한 유닛 id 집합(정책은 이 유닛들을 이번 턴에 건드리지 않는다).
 */
export function runOpeningTurn({ engine, dispatch, state, opening, cid, log, verbose }) {
  const owned = new Set();
  const turn = state().turn;
  const steps = openingSteps(opening, turn);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const where = `오프닝 ${cid} T${turn} #${i}`;
    const before = state();
    let plan;
    try {
      plan = resolveStep(engine, before, step);
    } catch (e) {
      // ★`optional` = "이 수가 **이번 턴에 안 서면 건너뛴다**"(제거 실패시 추가공격 · 적이 아직 안 붙었을 때).
      //   ☠문법·소유 오류는 여전히 던진다 — 오타나 잘못된 유닛 지정을 넘기면 수순이 조용히 사라진다.
      const skippable = /대상 없음|사거리 밖|도달 불가|기공 미충전|이미 인게이지 중|인게이지 중이 아니다|이미 행동을 마쳤다|방문 가능한 민가가 없다|칸에 이번 턴 도달 불가/;
      if (step.optional === true && skippable.test(e.message)) {
        if (verbose === true) log?.(`  ${where}: 생략(optional — ${e.message})`);
        continue;
      }
      throw new OpeningError(`${where}: ${e.message}`);
    }
    if (verbose === true) log?.(`  ${where}: ${label(plan.self)} ${plan.note}`);
    // 이미 그 칸에 서 있는 이동처럼 **낼 액션이 없는 수**는 무동작이 정답이다(거부가 아니다).
    if (plan.actions.length === 0) continue;
    for (const a of plan.actions) dispatch(a);
    if (state() === before) {
      throw new OpeningError(`${where}: ${label(plan.self)} ${plan.note} — 엔진이 거부했다`);
    }
    if (plan.terminal) owned.add(plan.self.id);
  }
  return owned;
}
