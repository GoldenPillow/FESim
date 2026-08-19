import { describe, expect, it } from "vitest";
import { readAddress, readMapQuery, writeAddress, writeMapQuery } from "../src/lib/replayQuery";

describe("맵 질의", () => {
  it("왕복 — 국면·난이도가 그대로 돌아온다", () => {
    const search = writeMapQuery("", { p: "2", d: "h" });
    expect(search).toBe("?p=2&d=h");
    expect(readMapQuery(search)).toEqual({ p: "2", d: "h" });
  });

  it("undefined는 키를 지우고 다른 질의는 보존한다", () => {
    const search = writeMapQuery("?l=ko&p=1&d=n", { p: undefined, d: "l" });
    expect(new URLSearchParams(search).get("l")).toBe("ko");
    expect(new URLSearchParams(search).has("p")).toBe(false);
    expect(readMapQuery(search).d).toBe("l");
  });

  /** 남이 손으로 고친 URL이 난이도를 이물로 채워도 스토어까지 새면 안 된다. */
  it("난이도가 n|h|l이 아니면 무시한다", () => {
    expect(readMapQuery("?d=x").d).toBeUndefined();
    expect(readMapQuery("").d).toBeUndefined();
  });
});

describe("주소 질의", () => {
  it("왕복 — a=0은 생략된다(페이즈 개시)", () => {
    expect(writeAddress("", { t: 3, p: "enemy", a: 0 })).toBe("?t=3&p=enemy");
    expect(readAddress("?t=3&p=enemy")).toEqual({ t: 3, p: "enemy", a: 0 });
    const full = writeAddress("", { t: 1, p: "player", a: 4 });
    expect(readAddress(full)).toEqual({ t: 1, p: "player", a: 4 });
  });

  it("t·p가 불량이면 주소가 성립하지 않는다", () => {
    expect(readAddress("?t=0&p=player")).toBeUndefined();
    expect(readAddress("?t=1&p=hero")).toBeUndefined();
    expect(readAddress("?p=player")).toBeUndefined();
  });

  it("음수·비정수 a는 페이즈 개시로 접힌다", () => {
    expect(readAddress("?t=1&p=player&a=-3")?.a).toBe(0);
    expect(readAddress("?t=1&p=player&a=abc")?.a).toBe(0);
  });
});

/**
 * ?load=n — 번호로 부른 세이브. ★자동 복원보다 앞선다(명시 지시가 이긴다).
 * 왜 위험한가: 다른 챕터의 세이브를 여는 유일한 경로라, 여기서 값이 새면 목록 클릭이 조용히 무동작이 된다.
 */
describe("세이브 딥링크 — ?load", () => {
  it("양수 정수만 읽고, 이물·0·음수는 없는 셈 친다", () => {
    expect(readMapQuery("?load=7").load).toBe(7);
    expect(readMapQuery("?load=0").load).toBeUndefined();
    expect(readMapQuery("?load=-3").load).toBeUndefined();
    expect(readMapQuery("?load=abc").load).toBeUndefined();
    expect(readMapQuery("").load).toBeUndefined();
  });

  it("다른 질의를 보존하며 왕복한다", () => {
    // 이 코덱이 소유하지 않는 키(로케일 등)는 보존, 소유하는 키는 undefined = 삭제가 계약이다.
    expect(writeMapQuery("?l=ko", { load: 12 })).toBe("?l=ko&load=12");
    expect(readMapQuery(writeMapQuery("", { d: "l", load: 3 }))).toEqual({ p: undefined, d: "l", load: 3 });
  });
});
