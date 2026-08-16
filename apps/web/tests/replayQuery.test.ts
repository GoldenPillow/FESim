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
