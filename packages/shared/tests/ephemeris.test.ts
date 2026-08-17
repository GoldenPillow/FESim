import { describe, expect, it } from "vitest";
import { parseEphemeris, serializeEphemeris, type EphemerisFile } from "@fesim/shared";

/**
 * .eph 기보 = 공유 링크의 정본 페이로드다. 왕복(직렬화→파싱)이 손실되면 남의 전략이 다르게 재생되고,
 * 검증 없는 파싱은 남이 만든 파일을 그대로 신뢰하는 것이라 재생 중 폭발한다 — 둘 다 여기서 막는다.
 */
const file: EphemerisFile = {
  eph: 1,
  game: "fe17",
  ruleVersion: "fe17-1",
  chapter: { cid: "CID_M002", difficulty: "l" },
  log: [
    { action: { type: "move", unit: "a", x: 1, y: 0 } },
    {
      action: { type: "attack", unit: "a", target: "e" },
      rolls: [0, 12],
      events: [
        { type: "strike", attacker: "a", defender: "e", kind: "attack", hit: true, crit: false, damage: 13, hpAfter: 7 },
        { type: "exp", unit: "a", amount: 6, total: 6 },
      ],
    },
    { action: { type: "endPhase" } },
  ],
  meta: { title: "샘플", created: "2026-08-16" },
};

describe(".eph 기보", () => {
  it("직렬화 → 파싱 왕복이 무손실이다", () => {
    expect(parseEphemeris(serializeEphemeris(file))).toEqual(file);
  });

  it("meta·scenario 같은 선택 필드가 없어도 왕복한다", () => {
    const minimal: EphemerisFile = {
      eph: 1,
      game: "fe17",
      ruleVersion: "fe17-1",
      chapter: { cid: "CID_M001", difficulty: "n" },
      log: [],
    };
    expect(parseEphemeris(serializeEphemeris(minimal))).toEqual(minimal);
  });

  it("setup(초기 세팅 diff)이 왕복하고, 뼈대가 불량이면 던진다", () => {
    // 왜 위험한가: setup은 편집기 산출물이자 공유 열람의 초기 국면 입력이다 —
    // 스냅숏(stats·hp)이 정본이라 열람 경로가 원천 테이블 없이 결정적으로 재구성한다.
    const withSetup: EphemerisFile = {
      ...file,
      setup: {
        units: {
          u0: { x: 3, y: 4, level: 5, stats: { hp: 30, str: 12, mag: 0, dex: 9, spd: 11, lck: 6, def: 7, res: 4, bld: 5 } },
          u1: { removed: true },
          u2: { items: ["IID_鉄の剣"], sids: ["SID_力＋１"], god: "GID_マルス", bond: 3 },
        },
      },
    };
    expect(parseEphemeris(serializeEphemeris(withSetup))).toEqual(withSetup);
    expect(() => parseEphemeris(JSON.stringify({ ...file, setup: [] }))).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, setup: { units: [] } }))).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, setup: { units: { u0: 1 } } }))).toThrow();
  });

  it("깨진 입력은 던진다 (파싱은 신뢰 경계)", () => {
    expect(() => parseEphemeris("{")).toThrow();
    expect(() => parseEphemeris("[]")).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, eph: 2 }))).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, game: 17 }))).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, ruleVersion: undefined }))).toThrow();
    expect(() =>
      parseEphemeris(JSON.stringify({ ...file, chapter: { cid: "CID_M002", difficulty: "x" } })),
    ).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, log: {} }))).toThrow();
    expect(() => parseEphemeris(JSON.stringify({ ...file, log: [{ rolls: [1] }] }))).toThrow();
  });
});
