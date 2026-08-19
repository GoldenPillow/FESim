import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseEphemeris, serializeEphemeris } from "@fesim/shared";
import { carryover, RULE_VERSION } from "@fesim/engine";
import { createBoardStore, displayState } from "../src/lib/boardStore";
import { loadSlot } from "../src/lib/guestSave";
import { boardFixture, memoryStorage } from "./fixtures";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
});

const props = boardFixture();

describe("성장 안전장치 사영 (MP5 5-0)", () => {
  it("projectUnit이 cap·maxLevel을 엔진 국면까지 나른다", () => {
    // 왜 위험한가: 보드 프롭에만 실리고 국면 사영에서 빠지면 엔진 게이트는 여전히 항상 통과한다.
    const u = createBoardStore(props).getState().game.units[0]!;
    expect(u.cap).toEqual(props.units[0]!.cap);
    expect(u.maxLevel).toBe(20);
  });
});

describe("dispos 배치 게이트 (MP3 3-7)", () => {
  it("난이도 마스크가 없는 dispos 행은 그 난이도에 서지 않는다", () => {
    // 왜 위험한가: Flag 하위 3비트(N1/H2/L4)가 배치 게이트인데(CanDispos → IsDifficulty) 사영이 통째로
    // 빠져 있었다. 루나틱 기준 비자군 1,624유닛이 48챕터에서 유령으로 서 있었고, 그 위에서 잰
    // AI 자동화율·기보가 전부 오염된다. 자군은 CreatePlayerTeam 별도 경로라 flag 부재 = 게이트 밖이다.
    const withFlags = {
      ...props,
      units: [
        { ...props.units[0]!, flag: 7 },
        { ...props.units[1]!, flag: 3 },
      ],
    };
    const lunatic = createBoardStore(withFlags).getState().game.units;
    expect(lunatic.map((u) => u.id)).toEqual(["u0"]);

    const store = createBoardStore(withFlags);
    store.getState().setDifficulty("h");
    expect(store.getState().game.units.map((u) => u.id)).toEqual(["u0", "u1"]);
  });

  it("초기 배치는 CreateFirst가 부르는 그룹뿐 — 증원은 스크립트 트리거를 기다린다", () => {
    // 왜 위험한가: 종전 규칙은 "스크립트가 Dispos하는 그룹만 제외"라는 정규식이라 래퍼 호출·이름
    // 문자열 연결을 못 잡았다. g006이 1턴부터 656유닛(진영 상한 64의 10배)을 놓았다.
    const withReinforcement = {
      ...props,
      units: [...props.units, { ...props.units[1]!, x: 4, y: 4, group: "Reinforcement1_1" }],
    };
    const placed = createBoardStore(withReinforcement).getState().game.units;
    expect(placed.map((u) => u.id)).toEqual(["u0", "u1"]);
  });
});

describe("엠블렘·장비 사영", () => {
  it("gid가 국면까지 간다 — 보드 배지가 읽는 유일한 얼굴 주소다", () => {
    // 왜 위험한가: 보드 프롭에만 gid가 실리고 국면에서 빠지면 배지는 초기 렌더에만 뜨고
    // 엠블렘 교체(godUnit)·리플레이 재생 국면에서는 사라진다(같은 판이 두 그림을 갖는다).
    const ringed = { ...props, units: [{ ...props.units[0]!, gid: "GID_マルス" }, ...props.units.slice(1)] };
    expect(createBoardStore(ringed).getState().game.units[0]!.gid).toBe("GID_マルス");
  });

  it("장비 무기 = weapons[0] — 보드가 따로 안 실어도 국면에 선다", () => {
    // 왜 위험한가: 중복 필드(weapon)를 걷어낸 뒤 국면 사영이 그것만 보고 있으면
    // 전 유닛이 비무장으로 떨어져 공격·예보가 통째로 성립하지 않는다.
    const u = createBoardStore(props).getState().game.units[0]!;
    expect(u.weapon).toEqual(props.units[0]!.weapons?.[0]);
  });
});

describe("챕터 인계 그릇 (MP5 5-2)", () => {
  const setupBy = (key: string) => ({
    units: {
      [key]: {
        level: 7, exp: 40, internalLevel: 3, hp: 12,
        growthAcc: { str: 80 },
        stats: { hp: 30, str: 14, mag: 0, dex: 12, spd: 12, lck: 6, def: 8, res: 4, bld: 7 },
      },
    },
  });

  it("pid 키가 보드 슬롯으로 해석된다 — 챕터마다 u{순번}이 달라지므로 인계 키는 pid다", () => {
    const store = createBoardStore(props, undefined, setupBy(props.units[0]!.pid));
    const u = store.getState().game.units.find((x) => x.id === "u0")!;
    expect(u.level).toBe(7);
    expect(u.exp).toBe(40);
    expect(u.internalLevel).toBe(3);
    expect(u.hp).toBe(12);
    expect(u.growthAcc).toEqual({ str: 80 });
    expect(u.stats.str).toBe(14);
  });

  it("인덱스 키(u{순번})가 pid 키보다 우선한다 — 편집기 의도가 인계를 덮는다", () => {
    const store = createBoardStore(props, undefined, {
      units: { ...setupBy(props.units[0]!.pid).units, u0: { level: 2 } },
    });
    expect(store.getState().game.units.find((x) => x.id === "u0")!.level).toBe(2);
  });

  it("pid 키는 자군에만 적용된다 — 인계는 자군 로스터의 계약이다", () => {
    const enemyPid = props.units[1]!.pid;
    const store = createBoardStore(props, undefined, { units: { [enemyPid]: { level: 9 } } });
    expect(store.getState().game.units.find((x) => x.id === "u1")!.level).not.toBe(9);
  });
});

describe("인계 로스터 추출 — 커서 국면 (MP5 5-5)", () => {
  it("리플레이의 인계는 displayState에서 뽑는다 — store.game은 초기 국면이다", () => {
    // 왜 위험했나: 기보 생성기가 seek(끝) 뒤 store.game을 읽어 carryover를 돌렸고,
    // 그 결과 경험치·레벨이 통째로 0인 로스터가 **조용히** 다음 챕터로 인계됐다.
    // seek은 커서만 옮긴다 — 커서 국면의 소유자는 displayState다.
    // ☠시드 고정 — 안 주면 판마다 명중이 갈려 이 테스트가 간헐적으로 레드가 된다(빗나가면 exp가 안 붙는다).
    const play = createBoardStore(props, undefined, undefined, undefined, 20260819);
    play.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const file = play.getState().toFile();
    const gained = carryover(play.getState().game)[props.units[0]!.pid]!.exp!;
    expect(gained).toBeGreaterThan(0);

    const viewer = createBoardStore(props, { file });
    viewer.getState().seek(file.log.length);
    expect(carryover(viewer.getState().game)[props.units[0]!.pid]!.exp).toBe(0); // 초기 국면
    expect(carryover(displayState(viewer.getState()))[props.units[0]!.pid]!.exp).toBe(gained);
  });
});

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

  /** 끝까지 본 뒤 나가면 진행이 그대로여야 한다 — 여기서 유실되면 자기 기보 열람이 판을 날린다. */
  it("exitReplay — 끝에서 나가면 기록·최종 국면 보존, 이어서 플레이 가능", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "endPhase" });
    const before = store.getState().game;
    const log = store.getState().recording;

    store.getState().loadReplay(store.getState().toFile());
    store.getState().seek(log.length);
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

  /**
   * ★리플레이 해제 = **보던 커서 국면부터 이어 두기**(2026-08-18 확정 — 무한 천각 문법).
   * 왜 위험한가: 커서 뒤 기록을 그대로 두면 화면(커서 국면)과 기록(끝 국면)이 어긋나 다음 수가
   * 엉뚱한 국면에 얹힌다. 커서에서 잘라야 화면과 기록이 같은 것을 가리킨다.
   */
  it("exitReplay — 중간 커서에서 나가면 그 국면부터 이어 둔다", () => {
    const store = createBoardStore(props);
    store.getState().dispatch({ type: "move", unit: "u0", x: 1, y: 2 });
    store.getState().dispatch({ type: "wait", unit: "u0" });
    store.getState().dispatch({ type: "endPhase" });
    const full = store.getState().recording;

    store.getState().loadReplay(store.getState().toFile());
    store.getState().seek(1);
    const seen = displayState(store.getState());

    store.getState().exitReplay();
    expect(store.getState().mode).toBe("play");
    expect(store.getState().recording).toEqual(full.slice(0, 1));
    expect(store.getState().game.units).toEqual(seen.units);
    expect(store.getState().game.turn).toBe(seen.turn);

    // 이어 둔 수는 잘린 기록 뒤에 쌓인다 — 버려진 뒷부분이 되살아나면 안 된다.
    store.getState().dispatch({ type: "wait", unit: "u0" });
    expect(store.getState().recording.length).toBe(2);
  });
});

describe("지팡이 회복 (MP0)", () => {
  const staffProps = () => {
    const p = boardFixture();
    // u0 = 힐러(마력 8·라이브), u2 = 손상 아군 — u1(적)은 멀리 치워 교전 배제.
    p.units = [
      { ...p.units[0], weapons: undefined, stats: { n: undefined, h: undefined, l: { ...p.units[0].stats!.l!, mag: 8 } }, staves: [{ power: 10, rangeMin: 1, rangeMax: 1, uses: 2, rodType: 2, rodExp: 25 }] },
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
    // ☠결정화는 **시드 주입**으로 한다 — 종전엔 `Math.random`을 스텁했는데, 스토어가 정본 PRNG를
    //   소유하게 되면서(MP8 A6) 스텁이 아무 효과가 없어 **확률적으로 실패하는 테스트**가 됐다
    //   (2026-08-19 게이트가 간헐적으로 흔들린 원인이 이것이었다 — 재현이 안 돼 오래 미궁이었다).
    const s2 = createBoardStore(p, undefined, undefined, undefined, 1);
    // 적 페이즈로 넘겨 u2를 때리게 한다
    s2.getState().dispatch({ type: "wait", unit: "u0" });
    s2.getState().dispatch({ type: "endPhase" });
    const afterHit = s2.getState().dispatch({ type: "attack", unit: "u1", target: "u2" });
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

/**
 * ★관통 테스트 — 되돌리기 x 난수 커서 (MP8 A6).
 *
 * 왜 위험했나: 엔진의 난수 계약과 스토어의 되돌리기는 **다른 층**이라, 층별 테스트는 둘 다 그린이었다.
 * 엔진은 "주입된 난수를 그대로 쓴다"를 지키고, 스토어는 "국면을 정확히 되돌린다"를 지켰다.
 * 그런데 사이가 끊겨 있었다 — `undo`가 국면만 되돌리고 **난수 커서를 안 되돌려서**,
 * 되감고 같은 수를 다시 두면 다른 결과가 나왔다. 인게임은 정확히 반대다(사용자 실측 2026-08-19:
 * 되감아도 같고, 사이에 다른 캐릭터가 조금이라도 때리면 바뀐다).
 * 오류도 경고도 없이 조용히 틀리는 종류라, 이 경계에 하나 박제한다.
 *
 * 정본 = MapHistory가 난수 4워드를 통째로 저장·복원한다(WriteRandom 0x24CC2D0 / ReadRandom 0x24CBA00).
 * 판독물 = ~/fesim_data/extracted/il2cpp/_mp8/A6_s5s6_rewind.md §5·§6
 */
describe("★되돌리기 x 난수 커서 (관통)", () => {
  const rollsOf = (store: ReturnType<typeof createBoardStore>): number[] =>
    store.getState().recording.at(-1)?.rolls ?? [];

  it("되감고 같은 수를 다시 두면 같은 결과다", () => {
    const store = createBoardStore(props, undefined, undefined, undefined, 20260819);
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const first = store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const firstRolls = rollsOf(store);
    expect(firstRolls.length).toBeGreaterThan(0);

    store.getState().undo();
    const again = store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });

    expect(rollsOf(store)).toEqual(firstRolls);
    expect(again.events).toEqual(first.events);
  });

  it("사이에 다른 행동이 끼면 결과가 달라진다(정본이 그렇다)", () => {
    // 자군 2기 판 — 되감은 뒤 **다른 유닛이 먼저 때리는** 상황이라야 커서가 밀린다.
    const twoAllies = boardFixture();
    twoAllies.units = [...twoAllies.units, { ...twoAllies.units[0]!, x: 3, y: 1, pid: "PID_ally2" }];
    const store = createBoardStore(twoAllies, undefined, undefined, undefined, 20260819);

    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const firstRolls = rollsOf(store);
    expect(firstRolls.length).toBeGreaterThan(0);

    store.getState().undo();
    store.getState().dispatch({ type: "attack", unit: "u2", target: "u1" }); // 다른 유닛이 한 대 때린다
    expect((store.getState().recording.at(-1)?.rolls ?? []).length).toBeGreaterThan(0);
    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });

    expect(rollsOf(store)).not.toEqual(firstRolls);
  });

  it("같은 시드면 같은 판이 열린다 — 시드가 기보에 실린다", () => {
    const a = createBoardStore(props, undefined, undefined, undefined, 4242);
    const b = createBoardStore(props, undefined, undefined, undefined, 4242);
    a.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    b.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(rollsOf(a)).toEqual(rollsOf(b));
    expect(a.getState().toFile().seed).toBe(4242);
  });

  it("시드가 다르면 다른 판이다(커서 복원이 시드를 무시하지 않는다)", () => {
    const a = createBoardStore(props, undefined, undefined, undefined, 1);
    const b = createBoardStore(props, undefined, undefined, undefined, 2);
    a.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    b.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(rollsOf(a)).not.toEqual(rollsOf(b));
  });
});

/**
 * ★관통 테스트 — 넘버링 세이브 x 난수 커서 x 미러 페이로드.
 *
 * 세이브는 세 층을 지난다: 스토어(국면·시드) → 저장 계층(localStorage) → dev 미러(파일).
 * 층마다 테스트가 그린이어도 **사이가 끊기면** 조용히 죽는다:
 *   - 시드를 안 실으면 로드한 판이 "같은 국면 다른 난수"가 된다(화면에 안 보인다)
 *   - 미러 페이로드가 파서를 못 통과하면 대화 앵커가 통째로 무용지물이 된다(브라우저에선 멀쩡하다)
 * 그래서 양끝 값으로 여기 박제한다.
 */
describe("★넘버링 세이브 (관통)", () => {
  const rollsOf = (store: ReturnType<typeof createBoardStore>): number[] =>
    store.getState().recording.at(-1)?.rolls ?? [];

  it("저장 → 로드 왕복: 국면과 기록이 저장 시점 그대로다", () => {
    const store = createBoardStore(props, undefined, undefined, undefined, 7);
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const at = store.getState().game;
    const saved = store.getState().saveNamed();
    expect(saved?.n).toBe(1);
    expect(saved).toMatchObject({ cid: props.mapId, steps: 1, origin: "play" });

    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(store.getState().recording.length).toBe(2);

    expect(store.getState().loadSave(saved!.n)).toBe(true);
    expect(store.getState().game).toEqual(at);
    expect(store.getState().recording.length).toBe(1);
  });

  /**
   * ☠세이브가 시드를 안 이어받으면 "같은 국면인데 다른 판"이 된다 — 오류도 경고도 없다.
   * 새로고침 뒤 ?load=n은 **다른 시드로 열린 스토어**에 얹히므로 이 경계가 실제로 발현한다.
   */
  it("새 세션에서 로드해도 같은 수는 같은 결과다 — 시드·커서까지 그 판으로 돌아온다", () => {
    const a = createBoardStore(props, undefined, undefined, undefined, 111);
    a.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const saved = a.getState().saveNamed();
    const first = a.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });

    const b = createBoardStore(props, undefined, undefined, undefined, 999); // 새로고침 = 새 시드
    expect(b.getState().loadSave(saved!.n)).toBe(true);
    const again = b.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });

    expect(rollsOf(b)).toEqual(rollsOf(a));
    expect(again.events).toEqual(first.events);
  });

  /** 자동 저장 이어하기도 같은 경로다 — 복원이 하나면 결함도 하나다(둘로 두면 하나만 고쳐진다). */
  it("자동 저장 복원도 시드·난수 커서를 되돌린다", () => {
    const a = createBoardStore(props, undefined, undefined, undefined, 555);
    a.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });

    // 새로고침 = 다른 시드로 열린 스토어. 슬롯에는 위 1수가 들어 있다.
    const b = createBoardStore(props, undefined, undefined, undefined, 31337);
    b.getState().restore();

    const second = a.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const secondB = b.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(rollsOf(a).length).toBeGreaterThan(0);
    expect(rollsOf(b)).toEqual(rollsOf(a));
    expect(secondB.events).toEqual(second.events);
  });

  /**
   * ☠실측(2026-08-19)에서 잡힌 조용한 실패: 로드는 국면을 옮기는데 **이어하기 슬롯은 낡은 채** 남아,
   * 로드 직후 새로고침하면 부른 판이 소리 없이 사라지고 옛 국면이 돌아온다.
   */
  it("복원은 이어하기 슬롯까지 그 국면으로 옮긴다", () => {
    const key = { game: "fe17", mapId: props.mapId, difficulty: "l" as const, scenario: undefined };
    const store = createBoardStore(props, undefined, undefined, undefined, 77);
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const saved = store.getState().saveNamed();
    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    expect(loadSlot(key)!.log.length).toBe(2);

    store.getState().loadSave(saved!.n);
    expect(loadSlot(key)!.log.length).toBe(1); // 새로고침해도 부른 판이 이어진다
  });

  /** 난입 계보 — 어느 기보 도중에서 이어받았는지가 앵커의 절반이다. */
  it("리플레이 난입 후 저장하면 origin이 replay다", () => {
    const store = createBoardStore(props, undefined, undefined, undefined, 8);
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const file = store.getState().toFile();

    const viewer = createBoardStore(props, { file, cursor: 1 });
    viewer.getState().exitReplay();
    expect(viewer.getState().saveNamed()).toMatchObject({ origin: "replay", from: props.mapId });
  });

  it("다른 챕터의 세이브는 이 보드에서 열리지 않는다", () => {
    const store = createBoardStore(props, undefined, undefined, undefined, 9);
    store.getState().dispatch({ type: "move", unit: "u0", x: 2, y: 2 });
    const saved = store.getState().saveNamed();
    const other = boardFixture("m123");
    expect(createBoardStore(other, undefined, undefined, undefined, 9).getState().loadSave(saved!.n)).toBe(false);
  });

  /** ★층 경계 — dev 미러로 나가는 페이로드가 .eph 파서를 통과하는가(브라우저만 보면 영원히 안 보인다). */
  it("미러 페이로드가 .eph 파서를 통과한다", () => {
    const sent: { summary: unknown; eph: string }[] = [];
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      if (url === "/__fesim/save") sent.push(JSON.parse(String(init.body)));
      return Promise.resolve(new Response(null));
    });
    const store = createBoardStore(props, undefined, undefined, undefined, 10);
    store.getState().dispatch({ type: "attack", unit: "u0", target: "u1" });
    const saved = store.getState().saveNamed();

    expect(sent.length).toBe(1);
    const parsed = parseEphemeris(sent[0]!.eph);
    expect(parsed.chapter.cid).toBe(props.mapId);
    expect(parsed.seed).toBe(10);
    expect(sent[0]!.summary).toMatchObject({ n: saved!.n });
    vi.unstubAllGlobals();
  });
});
