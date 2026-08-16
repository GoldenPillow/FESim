import { describe, expect, it } from "vitest";
import { serializeEphemeris, type EphemerisFile } from "@fesim/shared";
import { getReplay, isLinkId, linkKey, normalizeLinkId, statusFor, type LinkStore } from "../src/index";

const FILE: EphemerisFile = {
  eph: 1,
  game: "fe17",
  ruleVersion: "fe17-1",
  chapter: { cid: "m002", difficulty: "l" },
  log: [{ action: { type: "endPhase" } }],
};

/** 호출 기록을 남기는 KV 대역 — "불량 id는 KV를 건드리지 않는다"를 관측 가능하게 만든다. */
function store(entries: Record<string, string>): LinkStore & { keys: string[] } {
  const keys: string[] = [];
  return {
    keys,
    get: async (key: string) => {
      keys.push(key);
      return entries[key] ?? null;
    },
  };
}

describe("링크 id 코덱", () => {
  it("base62 5~12자만 통과한다", () => {
    expect(isLinkId("aB3xZ")).toBe(true);
    expect(isLinkId("0123456789ab")).toBe(true);
    expect(isLinkId("abcd")).toBe(false); // 4자
    expect(isLinkId("0123456789abc")).toBe(false); // 13자
    expect(isLinkId("ab-cd")).toBe(false); // base62 밖
    expect(isLinkId("ab cde")).toBe(false);
    expect(isLinkId(undefined)).toBe(false);
  });

  it("정규화는 공백만 턴다 — 대소문자·문자 교정은 하지 않는다", () => {
    expect(normalizeLinkId("  aB3xZ\n")).toBe("aB3xZ");
    expect(normalizeLinkId("AB3XZ")).toBe("AB3XZ"); // 소문자화 금지(다른 링크다)
    expect(normalizeLinkId("aB3xZ.json")).toBeUndefined();
    expect(normalizeLinkId(null)).toBeUndefined();
  });

  it("KV 키는 id 그대로다(./dev link:put과 같은 규칙)", () => {
    expect(linkKey("aB3xZ")).toBe("aB3xZ");
  });
});

describe("getReplay", () => {
  it("레코드를 parseEphemeris로 돌려준다", async () => {
    const kv = store({ aB3xZ: serializeEphemeris(FILE) });
    const found = await getReplay(kv, "aB3xZ");
    expect(found).toEqual({ ok: true, id: "aB3xZ", file: FILE });
  });

  it("없는 링크 = not-found(404)", async () => {
    const kv = store({});
    const missing = await getReplay(kv, "aB3xZ");
    expect(missing).toEqual({ ok: false, reason: "not-found" });
    expect(statusFor("not-found")).toBe(404);
  });

  it("불량 id는 KV를 건드리지 않는다", async () => {
    const kv = store({ aB3xZ: serializeEphemeris(FILE) });
    const bad = await getReplay(kv, "ab-cd");
    expect(bad).toEqual({ ok: false, reason: "invalid-id" });
    expect(kv.keys).toEqual([]);
    expect(statusFor("invalid-id")).toBe(404);
  });

  it("깨진 레코드 = corrupt(400) + 사유 보존", async () => {
    const kv = store({ aB3xZ: '{"eph":2}' });
    const broken = await getReplay(kv, "aB3xZ");
    expect(broken.ok).toBe(false);
    if (broken.ok) return;
    expect(broken.reason).toBe("corrupt");
    expect(broken.message).toContain("eph");
    expect(statusFor("corrupt")).toBe(400);
  });
});
