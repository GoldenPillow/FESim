/**
 * 오프닝 해석기 단위 테스트 — ☠여기서 잡는 결함은 "수순이 조용히 다른 유닛을 가리키는 것"이다.
 * 기보는 되읽으면 그럴듯해 보이므로, 잘못 가리킨 대상은 실행 결과만으로는 못 잡는다(설계 §5-2).
 */
import { describe, expect, it } from "vitest";
import { OpeningError, resolveStep, resolveTile, resolveUnit } from "./opening.mjs";

/** 이동 판정은 엔진이 소유한다 — 여기서는 "맨해튼 budget 안 = 도달"로 대역만 세운다. */
const engine = {
  moveBudgetOn: (_map: unknown, u: { movePoints?: number }) => u.movePoints ?? 0,
  makeCostAt: () => () => 1,
  movePredicates: () => ({}),
  movementRange: ({ width, height, movePoints, start }: {
    width: number; height: number; movePoints: number; start: { x: number; y: number };
  }) => {
    const out = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cost = Math.abs(x - start.x) + Math.abs(y - start.y);
        if (cost <= movePoints) out.push({ x, y, cost });
      }
    }
    return out;
  },
  effectiveWeapons: (u: { weapons?: unknown[] }) => u.weapons,
};

const sword = { name: "철검", rangeMin: 1, rangeMax: 1 };
const bow = { name: "철궁", rangeMin: 2, rangeMax: 2 };

const unit = (over: Record<string, unknown>) => ({
  id: "u0",
  pid: "PID_X",
  force: 1,
  x: 0,
  y: 0,
  hp: 10,
  stats: { hp: 10 },
  movePoints: 0,
  moveType: "foot",
  ...over,
});

const gameWith = (units: unknown[], terrain?: Record<string, unknown>[][]) => ({
  turn: 1,
  phase: 0,
  units,
  map: { width: 8, height: 8, costs: { foot: [] }, terrain },
});

const hero = unit({ id: "u0", pid: "PID_リュール", force: 0, x: 3, y: 3, movePoints: 4, weapons: [sword] });

describe("resolveUnit — 대상 지정", () => {
  it("pid가 유일하면 그대로 고른다", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 6, y: 3 });
    expect(resolveUnit(gameWith([hero, foe]), { pid: "PID_AXE" }, hero).id).toBe("u1");
  });

  it("☠같은 pid가 여럿인데 pick이 없으면 실패한다(임의 선택 금지)", () => {
    const a = unit({ id: "u1", pid: "PID_SWORD", x: 6, y: 3 });
    const b = unit({ id: "u2", pid: "PID_SWORD", x: 3, y: 6 });
    expect(() => resolveUnit(gameWith([hero, a, b]), { pid: "PID_SWORD" }, hero)).toThrow(OpeningError);
    expect(() => resolveUnit(gameWith([hero, a, b]), { pid: "PID_SWORD" }, hero)).toThrow(/모호/);
  });

  it("dir는 화면 기준이다 — up = y+ (데이터 좌표계 변환은 도구가 한다)", () => {
    const above = unit({ id: "u1", pid: "PID_SWORD", x: 3, y: 6 });
    const right = unit({ id: "u2", pid: "PID_SWORD", x: 6, y: 3 });
    const game = gameWith([hero, above, right]);
    expect(resolveUnit(game, { pid: "PID_SWORD", pick: { dir: "up", of: "PID_リュール" } }, hero).id).toBe("u1");
    expect(resolveUnit(game, { pid: "PID_SWORD", pick: { dir: "right", of: "PID_リュール" } }, hero).id).toBe("u2");
  });

  it("of를 생략하면 행동 주체가 기준이다", () => {
    const above = unit({ id: "u1", pid: "PID_SWORD", x: 3, y: 6 });
    const below = unit({ id: "u2", pid: "PID_SWORD", x: 3, y: 1 });
    expect(resolveUnit(gameWith([hero, above, below]), { pid: "PID_SWORD", pick: { dir: "down" } }, hero).id).toBe("u2");
  });

  it("같은 방향에 여럿이면 기준에서 가까운 쪽", () => {
    const near = unit({ id: "u1", pid: "PID_SWORD", x: 3, y: 5 });
    const far = unit({ id: "u2", pid: "PID_SWORD", x: 3, y: 7 });
    expect(resolveUnit(gameWith([hero, far, near]), { pid: "PID_SWORD", pick: { dir: "up" } }, hero).id).toBe("u1");
  });

  it("☠dir는 '바로 그쪽'이다 — 옆으로 덜 벗어난 쪽이 먼 쪽보다 먼저다(m003 검병 2인)", () => {
    const straight = unit({ id: "u1", pid: "PID_SWORD", x: 2, y: 7 }); // 옆으로 1칸, 위로 4칸
    const diagonal = unit({ id: "u2", pid: "PID_SWORD", x: 6, y: 5 }); // 맨해튼은 더 가깝지만 옆으로 3칸
    const got = resolveUnit(gameWith([hero, straight, diagonal]), { pid: "PID_SWORD", pick: { dir: "up" } }, hero);
    expect(got.id).toBe("u1");
  });

  it("☠pick은 후보가 하나여도 거른다 — 못박은 칸과 다른 유닛이 조용히 통과하면 안 된다", () => {
    const only = unit({ id: "u1", pid: "PID_SWORD", x: 6, y: 3 });
    const game = gameWith([hero, only]);
    expect(() => resolveUnit(game, { pid: "PID_SWORD", pick: { at: { x: 3, y: 6 } } }, hero)).toThrow(/대상 없음/);
    expect(resolveUnit(game, { pid: "PID_SWORD", pick: { at: { x: 6, y: 3 } } }, hero).id).toBe("u1");
  });

  it("죽은 유닛은 대상이 아니다", () => {
    const dead = unit({ id: "u1", pid: "PID_AXE", x: 6, y: 3, dead: true });
    expect(() => resolveUnit(gameWith([hero, dead]), { pid: "PID_AXE" }, hero)).toThrow(/대상 없음/);
  });

  it("at으로 칸을 못박을 수 있다", () => {
    const a = unit({ id: "u1", pid: "PID_SWORD", x: 6, y: 3 });
    const b = unit({ id: "u2", pid: "PID_SWORD", x: 3, y: 6 });
    expect(resolveUnit(gameWith([hero, a, b]), { pid: "PID_SWORD", pick: { at: { x: 3, y: 6 } } }, hero).id).toBe("u2");
  });
});

describe("resolveTile — 칸 지정", () => {
  it("near+dir는 그 유닛 기준 상대 칸", () => {
    const foe = unit({ id: "u1", pid: "PID_ARCHER", x: 5, y: 5 });
    const game = gameWith([hero, foe]);
    expect(resolveTile(engine, game, { near: "PID_ARCHER", dir: "down", steps: 2 }, hero)).toEqual({ x: 5, y: 3 });
  });

  it("tid는 도달 가능한 칸 중 가장 싼 칸", () => {
    const terrain = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ tid: "TID_平地" })));
    terrain[4][3] = { tid: "TID_砦" };
    terrain[7][7] = { tid: "TID_砦" };
    const at = resolveTile(engine, gameWith([hero], terrain), { tid: "TID_砦", nearest: true }, hero);
    expect(at).toEqual({ x: 3, y: 4 });
  });

  it("도달 못 하는 지형은 실패다(조용한 근사 금지)", () => {
    const terrain = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ tid: "TID_平地" })));
    terrain[7][7] = { tid: "TID_砦" };
    expect(() => resolveTile(engine, gameWith([hero], terrain), { tid: "TID_砦" }, hero)).toThrow(/도달 불가/);
  });

  it("맵 밖은 실패다", () => {
    const foe = unit({ id: "u1", pid: "PID_ARCHER", x: 0, y: 0 });
    expect(() => resolveTile(engine, gameWith([hero, foe]), { near: "PID_ARCHER", dir: "down" }, hero)).toThrow(/맵 밖/);
  });
});

describe("resolveStep — 수순 → 액션", () => {
  it("attack은 사거리 안으로 최소 이동 후 친다", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 6, y: 3 });
    const plan = resolveStep(engine, gameWith([hero, foe]), { unit: "PID_リュール", attack: { pid: "PID_AXE" } });
    expect(plan.actions).toEqual([
      { type: "move", unit: "u0", x: 5, y: 3 },
      { type: "attack", unit: "u0", target: "u1" },
    ]);
    expect(plan.terminal).toBe(true);
  });

  it("이미 사거리 안이면 이동하지 않는다", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 4, y: 3 });
    const plan = resolveStep(engine, gameWith([hero, foe]), { unit: "PID_リュール", attack: { pid: "PID_AXE" } });
    expect(plan.actions).toEqual([{ type: "attack", unit: "u0", target: "u1" }]);
  });

  it("무기를 지정하면 그 인덱스가 실린다(사거리도 그 무기 기준)", () => {
    const archer = unit({ id: "u0", pid: "PID_エーティエ", force: 0, x: 3, y: 3, movePoints: 4, weapons: [sword, bow] });
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 7, y: 3 });
    const plan = resolveStep(engine, gameWith([archer, foe]), {
      unit: "PID_エーティエ",
      attack: { pid: "PID_AXE", weapon: "철궁" },
    });
    expect(plan.actions).toEqual([
      { type: "move", unit: "u0", x: 5, y: 3 },
      { type: "attack", unit: "u0", target: "u1", weapon: 1 },
    ]);
  });

  it("사거리에 못 닿으면 실패다 — 근처까지 가서 때리는 척하지 않는다", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 7, y: 7 });
    expect(() =>
      resolveStep(engine, gameWith([hero, foe]), { unit: "PID_リュール", attack: { pid: "PID_AXE" } }),
    ).toThrow(/사거리 밖/);
  });

  it("engage·move는 행동을 소진하지 않는다(정책이 이어받는다)", () => {
    const charged = { ...hero, engage: { count: 7, limit: 7, turnLimit: 3, turn: 0, engaging: false } };
    expect(resolveStep(engine, gameWith([charged]), { unit: "PID_リュール", engage: true }).terminal).toBe(false);
    const game = gameWith([hero]);
    const moved = resolveStep(engine, game, { unit: "PID_リュール", move: { to: { x: 5, y: 3 } } });
    expect(moved.terminal).toBe(false);
    expect(moved.actions).toEqual([{ type: "move", unit: "u0", x: 5, y: 3 }]);
  });

  it("워프 착지 칸은 이동 범위 밖이어도 된다(착지는 이동이 아니다)", () => {
    const terrain = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ tid: "TID_平地" })));
    terrain[7][7] = { tid: "TID_砦" };
    const warper = unit({
      id: "u0",
      pid: "PID_セリーヌ",
      force: 0,
      x: 0,
      y: 0,
      movePoints: 1,
      weapons: [sword],
      engage: { engaging: true, count: 3 },
      engageArt: { name: "ワープライナ", cost: 2, rewarp: 1, rangeMin: 1, rangeMax: 2 },
    });
    const foe = unit({ id: "u1", pid: "PID_ARCHER", x: 7, y: 5 });
    const plan = resolveStep(engine, gameWith([warper, foe], terrain), {
      unit: "PID_セリーヌ",
      art: { pid: "PID_ARCHER", land: { tid: "TID_砦" } },
    });
    expect(plan.actions).toEqual([{ type: "engageAttack", unit: "u0", target: "u1", x: 7, y: 7 }]);
  });

  it("리워프형 기술은 land가 없으면 실패다", () => {
    const warper = unit({
      id: "u0",
      pid: "PID_セリーヌ",
      force: 0,
      x: 3,
      y: 3,
      movePoints: 4,
      weapons: [sword],
      engage: { engaging: true, count: 3 },
      engageArt: { name: "ワープライナ", cost: 2, rewarp: 1, rangeMin: 1, rangeMax: 1 },
    });
    const foe = unit({ id: "u1", pid: "PID_ARCHER", x: 6, y: 6 });
    const game = gameWith([warper, foe]);
    expect(() => resolveStep(engine, game, { unit: "PID_セリーヌ", art: { pid: "PID_ARCHER" } })).toThrow(/land/);
    const plan = resolveStep(engine, game, {
      unit: "PID_セリーヌ",
      art: { pid: "PID_ARCHER", land: { near: "PID_ARCHER", dir: "down" } },
    });
    expect(plan.actions).toEqual([{ type: "engageAttack", unit: "u0", target: "u1", x: 6, y: 5 }]);
  });

  it("인게이지 중이 아니면 기술을 못 쓴다(engage 수순이 먼저다)", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 4, y: 3 });
    expect(() => resolveStep(engine, gameWith([hero, foe]), { unit: "PID_リュール", art: { pid: "PID_AXE" } })).toThrow(
      /인게이지 중이 아니다/,
    );
  });

  it("기공이 모자라면 실패다", () => {
    const engaged = unit({
      id: "u0",
      pid: "PID_リュール",
      force: 0,
      x: 3,
      y: 3,
      movePoints: 4,
      weapons: [sword],
      engage: { engaging: true, count: 1 },
      engageArt: { name: "スターラッシュ", cost: 3 },
    });
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 4, y: 3 });
    expect(() => resolveStep(engine, gameWith([engaged, foe]), { unit: "PID_リュール", art: { pid: "PID_AXE" } })).toThrow(
      /기공 부족/,
    );
  });

  /**
   * 왜 위험한가: 엔진은 발동을 거부만 하고 **사유를 주지 않는다**. 검수 도구가 "엔진이 거부했다"만
   * 되뇌면 사람은 기공인지 이미 발동 중인지 교환 탓인지 못 가린다 — m002 수순 검수에서 실제로 막혔다.
   */
  it("인게이지 발동 실패는 사유를 준다(기공·중복 발동)", () => {
    const empty = { ...hero, engage: { count: 0, limit: 7, turnLimit: 3, turn: 0, engaging: false } };
    expect(() => resolveStep(engine, gameWith([empty]), { unit: "PID_リュール", engage: true })).toThrow(/기공 미충전/);
    const on = { ...hero, engage: { count: 7, limit: 7, turnLimit: 3, turn: 1, engaging: true } };
    expect(() => resolveStep(engine, gameWith([on]), { unit: "PID_リュール", engage: true })).toThrow(/이미 인게이지 중/);
    expect(() => resolveStep(engine, gameWith([hero]), { unit: "PID_リュール", engage: true })).toThrow(/엠블렘이 없다/);
  });

  it("자군이 아닌 유닛은 지시할 수 없다", () => {
    const foe = unit({ id: "u1", pid: "PID_AXE", x: 4, y: 3 });
    expect(() => resolveStep(engine, gameWith([hero, foe]), { unit: "PID_AXE", wait: true })).toThrow(/자군이 아니다/);
  });

  it("문법에 없는 수순은 실패다(빈 수순을 조용히 넘기지 않는다)", () => {
    expect(() => resolveStep(engine, gameWith([hero]), { unit: "PID_リュール" })).toThrow(/수순 문법/);
  });

  /**
   * 왜 위험한가: 소모품 경로는 오프닝 수순 중 **유일하게 AddType 게이트가 없었다**. 엔진은 범위 회복(2)만
   * 배선했으므로 사람이 특효약(7)·해독제(18)·능력치 약(31)을 지명하면 리듀서가 `미배선 아이템 종류`로
   * 던지는데, 그 문장에는 **어느 수순의 무엇인지가 없다** — 검수 도구가 원인을 못 짚는다.
   */
  it("엔진 미배선 소모품(AddType != 2)은 사유를 붙여 거부한다", () => {
    const vulnerary = { iid: "IID_상처약", addType: 2, uses: 3 };
    const tonic = { iid: "IID_능력치약", addType: 31, uses: 1 };
    const carrier = { ...hero, consumables: [vulnerary, tonic] };
    const step = (iid: string) => ({ unit: "PID_リュール", item: { iid } });
    expect(resolveStep(engine, gameWith([carrier]), step("IID_상처약")).actions).toEqual([
      { type: "item", unit: "u0", item: 0 },
    ]);
    expect(() => resolveStep(engine, gameWith([carrier]), step("IID_능력치약"))).toThrow(OpeningError);
    expect(() => resolveStep(engine, gameWith([carrier]), step("IID_능력치약"))).toThrow(/AddType 31/);
  });
});
