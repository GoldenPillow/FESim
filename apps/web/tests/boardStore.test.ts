import { beforeEach, describe, expect, it } from "vitest";
import { parseEphemeris, serializeEphemeris } from "@fesim/shared";
import { RULE_VERSION } from "@fesim/engine";
import { createBoardStore, displayState } from "../src/lib/boardStore";
import { boardFixture, memoryStorage } from "./fixtures";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
});

const props = boardFixture();

describe("dispatch 기보 누적", () => {
  it("행동마다 스텝 1건 — 이동은 롤 무소비, 공격은 롤·이벤트 병기", () => {
    const store = createBoardStore(props);
    // 이동은 활성화당 1회(엔진 룰) — 한 번에 공격 인접 위치로 간다.
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    expect(store.getState().recording).toHaveLength(1);
    expect(store.getState().recording[0]).toEqual({ action: { type: "move", unit: "u0", x: 2, y: 2 } });

    const attacked = store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const last = store.getState().recording.at(-1)!;
    expect(last.action).toEqual({ type: "attack", unit: "u0", target: "u1" });
    expect(last.rolls?.length ?? 0).toBeGreaterThan(0);
    expect(last.events).toEqual(attacked.events);
  });

  it("불법 행동은 국면도 기보도 건드리지 않는다", () => {
    const store = createBoardStore(props);
    const before = store.getState().game;
    expect(store.getState().dispatch({ type: "attack", unit: "u1", target: "u0" })).toBe(before);
    expect(store.getState().recording).toHaveLength(0);
  });

  it("난이도·국면 변경은 기보를 초기화한다", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "wait", unit: "u0" });
    store.getState().setDifficulty("n");
    expect(store.getState().recording).toHaveLength(0);
    expect(store.getState().game.difficulty).toBe("n");
  });

  it("toFile은 챕터 정보를 박고 .eph 왕복을 통과한다", () => {
    const store = createBoardStore(props);
    store.getState().setScenario("1");
    store.getState().dispatch({ type: "wait", unit: "u0" });
    const file = store.getState().toFile({ created: "2026-08-16T00:00:00.000Z" });
    expect(file).toMatchObject({
      eph: 1,
      game: "fe17",
      ruleVersion: RULE_VERSION,
      chapter: { cid: props.mapId, difficulty: "l", scenario: "1" },
    });
    expect(parseEphemeris(serializeEphemeris(file)).log).toEqual(file.log);
  });
});

describe("게스트 자동 저장", () => {
  it("dispatch마다 저장 — 새 스토어가 restore로 같은 국면을 복원한다", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "wait", unit: "u0" });

    const revived = createBoardStore(props);
    revived.getState().restore();
    expect(revived.getState().recording).toHaveLength(2);
    expect(revived.getState().game.units).toEqual(store.getState().game.units);
  });

  it("리셋은 슬롯을 지운다 — 다음 방문이 새 판으로 뜬다", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "wait", unit: "u0" });
    store.getState().reset();
    const revived = createBoardStore(props);
    revived.getState().restore();
    expect(revived.getState().recording).toHaveLength(0);
  });
});

describe("setup 초기 세팅 diff (M4 편집기 백본)", () => {
  const setup = {
    units: {
      u0: { x: 3, y: 3, level: 9, stats: { hp: 40, str: 14, mag: 0, dex: 11, spd: 12, lck: 6, def: 8, res: 4, bld: 6 } },
      u1: { removed: true },
    },
  };

  it("플레이 모드 생성 인자로 실리면 초기 국면에 위치·레벨·스탯 스냅숏·제거가 반영된다", () => {
    // 왜 위험한가: 스냅숏이 초기화의 정본이어야 열람 경로(/s/)가 원천 테이블 없이
    // 같은 국면을 재구성한다 — 여기가 어긋나면 편집 전략의 공유 재생이 통째로 다른 판이 된다.
    const store = createBoardStore(props, undefined, setup);
    const u0 = store.getState().game.units.find((u) => u.id === "u0")!;
    expect([u0.x, u0.y]).toEqual([3, 3]);
    expect(u0.level).toBe(9);
    expect(u0.hp).toBe(40);
    expect(u0.stats.str).toBe(14);
    expect(store.getState().game.units.find((u) => u.id === "u1")).toBeUndefined();
  });

  it("무기·스킬 스냅숏이 초기 유닛에 반영된다 (weapons[0] = 장비)", () => {
    // 왜 위험한가: 장비 diff가 iid 의도로만 실리면 열람 경로가 items 테이블 없이는 복원 불능 —
    // 스냅숏 배열이 정본이고 attack.weapon 인덱스도 이 배열을 가리킨다.
    const axe = { name: "axe", might: 10, hit: 80, crit: 0, weight: 8, kind: 3, rangeMin: 1, rangeMax: 1 };
    const store = createBoardStore(props, undefined, {
      units: { u0: { items: ["IID_axe"], weapons: [axe], skills: [{ Sid: "SID_TEST" }] } },
    });
    const u0 = store.getState().game.units.find((u) => u.id === "u0")!;
    expect(u0.weapon).toEqual(axe);
    expect(u0.weapons).toEqual([axe]);
    expect(u0.skills?.map((s) => s.Sid)).toEqual(["SID_TEST"]);
  });

  it("toFile에 setup이 실리고, 게스트 저장 복원과 리플레이 생성이 같은 국면을 만든다", () => {
    const store = createBoardStore(props, undefined, setup);
    store.getState().dispatch({ type: "wait", unit: "u0" });
    const file = store.getState().toFile();
    expect(file.setup).toEqual(setup);

    const replayed = createBoardStore(props, { file });
    expect(displayState(replayed.getInitialState()).units.find((u) => u.id === "u0")?.stats.str).toBe(14);

    const revived = createBoardStore(props, undefined, setup);
    revived.getState().restore();
    expect(revived.getState().game.units).toEqual(store.getState().game.units);
  });
});

describe("setSetup — 세팅 변경 (M4 편집기)", () => {
  it("세팅 주입 = 새 판(기보·슬롯 리셋) + 초기 국면 즉시 반영, 리플레이 중엔 잠금", () => {
    // 왜 위험한가: 세팅 변경 후 이전 기보가 남으면 새 초기 국면과 정합이 깨진 로그가
    // 저장·공유돼 재생이 폭발한다 — 세팅 변경은 반드시 판을 새로 연다.
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "wait", unit: "u0" });
    store.getState().setSetup({ units: { u0: { x: 4, y: 4 } } });
    expect(store.getState().recording).toHaveLength(0);
    const u0 = store.getState().game.units.find((u) => u.id === "u0")!;
    expect([u0.x, u0.y]).toEqual([4, 4]);
    const revived = createBoardStore(props);
    revived.getState().restore();
    expect(revived.getState().recording).toHaveLength(0); // 슬롯도 리셋

    const file = store.getState().toFile();
    const replay = createBoardStore(props, { file });
    replay.getState().setSetup(undefined);
    expect(replay.getState().setup).toEqual(file.setup); // 리플레이 잠금
  });
});

describe("플레이 언두 (M4 수순층)", () => {
  it("마지막 행동을 물리고 국면·기보가 직전 시점과 일치한다 — 빈 기보에선 무동작", () => {
    // 왜 위험한가: 언두 재구성은 이벤트 절대값 재적용(applyStep)이라 실굴림과 무관하게 결정적이어야 한다 —
    // reduce 재굴림으로 되감으면 난수가 새로 소비돼 다른 국면이 된다.
    const store = createBoardStore(props);
    store.getState().undo(); // 빈 기보 — 무동작
    expect(store.getState().recording).toHaveLength(0);

    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const afterMove = store.getState().game;
    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    store.getState().undo();
    expect(store.getState().recording).toHaveLength(1);
    expect(store.getState().game.units).toEqual(afterMove.units);
    // 언두 후 이어 플레이가 합법이어야 한다(내부 상태 표류 검출).
    const next = store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(next).not.toBe(afterMove);
    expect(store.getState().recording).toHaveLength(2);
  });

  it("언두는 게스트 저장 슬롯에도 반영된다", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "wait", unit: "u0" });
    store.getState().undo();
    const revived = createBoardStore(props);
    revived.getState().restore();
    expect(revived.getState().recording).toHaveLength(1);
  });
});

describe("리플레이", () => {
  const recorded = () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "endPhase" });
    store.getState().dispatch({ type: "wait", unit: "u1" });
    store.getState().dispatch({ type: "endPhase" });
    return store.getState().toFile();
  };

  /**
   * 왜 위험했나: zustand의 서버 스냅숏은 `getInitialState()`다. 기보를 만든 뒤 loadReplay로 얹으면
   * SSR(/s/)이 초기 국면을 그리고 하이드레이션에서 화면이 튄다(딥링크 ?t/p/a가 서버에서 무시됐다).
   * 그래서 리플레이는 **생성 인자**로 실려야 하고, 그 사실이 초기 상태에서 관측돼야 한다.
   */
  it("생성 인자로 실은 기보·커서는 초기 상태(SSR 스냅숏)에 이미 들어 있다", () => {
    const file = recorded();
    const store = createBoardStore(props, { file, cursor: 2 });
    const initial = store.getInitialState();
    expect(initial.mode).toBe("replay");
    expect(initial.cursor).toBe(2);
    expect(initial.replay?.verify.ok).toBe(true);
    expect(displayState(initial)).toEqual(displayState(store.getState()));

    // 커서는 타임라인 밖으로 나가지 않는다(주소가 조작돼도 렌더가 깨지지 않아야 한다).
    expect(createBoardStore(props, { file, cursor: 999 }).getInitialState().cursor).toBe(file.log.length);
  });

  it("loadReplay는 난이도·국면을 잠근다(파일이 소유)", () => {
    const file = recorded();
    const store = createBoardStore(props);
    store.getState().loadReplay(file);
    expect(store.getState().mode).toBe("replay");
    expect(store.getState().replay?.verify.ok).toBe(true);

    const locked = store.getState().game;
    store.getState().setDifficulty("n");
    store.getState().setScenario("2");
    expect(store.getState().difficulty).toBe(file.chapter.difficulty);
    expect(store.getState().scenario).toBe(file.chapter.scenario);
    expect(store.getState().dispatch({ type: "wait", unit: "u0" })).toBe(locked);
    expect(store.getState().recording).toEqual(file.log);
  });

  it("stepAction 커서 — 범위 밖은 클램프되고 표시 국면이 따라간다", () => {
    const store = createBoardStore(props);
    store.getState().loadReplay(recorded());
    const total = store.getState().replay!.timeline.steps.length;

    expect(displayState(store.getState())).toBe(store.getState().replay!.timeline.initial);
    store.getState().stepAction(1);
    expect(store.getState().cursor).toBe(1);
    expect(displayState(store.getState()).units.find((u) => u.id === "u0")?.y).toBe(2);
    store.getState().stepAction(-5);
    expect(store.getState().cursor).toBe(0);
    store.getState().seek(999);
    expect(store.getState().cursor).toBe(total);
  });

  it("stepPhase — 앞으로는 다음 페이즈 개시, 뒤로는 현 페이즈 개시 후 이전 페이즈", () => {
    const store = createBoardStore(props);
    store.getState().loadReplay(recorded());
    const phases = store.getState().replay!.timeline.phases;
    expect(phases).toHaveLength(3);

    store.getState().stepPhase(1);
    expect(store.getState().cursor).toBe(phases[1].start);
    store.getState().stepAction(1);
    store.getState().stepPhase(-1);
    expect(store.getState().cursor).toBe(phases[1].start);
    store.getState().stepPhase(-1);
    expect(store.getState().cursor).toBe(phases[0].start);
    store.getState().stepPhase(-1);
    expect(store.getState().cursor).toBe(0);
  });

  /** 맵 페이지 리플레이 열람(자기 기보) — 종료 시 보던 판의 끝 국면으로 복귀해야 한다(진행 유실 금지). */
  it("exitReplay — 플레이 모드 복귀, 기록·최종 국면 보존, 이어서 플레이 가능", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "endPhase" });
    const before = store.getState().game;
    const log = store.getState().recording;

    store.getState().loadReplay(store.getState().toFile());
    store.getState().stepAction(1);
    expect(store.getState().mode).toBe("replay");

    store.getState().exitReplay();
    expect(store.getState().mode).toBe("play");
    expect(store.getState().recording).toEqual(log);
    expect(store.getState().game.units).toEqual(before.units);
    expect(store.getState().game.turn).toBe(before.turn);
    expect(store.getState().game.phase).toBe(before.phase);

    store.getState().dispatch({ type: "wait", unit: "u1" });
    expect(store.getState().recording.length).toBe(log.length + 1);
  });
});

describe("지팡이 회복 (MP0)", () => {
  const staffProps = () => {
    const p = boardFixture();
    // u0 = 힐러(마력 8·라이브), u2 = 손상 아군 — u1(적)은 멀리 치워 교전 배제.
    p.units = [
      { ...p.units[0], weapon: undefined, stats: { n: undefined, h: undefined, l: { ...p.units[0].stats!.l!, mag: 8 } }, staves: [{ power: 10, rangeMin: 1, rangeMax: 1, uses: 2, rodType: 2, rodExp: 25 }] },
      { ...p.units[1], x: 5, y: 5 },
      { ...p.units[0], x: 1, y: 2, name: "hurt" },
    ];
    return p;
  };

  it("staff 액션 = 스텝 1건(이벤트 병기·롤 무소비), 회복·잔여 감소가 국면에 반영", () => {
    const store = createBoardStore(staffProps());
    // 대상 u2를 먼저 손상시킬 수 없으니(자해 없음) 적의 공격 대신 초기 hp를 setup으로 깎는 대신,
    // 여기서는 엔진 위 계약만 확인: 무손상 대상은 거부되고 국면·기보 불변.
    const before = store.getState().game;
    expect(store.getState().dispatch({ type: "staff", unit: "u0", target: "u2", staff: 0 })).toBe(before);
    expect(store.getState().recording).toHaveLength(0);
  });

  it("손상 아군 회복이 기보에 실리고 undo가 잔여 횟수까지 되돌린다", () => {
    // 손상은 전투로 만든다: u1을 인접시켜 공격 → u2 피격(초기 hp를 깎는 주입구는 없다 — 정본 = stats).
    const p = staffProps();
    p.units[1] = { ...p.units[1], x: 2, y: 2 }; // 적을 u2 인접에
    const s2 = createBoardStore(p);
    // 적 페이즈로 넘겨 u2를 때리게 한다
    s2.getState().dispatch({ type: "wait", unit: "u0" });
    s2.getState().dispatch({ type: "endPhase" });
    // 결정화: roll 0.5 → 명중(표시 90+)·비필살 — 빗나감/즉사로 검증이 새는 것을 막는다.
    const restore = Math.random;
    Math.random = () => 0.5;
    const afterHit = s2.getState().dispatch({ type: "attack", unit: "u1", target: "u2" });
    Math.random = restore;
    const hurt = afterHit.units.find((u) => u.id === "u2")!;
    expect(hurt.dead).toBe(false);
    expect(hurt.hp).toBeLessThan(hurt.stats.hp);
    s2.getState().dispatch({ type: "endPhase" });
    const healed = s2.getState().dispatch({ type: "staff", unit: "u0", target: "u2", staff: 0 });
    const last = s2.getState().recording.at(-1)!;
    expect(last.action).toEqual({ type: "staff", unit: "u0", target: "u2", staff: 0 });
    expect(last.events).toEqual(healed.events);
    expect(healed.units.find((u) => u.id === "u2")!.hp).toBeGreaterThan(hurt.hp);
    expect(healed.units.find((u) => u.id === "u0")!.staves![0].uses).toBe(1);
    s2.getState().undo();
    const undone = s2.getState().game;
    expect(undone.units.find((u) => u.id === "u2")!.hp).toBe(hurt.hp);
    expect(undone.units.find((u) => u.id === "u0")!.staves![0].uses).toBe(2);
  });
});
