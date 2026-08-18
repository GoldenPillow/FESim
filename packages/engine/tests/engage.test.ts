import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CalculatorData } from "@fesim/shared";
import {
  canBreak,
  createCalculator,
  createReducer,
  createReplayer,
  recordingSource,
  type BattleAction,
  type EngageState,
  type GameState,
  type RandomSource,
  type UnitState,
} from "@fesim/engine";

/**
 * 인게이지 상태 기계(MP1-4a) — 정본 = il2cpp/EMBLEM_ENGAGE §3(전부 코드 확정):
 * (1) 충전 = 전투 1회 참가당 +1(공격·피격 양측), 상한 클램프 · 인게이지 중엔 충전 없음 · 턴당 자연 증가 없음.
 * (2) 발동 = count >= limit, 행동 소모 없음(발동 후 이동·공격 가능) · 발동 시 turn = 0.
 * (3) 소비 = 자기 페이즈 시작마다 turn += 1, turnLimit 도달 시 해제 + count = 0.
 * 이 순서가 어긋나면 게이지·지속이 실기와 어긋나 답안지 기보가 통째로 틀어진다.
 */
const data: CalculatorData = JSON.parse(
  readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8"),
);
const reduce = createReducer(createCalculator(data));

const roll = (...values: number[]): RandomSource => ({ next: () => values.shift() ?? 0 });

const baseStats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
const gauge = (over: Partial<EngageState> = {}): EngageState => ({
  count: 0,
  limit: 7,
  turnLimit: 3,
  turn: 0,
  engaging: false,
  ...over,
});

function unit(partial: Partial<UnitState> & { id: string; force: number; x: number; y: number }): UnitState {
  return {
    hp: partial.stats?.hp ?? baseStats.hp,
    stats: baseStats,
    level: 1,
    exp: 0,
    movePoints: 4,
    moveType: "foot",
    acted: false,
    dead: false,
    broken: false,
    ...partial,
  };
}

function state(units: UnitState[], phase = 0): GameState {
  return {
    turn: 1,
    phase,
    difficulty: "n",
    map: { width: 8, height: 8, costs: { foot: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 1)) } },
    units,
    events: [],
  };
}

describe("인게이지 충전", () => {
  it("전투 1회 = 공격·피격 양측 +1(상한 클램프), charge 이벤트 절대값", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, engage: gauge({ count: 6 }) });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, engage: gauge({ count: 0 }) });
    const next = reduce(state([a, e]), { type: "attack", unit: "a", target: "e" } as BattleAction, roll(9999, 9999, 9999, 9999));
    expect(next.units[0].engage?.count).toBe(7);
    expect(next.units[1].engage?.count).toBe(1);
    expect(next.events).toContainEqual({ type: "charge", unit: "a", count: 7 });
    expect(next.events).toContainEqual({ type: "charge", unit: "e", count: 1 });
  });

  it("인게이지 중인 유닛은 충전되지 않는다 · 만충도 그대로", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, engage: gauge({ count: 7, engaging: true }) });
    const e = unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword });
    const next = reduce(state([a, e]), { type: "attack", unit: "a", target: "e" } as BattleAction, roll(9999, 9999, 9999, 9999));
    expect(next.units[0].engage?.count).toBe(7);
    expect(next.events.some((ev) => ev.type === "charge" && ev.unit === "a")).toBe(false);
  });

  it("지팡이 사용도 술자 +1 (전투 계산기 경로 — 가정, 실측 대조 대상)", () => {
    const h = unit({
      id: "h", force: 0, x: 0, y: 0,
      staves: [{ power: 10, rangeMin: 1, rangeMax: 1, uses: 5, rodType: 2, rodExp: 25 }],
      engage: gauge({ count: 2 }),
    });
    const t = unit({ id: "t", force: 0, x: 1, y: 0, hp: 5 });
    const next = reduce(state([h, t]), { type: "staff", unit: "h", target: "t" } as BattleAction, roll(0, 0, 0, 0, 0, 0, 0, 0, 0));
    expect(next.units[0].engage?.count).toBe(3);
  });
});

describe("인게이지 발동·지속·해제", () => {
  it("발동 = 만충 필요·행동 소모 없음·turn 리셋 — 미만충은 던진다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7 }) });
    const b = unit({ id: "b", force: 0, x: 3, y: 0, engage: gauge({ count: 3 }) });
    const next = reduce(state([a, b]), { type: "engage", unit: "a" } as BattleAction, roll());
    expect(next.units[0].engage?.engaging).toBe(true);
    expect(next.units[0].engage?.turn).toBe(0);
    expect(next.units[0].acted).toBe(false); // 발동 후에도 행동 가능
    expect(next.events).toContainEqual({ type: "engage", unit: "a" });
    expect(() => reduce(state([a, b]), { type: "engage", unit: "b" } as BattleAction, roll())).toThrow();
  });

  it("자기 페이즈 시작마다 turn +1, turnLimit 도달 시 해제 + count 0", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7, engaging: true, turn: 0 }) });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = state([a, e]);
    // 적 페이즈로 → 자기 페이즈 복귀 = 1턴 소비. 3회 반복하면 해제.
    for (let cycle = 1; cycle <= 3; cycle++) {
      s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 적 페이즈 (소비 없음)
      expect(s.units[0].engage?.engaging).toBe(true);
      s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 자기 페이즈 (turn += 1)
      if (cycle < 3) {
        expect(s.units[0].engage?.turn).toBe(cycle);
        expect(s.units[0].engage?.engaging).toBe(true);
      }
    }
    expect(s.units[0].engage?.engaging).toBe(false);
    expect(s.units[0].engage?.count).toBe(0);
    expect(s.events).toContainEqual({ type: "disengage", unit: "a" });
  });

  it("絆 11 이상(turnLimit 4)은 한 페이즈 더 지속된다", () => {
    const a = unit({ id: "a", force: 0, x: 0, y: 0, engage: gauge({ count: 7, engaging: true, turnLimit: 4 }) });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = state([a, e]);
    for (let i = 0; i < 3; i++) {
      s = reduce(s, { type: "endPhase" } as BattleAction, roll());
      s = reduce(s, { type: "endPhase" } as BattleAction, roll());
    }
    expect(s.units[0].engage?.engaging).toBe(true); // 3주기 뒤에도 유지(4턴째까지)
  });
});

/**
 * MP1-4b 인게이지 효과 — 정본 = il2cpp/EMBLEM_ENGAGE §2·§4(전부 코드 확정):
 * (1) engaging이면 스킬 세트가 EngagedSkills 교체본으로 바뀐다(GetSyncroSkills 0x2342530).
 *     안 바꾸면 인게이지 스킬(면역·발동기)이 전부 무발동 = 예보·판정이 실기와 어긋난다.
 * (2) 엠블렘 무기는 weapons 뒤 인덱스로만 유효(기존 인덱스 불변 = 기보 계약) · 해제 시 장비 복귀.
 * (3) 紋章氣 = count 만충 **대입** + 타일 1회성 소멸(EngageHeal 0x2681CC0) — 가산으로 구현하면 과소/과대.
 */
describe("인게이지 효과 — 스킬 세트 교체", () => {
  const axe = { might: 5, hit: 100, crit: 0, weight: 5, kind: 3, rangeMin: 1, rangeMax: 1 };

  it("브레이크 면역이 engagedSkills에만 있으면 인게이지 중에만 발동한다", () => {
    const from = unit({ id: "f", force: 0, x: 0, y: 0, weapon: sword });
    const target = unit({
      id: "t", force: 1, x: 1, y: 0, weapon: axe,
      skills: [{ Sid: "SID_力＋１" }],
      engagedSkills: [{ Sid: "SID_力＋１" }, { Sid: "SID_ブレイク無効" }],
      engage: gauge({ count: 7 }),
    });
    expect(canBreak(from, target)).toBe(true);
    const engaged = { ...target, engage: gauge({ count: 7, engaging: true }) };
    expect(canBreak(from, engaged)).toBe(false);
  });
});

describe("인게이지 효과 — 엠블렘 무기", () => {
  const emblem = { might: 9, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1, name: "엠블렘검" };

  it("엠블렘 무기 인덱스(weapons.length + n)는 engaging일 때만 유효하고 장비 전환된다", () => {
    const mk = () => [
      unit({ id: "a", force: 0, x: 0, y: 0, weapon: sword, weapons: [sword], engageWeapons: [emblem], engage: gauge({ count: 7 }) }),
      unit({ id: "e", force: 1, x: 1, y: 0 }),
    ];
    expect(() =>
      reduce(state(mk()), { type: "attack", unit: "a", target: "e", weapon: 1 } as BattleAction, roll(9999, 9999)),
    ).toThrow(/불법 무기 인덱스/);
    let s = reduce(state(mk()), { type: "engage", unit: "a" } as BattleAction, roll());
    s = reduce(s, { type: "attack", unit: "a", target: "e", weapon: 1 } as BattleAction, roll(9999, 9999, 9999, 9999));
    expect(s.units[0].weapon?.might).toBe(9);
  });

  it("인게이지 해제 시 장비 중인 엠블렘 무기는 소지품 첫 무기로 복귀한다", () => {
    const a = unit({
      id: "a", force: 0, x: 0, y: 0,
      weapon: emblem, weapons: [sword], engageWeapons: [emblem],
      engage: gauge({ count: 7, engaging: true, turnLimit: 1 }),
    });
    const e = unit({ id: "e", force: 1, x: 5, y: 5 });
    let s = state([a, e]);
    s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 적 페이즈
    s = reduce(s, { type: "endPhase" } as BattleAction, roll()); // → 자군: turnLimit 1 도달 = 해제
    expect(s.units[0].engage?.engaging).toBe(false);
    expect(s.units[0].weapon).toBe(sword);
  });
});

/**
 * MP1-4c 인게이지 기술(공격기) — 흐름은 전부 데이터(汎用設定 SyncSids)가 소유한다:
 * 攻撃回数(타격 수)·手番回数(자기 회수)·相手の手番回数(반격 회수 = 0이면 반격 몰수)·命中率 100·必殺率 0.
 * 대미지 감쇠(ダメージ３０％류)는 相手のダメージ 대입식 — 자기 값을 식 안에서 참조한다(올림은 원문 소유).
 * 이 문법이 어긋나면 기술 대미지·타수가 실기와 통째로 어긋난다(실기 앵커 없는 가정은 장부에 명시).
 */
describe("인게이지 기술(engageAttack)", () => {
  // 汎用設定 원문 구조 그대로: 명중 100 고정·필살 0·1회수·반격 몰수.
  const artSetup = {
    Sid: "SID_エンゲージ技_汎用設定", Timing: 3, Stand: 1,
    ActNames: ["命中率", "必殺率", "手番回数", "攻撃回数", "行動回数", "相手の手番回数"],
    ActOperations: ["=", "=", "=", "=", "=", "="],
    ActValues: ["100", "0", "1", "1", "1", "0"],
  };
  const triple = { ...artSetup, ActValues: ["100", "0", "1", "3", "1", "0"] };
  const damage30 = {
    Sid: "SID_ダメージ３０％", Timing: 12, Action: 1,
    ActNames: ["相手のダメージ"], ActOperations: ["="],
    ActValues: ["cond(相手のダメージ==0, 0, cond( (相手のダメージ*0.3-int(相手のダメージ*0.3)) > 0, 相手のダメージ*0.3+1, 相手のダメージ*0.3 ) )"],
  };
  const art = (over: Record<string, unknown> = {}) => ({
    sid: "SID_試験技", skills: [{ Sid: "SID_試験技" }, triple], cost: 0, ...over,
  });
  const mk = (artOver: Record<string, unknown> = {}, unitOver: Partial<UnitState> = {}) =>
    state([
      unit({
        id: "a", force: 0, x: 0, y: 0, weapon: sword,
        engage: gauge({ count: 7, engaging: true }),
        engageArt: art(artOver) as UnitState["engageArt"],
        ...unitOver,
      }),
      unit({ id: "e", force: 1, x: 1, y: 0, weapon: sword, stats: { ...baseStats, hp: 99 }, hp: 99 }),
    ]);

  it("리워프형 기술은 착지 칸으로 순간이동한 뒤 친다 — 이동 코스트를 보지 않는다", () => {
    // 왜 위험한가: 종전엔 rewarp>0을 통째로 거부해 **세리카 ワープライナ가 아예 안 나갔다**.
    // 제4장은 이 기술을 가르치는 장이고(チュートリアル_ワープライナ_済), 정석 수가 "회복 타일 칸으로
    // 워프해서 위쪽 유닛을 잡는" 것이다. 정본 = MapDeployTemplate.UnitRewarp(0x2C1FE40) —
    // 대상마다 기술 사거리 링을 후보로 칠하고, 게이트는 지형 IsNotTarget(Flag & 0x2001)뿐이다.
    const g = mk({ rewarp: 1 }, {});
    // 사거리 밖(멀리) 서 있어도 착지 칸이 사거리 안이면 성립한다.
    const far = { ...g, units: g.units.map((u) => (u.id === "a" ? { ...u, x: 5, y: 5 } : u)) };
    const next = reduce(far, { type: "engageAttack", unit: "a", target: "e", x: 2, y: 0 } as BattleAction, roll(0, 0, 0, 0));
    const me = next.units.find((u) => u.id === "a")!;
    expect([me.x, me.y]).toEqual([2, 0]);
    expect(next.events).toContainEqual({ type: "setPos", unit: "a", x: 2, y: 0 });
    expect(next.events.filter((ev) => ev.type === "strike").length).toBeGreaterThan(0);
  });

  it("리워프 착지 칸은 기술 사거리 안이어야 하고 유닛이 없어야 한다", () => {
    const g = mk({ rewarp: 1 }, {});
    const far = { ...g, units: g.units.map((u) => (u.id === "a" ? { ...u, x: 5, y: 5 } : u)) };
    // 사거리 밖 착지 — 검(사거리 1)인데 대상과 3칸 떨어진 칸
    expect(() => reduce(far, { type: "engageAttack", unit: "a", target: "e", x: 4, y: 0 } as BattleAction, roll(0, 0, 0, 0)))
      .toThrow(/사거리 밖/);
    // 대상이 선 칸 자체는 점유라 안 된다
    expect(() => reduce(far, { type: "engageAttack", unit: "a", target: "e", x: 1, y: 0 } as BattleAction, roll(0, 0, 0, 0)))
      .toThrow(/유닛이 있다/);
    // 좌표 없이 부르면 거부(통상 기술과 문법이 다르다)
    expect(() => reduce(far, { type: "engageAttack", unit: "a", target: "e" } as BattleAction, roll(0, 0, 0, 0)))
      .toThrow(/착지 칸이 필요/);
  });

  it("攻撃回数 = 3타·반격 몰수(相手の手番回数 0)·명중 100 고정 — 흐름이 데이터에서 나온다", () => {
    // 명중 롤 9999(통상이면 빗나감)라도 汎用設定 명중률 100이라 전탄 명중해야 한다.
    const next = reduce(mk(), { type: "engageAttack", unit: "a", target: "e" } as BattleAction, roll(9999, 9999, 9999, 0));
    const strikes = next.events.filter((ev) => ev.type === "strike");
    expect(strikes).toHaveLength(3);
    expect(strikes.every((s) => s.type === "strike" && s.hit && s.attacker === "a")).toBe(true);
    expect(next.units[0].acted).toBe(true);
  });

  it("ダメージ３０％ = 相手のダメージ 대입(자기참조 식·올림) — 10 → 3", () => {
    // 검 위력 5 + 힘 10 - 수비 5 = 10. 30% = 3.0(정수) → 3.
    const next = reduce(mk({ skills: [{ Sid: "SID_試験技" }, triple, damage30] }), { type: "engageAttack", unit: "a", target: "e" } as BattleAction, roll(0, 0, 0, 0));
    const strikes = next.events.filter((ev) => ev.type === "strike" && ev.damage > 0);
    expect(strikes.every((s) => s.type === "strike" && s.damage === 3)).toBe(true);
  });

  it("타격 슬롯별 강제 무기 — weapons[1] 위력이 두 번째 타에 실린다(IID_無し = null 슬롯은 현 장비)", () => {
    const emblem = { might: 9, hit: 100, crit: 0, weight: 5, kind: 2, rangeMin: 1, rangeMax: 1 };
    const next = reduce(
      mk({ weapons: [null, emblem], skills: [{ Sid: "SID_試験技" }, { ...artSetup, ActValues: ["100", "0", "1", "2", "1", "0"] }] }),
      { type: "engageAttack", unit: "a", target: "e" } as BattleAction, roll(0, 0, 0, 0),
    );
    const strikes = next.events.filter((ev) => ev.type === "strike");
    expect(strikes[0]).toMatchObject({ damage: 10 }); // 검 5 + 힘 10 - 수비 5
    expect(strikes[1]).toMatchObject({ damage: 14 }); // 강제 무기 9 + 힘 10 - 수비 5
  });

  it("발동 게이트: 비인게이지·리워프형·技コスト 미달·금지 무기(WeaponProhibit 비트)는 던진다", () => {
    const act = { type: "engageAttack", unit: "a", target: "e" } as BattleAction;
    expect(() => reduce(mk({}, { engage: gauge({ count: 7 }) }), act, roll())).toThrow(/인게이지 중/);
    expect(() => reduce(mk({ rewarp: 10 }), act, roll())).toThrow(/리워프/);
    expect(() => reduce(mk({ cost: 9 }), act, roll())).toThrow(/게이지 부족/);
    // 1021 = 0b1111111101 — 검(kind 1)만 허용. 도끼(kind 3) 장비는 거부.
    const axe = { might: 5, hit: 100, crit: 0, weight: 5, kind: 3, rangeMin: 1, rangeMax: 1 };
    expect(() => reduce(mk({ weaponProhibit: 1021 }, { weapon: axe }), act, roll())).toThrow(/쓸 수 없는/);
    expect(reduce(mk({ weaponProhibit: 1021 }), act, roll(0, 0, 0, 0)).events.some((e) => e.type === "strike")).toBe(true);
  });

  it("技コスト가 게이지를 차감하고 charge 이벤트 절대값으로 실린다", () => {
    const next = reduce(mk({ cost: 3 }), { type: "engageAttack", unit: "a", target: "e" } as BattleAction, roll(0, 0, 0, 0));
    expect(next.units[0].engage?.count).toBe(4);
    expect(next.events).toContainEqual({ type: "charge", unit: "a", count: 4 });
  });

  it("절대 재생(events)이 기술 전투를 복원한다", () => {
    const rng = recordingSource(roll(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0));
    const live = reduce(mk(), { type: "engageAttack", unit: "a", target: "e" } as BattleAction, rng);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(mk(), {
      action: { type: "engageAttack", unit: "a", target: "e" } as BattleAction,
      events: live.events,
    });
    expect(replayed.units[1].hp).toBe(live.units[1].hp);
    expect(replayed.units[0].acted).toBe(true);
  });
});

describe("인게이지 효과 — 紋章氣", () => {
  it("타일 위 대기 = count 만충 대입 + 타일 소멸 + crest 이벤트(절대값)", () => {
    const a = unit({ id: "a", force: 0, x: 2, y: 3, engage: gauge({ count: 1 }) });
    const s0: GameState = { ...state([a]), crests: [{ x: 2, y: 3 }, { x: 5, y: 5 }] };
    const s1 = reduce(s0, { type: "wait", unit: "a" } as BattleAction, roll());
    expect(s1.units[0].engage?.count).toBe(7);
    expect(s1.crests).toEqual([{ x: 5, y: 5 }]);
    expect(s1.events).toContainEqual({ type: "crest", unit: "a", x: 2, y: 3, count: 7 });
  });

  it("인게이지 중·만충·엠블렘 미장착은 소비하지 않는다(타일 잔존)", () => {
    const cases: UnitState[] = [
      unit({ id: "a", force: 0, x: 2, y: 3, engage: gauge({ count: 3, engaging: true }) }),
      unit({ id: "a", force: 0, x: 2, y: 3, engage: gauge({ count: 7 }) }),
      unit({ id: "a", force: 0, x: 2, y: 3 }),
    ];
    for (const u of cases) {
      const s1 = reduce({ ...state([u]), crests: [{ x: 2, y: 3 }] }, { type: "wait", unit: "a" } as BattleAction, roll());
      expect(s1.crests).toEqual([{ x: 2, y: 3 }]);
      expect(s1.events.some((ev) => ev.type === "crest")).toBe(false);
    }
  });

  it("전투로 활성화가 끝나도 그 칸이면 소비된다 — 절대 재생(events)이 같은 국면을 복원한다", () => {
    const mk = (): GameState => ({
      ...state([
        unit({ id: "a", force: 0, x: 2, y: 3, weapon: sword, engage: gauge({ count: 1 }) }),
        unit({ id: "e", force: 1, x: 3, y: 3, stats: { ...baseStats, hp: 99 }, hp: 99 }),
      ]),
      crests: [{ x: 2, y: 3 }],
    });
    const rng = recordingSource(roll(9999, 9999, 9999, 9999));
    const live = reduce(mk(), { type: "attack", unit: "a", target: "e" } as BattleAction, rng);
    expect(live.units[0].engage?.count).toBe(7); // 충전 +1 뒤 만충 대입
    expect(live.crests).toEqual([]);
    const { applyStep } = createReplayer(reduce);
    const replayed = applyStep(mk(), {
      action: { type: "attack", unit: "a", target: "e" } as BattleAction,
      events: live.events,
    });
    expect(replayed.units[0].engage?.count).toBe(7);
    expect(replayed.crests).toEqual([]);
  });
});
