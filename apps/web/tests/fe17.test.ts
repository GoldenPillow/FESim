import { describe, expect, it } from "vitest";
import type { DisposUnit } from "@fesim/shared";
import { attackWeapons, emblemSyncSids, unitSkillRows, unitStats } from "../src/lib/fe17";

/**
 * fe17 어댑터 — 정본 테이블(persons/jobs/gods.json)을 엔진 입력으로 사상하는 층.
 * 실측 근거: ~/fesim_data/reference/screens/NOTES.md (M003 세트, 뤼에르&마르스 絆3).
 */
const disposUnit = (over: Partial<DisposUnit>): DisposUnit => ({
  pid: "PID_リュール",
  jid: "JID_神竜ノ子",
  force: 0,
  x: 0,
  y: 0,
  direction: 0,
  level: { n: 1, h: 1, l: 1 },
  items: [],
  sids: [],
  ai: {},
  ...over,
});

describe("unitStats — 스탯 상한(Limit) 배선", () => {
  it("상한 = job.xml Limit + person.xml Limit(개인 보정) 합산 후 클램프", () => {
    // 왜 위험한가: deriveStats에 cap 클램프 코드가 있는데 호출부가 cap을 안 넘겨 상한이 통째로 미배선이었다
    // (D축 §5-2). 고레벨 유닛의 표시 스탯이 정본 캡을 넘어 예보·전투 수치가 전부 부풀어 오른다.
    // 뤼에르(JID_神竜ノ子) Lv99 노멀 무보정 산출 = HP81 기49 속56 수44 마방28.
    const capped = unitStats(disposUnit({ level: { n: 99, h: 99, l: 99 } }), "n");
    expect(capped).toEqual({ hp: 68, str: 40, mag: 20, dex: 37, spd: 44, lck: 30, def: 35, res: 25, bld: 9 });
    // dex 37 = job 36 + person 1, spd 44 = job 43 + person 1 — 개인 보정이 합산됨을 증명한다.
  });

  it("상한 미달 유닛은 종전 산출 그대로 (무회귀)", () => {
    expect(unitStats(disposUnit({}), "n")).toEqual({
      hp: 22, str: 6, mag: 0, dex: 5, spd: 7, lck: 5, def: 5, res: 3, bld: 4,
    });
  });
});

describe("attackWeapons — 소지품 → 무기 목록 사영", () => {
  it("공격 무기만 소지 순서대로, 지팡이·소모품 제외 (목록[0] = 장비 무기)", () => {
    // 왜 위험한가: 예보 무기 목록과 attack.weapon 인덱스가 이 배열을 공유한다 —
    // 필터·순서가 흔들리면 기보의 무기 인덱스가 다른 무기를 가리켜 재생이 어긋난다.
    const u = disposUnit({
      items: [{ iid: "IID_傷薬" }, { iid: "IID_鉄の剣" }, { iid: "IID_ライブ" }, { iid: "IID_鉄の弓" }],
    });
    const list = attackWeapons(u, "ko");
    expect(list.map((w) => w.kind)).toEqual([1, 4]); // 검, 활 — 상약·지팡이 제외
    expect(list[0].rangeMax).toBe(1);
    expect(list[1].rangeMin).toBe(2);
  });
});

describe("emblemSyncSids — 絆 레벨 싱크로", () => {
  it("絆 3 = 레벨 1..3 합집합, 동계열은 최고 레벨만 (실측: 힘+1 기+2 속+1 · ブレイク時追撃 보유)", () => {
    // 왜 위험한가: Lv1 테이블만 읽으면 실기(絆3)의 技＋２·ブレイク時追撃이 통째로 누락되고,
    // 반대로 단순 합집합이면 技＋１과 技＋２가 겹쳐 +3이 된다 — 실측은 +2다(C축 §4-3 반증).
    const sids = emblemSyncSids("GID_マルス", 3);
    expect(sids).toContain("SID_力＋１");
    expect(sids).toContain("SID_技＋２");
    expect(sids).not.toContain("SID_技＋１"); // 동계열 하위는 대체된다
    expect(sids).toContain("SID_速さ＋１");
    expect(sids).toContain("SID_ブレイク時追撃"); // Lv3
    expect(sids).toContain("SID_見切り");
    expect(sids).not.toContain("SID_速さ＋２"); // Lv4 미달
  });

  it("기본 絆 레벨 = god.xml Level (마르스 1)", () => {
    expect(emblemSyncSids("GID_マルス")).toEqual([
      "SID_見切り", "SID_力＋１", "SID_技＋１", "SID_速さ＋１", "SID_メディウス特効",
    ]);
  });

  it("絆 20(상한)이면 최상위 계열만 남는다", () => {
    const sids = emblemSyncSids("GID_マルス", 20);
    expect(sids).toContain("SID_技＋４");
    expect(sids).toContain("SID_不屈＋＋");
    expect(sids).toContain("SID_見切り＋");
    expect(sids).not.toContain("SID_不屈");
    expect(sids).not.toContain("SID_見切り");
  });

  it("unitSkillRows가 絆 레벨을 그대로 태운다", () => {
    const rows = unitSkillRows(disposUnit({ gid: "GID_マルス" }), 3);
    expect(rows.map((r) => r.Sid)).toContain("SID_技＋２");
  });
});
