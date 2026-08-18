import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DisposUnit } from "@fesim/shared";
import { attackWeapons, boardPropsFor, chapterList, nextChapter, consumableItems, staffItems, emblemEngageArt, emblemEngagedSids, emblemEngageWeapons, emblemSyncSids, unitSkillRows, unitSynchroSkillRows, unitStats } from "../src/lib/fe17";

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

describe("챕터 연쇄 (MP5 5-3)", () => {
  it("nextChapter — 본편 사슬은 chapter.xml NextChapter가 정본이다", () => {
    // 왜 위험한가: 종전 chapterlist는 cid/category/recommendedLevel 3필드뿐이라 캠페인이
    // 다음 챕터를 알 방법이 없었다(파일명 정렬은 외전·신룡의 장을 섞어 놓는다).
    expect(nextChapter("CID_M002")).toBe("CID_M003");
    expect(nextChapter("CID_S001")).toBeUndefined(); // 외전은 사슬 밖 — 해금(unlock)으로 열린다
  });

  it("unlock — 외전 개방 시점이 실린다(MA 공략의 외전 진입 판단 입력)", () => {
    expect(chapterList.find((e) => e.cid === "CID_S001")?.unlock).toBe("M005");
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
    expect(ruell?.weapons?.[0]?.kind).toBe(1); // 철의 검
    expect(ruell?.rangeMax).toBe(1);
    // 무회귀: 자체 소지가 있는 유닛은 그대로
    const boss = props.units.find((u) => u.force === 1 && u.weapons !== undefined);
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

  it("싱크로 스킬은 unitSkillRows(사람 스킬)가 아니라 unitSynchroSkillRows(엠블렘 클러스터)가 소유한다", () => {
    // 왜 위험한가: 반지는 붙였다 뗀다. 싱크로를 사람 스킬에 섞으면 해제(UnitSetGodUnit nil)가
    // 패시브를 못 걷어내고, 반대로 Lua로 붙인 엠블렘은 패시브가 통째로 안 붙는다(m002 2회전 결손).
    const unit = disposUnit({ gid: "GID_マルス" });
    expect(unitSkillRows(unit).map((r) => r.Sid)).not.toContain("SID_技＋２");
    expect(unitSynchroSkillRows(unit, 3)?.map((r) => r.Sid)).toContain("SID_技＋２");
    expect(unitSynchroSkillRows(disposUnit({}))).toBeUndefined();
  });
});

describe("스크립트 엠블렘(m002 2회전 시구르드) — 문장사 패시브·오버드라이브", () => {
  const gods = boardPropsFor("m002", "ko").script!.gods;

  /**
   * ☠조용한 결손이었다: Lua로 붙인 엠블렘(UnitCreateGodUnit)이 게이지·무기·기술만 받고
   * **패시브를 하나도 못 받았다**. 그래서 2회전 뤼미에르가 迅走(이동+5)를 못 얻어 거리를 못 좁혔고,
   * 오류도 경고도 없어 "AI가 소극적이다"로 오해되기만 했다(사용자 관측 2026-08-18).
   */
  it("script.gods가 싱크로·인게이지 스킬을 함께 싣는다 — 迅走(이동+5)가 인게이지 세트에 있다", () => {
    const sigurd = gods["GID_M002_シグルド"]!;
    expect(sigurd.synchroSkills?.map((r) => r.Sid)).toEqual(
      expect.arrayContaining(["SID_守備＋３", "SID_移動＋１", "SID_再移動"]),
    );
    const engaged = sigurd.engagedSkills?.find((r) => r.Sid === "SID_迅走");
    expect(engaged?.["EnhanceValue.Move"]).toBe(5);
  });

  /**
   * ☠비계 — god.xml GID_M002_シグルド는 EngageAttack이 비어 있다(정규 GID_シグルド만 보유).
   * 사용자 실기 관측이 "2회전 뤼미에르가 오버드라이브를 쓴다"라 관측을 정본으로 채택했다(2026-08-18).
   * 제거 조건 = 실기 재관측으로 미사용 확인, 또는 변종이 정규 기술을 참조하는 경로 판독.
   */
  it("오버드라이브가 관통형(Target=Pierce 4)으로 실린다", () => {
    const art = gods["GID_M002_シグルド"]!.arts?.[""];
    expect(art?.sid).toBe("SID_シグルドエンゲージ技");
    expect(art?.pierce).toBe(true);
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

  it("boardPropsFor — 성장 안전장치(cap·maxLevel)가 유닛에 실린다 (MP5 5-0)", () => {
    // 왜 위험한가: 엔진 rollGrowth의 캡 게이트와 grantExp의 최대 레벨 정지는 이 두 필드가
    // 있어야만 동작한다. 사영이 없으면 게이트가 항상 통과해 인계(MP5)를 켜는 순간 무한 성장이 된다.
    const props = boardPropsFor("m003", "ko");
    const lueur = props.units.find((u) => u.pid === "PID_リュール")!;
    // 뤼에르(JID_神竜ノ子) 상한 = job.Limit + person.Limit 실값(Lv99 산출은 이 상한에 못 닿는 스탯이 있다).
    expect(lueur.cap).toEqual({ hp: 68, str: 42, mag: 25, dex: 37, spd: 44, lck: 35, def: 35, res: 25, bld: 13 });
    expect(lueur.maxLevel).toBe(20);
  });

  it("boardPropsFor — m003 紋章氣가 crest 플래그로 실린다(엔진 국면 crests의 초기값)", () => {
    const props = boardPropsFor("m003", "ko");
    expect(props.objects.some((o) => o.crest === true && o.x === 9 && o.y === 10)).toBe(true);
  });
});

describe("인게이지 기술 선택 (MP1-4c) — emblemEngageArt", () => {
  it("마르스 기본 = SyncSids 전개(汎用設定·ダメージ３０％) **뒤에** 기술 행, 사거리 1-1", () => {
    // 왜 위험한가: 흐름 변수(攻撃回数·명중 100·반격 몰수)는 SyncSids의 汎用設定이 기본값으로 `=` 대입한다 —
    // ☠**순서가 값을 정한다**: 기술 행이 앞에 오면 汎用設定의 攻撃回数=1이 기술의 7(竜族 9)을 덮어
    // 스타 러시가 1타로 나간다(2026-08-18 프롤로그 실측 — 4피해 1타로 마무리에 실패했다).
    const art = emblemEngageArt("GID_マルス", undefined, "ko");
    expect(art?.sid).toBe("SID_マルスエンゲージ技");
    const sids = art?.skills.map((r) => r.Sid);
    expect(sids).toEqual(["SID_エンゲージ技_汎用設定", "SID_ダメージ３０％", "SID_マルスエンゲージ技"]);
    expect(art?.rangeMin).toBe(1);
    expect(art?.rangeMax).toBe(1);
    expect(art?.cost).toBe(0);
    expect(art?.weaponProhibit).toBe(1021); // 검(kind 1)만 허용 — 가정 비트 해석의 앵커 값
    // 사영 결손 정정 확인: 汎用設定의 Stand·기술 행의 Action이 슬림 사영에 실려야 필터가 돈다.
    expect(art?.skills[0]?.Stand).toBe(1); // 汎用設定
    expect(art?.skills[2]?.Action).toBe(1); // 기술 행(맨 뒤 = 최종 대입)
    expect(art?.skills[2]?.ActValues?.[0]).toBe("7"); // 攻撃回数 7 — 기본값 1을 이긴다
  });

  it("스타일 분기 — 竜族 직업이면 SID_マルスエンゲージ技_竜族(攻撃回数 9 변형)", () => {
    const art = emblemEngageArt("GID_マルス", "竜族スタイル", "ko");
    expect(art?.sid).toBe("SID_マルスエンゲージ技_竜族");
    expect(art?.skills.at(-1)?.ActValues?.[0]).toBe("9");
  });

  /**
   * ★특효의 원천은 **무기 EquipSids**다(레이피어 → 馬特効·鎧特効). 사영이 그 행을 안 실으면
   * 엔진 쪽 특효 판정(efficacy.test.ts)이 아무리 맞아도 **판에서는 영영 안 걸린다** —
   * m002 2회전의 소드나이트(기병 Attrs 2)가 그 자리다(2026-08-18 사용자 지적으로 점검).
   */
  it("마르스 인게이지 무기 = 레이피어 + 특효 스킬 사영(馬特効 2·鎧特効 4, 배율 3)", () => {
    const weapons = emblemEngageWeapons("GID_マルス", "ko");
    const rapier = weapons[0];
    expect(rapier?.kind).toBe(1);
    expect(rapier?.might).toBe(7);
    const sids = rapier?.sids?.map((r) => r.Sid);
    expect(sids).toEqual(["SID_馬特効", "SID_鎧特効"]);
    const horse = rapier?.sids?.find((r) => r.Sid === "SID_馬特効");
    expect([horse?.Efficacy, horse?.EfficacyValue]).toEqual([2, 3]);
  });

  it("특효 대상 판정용 attrs가 유닛에 실린다 — m002 소드나이트(기병) = 2", () => {
    const units = boardPropsFor("m002", "ko").units;
    const knights = units.filter((u) => u.attrs === 2);
    expect(knights.length).toBeGreaterThan(0);
  });

  /**
   * ★사영 → 엔진 **끝까지** 특효가 걸리는지 — 두 층이 각각 맞아도 사이에서 끊기면 판에서는 안 걸린다.
   * 레이피어(위력 7)로 기병(Attrs 2)을 치면 무기 위력만 ×3 = +14의 차이가 나야 한다.
   */
  it("레이피어 × 기병 = 무기 위력만 ×3 (사영 무기로 엔진 판정까지 관통)", async () => {
    const { createCalculator, forecastSide, toCombatant } = await import("@fesim/engine");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
    const rapier = emblemEngageWeapons("GID_マルス", "ko")[0]!;
    const map = { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } };
    const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
    const a = { ...base, id: "a", force: 0, x: 0, y: 0, weapon: rapier };
    const horse = { ...base, id: "h", force: 1, x: 1, y: 0, attrs: 2 };
    const foot = { ...base, id: "f", force: 1, x: 2, y: 0, attrs: 1 };
    const onHorse = forecastSide(calc, toCombatant(a, map), toCombatant(horse, map));
    const onFoot = forecastSide(calc, toCombatant(a, map), toCombatant(foot, map));
    expect(onFoot.damage).toBe(12); // 힘10 + 위력7 − 수5
    expect(onHorse.damage).toBe(26); // 힘10 + 위력7×3 − 수5
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

describe("script.items — ItemGain 아이템 사영 (MP3)", () => {
  it("챕터 Lua 폐포의 IID 전수를 채널·스냅숏으로 굳힌다 — 표에 없는 IID만 빠진다(정직 거부의 근거)", () => {
    // 왜 위험한가: 이벤트 ItemGain이 이 사영만 보고 소지품을 늘린다. 채널 판별이 setup 사영과
    // 어긋나면 런타임 지급 아이템이 초기 배치 아이템과 다른 물건이 된다(인덱스·위력 계약 붕괴).
    const board = boardPropsFor("s009", "ko");
    const pack = board.script?.items ?? {};
    expect(Object.keys(pack).length).toBeGreaterThan(0);
    // 여신상 = Kind 10 · AddTarget 0 · AddType/AddPower 0(매각 귀중품) → 맵 국면 효과 없음을 명시.
    expect(pack["IID_女神の像"]).toEqual({ kind: "none" });
  });

  it("무기·지팡이·사용형은 setup 사영과 같은 스냅숏을 준다(중복 구현 금지의 증거)", () => {
    const board = boardPropsFor("m004", "ko");
    const pack = board.script?.items ?? {};
    const u = { pid: "x", jid: "y", force: 0, x: 0, y: 0, level: { n: 1, h: 1, l: 1 }, items: [], sids: [] } as unknown as DisposUnit;
    for (const [iid, row] of Object.entries(pack)) {
      if (row.kind === "none") continue;
      const one = { ...u, items: [{ iid, drop: false }] } as DisposUnit;
      const mirror =
        row.kind === "weapon" ? attackWeapons(one, "ko")[0]
          : row.kind === "staff" ? staffItems(one, "ko")[0]
            : consumableItems(one, "ko")[0];
      expect(row.item).toEqual(mirror);
    }
  });
});

describe("hpStock 사영 — 다단 보스 (MP3)", () => {
  it("dispos HpStockCount가 보드 props까지 실린다 — 0은 생략(부활 거동은 미배선)", () => {
    // 왜 위험한가: 이벤트 UnitGetHpStock이 이 값으로 국면을 분기한다(e006 보스 다단 연출).
    // ☠값이 실려도 부활은 일어나지 않는다 — 장부 combat.hp-stock은 absent 그대로다.
    const board = boardPropsFor("e006", "ko");
    const stocked = board.units.filter((u) => u.hpStock !== undefined);
    expect(stocked.length).toBeGreaterThan(0);
    expect(stocked.every((u) => (u.hpStock ?? 0) > 0)).toBe(true);
    expect(board.units.find((u) => u.pid === "PID_E006_Boss")?.hpStock).toBe(3);
  });
});

describe("문장사 배지 사영 (엠블렘 초상·게이지)", () => {
  it("반지 장착 유닛은 gid를 싣고, 보드가 그 gid의 초상 경로를 한 번만 싣는다", () => {
    // 왜 위험한가: 배지의 얼굴 원천은 gid 하나뿐이다 — 유닛에 gid가 안 실리거나
    // godFaces에 그 gid가 빠지면 반지 유닛이 게이지만 남고 누구의 반지인지 사라진다.
    // ☠경로를 유닛마다 싣지 않는 것도 계약이다(같은 문자열 반복 = 챕터 JSON 예산 §11 지출).
    const props = boardPropsFor("g001", "ko");
    const ringed = props.units.filter((u) => u.gid !== undefined);
    expect(ringed.length).toBeGreaterThan(0);
    for (const u of ringed) {
      expect(u.engage).toBeDefined(); // gid가 실렸으면 게이지도 함께다
      expect(props.godFaces?.[u.gid!]).toMatch(/^\/fe17\/assets\/faces\/.+\.webp$/);
    }
    // 얼굴 경로는 유닛 사영에 없다 — 보드 단위 표가 유일한 소유자다
    expect(JSON.stringify(ringed)).not.toContain("assets/faces/");
  });

  it("장비 무기는 보드 JSON에 따로 실리지 않는다 — weapons[0]이 정본", () => {
    // 왜 위험한가: 같은 무기를 weapon과 weapons[0]으로 두 번 실어 e006.ko 기준 1.8KB gz를
    // 중복 지출했고, 그 탓에 유닛 필드 증설(gid)이 예산을 넘겼다. 둘로 갈리면 장비 해석도 갈린다.
    const props = boardPropsFor("m002", "ko");
    const armed = props.units.filter((u) => u.weapons !== undefined);
    expect(armed.length).toBeGreaterThan(0);
    expect(Object.keys(props.units[0]!)).not.toContain("weapon");
  });
});
