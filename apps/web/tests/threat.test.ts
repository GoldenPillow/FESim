import { describe, expect, it } from "vitest";
import type { GameState, UnitState } from "@fesim/engine";
import { createBoardStore } from "../src/lib/boardStore";
import {
  alertTiles,
  arcPath,
  hasEfficacyWeaponAgainst,
  regionOutline,
  threatArcs,
  threatIndex,
} from "../src/lib/threat";
import { boardFixture } from "./fixtures";

/**
 * 위협 표시층 — 정본 = `~/fesim_data/extracted/fidelity_axes/F3_threat_arc.md`(실행파일 판독) ·
 * `F5_panel_colors.md`(픽셀 역산). 여기 테스트는 **표시 규칙**을 박제한다: 색은 CSS가, 규칙은 이 층이 소유한다.
 */

type Props = ReturnType<typeof boardFixture>;

/** 6x6 평지 위에 유닛만 갈아끼운 국면 — 이동력·무기·속성을 케이스마다 다르게 준다. */
const gameWith = (units: Props["units"]): GameState => {
  const base = boardFixture();
  return createBoardStore({ ...base, units }).getState().game;
};

const proto = boardFixture().units;
const ally = (over: Partial<Props["units"][number]>): Props["units"][number] => ({ ...proto[0]!, ...over });
const foe = (over: Partial<Props["units"][number]>): Props["units"][number] => ({ ...proto[1]!, ...over });
const plainBow = { name: "bow", might: 6, hit: 90, crit: 0, weight: 5, avoid: 0, magic: false, rangeMin: 1, rangeMax: 1, kind: 1 };

const at = (g: GameState, i: number): UnitState => g.units[i]!;

describe("위협 아크 — CommitForAttack(0x2358380)의 3분류", () => {
  /**
   * 왜 위험한가: 아크가 "그 칸을 칠 수 있는 적"이라는 뜻을 잃으면 화면이 거짓말을 한다.
   * 사거리 밖 적까지 선이 뻗으면 사용자는 안전한 칸을 위험하다고 읽고, 반대면 그 반대다.
   * 정본은 적의 **이동 + 무기 사거리 비트맵**(`MapDeployAttackImage`)에 표적 칸이 켜져 있는지 하나다.
   */
  it("사정권 안의 적에게만 선이 뻗고, 방향은 적 → 표적", () => {
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0 }),
      foe({ x: 2, y: 1, force: 1, movePoints: 0 }),
      foe({ x: 5, y: 5, force: 1, movePoints: 0 }),
    ]);
    const arcs = threatArcs(g, threatIndex(g, 0), at(g, 0));
    expect(arcs.map((a) => a.id)).toEqual([at(g, 1).id]);
    expect(arcs[0]!.from).toEqual({ x: 2, y: 1 });
    expect(arcs[0]!.to).toEqual({ x: 1, y: 1 });
  });

  /**
   * 왜 위험한가: `CanActWithoutEngageCharge` 게이트를 빼면 **이미 움직인 적**까지 선이 남아
   * "아직 위험하다"는 거짓 신호를 준다 — 적 페이즈 중 판단이 통째로 뒤집히는 종류의 오표시다.
   */
  it("행동을 마친 적은 아크에서 빠진다", () => {
    const g0 = gameWith([ally({ x: 1, y: 1, force: 0 }), foe({ x: 2, y: 1, force: 1, movePoints: 0 })]);
    const g: GameState = { ...g0, units: g0.units.map((u) => (u.force === 1 ? { ...u, acted: true } : u)) };
    expect(threatArcs(g, threatIndex(g, 0), at(g, 0))).toEqual([]);
  });

  /**
   * 왜 위험한가: 인게이지 분기는 정본에서 **도달 비트맵을 안 본다**(F3 §3-2 — `CanEngageTarget`만 본다).
   * "사거리 안"만으로 거르면 인게이지 위협이 통째로 빠지는데 **오류도 경고도 안 난다** = 조용한 결손.
   */
  it("인게이지 중인 적은 사거리 밖에서도 아크가 뜬다", () => {
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0 }),
      foe({ x: 5, y: 5, force: 1, movePoints: 0, engage: { count: 1, limit: 5, turnLimit: 3, turn: 0, engaging: true } }),
    ]);
    const arcs = threatArcs(g, threatIndex(g, 0), at(g, 0));
    expect(arcs.map((a) => a.tone)).toEqual(["engage"]);
  });

  /**
   * 왜 위험한가: 색 우선순위가 뒤집히면(`tst #4` → `tst #2`가 덮는 사슬) 특효를 든 적이 평범한 색으로 보인다.
   * 특효 = 대미지 배수라 그 한 줄이 생사를 가른다.
   */
  it("색 우선순위 = 특효 > 필살 > 기본", () => {
    const efficacy = { ...plainBow, sids: [{ Sid: "SID_特効", Efficacy: 1, EfficacyValue: 3 }] };
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0, attrs: 1 }),
      foe({ x: 2, y: 1, force: 1, movePoints: 0, weapons: [{ ...efficacy, crit: 30 }] }),
      foe({ x: 1, y: 2, force: 1, movePoints: 0, weapons: [{ ...plainBow, crit: 30 }] }),
      foe({ x: 0, y: 1, force: 1, movePoints: 0, weapons: [plainBow] }),
    ]);
    const arcs = threatArcs(g, threatIndex(g, 0), at(g, 0));
    expect(arcs.map((a) => a.tone)).toEqual(["efficacy", "crit", "base"]);
  });

  /**
   * 왜 위험한가: 인게임 `HasEfficacyWeapon`은 `UnitItemList` = **소지품 전수**를 본다(F3 검증 A-8).
   * 우리 엔진 `efficacyOf`는 장비 무기만 보므로 그대로 쓰면 *예비 무기로만 특효를 든 적*이
   * 평범한 색으로 보인다 — 실제로는 무기를 바꿔 들고 특효로 친다.
   */
  it("특효 판정은 장비가 아니라 소지품 전수", () => {
    const efficacy = { ...plainBow, sids: [{ Sid: "SID_特効", Efficacy: 1, EfficacyValue: 3 }] };
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0, attrs: 1 }),
      foe({ x: 2, y: 1, force: 1, movePoints: 0, weapons: [plainBow, efficacy] }),
    ]);
    expect(at(g, 1).weapon).toEqual(plainBow); // 장비는 특효가 아닌 쪽
    expect(hasEfficacyWeaponAgainst(at(g, 1), at(g, 0))).toBe(true);
  });

  /** 왜 위험한가: 대상이 特効無効를 들면 특효는 지워진다 — 안 지우면 없는 위험을 붉게 칠한다. */
  it("대상의 EfficacyIgnore가 마스크를 지우면 특효가 아니다", () => {
    const efficacy = { ...plainBow, sids: [{ Sid: "SID_特効", Efficacy: 1, EfficacyValue: 3 }] };
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0, attrs: 1, skills: [{ Sid: "SID_特効無効", EfficacyIgnore: 127 }] }),
      foe({ x: 2, y: 1, force: 1, movePoints: 0, weapons: [efficacy] }),
    ]);
    expect(hasEfficacyWeaponAgainst(at(g, 1), at(g, 0))).toBe(false);
  });
});

describe("붉은 ! 배지 — MakeBalloonList(0x207F050)", () => {
  /**
   * 왜 위험한가: 배지는 아크와 **조건이 다르다**(F3 §5 — 도달 판정이 없다). 아크와 같은 게이트를 물리면
   * 못 닿는 자리의 특효 적이 무표시가 되어 "다가가도 안전하다"고 읽힌다.
   */
  it("도달 판정을 보지 않는다 — 사거리 밖 특효 적에게도 붙는다", () => {
    const efficacy = { ...plainBow, sids: [{ Sid: "SID_特効", Efficacy: 1, EfficacyValue: 3 }] };
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0, attrs: 1 }),
      foe({ x: 5, y: 5, force: 1, movePoints: 0, weapons: [efficacy] }),
      foe({ x: 0, y: 0, force: 1, movePoints: 0, weapons: [plainBow] }),
    ]);
    expect(alertTiles(g, at(g, 0))).toEqual([{ x: 5, y: 5 }]);
  });
});

describe("ZR 전체 위험 범위 — MapPanelDangerAll", () => {
  /**
   * 왜 위험한가: 합집합을 중복 없이 만들지 못하면 같은 칸에 분홍이 여러 겹 쌓여 알파가 진해진다
   * (인게임 분홍은 개별 표시의 절반 세기 = **배경 정보**라는 뜻인데 그 문법이 깨진다).
   * 그리고 색인은 커서가 아니라 **국면**이 무효화 키다 — 적별 집합을 여기서 한 번만 만든다.
   */
  it("적 사정권 합집합은 칸당 1개 · 적별 색인도 함께 선다", () => {
    const g = gameWith([
      ally({ x: 1, y: 1, force: 0 }),
      foe({ x: 4, y: 4, force: 1, movePoints: 0 }),
      foe({ x: 4, y: 4, force: 1, movePoints: 0 }),
    ]);
    const idx = threatIndex(g, 0);
    expect(idx.reach.size).toBe(2);
    const keys = idx.all.map((t) => `${t.x},${t.y}`).sort();
    expect(keys).toEqual([...new Set(keys)]);
    expect(keys).toEqual(["3,4", "4,3", "4,5", "5,4"]);
  });

  /** 왜 위험한가: 아크와 다른 규칙으로 갈리면 "선은 사라졌는데 분홍은 남는" 모순 화면이 나온다. */
  it("행동을 마친 적은 위험 범위에서도 빠진다", () => {
    const g0 = gameWith([ally({ x: 1, y: 1, force: 0 }), foe({ x: 4, y: 4, force: 1, movePoints: 0 })]);
    const g: GameState = { ...g0, units: g0.units.map((u) => (u.force === 1 ? { ...u, acted: true } : u)) };
    expect(threatIndex(g, 0).all).toEqual([]);
  });
});

describe("영역 둘레·아크 기하", () => {
  /**
   * 왜 위험한가: 칸마다 테두리를 그으면 인게임과 다른 그림이 된다 —
   * 실측은 면 내부에 **주기적 스파이크가 없다**(F5 §3 (D) = 내부 타일 구분선 부재).
   * 게다가 변을 안 합치면 점선 대시가 칸마다 처음부터 다시 시작해 실측 주기(3px/4.5px)가 깨진다.
   */
  it("연속한 변은 한 선분으로 합치고 내부 변은 그리지 않는다", () => {
    // 6x6 판의 (0,0),(1,0) 두 칸 — FLIP_Y라 화면 맨 아랫줄(r=5)이다.
    const d = regionOutline([{ x: 0, y: 0 }, { x: 1, y: 0 }], 6, 6);
    expect(d).toBe("M0 5H2M0 6H2M0 5V6M2 5V6");
    expect(d).not.toContain("M1 5V6"); // 두 칸 사이의 내부 변
  });

  /** 왜 위험한가: 화면 상하 반전(FLIP_Y)을 빼먹으면 위험 범위가 위아래 거울로 뜬다 — 정반대의 안전 판단. */
  it("데이터 y 증가는 화면 위 — 둘레도 같은 사상을 쓴다", () => {
    expect(regionOutline([{ x: 0, y: 5 }], 6, 6)).toBe("M0 0H1M0 1H1M0 0V1M1 0V1");
  });

  /**
   * 왜 위험한가: 아치 높이는 **거리 정비례**가 정본이다(`CalcArrowArchHeight` = d * 5 * offset).
   * 고정 높이로 그리면 먼 적의 선이 납작해져 가까운 적과 구분이 안 된다.
   */
  it("2차 베지어 제어점은 거리에 비례해 화면 위로 솟는다", () => {
    expect(arcPath(0, 0, 4, 0)).toBe("M0 0 Q2 -2.2 4 0");
    expect(arcPath(0, 0, 8, 0)).toBe("M0 0 Q4 -4.4 8 0");
  });
});
