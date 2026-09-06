import { afterEach, describe, expect, it, vi } from "vitest";
import type { EphemerisFile } from "@fesim/shared";
import {
  clampZoom,
  clearSlot,
  loadSlot,
  loadEntryLocks,
  loadShowDlc,
  loadShowGrowth,
  loadShowSpoilers,
  loadStarsphere,
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
  emptySnapshot,
  dropPreset,
  nextPresetNo,
  normalizeSnapshot,
  openPresets,
  parseSnapshot,
  presetKey,
  presetName,
  readPreset,
  writePreset,
  writePresetIndex,
  type BuilderSnapshot,
  type PresetIndex,
  type RunState,
  type SaveDraft,
  type SaveKey,
} from "../src/lib/guestSave";
import { memoryStorage, use } from "./fixtures";

const KEY: SaveKey = { game: "fe17", mapId: "m002", difficulty: "l", scenario: "1" };

const file = (over: Partial<EphemerisFile> = {}): EphemerisFile => ({
  eph: 1,
  game: "fe17",
  ruleVersion: "fe17-1",
  chapter: { cid: "m002", difficulty: "l", scenario: "1" },
  log: [{ action: { type: "wait", unit: "u0" } }],
  ...over,
});

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

describe("빌더 체커 구 키(마이그레이션 전용)", () => {
  /**
   * 왜 위험한가: 체커 4종의 정본은 프리셋으로 옮겨갔고(2026-09-05 — 빼면 성옥·캐릭터가 빠지는 사고가 난다),
   * 이 키들은 **승격 경로만 읽는 비계**다. 강하 규칙이 낡으면 옛 사용자의 체커가 승격에서 기본값으로
   * 떨어지는데, 스포일러가 그렇게 새면 되돌릴 수 없다. "1"/"0" 외는 전부 안전측(숨김)이다.
   * ☠키 문자열은 리터럴로 적는다 — 상수를 import하면 키 오타형 조용한 실패를 테스트가 같이 따라간다.
   */
  it("기본 = 숨김(false) · \"1\"/\"0\"만 유효 · 이물·예외는 안전측으로 강하한다", () => {
    const storage = memoryStorage();
    use(storage);
    expect([loadShowSpoilers(), loadShowDlc(), loadStarsphere(), loadShowGrowth()]).toEqual([false, false, false, false]);

    storage.setItem("fesim:ui:spoilers", "1");
    storage.setItem("fesim:ui:starsphere", "1");
    expect(loadShowSpoilers()).toBe(true);
    expect(loadStarsphere()).toBe(true);
    // ☠키가 섞이면 한 체커가 다른 체커를 켠다.
    expect(loadShowDlc()).toBe(false);
    expect(loadShowGrowth()).toBe(false);

    storage.setItem("fesim:ui:spoilers", "yes");
    storage.setItem("fesim:ui:dlc", "junk");
    expect(loadShowSpoilers()).toBe(false);
    expect(loadShowDlc()).toBe(false);

    use(memoryStorage("getItem"));
    expect(loadShowSpoilers()).toBe(false);
  });
});

describe("엔트리 잠금 구 키(마이그레이션 전용)", () => {
  /**
   * 왜 위험한가: 이 키는 프리셋 도입(2026-09-05)으로 **읽기 전용 비계**가 됐다 — 승격 경로만 소비한다.
   * 강하 규칙(원소 단위 필터)이 낡으면 옛 사용자의 잠금이 승격에서 통째로 사라지는데, 오류도 경고도 없고
   * 되돌릴 UI도 없다. 그래서 parseEntryLock을 프리셋 파서와 **공유**하고 그 규칙을 여기서 박제한다.
   * ☠키 문자열은 리터럴로 적는다 — 상수를 import하면 키 오타형 조용한 실패를 테스트가 같이 따라간다.
   */
  it("잠근 순서·스냅샷 그대로 읽는다", () => {
    const storage = memoryStorage();
    use(storage);
    expect(loadEntryLocks()).toEqual([]);
    const locks = [
      { pid: "PID_c", internal: 11, jid: "JID_high", star: true, iid: "IID_鉄の剣", plus: 2, engrave: "GID_マルス" },
      { pid: "PID_a", internal: 0 },
    ];
    storage.setItem("fesim:ui:entrylocks", JSON.stringify(locks));
    expect(loadEntryLocks()).toEqual(locks);
  });

  it("이물 값(비배열·형태 불일치 원소·구버전 pid 문자열)·localStorage 예외는 걸러서 강하한다", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:ui:entrylocks", "junk");
    expect(loadEntryLocks()).toEqual([]);
    // 구버전(pid 문자열 배열)·필드 결손 원소는 버리고 온전한 원소만 남긴다.
    storage.setItem(
      "fesim:ui:entrylocks",
      JSON.stringify(["PID_old", { pid: "PID_a", internal: 3 }, { pid: 7, internal: 1 }, { pid: "PID_b" }]),
    );
    expect(loadEntryLocks()).toEqual([{ pid: "PID_a", internal: 3 }]);
    use(memoryStorage("getItem"));
    expect(loadEntryLocks()).toEqual([]);
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

/**
 * 엔트리 프리셋 — 빌더 화면 한 벌의 저장 슬롯(2026-09-05 사용자 지시, 정본 = design/entry_preset.md).
 *
 * ☠왜 위험한가: 프리셋은 이 프로젝트 최초의 **사용자가 손으로 쌓은 실데이터**다. 기보는 다시 둘 수 있지만
 * 빌드는 못 되살린다. 그래서 여기 테스트는 전부 "조용히 사라지는 경로"를 하나씩 막는다 —
 * 저장 실패를 성공으로 보고하는 경로 · 손상 슬롯을 빈 프리셋으로 위장하는 경로 · 인덱스만 깨져도
 * 슬롯이 목록에서 증발하는 경로 · 다중 탭이 남의 번호를 재사용하는 경로.
 * ☠키 문자열은 리터럴로 하드코딩한다(상수를 import하면 키 오타형 조용한 실패를 테스트가 따라간다).
 */
describe("엔트리 프리셋", () => {
  /** ☠전 필드가 기본값과 달라야 한다 — 기본값으로 채운 픽스처는 파서가 값을 떨어뜨려도 통과한다. */
  const FULL: Required<BuilderSnapshot> = {
    slots: [
      { jid: "JID_hero", iid: "IID_鉄の剣", plus: 3, engrave: "GID_マルス" },
      { jid: "JID_sage", internal: 22 },
    ],
    internal: 25,
    sort: { key: "spd", dir: "desc" },
    locked: [
      {
        pid: "PID_a", internal: 12, jid: "JID_hero", star: true, iid: "IID_鉄の剣",
        plus: 2, engrave: "GID_マルス", gid: "GID_シグルド", bond: 17, skills: ["SID_x", "SID_y"],
      },
    ],
    overrides: { "PID_b:1": { iid: "IID_斧", plus: 1, engrave: "GID_リン" } },
    cardClass: { PID_b: { jid: "JID_monk", internal: 18 } },
    rings: { PID_b: { gid: "GID_シグルド", bond: 9 } },
    inherits: { PID_b: ["SID_c", "SID_d"] },
    star: true,
    showGrowth: true,
    showSpoilers: true,
    showDlc: true,
  };

  const doc = (snap: unknown, name = "") => JSON.stringify({ v: 1, updated: "2026-09-05T00:00:00.000Z", name, snap });

  it("픽스처의 모든 필드가 기본값과 다르다 — 왕복 테스트가 실제로 무언가를 판정하게 하는 전제", () => {
    const base = emptySnapshot() as Record<string, unknown>;
    for (const key of Object.keys(FULL)) {
      const mine = JSON.stringify((FULL as Record<string, unknown>)[key]);
      expect([key, mine]).not.toEqual([key, JSON.stringify(base[key])]);
    }
  });

  it("왕복 — 12종 전 필드가 그대로 돌아온다", () => {
    use(memoryStorage());
    expect(writePreset(1, FULL, "마스나이트 축")).toBe(true);
    expect(readPreset(1)).toEqual(FULL);
  });

  /**
   * ☠왜 위험한가: 캐릭터 순번은 별도 상태가 아니라 locked **배열 순서**다(2026-09-05 사용자 지시로 프리셋에
   * 포함). 파서가 정렬·중복 제거를 하면 드래그로 맞춘 엔트리 순서가 왕복마다 흐트러지는데, 값은 다 맞아서
   * 아무 테스트도 안 깨진다. 기본 순서로 왕복하면 "우연히 같은 순서"와 구분되지 않으므로 **재정렬한 순서**로 건다.
   */
  it("★캐릭터 순번 — 재정렬한 배열 순서가 그대로 돌아오고, 중간 원소가 강하돼도 나머지 상대 순서는 유지된다", () => {
    const storage = memoryStorage();
    use(storage);
    const snap = {
      ...emptySnapshot(),
      locked: [
        { pid: "PID_c", internal: 3 },
        { pid: "PID_a", internal: 1 },
        { pid: "PID_b", internal: 2 },
      ],
    };
    writePreset(1, snap, "");
    expect(readPreset(1)?.locked.map((e) => e.pid)).toEqual(["PID_c", "PID_a", "PID_b"]);

    storage.setItem(
      "fesim:preset:fe17:002",
      doc({ ...emptySnapshot(), locked: [{ pid: "PID_c", internal: 3 }, { pid: 7 }, { pid: "PID_b", internal: 2 }] }),
    );
    expect(readPreset(2)?.locked.map((e) => e.pid)).toEqual(["PID_c", "PID_b"]);
  });

  it("이물·범위 밖 값은 원소 단위로 걸러 강하한다 — 손상값이 엔진 루프에 들어가면 탭이 조용히 멈춘다", () => {
    const parsed = parseSnapshot({
      slots: "nope",
      internal: 1e9,
      sort: { key: "spd", dir: "sideways" },
      locked: [{ pid: "PID_a", internal: 12 }, "PID_old"],
      overrides: { "PID_b:1": { iid: "IID_斧", plus: 99 }, badkey: { iid: "IID_x" } },
      cardClass: { PID_b: { jid: "JID_monk", internal: 3 } },
      rings: { PID_b: { gid: "GID_x" }, PID_c: 42 },
      inherits: { PID_b: ["SID_c"], PID_d: ["SID_e", "SID_f"] },
      star: "yes",
      showDlc: true,
    });
    // 비배열 slots = 최소 1칸 강하 · 범위 밖 값은 **버리지 않고 클램프**(의도를 최대한 보존) · 잘못된 dir = sort 없음
    expect(parsed.slots).toEqual([{ jid: "" }]);
    expect(parsed.internal).toBe(50);
    expect(parsed.sort).toBeUndefined();
    expect(parsed.locked).toEqual([{ pid: "PID_a", internal: 12 }]);
    // 형식이 깨진 키(pid:li 아님)는 버린다 · plus는 연성 단계 0~5로 클램프
    expect(parsed.overrides).toEqual({ "PID_b:1": { iid: "IID_斧", plus: 5 } });
    // 표기 내부 레벨은 10~50 클램프
    expect(parsed.cardClass).toEqual({ PID_b: { jid: "JID_monk", internal: 10 } });
    // bond 결손 = 20 기본 · 객체 아닌 원소는 버린다
    expect(parsed.rings).toEqual({ PID_b: { gid: "GID_x", bond: 20 } });
    // 계승은 정확히 2칸일 때만
    expect(parsed.inherits).toEqual({ PID_d: ["SID_e", "SID_f"] });
    // 체커는 부울린만 — 이물은 안전측(false)
    expect(parsed.star).toBe(false);
    expect(parsed.showDlc).toBe(true);
  });

  /**
   * ☠왜 위험한가: 잠긴 pid는 세션 맵에서 걷힌 상태가 정본이다(잠금 = 스냅샷이 소유). 둘 다 있으면 카드가
   * 정본을 둘 갖는다. 런타임 왕복은 이를 지키지만 손편집 JSON·구버전·M4 서버 병합본은 안 지킨다.
   */
  it("normalizeSnapshot — 잠긴 pid는 세션 맵 4종에서 걷힌다(overrides는 `pid:li` 접두로만)", () => {
    const out = normalizeSnapshot({
      ...emptySnapshot(),
      locked: [{ pid: "PID_a", internal: 1 }],
      overrides: { "PID_a:0": { plus: 1 }, "PID_b:0": { plus: 2 }, "PID_ab:1": { plus: 3 } },
      cardClass: { PID_a: { jid: "JID_x" }, PID_b: { jid: "JID_y" } },
      rings: { PID_a: { gid: "GID_x", bond: 5 }, PID_b: { gid: "GID_y", bond: 6 } },
      inherits: { PID_a: ["SID_a", ""], PID_b: ["SID_b", ""] },
    });
    expect(Object.keys(out.overrides)).toEqual(["PID_b:0", "PID_ab:1"]);
    expect(Object.keys(out.cardClass)).toEqual(["PID_b"]);
    expect(Object.keys(out.rings)).toEqual(["PID_b"]);
    expect(Object.keys(out.inherits)).toEqual(["PID_b"]);
  });

  /**
   * ☠왜 위험한가: 저장 실패를 조용히 넘기면 시크릿 창에서 한 시간 쌓은 빌드가 새로고침에 사라진다.
   * 특히 **저장소 접근 자체가 차단된 브라우저**에서는 setItem이 no-op으로 지나가므로,
   * `storage()?.setItem(...)` 뒤에 그냥 true를 돌려주면 경고가 영원히 안 뜬다.
   */
  it("localStorage 예외·저장소 부재는 무해화하되 실패를 반환값으로 알린다", () => {
    use(memoryStorage("setItem"));
    expect(writePreset(1, emptySnapshot(), "")).toBe(false);
    expect(writePresetIndex({ v: 1, active: 1, seq: 2, list: [{ n: 1, name: "", entries: 0 }] })).toBe(false);
    use(memoryStorage("getItem"));
    expect(readPreset(1)).toBeUndefined();
    expect(openPresets().index.list).toHaveLength(1);
    use(memoryStorage("removeItem"));
    expect(() => dropPreset(1)).not.toThrow();

    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("blocked");
      },
      configurable: true,
    });
    expect(writePreset(1, emptySnapshot(), "")).toBe(false);
    expect(writePresetIndex({ v: 1, active: 1, seq: 2, list: [] })).toBe(false);
  });

  it("마이그레이션 — 구 키 5개(잠금 + 체커 4)가 Preset 001로 승격되고 지워진다", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:ui:entrylocks", JSON.stringify([{ pid: "PID_a", internal: 3 }, { pid: "PID_b", internal: 4 }]));
    storage.setItem("fesim:ui:starsphere", "1");
    storage.setItem("fesim:ui:spoilers", "1");
    storage.setItem("fesim:ui:pgrowth", "0");
    storage.setItem("fesim:ui:dlc", "0");

    const { index, snapshot, failed, broken } = openPresets();
    expect(failed).toBe(false);
    expect(broken).toBe(false);
    expect(index).toEqual({ v: 1, active: 1, seq: 2, list: [{ n: 1, name: "", entries: 2 }] });
    expect(snapshot.locked.map((e) => e.pid)).toEqual(["PID_a", "PID_b"]);
    expect(snapshot.star).toBe(true);
    expect(snapshot.showSpoilers).toBe(true);
    expect(snapshot.showGrowth).toBe(false);
    // 구 키 5개는 승격 성공 뒤에만 사라진다
    for (const k of ["fesim:ui:entrylocks", "fesim:ui:starsphere", "fesim:ui:spoilers", "fesim:ui:pgrowth", "fesim:ui:dlc"]) {
      expect(storage.getItem(k)).toBeNull();
    }
  });

  it("☠마이그레이션 저장 실패는 구 키를 남긴다 — 지우고 못 쓰면 사용자 잠금이 증발한다", () => {
    const storage = memoryStorage();
    const seeded = JSON.stringify([{ pid: "PID_a", internal: 3 }]);
    storage.setItem("fesim:ui:entrylocks", seeded);
    use({ ...storage, setItem: () => { throw new Error("QuotaExceededError"); } } as Storage);
    const { failed } = openPresets();
    expect(failed).toBe(true);
    expect(storage.getItem("fesim:ui:entrylocks")).toBe(seeded);
  });

  it("고아 슬롯 회수 — 인덱스가 없어도 슬롯에서 목록·이름이 되살아난다(부분 쓰기 실패의 복구 경로)", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:preset:fe17:002", doc({ ...emptySnapshot(), locked: [{ pid: "PID_a", internal: 1 }] }, "잃어버린 빌드"));
    const { index } = openPresets();
    expect(index.list).toEqual([{ n: 2, name: "잃어버린 빌드", entries: 1 }]);
    expect(index.active).toBe(2);
    // ☠발급기는 항상 최대 번호 위로 — 손상된 seq가 번호를 되쓰면 옛 대화의 앵커가 딴 빌드를 가리킨다.
    expect(index.seq).toBeGreaterThanOrEqual(3);
  });

  it("인덱스 손상 — 키를 지우지 않고 슬롯에서 복구하며 active 미아는 첫 항목으로 강하한다", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:preset:fe17:index", "junk");
    storage.setItem("fesim:preset:fe17:001", doc(emptySnapshot(), "A"));
    storage.setItem("fesim:preset:fe17:002", doc(emptySnapshot(), "B"));
    const first = openPresets();
    expect(first.index.list.map((p) => p.name)).toEqual(["A", "B"]);
    expect(first.index.active).toBe(1);

  });

  it("active 미아 — 목록에 없는 활성 번호는 첫 항목으로 강하한다(고아 키에 계속 쓰는 것을 막는다)", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:preset:fe17:002", doc(emptySnapshot(), "B"));
    storage.setItem(
      "fesim:preset:fe17:index",
      JSON.stringify({ v: 1, active: 99, seq: 3, list: [{ n: 2, name: "B", entries: 0 }] }),
    );
    expect(openPresets().index.active).toBe(2);
  });

  /**
   * ☠왜 위험한가: 활성 슬롯이 손상됐는데 빈 스냅샷으로 강하만 하면, 목록엔 "12 엔트리"가 서 있는데 표는
   * 비어 보이고 **사용자의 첫 조작 한 번이 자동 저장으로 그 슬롯을 덮어** 원본 회수 기회가 영구히 사라진다.
   */
  it("활성 슬롯 손상 — broken을 세워 자동 저장을 막을 수 있게 하고, 슬롯은 지우지 않는다", () => {
    const storage = memoryStorage();
    use(storage);
    storage.setItem("fesim:preset:fe17:index", JSON.stringify({ v: 1, active: 1, seq: 2, list: [{ n: 1, name: "A" }] }));
    storage.setItem("fesim:preset:fe17:001", "{ not json");
    const { broken, snapshot } = openPresets();
    expect(broken).toBe(true);
    expect(snapshot).toEqual(emptySnapshot());
    expect(storage.getItem("fesim:preset:fe17:001")).toBe("{ not json");
  });

  /**
   * ☠왜 위험한가: seq는 탭마다 메모리에만 있다. 탭 B가 003을 만든 뒤 탭 A가 stale seq로 같은 003을 발급하면
   * B의 빌드를 덮고 인덱스에서도 지운다 — 번호 재사용 금지 불변식이 정면으로 깨진다.
   */
  it("nextPresetNo — 다른 탭이 발급한 번호를 디스크에서 다시 읽어 재사용을 막는다", () => {
    const storage = memoryStorage();
    use(storage);
    const stale: PresetIndex = { v: 1, active: 1, seq: 2, list: [{ n: 1, name: "", entries: 0 }] };
    storage.setItem(
      "fesim:preset:fe17:index",
      JSON.stringify({ v: 1, active: 3, seq: 4, list: [{ n: 1, name: "", entries: 0 }, { n: 3, name: "", entries: 0 }] }),
    );
    expect(nextPresetNo(stale)).toBe(4);
  });

  it("presetKey·presetName — 3자리 패딩, 이름이 비면 Preset NNN", () => {
    expect(presetKey(7)).toBe("fesim:preset:fe17:007");
    expect(presetName({ n: 7, name: "", entries: 0 })).toBe("Preset 007");
    expect(presetName({ n: 7, name: "마스나이트 축", entries: 3 })).toBe("마스나이트 축");
  });
});
