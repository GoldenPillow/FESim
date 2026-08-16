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
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    expect(store.getState().recording).toHaveLength(1);
    expect(store.getState().recording[0]).toEqual({ action: { type: "move", unit: "u0", x: 1, y: 2 } });

    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 1 });
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

describe("리플레이", () => {
  const recorded = () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "endPhase" });
    store.getState().dispatch({ type: "wait", unit: "u1" });
    store.getState().dispatch({ type: "endPhase" });
    return store.getState().toFile();
  };

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
