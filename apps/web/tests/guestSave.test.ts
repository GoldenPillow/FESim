import { afterEach, describe, expect, it, vi } from "vitest";
import type { EphemerisFile } from "@fesim/shared";
import {
  clampZoom,
  clearSlot,
  loadSlot,
  loadZoom,
  saveSlot,
  saveZoom,
  slotKey,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  loadRun,
  saveRun,
  runKey,
  dropSave,
  listSaves,
  putSave,
  readSave,
  saveKey,
  type RunState,
  type SaveDraft,
  type SaveKey,
} from "../src/lib/guestSave";
import { memoryStorage } from "./fixtures";

const KEY: SaveKey = { game: "fe17", mapId: "m002", difficulty: "l", scenario: "1" };

const file = (over: Partial<EphemerisFile> = {}): EphemerisFile => ({
  eph: 1,
  game: "fe17",
  ruleVersion: "fe17-1",
  chapter: { cid: "m002", difficulty: "l", scenario: "1" },
  log: [{ action: { type: "wait", unit: "u0" } }],
  ...over,
});

const use = (storage: Storage) => {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("게스트 저장", () => {
  it("슬롯 키는 (게임, 맵, 난이도, 국면)당 1개다", () => {
    expect(slotKey(KEY)).toBe("fesim:eph:fe17:m002:l:1");
    expect(slotKey({ ...KEY, scenario: undefined })).toBe("fesim:eph:fe17:m002:l:-");
    expect(slotKey({ ...KEY, difficulty: "n" })).not.toBe(slotKey(KEY));
  });

  it("직렬화 왕복 — 저장한 기보가 그대로 돌아온다", () => {
    use(memoryStorage());
    saveSlot(KEY, file());
    expect(loadSlot(KEY)).toEqual(file());
    clearSlot(KEY);
    expect(loadSlot(KEY)).toBeUndefined();
  });

  it("다른 난이도·국면 슬롯은 서로를 못 본다", () => {
    use(memoryStorage());
    saveSlot(KEY, file());
    expect(loadSlot({ ...KEY, difficulty: "n" })).toBeUndefined();
    expect(loadSlot({ ...KEY, scenario: "2" })).toBeUndefined();
  });

  /** 손상 슬롯이 판을 막으면 안 된다 — 경고 후 버리고 새 판. */
  it("파싱 오류·챕터 불일치는 조용히 버린다", () => {
    const storage = memoryStorage();
    use(storage);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    storage.setItem(slotKey(KEY), "{ not json");
    expect(loadSlot(KEY)).toBeUndefined();
    expect(storage.getItem(slotKey(KEY))).toBeNull();

    saveSlot(KEY, file({ chapter: { cid: "m003", difficulty: "l", scenario: "1" } }));
    expect(loadSlot(KEY)).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  /** 쿼터 초과·프라이빗 모드 = 저장 스킵. 진행 중인 판을 죽이는 예외가 새면 안 된다. */
  it("localStorage 예외는 저장·복원·삭제 전부에서 무해화된다", () => {
    use(memoryStorage("setItem"));
    expect(() => saveSlot(KEY, file())).not.toThrow();
    use(memoryStorage("getItem"));
    expect(loadSlot(KEY)).toBeUndefined();
    use(memoryStorage("removeItem"));
    expect(() => clearSlot(KEY)).not.toThrow();
  });
});

describe("맵 줌 저장", () => {
  it("clampZoom — 상·하한을 자르고 스텝 누적의 부동소수 잔차를 반올림한다", () => {
    expect(clampZoom(ZOOM_MAX + ZOOM_STEP)).toBe(ZOOM_MAX);
    expect(clampZoom(ZOOM_MIN - ZOOM_STEP)).toBe(ZOOM_MIN);
    // 0.9 - 0.1 = 0.8000000000000001 — 잔차가 저장·표시로 새면 안 된다.
    expect(clampZoom(ZOOM_DEFAULT - ZOOM_STEP)).toBe(0.8);
  });

  it("왕복 — 저장한 배율이 그대로 돌아오고, 빈 저장소는 디폴트다", () => {
    use(memoryStorage());
    expect(loadZoom()).toBe(ZOOM_DEFAULT);
    saveZoom(1.2);
    expect(loadZoom()).toBe(1.2);
  });

  /** 손상 값이 배율로 새면 보드가 0px·거대 렌더로 죽는다 — 범위 밖·이물은 디폴트로 강하. */
  it("손상·범위 밖 값은 디폴트로 강하한다", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:ui:zoom", "not-a-number");
    expect(loadZoom()).toBe(ZOOM_DEFAULT);
    storage.setItem("fesim:ui:zoom", "99");
    expect(loadZoom()).toBe(ZOOM_DEFAULT);
  });

  it("localStorage 예외는 저장·복원에서 무해화된다", () => {
    use(memoryStorage("setItem"));
    expect(() => saveZoom(1)).not.toThrow();
    use(memoryStorage("getItem"));
    expect(loadZoom()).toBe(ZOOM_DEFAULT);
  });
});

/**
 * 런(캠페인) 저장 — 챕터 사슬의 상태다. 게이트 제로 유지(무계정 localStorage, 서버 저장은 M4).
 * 왜 위험한가: 손상 슬롯 하나로 캠페인 진입이 막히면 사용자는 판을 통째로 잃는다.
 * 자동 저장 계층의 규약과 같게 — 못 읽으면 조용히 버리고 새 런으로 간다.
 */
describe("런 저장 — fesim:run", () => {
  const run = (): RunState => ({
    game: "fe17",
    difficulty: "l",
    chapter: "CID_M003",
    cleared: ["CID_M002"],
    roster: { PID_A: { level: 6, exp: 20 } },
    updated: "2026-08-18T00:00:00.000Z",
  });

  it("저장 → 복원 왕복", () => {
    Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
    saveRun(run());
    expect(loadRun()).toEqual(run());
  });

  it("이물·손상 슬롯은 조용히 버린다(캠페인 진입이 막히면 안 된다)", () => {
    const store = memoryStorage();
    Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
    store.setItem(runKey("fe17"), "{ 이건 JSON이 아니다");
    expect(loadRun()).toBeUndefined();
    expect(store.getItem(runKey("fe17"))).toBeNull(); // 버려졌다
  });

  it("게임이 다른 런은 남의 런이다 — 게임 id가 키의 일부다", () => {
    Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
    saveRun(run());
    expect(loadRun("fe18")).toBeUndefined();
  });
});

/**
 * 넘버링 세이브 — 대화 앵커의 그릇. 자동 저장(fesim:eph:*)과 **다른 축**이다:
 * 저쪽은 챕터당 1슬롯이 계속 덮어써지는 이어하기, 이쪽은 사용자가 찍은 지점이 번호로 남는 보관이다.
 * 왜 위험한가: 번호가 흔들리면 "세이브 7 봐줘"가 다른 국면을 가리킨다 — 앵커의 존재 이유가 사라진다.
 */
describe("넘버링 세이브 — fesim:save", () => {
  const draft = (over: Partial<SaveDraft> = {}): SaveDraft => ({
    game: "fe17",
    cid: "m002",
    difficulty: "l",
    turn: 3,
    phase: 0,
    steps: 12,
    alive: 5,
    total: 6,
    origin: "play",
    ...over,
  });

  it("저장 → 목록 → 읽기 왕복", () => {
    use(memoryStorage());
    const s = putSave(draft(), file());
    expect(s?.n).toBe(1);
    expect(listSaves()).toEqual([s]);
    expect(readSave(1)).toEqual(file());
  });

  /** ☠번호 재사용 = 앵커 붕괴. 지운 자리에 다음 세이브가 들어앉으면 옛 대화의 "세이브 2"가 딴 판을 가리킨다. */
  it("번호는 삭제 후에도 재사용되지 않는다", () => {
    use(memoryStorage());
    putSave(draft(), file());
    const two = putSave(draft(), file());
    dropSave(two!.n);
    expect(listSaves().map((s) => s.n)).toEqual([1]);
    expect(putSave(draft(), file())?.n).toBe(3);
  });

  it("최신이 앞에 온다 — 목록은 사용자가 방금 찍은 지점부터 읽는다", () => {
    use(memoryStorage());
    putSave(draft(), file());
    putSave(draft({ turn: 9 }), file());
    expect(listSaves().map((s) => s.n)).toEqual([2, 1]);
  });

  it("난입 계보를 싣는다 — 어느 기보 어디서 이어받았는지가 앵커의 절반이다", () => {
    use(memoryStorage());
    const s = putSave(draft({ origin: "replay", from: "m002" }), file());
    expect(listSaves()[0]).toMatchObject({ origin: "replay", from: "m002" });
    expect(s?.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  /** 손상 인덱스로 보관함 전체가 막히면 안 된다 — 자동 저장 계층과 같은 규약. */
  it("손상 인덱스는 빈 목록으로 강하한다", () => {
    const storage = memoryStorage();
    use(storage);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    storage.setItem("fesim:save:index", "{ 이건 JSON이 아니다");
    expect(listSaves()).toEqual([]);
    expect(putSave(draft(), file())?.n).toBe(1); // 인덱스가 죽어도 저장은 계속된다
  });

  /** 인덱스에만 남은 고아는 읽는 순간 스스로 걷힌다 — 목록이 없는 세이브를 계속 광고하면 안 된다. */
  it("슬롯이 사라진 인덱스 항목은 읽을 때 걷힌다", () => {
    const storage = memoryStorage();
    use(storage);
    const s = putSave(draft(), file());
    storage.removeItem(saveKey(s!.n));
    expect(readSave(s!.n)).toBeUndefined();
    expect(listSaves()).toEqual([]);
  });

  it("localStorage 예외는 저장·목록·읽기·삭제 전부에서 무해화된다", () => {
    use(memoryStorage("setItem"));
    expect(() => putSave(draft(), file())).not.toThrow();
    use(memoryStorage("getItem"));
    expect(listSaves()).toEqual([]);
    expect(readSave(1)).toBeUndefined();
    use(memoryStorage("removeItem"));
    expect(() => dropSave(1)).not.toThrow();
  });
});
