import { afterEach, describe, expect, it, vi } from "vitest";
import type { EphemerisFile } from "@fesim/shared";
import { clearSlot, loadSlot, saveSlot, slotKey, type SaveKey } from "../src/lib/guestSave";
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
