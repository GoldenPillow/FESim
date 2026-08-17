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
});
