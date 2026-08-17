import { describe, expect, it } from "vitest";
import type { DisposUnit } from "@fesim/shared";
import { attackWeapons, boardPropsFor, consumableItems, staffItems, emblemEngageArt, emblemEngagedSids, emblemEngageWeapons, emblemSyncSids, unitSkillRows, unitStats } from "../src/lib/fe17";

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
      items: ["IID_傷薬", "IID_鉄の剣", "IID_ライブ", "IID_鉄の弓"].map((iid) => ({ iid, drop: false })),
    });
    const list = attackWeapons(u, "ko");
    expect(list.map((w) => w.kind)).toEqual([1, 4]); // 검, 활 — 상약·지팡이 제외
    expect(list[0].rangeMax).toBe(1);
    expect(list[1].rangeMin).toBe(2);
  });
});

describe("소지품 인계 — dispos가 비운 자군 무기", () => {
  it("m003 자군은 m002 소지품을 인계받아 무장한다 (인게임 = 세이브 인계의 근사)", () => {
    // 왜 위험한가: 후속장 dispos의 자군 items는 빈 배열(세이브가 소유)이라
    // 인계 없이는 자군 전원이 비무장 — 공격 범위·전투 예보·공격이 통째로 성립하지 않는다(3장 실측).
    const props = boardPropsFor("m003", "ko");
    const ruell = props.units.find((u) => u.name === "뤼에르");
    expect(ruell?.weapon?.kind).toBe(1); // 철의 검
    expect(ruell?.rangeMax).toBe(1);
    // 무회귀: 자체 소지가 있는 유닛은 그대로
    const boss = props.units.find((u) => u.force === 1 && u.weapon !== undefined);
    expect(boss).toBeDefined();
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

describe("인게이지 효과 사영 (MP1-4b) — EngagedSkills·EngageSid 치환·엠블렘 무기", () => {
  it("emblemEngagedSids = 싱크로 ∪ 인게이지 스킬 (마르스 絆1: カウンター 합류)", () => {
    // 왜 위험한가: 인게이지 중 스킬 세트를 안 바꾸면 인게이지 스킬(카운터·경감)이 전부 무발동이고,
    // EngageSkills를 평시에도 섞으면 비인게이지 판정이 과대다(GetSyncroSkills 0x2342530이 배열째 교체).
    const engaged = emblemEngagedSids("GID_マルス", 1);
    expect(engaged).toContain("SID_カウンター");
    expect(engaged).toContain("SID_敵エンゲージ技ダメージ軽減");
    expect(engaged).toContain("SID_見切り"); // 싱크로 층은 그대로 합류
    expect(emblemSyncSids("GID_マルス", 1)).not.toContain("SID_カウンター"); // 평시 목록엔 없다
  });

  it("EngageSid 치환 — 에이리크 月の腕輪 → 日月の腕輪, 優風 → 蒼穹 (원형은 평시 목록에만)", () => {
    const engaged = emblemEngagedSids("GID_エイリーク", 3);
    expect(engaged).toContain("SID_日月の腕輪");
    expect(engaged).not.toContain("SID_月の腕輪");
    expect(engaged).toContain("SID_蒼穹");
    expect(engaged).not.toContain("SID_優風");
    expect(emblemSyncSids("GID_エイリーク", 3)).toContain("SID_月の腕輪");
  });

  it("치환 뒤에도 동계열(Group) 대체 — 絆13 日月の腕輪＋(P6)가 日月の腕輪(P3)를 대체", () => {
    // 왜 위험한가: 동계열 정본은 SID 명명 규칙이 아니라 習得優先度 연속 구간(GroupAssign 0x248D0C0)이다 —
    // 명명 근사로는 치환 결과(日月~)와 원형(月~)이 딴 계열로 보여 상하위가 중첩된다.
    const engaged = emblemEngagedSids("GID_エイリーク", 13);
    expect(engaged).toContain("SID_日月の腕輪＋");
    expect(engaged).not.toContain("SID_日月の腕輪");
  });

  it("emblemEngageWeapons = EngageItems 레벨 누적, 공격 무기만 (에이리크 1/10/15)", () => {
    expect(emblemEngageWeapons("GID_エイリーク", "ko", 1)).toHaveLength(1); // レイピア
    const full = emblemEngageWeapons("GID_エイリーク", "ko", 20);
    expect(full).toHaveLength(3); // + かぜの剣(10)·ジークリンデ(15)
    expect(full.every((w) => w.kind > 0 && w.rangeMax >= 1)).toBe(true);
  });

  it("boardPropsFor — m003 紋章氣가 crest 플래그로 실린다(엔진 국면 crests의 초기값)", () => {
    const props = boardPropsFor("m003", "ko");
    expect(props.objects.some((o) => o.crest === true && o.x === 9 && o.y === 10)).toBe(true);
  });
});

describe("인게이지 기술 선택 (MP1-4c) — emblemEngageArt", () => {
  it("마르스 기본 = 기술 행 + SyncSids 전개(汎用設定·ダメージ３０％), 사거리 1-1", () => {
    // 왜 위험한가: 흐름 변수(攻撃回数 7·명중 100·반격 몰수)는 전부 SyncSids의 汎用設定이 소유한다 —
    // 전개가 빠지면 기술이 통상 전투 문법으로 돌아 타수·명중·반격이 전부 어긋난다.
    const art = emblemEngageArt("GID_マルス", undefined, "ko");
    expect(art?.sid).toBe("SID_マルスエンゲージ技");
    const sids = art?.skills.map((r) => r.Sid);
    expect(sids).toEqual(["SID_マルスエンゲージ技", "SID_エンゲージ技_汎用設定", "SID_ダメージ３０％"]);
    expect(art?.rangeMin).toBe(1);
    expect(art?.rangeMax).toBe(1);
    expect(art?.cost).toBe(0);
    expect(art?.weaponProhibit).toBe(1021); // 검(kind 1)만 허용 — 가정 비트 해석의 앵커 값
    // 사영 결손 정정 확인: 汎用設定의 Stand·기술 행의 Action이 슬림 사영에 실려야 필터가 돈다.
    expect(art?.skills[1]?.Stand).toBe(1);
    expect(art?.skills[0]?.Action).toBe(1);
  });

  it("스타일 분기 — 竜族 직업이면 SID_マルスエンゲージ技_竜族(攻撃回数 9 변형)", () => {
    const art = emblemEngageArt("GID_マルス", "竜族スタイル", "ko");
    expect(art?.sid).toBe("SID_マルスエンゲージ技_竜族");
    expect(art?.skills[0]?.ActValues?.[0]).toBe("9");
  });

  it("에이리크 = 슬롯별 강제 무기([IID_無し, ジークムント] → [null, 창]) · 세리카 = rewarp 판별자", () => {
    const eirika = emblemEngageArt("GID_エイリーク", undefined, "ko");
    expect(eirika?.weapons?.[0]).toBeNull(); // IID_無し = 현 장비
    expect(eirika?.weapons?.[1]?.kind).toBe(2); // ジークムント = 창
    const celica = emblemEngageArt("GID_セリカ", undefined, "ko");
    expect(celica?.rewarp).toBe(10); // 리워프형 — 엔진이 정직 거부하는 판별자
  });
});

describe("staffItems — 소지품 → 지팡이 목록 사영 (MP0)", () => {
  it("지팡이만 소지 순서대로 — ライブ 실값(Power 10·Range 1-1·잔여 25·RodType 2·RodExp 25)", () => {
    // 왜 위험한가: staff.staff 인덱스·회복량·경험치가 전부 이 사영을 지나 엔진에 들어간다 —
    // 필드 하나라도 어긋나면 회복량·잔여 횟수·경험치가 통째로 어긋난다.
    const u = disposUnit({
      items: ["IID_鉄の剣", "IID_ライブ"].map((iid) => ({ iid, drop: false })),
    });
    const list = staffItems(u, "ko");
    expect(list).toEqual([
      { iid: "IID_ライブ", name: "라이브", power: 10, rangeMin: 1, rangeMax: 1, uses: 25, rodType: 2, useType: 2, hit: 100, distance: 0, rodExp: 25 },
    ]);
  });

  it("방해·워프 사영(MP1-5) — フリーズ GiveSids→상태 행(BadState·Life)·ワープ Distance 5", () => {
    // 왜 위험한가: 명중식의 武器命中(hit)·상태 부여(gives)·워프 반경(distance)이 전부 이 사영을 지난다 —
    // gives의 BadState·Life가 어긋나면 상태 효과·지속이 통째로 어긋난다.
    const u = disposUnit({
      items: ["IID_フリーズ", "IID_ワープ"].map((iid) => ({ iid, drop: false })),
    });
    const list = staffItems(u, "ko");
    expect(list[0]).toMatchObject({
      rodType: 3,
      useType: 9,
      hit: 70,
      gives: [{ sid: "SID_移動不可", badState: 256, life: 1, name: expect.any(String) }],
    });
    expect(list[1]).toMatchObject({ rodType: 0, useType: 5, distance: 5 });
    expect(list[1].gives).toBeUndefined();
  });

  it("m002 프랑은 지팡이를 실보유한다 (재현 결손 발현 케이스의 회귀 앵커)", () => {
    const props = boardPropsFor("m002", "ko");
    const framme = props.units.find((u) => u.name === "프랑");
    expect(framme?.staves?.length).toBeGreaterThan(0);
    expect(framme?.staves?.[0].rodType).toBe(2);
  });
});

describe("consumableItems — 소지품 → 사용형 아이템 사영 (MP1-1)", () => {
  it("Kind=10 사용형만, 傷薬 실값(AddType 2·+15·범위 2·잔여 3) — 미배선 종류도 목록엔 실린다(인덱스 계약)", () => {
    const u = disposUnit({
      items: ["IID_鉄の剣", "IID_傷薬", "IID_毒消し"].map((iid) => ({ iid, drop: false })),
    });
    const list = consumableItems(u, "ko");
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ iid: "IID_傷薬", name: "상처약", addType: 2, power: 15, range: 2, uses: 3 });
    expect(list[1].addType).toBe(18); // 독소약 — 미배선이지만 인덱스 자리를 지킨다
  });
});

describe("script.terrains — 런타임 지형 교체 사영 (MP3)", () => {
  it("챕터 Lua 폐포의 TID 전수를 굳혀 넘긴다 — 클라이언트엔 terrain 표가 없다", () => {
    // 왜 위험한가: 이벤트 TerrainSet이 이 사영만 보고 지형을 바꾼다. 빠지면 세션이 정직 거부하고
    // 챕터가 통째로 원시판으로 강하한다(효과 없는 교체 = 오재현이라 no-op 강하가 금지돼 있다).
    const board = boardPropsFor("m015", "ko");
    const terrains = board.script?.terrains ?? {};
    expect(Object.keys(terrains).length).toBeGreaterThan(0);
    const door = terrains["TID_扉"]; // m015 스크립트가 문자열로 부르는 TID
    expect(door).toBeDefined();
    expect(door.cell.tid).toBe("TID_扉");
    expect(door.cell.costName).toBe("COST_不可"); // TerrainGetMoveCost가 비교하는 문자열
    expect(door.cost?.foot).toBe(255); // 통행 불가 — 교체 시 코스트가 실제로 바뀐다
    expect(door.name).not.toBe(""); // 렌더 표시(display)의 원천
    // 표시 필드는 cell에 중복 직렬화하지 않는다(보드 JSON 용량 정책).
    expect("color" in door.cell).toBe(false);
  });
});
