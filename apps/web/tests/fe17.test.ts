import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DisposUnit } from "@fesim/shared";
import { attackWeapons, bondScaffold, boardPropsFor, builderPropsFor, rankValue, chapterList, nextChapter, consumableItems, staffItems, emblemEngageArt, emblemEngagedSids, emblemEngageWeapons, emblemSyncSids, unitEngagedSkillRows, unitSkillRows, unitSynchroSkillRows, unitStats } from "../src/lib/fe17";
import { growthPath, mergeStatCap, STAT_KEYS, type GrowthPathJob, type GrowthPathResult } from "@fesim/engine";

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
   * ☠같은 결손의 두 번째 층 — 스크립트 엠블렘은 **받을 유닛을 모르는 자리**라 스타일 분기를 못 건다.
   * 그런데 迅走는 스타일마다 값이 다르다: 본체 이동 +5 · `SID_迅走_竜族` 이동 **+6**.
   * 기본 목록만 실으면 2회전 뤼미에르(竜族スタイル)가 영원히 +5를 받고, 숫자가 1 작을 뿐 오류가 없어
   * 아무도 못 찾는다. 사영은 치환표(원본 Sid → 변형 행)를 싣고 소비처가 unit.style로 고른다.
   */
  it("스타일 치환표 — 竜族スタイル이 받으면 SID_迅走_竜族(이동 +6)이 된다", () => {
    const sigurd = gods["GID_M002_シグルド"]!;
    const swap = sigurd.styles?.["竜族スタイル"];
    expect(swap?.["SID_迅走"]?.Sid).toBe("SID_迅走_竜族");
    expect(swap?.["SID_迅走"]?.["EnhanceValue.Move"]).toBe(6);
    // 갈리지 않는 스타일은 아예 안 싣는다(종별 선형 — 목록을 스타일마다 복제하면 8벌로 불어난다).
    expect(sigurd.styles?.["スタイル無し"]).toBeUndefined();
    // 치환되는 행만 든다 — 기본 목록 전량 복제가 아니다.
    expect(Object.keys(swap ?? {})).toEqual(["SID_迅走"]);
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

  it("boardPropsFor — 레벨업 rate 클래스 몫(growthJob = job.DiffGrow)이 자군에 실린다 (2026-08-31 수리)", () => {
    // 왜 위험한가: 이 필드가 없으면 엔진 levelUpGrowthRate가 개인 단독으로 조용히 강하해
    // 전 캠페인 레벨업이 클래스 성장분만큼 과소했다(오류도 경고도 없었다 — LEVELUP_GROW.md).
    // 앵커 = triangleattack Alear HP 레벨당 +0.7 = 개인 60 + 신룡의 아이 DiffGrow.Hp 10.
    const props = boardPropsFor("m003", "ko");
    const lueur = props.units.find((u) => u.pid === "PID_リュール")!;
    expect(lueur.growthJob).toEqual({ hp: 10, str: 10, mag: 0, dex: 10, spd: 15, lck: 5, def: 10, res: 10, bld: 5 });
    // 적·우군에는 싣지 않는다(레벨업이 자군 한정 — 챕터 JSON 예산).
    const enemy = props.units.find((u) => u.force !== 0)!;
    expect(enemy.growthJob).toBeUndefined();
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

/**
 * 장비 강화(items.json `Enhance.*`) 사영 — 층 사이를 잇는 자리.
 *
 * 왜 위험했나: 엔진은 `toCombatant`에서 `weapon.enhance`를 소비할 준비가 돼 있어도,
 * 이 어댑터가 안 실어 주면 값은 영원히 0이다. `Enhance.*`를 **도핑 아이템 전용**으로 오해해
 * 사영 자체가 없었고, 그래서 티르핑을 든 시구르드의 마방 +5가 어디에도 안 나타났다(m004에 실재).
 * 엔진 테스트는 enhance를 직접 넣으므로 영원히 그린이다 — 그 경계를 여기서 잡는다.
 */
describe("장비 Enhance 사영", () => {
  it("엠블렘 무기 티르핑이 마방 +5를 싣는다", () => {
    const [w] = attackWeapons(disposUnit({ items: [{ iid: "IID_シグルド_ティルフィング", drop: false }] }), "ko");
    expect(w?.enhance).toEqual({ res: 5 });
  });

  it("강화가 없는 평범한 무기는 enhance를 안 단다(스냅숏 군살 방지)", () => {
    const [w] = attackWeapons(disposUnit({ items: [{ iid: "IID_鉄の剣", drop: false }] }), "ko");
    expect(w?.enhance).toBeUndefined();
  });

  it("일반 상점 무기도 강화를 든다(호신 체술 = 수비 +5)", () => {
    const [w] = attackWeapons(disposUnit({ items: [{ iid: "IID_護身の法", drop: false }] }), "ko");
    expect(w?.enhance).toEqual({ def: 5 });
  });
});

/**
 * 무기 사영의 결손 2건 — 원본에 있는데 사영이 안 읽어 조용히 죽어 있던 필드들.
 * ☠Secure(무기 필살회피)는 엔진 combat.ts가 `武器必殺回避`로 **이미 소비 중**이라, 사영이 비면
 * 값이 늘 0이 되어 **예보 필살 확률이 과대**해진다 — 오류도 경고도 없이 수치만 틀린다.
 * Flag의 Engage 비트는 인게임이 엠블렘 무기를 시안으로 칠하는 판별 그 자체다
 * (ItemData.Flags.Engage = 128 · UnitItem.GetFontColor RVA 0x1F95D70).
 */
describe("무기 사영 — 필살회피·엠블렘 플래그", () => {
  it("Secure가 dodge로 실린다 — 가느다란 검 30", () => {
    const list = attackWeapons(disposUnit({ items: [{ iid: "IID_ほそみの剣", drop: false }] }), "ko");
    expect(list[0]?.dodge).toBe(30);
  });

  it("Secure가 없는 무기는 dodge를 싣지 않는다(용량 정책 — 0은 기본값)", () => {
    const list = attackWeapons(disposUnit({ items: [{ iid: "IID_鉄の剣", drop: false }] }), "ko");
    expect(list[0]?.dodge).toBeUndefined();
  });

  /** 엠블렘 무기 = Flag 128 비트. 마르스 레이피어 Flag=131(128+2+1). */
  it("엠블렘 무기에 engage 표식이 선다 — 목록에서 시안으로 갈리는 근거", () => {
    const rapier = emblemEngageWeapons("GID_マルス", "ko")[0];
    expect(rapier?.engage).toBe(true);
    const iron = attackWeapons(disposUnit({ items: [{ iid: "IID_鉄の剣", drop: false }] }), "ko")[0];
    expect(iron?.engage).toBeUndefined();
  });

  /**
   * ★사영 → 판정 관통. 층별로는 둘 다 그린이었다: 엔진은 주입된 `武器必殺回避`를 정확히 빼고,
   * 사영은 items.json을 정확히 읽는다. 그런데 **사이가 끊겨** 값이 늘 0이었다 —
   * 필살률이 조용히 과대 표시되고, 오류도 경고도 없어 예보를 눈으로 봐도 알 수 없다.
   * 정본 공식 = `必殺率計算 = 必殺値 - 相手の必殺回避`(calculator.json).
   */
  it("방어자 무기의 필살회피가 공격자 필살률을 깎는다 — 가느다란 검 30", async () => {
    const { createCalculator, forecastSide, toCombatant } = await import("@fesim/engine");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
    const map = { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } };
    const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
    const iron = attackWeapons(disposUnit({ items: [{ iid: "IID_鉄の剣", drop: false }] }), "ko")[0]!;
    const thin = attackWeapons(disposUnit({ items: [{ iid: "IID_ほそみの剣", drop: false }] }), "ko")[0]!;
    // 技 80 = 必殺値 40 — 낮은 技로는 양쪽 다 0으로 클램프돼 차이가 안 보인다(공식: int(技/2) + 武器必殺).
    const attacker = { ...base, id: "a", force: 0, x: 0, y: 0, weapon: iron, stats: { ...stats, dex: 80 } };
    const plain = { ...base, id: "p", force: 1, x: 1, y: 0, weapon: iron };
    const dodgy = { ...base, id: "d", force: 1, x: 1, y: 0, weapon: thin };

    const vsPlain = forecastSide(calc, toCombatant(attacker, map), toCombatant(plain, map));
    const vsDodgy = forecastSide(calc, toCombatant(attacker, map), toCombatant(dodgy, map));
    expect(thin.dodge).toBe(30);
    expect(vsPlain.critRate - vsDodgy.critRate).toBe(30);
  });

  // ☠랭크·설명문은 여기 싣지 않는다 — 같은 무기가 유닛마다 중복돼 보드 JSON 예산(50KB gz)을 먹고
  //   열람 경로(/s/)까지 따라간다. 소지품 화면 전용 사전으로 따로 낸다(제작 경로에서만 fetch).
});

/**
 * 인연(絆) 레벨 스케폴드 — ☠**비계**다. 진행 중 絆 레벨은 romfs·덤프 어디에도 없다
 * (dispos는 유닛 배치만 싣고, 絆는 플레이어 진행이 소유한다).
 * 사용자 지시(2026-08-19) = 경험치와 같은 문법으로 **유닛 레벨 / 2**를 쓰고,
 * 본편 문장사는 외전 클리어 전까지 **10에서 잠긴다**(클리어하면 상한이 풀린다).
 * 제거 조건 = 런(캠페인) 상태가 絆 레벨을 실제로 들고 다닐 때 그 값으로 교체.
 */
describe("인연 레벨 스케폴드", () => {
  it("레벨의 절반 — 경험치 스케폴드와 같은 문법", () => {
    expect(bondScaffold(2)).toBe(1);
    expect(bondScaffold(11)).toBe(5);
    expect(bondScaffold(20)).toBe(10);
  });

  it("외전 클리어 전에는 10에서 잠긴다", () => {
    expect(bondScaffold(30)).toBe(10);
    expect(bondScaffold(40)).toBe(10);
  });

  it("외전을 클리어하면 상한이 풀린다(絆 상한 20)", () => {
    expect(bondScaffold(30, true)).toBe(15);
    expect(bondScaffold(40, true)).toBe(20);
    expect(bondScaffold(99, true)).toBe(20);
  });

  it("1 미만으로 내려가지 않는다 — 반지를 낀 순간 絆는 1이다", () => {
    expect(bondScaffold(1)).toBe(1);
    expect(bondScaffold(0)).toBe(1);
  });

  /** ★인연 레벨이 실제로 패시브 수를 가른다 — 스케폴드가 사영까지 닿는지가 요점이다. */
  it("絆 레벨이 높을수록 싱크로 패시브가 누적된다", () => {
    const low = emblemSyncSids("GID_マルス", 1);
    const high = emblemSyncSids("GID_マルス", 10);
    expect(high.length).toBeGreaterThan(low.length);
  });
});

/**
 * ★문장사(엠블렘) 스탯 상승 — 싱크로 스킬의 `EnhanceValue.*`가 **스탯 스냅숏에 들어가야** 한다.
 * ☠종전에는 `staticEnhances(base, unitSkillRows(unit))`로 **유닛 자기 스킬만** 넣어서
 * 반지를 낀 유닛의 힘·기술·속도 보정이 통째로 빠졌다(마르스 絆1 = 力/技/速さ 각 +1).
 * 속도는 추격 임계(공격속도 차 5)를 직접 가르므로, 이 결손은 **판정까지 바꾼다** —
 * 화면에는 그냥 낮은 수치로 보일 뿐이라 눈으로는 못 잡는다.
 * 실기 앵커(2026-08-19 사용자 스크린샷) = 뤼에르&마르스 絆 Lv1, 속도 8 표시.
 */
describe("문장사 스탯 상승 사영", () => {
  it("싱크로 EnhanceValue가 스탯 스냅숏에 들어간다 — 마르스 絆1 = 힘·기술·속도 +1", () => {
    // 실기 앵커(2026-08-19 사용자 스크린샷) = 뤼에르&마르스 絆 Lv1, 철의 검 장비, **물공 12**.
    // 물공 = 힘 + 무기 위력(5)이므로 힘이 7이어야 12가 된다 — 싱크로 力＋１이 들어간 값이다.
    const board = boardPropsFor("m002", "ko");
    const ruell = board.units.find((u) => u.pid === "PID_リュール")!;
    expect(ruell.gid).toBe("GID_マルス");
    const bonus = (key: string) =>
      (ruell.synchroSkills ?? []).reduce((n, s) => n + Number(s[`EnhanceValue.${key}`] ?? 0), 0);
    expect(bonus("Str")).toBe(1); // 데이터가 실제로 +1을 들고 있다(전제)
    expect(ruell.stats?.l?.str).toBe(7); // ★스냅숏이 그 보정을 품는가 = 실기 물공 12의 근거
    expect(ruell.stats?.l?.dex).toBe(6);
  });

  it("반지를 안 낀 유닛에는 보정이 새지 않는다", () => {
    const board = boardPropsFor("m002", "ko");
    const noRing = board.units.find((u) => u.force === 0 && u.synchroSkills === undefined);
    if (noRing === undefined) return;
    expect(noRing.stats?.l?.str ?? 0).toBeGreaterThan(0);
  });
});

/**
 * GiveSids 해소 — ☠**층 사이**의 자리다. 엔진에는 스킬 표가 없어서(행은 유닛이 들고 다닌다)
 * 사영이 `GiveSids`(문자열)를 `Gives`(행)로 풀어 실어 보내지 않으면 부여층이 아무것도 못 붙인다.
 * 그때 나는 증상은 오류가 아니라 **"신속이 조용히 무발현"**이다 — 엔진 테스트는 자기 픽스처로 그린이라
 * 웹 경로만 죽는다(SKILL_ROW_FIELDS에서 Stand·Action·Order를 떨어뜨렸을 때와 같은 사고 유형).
 */
describe("슬림 사영 — 부여 사슬(GiveSids → Gives)", () => {
  it("SID_カウンター가 50% 행과 発動済み 래치까지 행으로 딸려 온다", () => {
    // ☠스타일 무관 직업으로 묻는다 — 竜族·隠密 직업은 분기 치환(GetStyleSkill)이 먼저 걸려
    //   본체가 아니라 변형이 실린다(그 갈래는 "스타일 분기 사영" 절이 소유한다).
    const rows = unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター"] }));
    const counter = rows.find((r) => r.Sid === "SID_カウンター");
    expect(counter?.Timing).toBe(4);
    const half = counter?.Gives?.find((r) => r.Sid === "SID_カウンター_ダメージ５０％");
    expect(half?.ActValues).toEqual(["0.5"]);
    expect(half?.Gives?.map((r) => r.Sid)).toEqual(["SID_神速発動済み"]);
  });

  /**
   * ★사영 → 엔진 **끝까지** 관통. 두 층이 각각 맞아도 사이에서 끊기면 판에서는 아무 일도 안 일어난다 —
   * 신속은 어휘·오더 큐·Timing·부여 넷 중 하나만 빠져도 **오류 없이** 종전 산출을 낸다.
   * 실기 앵커(뤼에르 인게이지 레이피어 = `8 + 4`)와 같은 모양: 추가타가 정확히 절반이어야 한다.
   */
  it("사영한 SID_カウンター로 엔진이 8 + 4를 낸다 (오더 큐·부여층 관통)", async () => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const reduce = createReducer(calc);
    const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
    const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
    const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
    // 기본 jid = JID_神竜ノ子(竜族スタイル)라 사영이 실어 보내는 것은 **SID_カウンター_竜族**이다 —
    // 실기 앵커(뤼에르)와 같은 행이고, 竜族 변형의 手番回数 +1·威力 * 0.5도 본체와 같은 값이다.
    const game = {
      turn: 1,
      phase: 0,
      difficulty: "n" as const,
      map: { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } },
      units: [
        { ...base, id: "a", force: 0, x: 0, y: 0, weapon: sword, skills: unitSkillRows(disposUnit({ sids: ["SID_カウンター"] })) },
        { ...base, id: "e", force: 1, x: 1, y: 0, weapon: sword },
      ],
      events: [],
    };
    const next = reduce(game, { type: "attack", unit: "a", target: "e" }, { next: () => 9999 });
    const strikes = next.events.filter((ev) => ev.type === "strike");
    expect(strikes.map((ev) => (ev.type === "strike" ? ev.kind : ""))).toEqual(["attack", "counter", "followUp"]);
    const damage = strikes.map((ev) => (ev.type === "strike" ? ev.damage : -1));
    expect(damage[2]).toBe(damage[0] / 2);
  });
});

/**
 * 스타일 분기(`SkillData.GetStyleSkill` 0x248D920)는 **기술만의 규칙이 아니다** —
 * `SkillArray.Commit`(0x2485A10)이 수집된 **모든 카테고리의 행**에 거는 파생이라
 * 개인·싱크로·인게이지 패시브가 전부 같은 치환을 탄다(il2cpp/SKILL_ENGINE.md §3 표 17행).
 * ☠왜 위험한가: 안 걸면 뤼에르(JID_神竜ノ子 = 竜族スタイル)가 마르스의 `SID_カウンター` **본체**를 받는다.
 *   手番回数 +1도 威力 * 0.5도 본체와 **똑같아서** 대미지로는 아무 차이가 안 보이는데,
 *   竜族 변형만 딸고 오는 HP 흡수(`SID_カウンター_竜族効果`)가 통째로 사라진다 —
 *   오류도 경고도 없는 조용한 결손이다(장부 skills.style-variant가 실측으로 단정한 자리:
 *   "M003 실측 신속 = SID_カウンター_竜族").
 */
describe("스타일 분기 사영 — 개인·싱크로·인게이지 패시브 (MP8 G1 3단계)", () => {
  it("竜族スタイル 직업은 SID_カウンター 대신 SID_カウンター_竜族을 받는다", () => {
    const rows = unitSkillRows(disposUnit({ sids: ["SID_カウンター"] })); // 기본 jid = JID_神竜ノ子
    const sids = rows.map((r) => r.Sid);
    expect(sids).toContain("SID_カウンター_竜族");
    expect(sids).not.toContain("SID_カウンター");
    // 竜族 변형만 HP 흡수(Timing 12)와 종료 래치를 딸고 온다 — 본체의 GiveSids는 50% 행 하나뿐이다.
    expect(rows.find((r) => r.Sid === "SID_カウンター_竜族")?.Gives?.map((r) => r.Sid)).toEqual([
      "SID_カウンター_ダメージ５０％",
      "SID_カウンター_竜族効果",
      "SID_カウンター_竜族効果_発動終了チェック",
    ]);
  });

  it("스타일 열이 비어 있으면 본체 그대로 — 連携スタイル은 SID_カウンター에 CooperationSkill이 없다", () => {
    // ☠빈 열을 "치환 실패"로 읽어 임의 행을 고르면 조용히 다른 스킬이 붙는다. 없으면 본체가 정답이다.
    const rows = unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター"] }));
    expect(rows.map((r) => r.Sid)).toContain("SID_カウンター");
    // 隠密스타일은 열이 있으므로 그쪽 변형으로 갈린다(같은 기전이 스타일마다 다른 답을 낸다는 증거).
    const covert = unitSkillRows(disposUnit({ jid: "JID_シーフ", sids: ["SID_カウンター"] }));
    expect(covert.map((r) => r.Sid)).toContain("SID_カウンター_隠密");
  });

  it("인게이지 패시브 = 뤼에르+마르스의 engagedSkills가 竜族 변형을 싣는다", () => {
    const rows = unitEngagedSkillRows(disposUnit({ gid: "GID_マルス" }), 1) ?? [];
    expect(rows.map((r) => r.Sid)).toContain("SID_カウンター_竜族");
    // ★보드 사영까지 관통 — 함수만 맞고 보드가 다른 인자로 부르면 판에서는 그대로 본체가 실린다.
    const lueur = boardPropsFor("m003", "ko").units.find((u) => u.pid === "PID_リュール");
    expect(lueur?.style).toBe("竜族スタイル");
    expect(lueur?.engagedSkills?.map((r) => r.Sid)).toContain("SID_カウンター_竜族");
  });

  it("싱크로 패시브도 같은 분기 — 카무이 絆1 SID_竜脈 → SID_竜脈_竜族", () => {
    const rows = unitSynchroSkillRows(disposUnit({ gid: "GID_カムイ" }), 1) ?? [];
    expect(rows.map((r) => r.Sid)).toContain("SID_竜脈_竜族");
    expect(rows.map((r) => r.Sid)).not.toContain("SID_竜脈");
  });
});

/**
 * ☠Order는 **웹 사영만** 잃을 수 있는 정렬 키다 — 엔진 테스트는 자기 픽스처로 Order를 직접 넣으므로
 * 사영이 이 필드를 떨어뜨려도 영원히 그린이고 판에서만 순서가 배열 순서로 강하한다.
 * 실제 갈리는 자리 = Timing 3의 `SID_切り返し`(Order -10, `手番回数 = 2`)와
 * `SID_追撃不可`(Order 50, `= min(手番回数,1)`) — 순서가 뒤집히면 추격 불가가 무력화된다.
 */
describe("Order 사영 — 정렬 키의 층 사이 결손", () => {
  it("기본값(0)은 안 싣고, 음수·양수 Order는 그대로 싣는다", () => {
    const rows = unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター", "SID_切り返し", "SID_追撃不可"] }));
    // Order 0 = 엔진 기본값(`skill.Order ?? 0`) — 유닛마다 반복되는 0은 보드 JSON 예산만 먹는다.
    expect(rows.find((r) => r.Sid === "SID_カウンター")?.Order).toBeUndefined();
    expect(rows.find((r) => r.Sid === "SID_切り返し")?.Order).toBe(-10);
    expect(rows.find((r) => r.Sid === "SID_追撃不可")?.Order).toBe(50);
    // 부여 사슬(Gives)도 같은 규칙 — 신속의 50% 행은 Order 10이라 실려야 한다.
    const half = rows.find((r) => r.Sid === "SID_カウンター")?.Gives?.[0];
    expect(half?.Sid).toBe("SID_カウンター_ダメージ５０％");
    expect(half?.Order).toBe(10);
  });

  it("Cycle도 같은 규칙 — 0(전투 로컬)은 생략, 비0(영속)은 싣는다", () => {
    // ☠Cycle을 생략만 하고 엔진 기본값이 0이 아니면 영속 부여가 전투 사본에 섞인다(`row.Cycle ?? 0`이 계약).
    const rows = unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター"] }));
    expect(rows.find((r) => r.Sid === "SID_カウンター")?.Cycle).toBeUndefined();
  });
});

/**
 * ★층 사이 — 예보 패널(`combatForecast`)은 리듀서와 **다른 코드**로 타격 순서를 돈다.
 * 각 층만 보는 테스트로는 이 경계가 영원히 안 보인다: 리듀서 테스트도 예보 테스트도 각자 그린인데
 * 판에서는 예보 숫자와 실제 결과가 갈린다. 여기서 양끝 값으로 한 번 관통시킨다.
 */
describe("예보 ↔ 리듀서 — 오더 순서 관통 (MP8 G1 3단계)", () => {
  const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
  const gameWith = (aSkills?: ReturnType<typeof unitSkillRows>, aStats = stats) => ({
    turn: 1,
    phase: 0,
    difficulty: "n" as const,
    map: { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } },
    units: [
      { ...base, stats: aStats, id: "a", force: 0, x: 0, y: 0, weapon: sword, ...(aSkills === undefined ? {} : { skills: aSkills }) },
      { ...base, id: "e", force: 1, x: 1, y: 0, weapon: sword },
    ],
    events: [],
  });

  it("배율 없는 판에서는 예보 잔여 HP = 리듀서 잔여 HP (추격 포함)", async () => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const { combatForecast } = await import("../src/components/BoardIsland");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    // 攻撃速度差 >= 5 = 追撃条件 → 手番回数 2. 예보와 리듀서가 같은 오더 수를 봐야 한다.
    const fast = { ...stats, spd: 20 };
    const game = gameWith(undefined, fast);
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    // ☠난수 0 = 전 타격 명중(필살률 0이라 필살은 안 뜬다). 예보는 **전 타격 명중 가정**이므로
    //   이 조건에서만 두 층을 값으로 맞댈 수 있다 — 빗나감이 섞이면 갈린 원인이 순서인지 명중인지 못 가른다.
    const next = createReducer(calc)(game as never, { type: "attack", unit: "a", target: "e" }, { next: () => 0 });
    expect(fc.attack?.battleTimes).toBe(2);
    expect(fc.targetHp).toBe(next.units.find((u) => u.id === "e")!.hp);
    expect(fc.selfHp).toBe(next.units.find((u) => u.id === "a")!.hp);
  });

  /**
   * ☠이 자리는 **결손 박제였다**(`expect(fc.targetHp).toBeLessThan(actual)` — 예보 10 vs 리듀서 15).
   * 결손의 정체 = 예보가 오더별 배율을 모른 채 `damage x battleTimes`를 그린 것이다. 신속 판에서
   * 마지막 오더만 `威力 * 0.5`인데 예보는 전 오더를 만배로 봐, 방향이 "격파한다" 쪽으로 과대했다 —
   * 확정타로 읽고 지르면 적이 산다(경고 표시도 없다).
   * 무엇이 닫았나 = 엔진 공용 오더 목록(`battlePlan`) 신설 + 예보·리듀서가 **그 하나만** 소비(MP8 G1 3단계).
   */
  it("신속(오더별 威力 * 0.5)에서도 예보 잔여 HP = 리듀서 잔여 HP", async () => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const { combatForecast } = await import("../src/components/BoardIsland");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const skills = unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター"] }));
    const game = gameWith(skills);
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    // ☠난수 0 = 전 타격 명중(필살률 0이라 필살은 안 뜬다). 예보는 **전 타격 명중 가정**이므로
    //   이 조건에서만 두 층을 값으로 맞댈 수 있다 — 빗나감이 섞이면 갈린 원인이 순서인지 명중인지 못 가른다.
    const next = createReducer(calc)(game as never, { type: "attack", unit: "a", target: "e" }, { next: () => 0 });
    expect(fc.attack?.battleTimes).toBe(2);
    expect(fc.targetHp).toBe(15); // 30 - 10 - (10 * 0.5)
    expect(fc.targetHp).toBe(next.units.find((u) => u.id === "e")!.hp);
    expect(fc.selfHp).toBe(next.units.find((u) => u.id === "a")!.hp);
  });

  /**
   * ☠체인어택은 **오더 목록 밖의 타격**이라 예보가 통째로 빼고 있었다 — 실측으로 기보 138 attack 스텝 중
   *   9건에서 예상 잔여 HP가 2~4 과대였고 화면엔 체인 표시가 하나도 없었다. 방향이 "격파한다" 쪽이 아니라
   *   "안 죽는다" 쪽으로 틀리는 자리라 더 조용하다(적이 예보보다 먼저 죽어도 아무도 안 따진다).
   * ★정본도 안 뺀다: 맵 예보는 `CalcSimulation`(명중 확정·필살 없음)으로 **체인 포함 전투를 통째로 돌린**
   *   결과 HP를 읽는다(MapUIGauge.CalcBattleInfoForNormal 0x2025920 → BattleCalculator 0x246D610).
   */
  it("★체인어택도 관통 — 예보 잔여 HP = 리듀서 잔여 HP", async () => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const { combatForecast } = await import("../src/components/BoardIsland");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const plain = gameWith();
    // 연계 스타일 아군이 대상 사거리 안에 서면 본공격 **앞에** 체인 타격이 한 번 들어간다(battle.ts).
    const game = {
      ...plain,
      units: [...plain.units, { ...base, id: "c", force: 0, x: 2, y: 0, weapon: sword, style: "連携スタイル" }],
    };
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    expect(fc.chain).toBe(1);
    expect(fc.chainDamage).toBeGreaterThan(0); // チェインアタック威力 = max(相手のMaxHP*0.1, 1)
    const next = createReducer(calc)(game as never, { type: "attack", unit: "a", target: "e" }, { next: () => 0 });
    expect(fc.targetHp).toBe(next.units.find((u) => u.id === "e")!.hp);
    expect(fc.selfHp).toBe(next.units.find((u) => u.id === "a")!.hp);
  });

  /**
   * ☠**잠복 결손** — 예보는 `toCombatant`에 `terrainPatches`를 안 넘기고 리듀서는 넘겼다.
   * 현행 5챕터에 `terrainSet` 이벤트가 0건이라 기보 대조로도 안 잡힌다: 그 이벤트를 쓰는 챕터가
   * 열리는 날 **예보만 조용히 옛 지형으로** 계산한다(오류도 경고도 없다). 그래서 여기서 박제한다.
   */
  it("★런타임 교체 지형(terrainPatches)도 관통 — 예보가 리듀서와 같은 지형 보정을 본다", async () => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const { combatForecast } = await import("../src/components/BoardIsland");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const plain = gameWith();
    // 대상 칸을 지형방어 5짜리로 갈아끼운다(TerrainSet 이벤트가 하는 일).
    const game = { ...plain, terrainPatches: [{ x: 1, y: 0, tid: "TID_test", cell: { avoid: 0, def: 5 } }] };
    const bare = combatForecast(plain as never, plain.units[0] as never, plain.units[1] as never, 1);
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    expect(fc.attack!.damage).toBe(bare.attack!.damage - 5); // 패치를 못 보면 두 값이 같다
    const next = createReducer(calc)(game as never, { type: "attack", unit: "a", target: "e" }, { next: () => 0 });
    expect(fc.targetHp).toBe(next.units.find((u) => u.id === "e")!.hp);
  });
});

/**
 * ★기보 `kind`와 **화면 이름**이 갈리는 자리. 기보는 호환 불변식이라 오더 인덱스 1을 무조건
 * `followUp`으로 적는데, 신속(`SID_カウンター` = 手番回数 +1) 판의 두 번째 타격은 추격이 아니다.
 * ☠왜 위험한가: 사용자가 실기 스크린샷으로 보고한 바로 그 장면(뤼에르 8 + 4, 追撃条件 거짓)에서
 *   UI가 "(추격)"을 내보냈다. 숫자는 맞고 이름만 틀린 조용한 오류라 아무도 결손으로 안 잡는다 —
 *   그 로그를 근거로 追撃条件(攻撃速度差 >= 5)을 역산하면 판독이 통째로 어긋난다.
 */
describe("표시 라벨 — 추격 vs 추가타 (MP8 G1 3단계-A)", () => {
  const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
  const gameWith = (over: { aStats?: typeof stats; eStats?: typeof stats; aSkills?: ReturnType<typeof unitSkillRows> }) => ({
    turn: 1,
    phase: 0,
    difficulty: "n" as const,
    map: { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } },
    units: [
      { ...base, stats: over.aStats ?? stats, id: "a", force: 0, x: 0, y: 0, weapon: sword, ...(over.aSkills === undefined ? {} : { skills: over.aSkills }) },
      { ...base, stats: over.eStats ?? stats, id: "e", force: 1, x: 1, y: 0, weapon: sword },
    ],
    events: [],
  });
  const strike = async (game: ReturnType<typeof gameWith>) => {
    const { createCalculator, createReducer } = await import("@fesim/engine");
    const calc = createCalculator(
      JSON.parse(readFileSync(new URL("../../../data/fe17/tables/calculator.json", import.meta.url), "utf-8")),
    );
    const next = createReducer(calc)(game as never, { type: "attack", unit: "a", target: "e" }, { next: () => 0 });
    return next.events.filter((ev): ev is Extract<typeof ev, { type: "strike" }> => ev.type === "strike");
  };

  it("신속 판의 두 번째 타격은 기보 followUp이지만 화면에는 추가타로 뜬다", async () => {
    // 기본 jid = JID_神竜ノ子(竜族スタイル) — 실기 앵커(뤼에르 8 + 4)와 같은 행(SID_カウンター_竜族)이다.
    const { displayKindOf } = await import("../src/components/BoardIsland");
    const game = gameWith({ aSkills: unitSkillRows(disposUnit({ sids: ["SID_カウンター"] })) });
    const hits = await strike(game);
    expect(hits.map((h) => h.kind)).toEqual(["attack", "counter", "followUp"]); // 기보는 안 바뀐다
    expect(displayKindOf(game as never, hits[2]!)).toBe("extra");
  });

  it("追撃条件(攻撃速度差 >= 5)이 참인 판은 그대로 추격이다", async () => {
    const { displayKindOf } = await import("../src/components/BoardIsland");
    const game = gameWith({ aStats: { ...stats, spd: 20 } });
    const hits = await strike(game);
    expect(hits.map((h) => h.kind)).toEqual(["attack", "counter", "followUp"]);
    expect(displayKindOf(game as never, hits[2]!)).toBe("followUp");
  });

  it("반격측도 같은 규칙 — 받는 쪽이 빠르면 counterFollowUp이 그대로 산다", async () => {
    // ☠개시측 판별이 뒤집히면 여기서만 갈린다(반격 오더의 攻撃速度差는 부호가 반대다).
    const { displayKindOf } = await import("../src/components/BoardIsland");
    const game = gameWith({ eStats: { ...stats, spd: 20 } });
    const hits = await strike(game);
    expect(hits.map((h) => h.kind)).toEqual(["attack", "counter", "counterFollowUp"]);
    expect(displayKindOf(game as never, hits[2]!)).toBe("counterFollowUp");
  });
});

/**
 * ★관통 앵커 — **재생 기보와 표시층 사이**. 두 층 각각은 멀쩡한데 사이가 끊겨 있었다.
 *
 * ☠왜 위험했나: 追撃条件은 `攻撃速度 = 速さ - max(武器の重さ - 体格, 0)` 위에 서 있어서 **무기가 바뀌면
 *   기저 手番回数가 뒤집힌다**. `displayKindOf`는 무기를 안 받고 `before` 유닛의 **전투 직전 장비**로
 *   근사했는데, m001 step34는 액션이 무기 인덱스 1(레이피어)을 지정한 전환 판이라 근사가 철의 검을 봤다.
 *   그 결과 진짜 추격이 화면에 "(추가타)"로 나갔다 — 숫자는 맞고 이름만 틀린 조용한 오류다.
 *   ☠m001은 맵 진입 시 **자동 재생되는 기본 기보**라 그 화면이 그대로 사용자에게 나간다.
 * ★기보를 직접 되읽는 이유 = 픽스처로 옮겨 적으면 기보가 다시 만들어질 때 테스트만 옛 판을 붙든다.
 */
describe("★앵커 m001 step34 — 무기 전환이 낀 추격 판", () => {
  it("액션이 지정한 무기(레이피어)로 판정해야 추격이 추격으로 뜬다", async () => {
    const { parseEphemeris } = await import("@fesim/shared");
    const { actionWeapon, displayKindOf } = await import("../src/components/BoardIsland");
    const { createBoardStore, replayer } = await import("../src/lib/boardStore");
    const { eventWiringFor } = await import("../src/lib/eventWiring");
    const eventsMod = await import("@fesim/engine/events");

    const file = parseEphemeris(
      readFileSync(new URL("../../../data/fe17/replays/m001.eph.json", import.meta.url), "utf-8"),
    );
    const props = boardPropsFor(file.chapter.cid, "ko");
    const commons = Object.fromEntries(
      (props.script?.commons ?? []).map((n) => [
        n,
        readFileSync(new URL(`../../../data/fe17/scripts/${n}.lua`, import.meta.url), "utf-8"),
      ]),
    );
    const store = createBoardStore(props, { file }, file.setup, eventWiringFor(props, eventsMod, commons));
    const session = store.getState().replay!;
    // ☠스텝 번호를 박제하지 않는다(rules/seams.md §6 — 기보가 다시 만들어지면 앵커가 사라진다).
    //   발현 조건(비장비 무기 지정 + 추격 타격)으로 판을 찾는다 — 없으면 그때가 진짜 레드다.
    const idx = file.log.findIndex(
      (s) =>
        s.action.type === "attack" &&
        ((s.action as { weapon?: number }).weapon ?? 0) > 0 &&
        (s.events ?? []).some((e) => e.type === "strike" && e.kind === "followUp"),
    );
    expect(idx).toBeGreaterThan(-1);
    const step = file.log[idx]!;

    const before = replayer.stateAt(session.timeline, idx);
    const actor = before.units.find((u) => u.id === (step.action as { unit: string }).unit);
    const equipped = actionWeapon(before, step.action);
    expect(equipped?.weapon.name).toBeDefined();
    expect(equipped?.weapon.name).not.toBe(actor?.weapon?.name); // 전환이 낀 판이어야 결함이 발현한다

    const hits = (step.events ?? []).filter(
      (e): e is Extract<typeof e, { type: "strike" }> => e.type === "strike",
    );
    const followUp = hits.find((h) => h.kind === "followUp")!;
    expect(displayKindOf(before, followUp, equipped)).toBe("followUp");
    // 종전 근사(무기 미전달) — 같은 타격이 추격 아닌 것으로 강하한다. 이 줄이 결함의 실물이다.
    expect(displayKindOf(before, followUp)).not.toBe("followUp");
  }, 30000);
});

/**
 * ☠`×2`는 **같은 대미지를 두 번**으로 읽힌다 — 신속 판(8 + 4)에서 그 읽기는 총합을 과대하게 만든다.
 * 잔여 HP 칸은 맞아도 대미지 칸이 혼자 거짓말을 하는 자리라, 사용자가 대미지 칸만 보고 지르면 적이 산다.
 */
describe("예보 대미지 표기 — 오더별로 다르면 ×N을 안 쓴다 (MP8 G1 3단계-A)", () => {
  const stats = { hp: 30, str: 10, mag: 0, dex: 10, spd: 10, lck: 5, def: 5, res: 5, bld: 5 };
  const sword = { might: 5, hit: 100, crit: 0, weight: 5, kind: 1, rangeMin: 1, rangeMax: 1 };
  const base = { hp: 30, stats, level: 1, exp: 0, movePoints: 4, moveType: "foot" as const, acted: false, dead: false, broken: false };
  const gameWith = (aStats: typeof stats, aSkills?: ReturnType<typeof unitSkillRows>) => ({
    turn: 1,
    phase: 0,
    difficulty: "n" as const,
    map: { width: 4, height: 1, costs: { foot: [[1, 1, 1, 1]] } },
    units: [
      { ...base, stats: aStats, id: "a", force: 0, x: 0, y: 0, weapon: sword, ...(aSkills === undefined ? {} : { skills: aSkills }) },
      { ...base, id: "e", force: 1, x: 1, y: 0, weapon: sword },
    ],
    events: [],
  });

  it("배율이 같은 추격 판은 종전대로 ×2", async () => {
    const { combatForecast, strikeSuffix } = await import("../src/components/BoardIsland");
    const game = gameWith({ ...stats, spd: 20 });
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    expect(fc.attack?.damages).toEqual([10, 10]);
    expect(strikeSuffix(fc.attack!.damages)).toBe("×2");
  });

  it("신속 판은 두 번째 오더가 절반이라 +5로 적는다", async () => {
    const { combatForecast, strikeSuffix } = await import("../src/components/BoardIsland");
    const game = gameWith(stats, unitSkillRows(disposUnit({ jid: "JID_ソードファイター", sids: ["SID_カウンター"] })));
    const fc = combatForecast(game as never, game.units[0] as never, game.units[1] as never, 1);
    expect(fc.attack?.damages).toEqual([10, 5]);
    expect(strikeSuffix(fc.attack!.damages)).toBe("+5");
    // 한 번뿐인 오더에는 아무것도 안 붙는다(종전과 같다).
    expect(strikeSuffix([10])).toBe("");
  });
});

/**
 * 캐릭터 빌더 사영(builderPropsFor — avg_stats_builder B2).
 * 왜 위험한가: 로스터·전용직 판정이 데이터 규칙(joins 역참조·Flag·승급망)에 걸려 있어
 * 규칙이 어긋나면 빌더 표가 조용히 사람을 빠뜨리거나 DLC 직업을 섞는다.
 */
describe("builderPropsFor — 캐릭터 빌더 사영", () => {
  const props = builderPropsFor("ko");

  it("로스터 41명(본편 36 + 사룡의 장 5 — DLC 해제 2026-08-31) · 합류순(뤼에르 선두, 외전은 개방 시점 삽입)", () => {
    expect(props.chars).toHaveLength(41);
    expect(props.chars.slice(-5).map((c) => c.pid)).toEqual([
      "PID_エル", "PID_ラファール", "PID_セレスティア", "PID_グレゴリー", "PID_マデリーン",
    ]);
    expect(props.chars[0]!.pid).toBe("PID_リュール");
    const pids = props.chars.map((c) => c.pid);
    // 장(s001, 개방 = M005 클리어)은 m004 합류(루이)와 m006 합류(유나카) 사이.
    expect(pids.indexOf("PID_ジャン")).toBeGreaterThan(pids.indexOf("PID_ルイ"));
    expect(pids.indexOf("PID_ジャン")).toBeLessThan(pids.indexOf("PID_ユナカ"));
  });

  it("뤼에르 개인 성장률 실값 + 얼굴 직결 + 전원 이름·얼굴 보유", () => {
    const lueur = props.chars[0]!;
    expect(lueur.personGrowth).toEqual({ hp: 60, str: 35, mag: 20, dex: 45, spd: 50, lck: 25, def: 40, res: 25, bld: 5 });
    expect(lueur.joinLevel).toBe(1);
    expect(lueur.internalOffset).toBe(0);
    for (const c of props.chars) {
      expect(c.name).not.toMatch(/^PID_/);
      expect(props.joinJobs[c.joinJid]).toBeDefined();
    }
    // 얼굴 전원 보유 — 라팔 결손은 베이크 필터(챕터 출현 유닛 한정)가 원인이었고
    // bake_roster_faces 보강으로 해소됐다(스프라이트 Rafale는 번들에 실재). 재발 = 파이프라인 회귀.
    expect(props.chars.filter((c) => c.face === undefined).map((c) => c.pid)).toEqual([]);
  });

  it("장(Jean)만 努力の才(Work=2)를 workSkills로 든다", () => {
    const jean = props.chars.find((c) => c.pid === "PID_ジャン")!;
    expect(jean.workSkills?.map((s) => s.Sid)).toEqual(["SID_努力の才"]);
    expect(props.chars.filter((c) => c.workSkills !== undefined)).toHaveLength(1);
  });

  it("직업 드롭다운 = 범용 21 + 전용 14 (인챈트·메이지캐넌·특수직 시프 + 전용 특수직 5 포함, 2026-08-31)", () => {
    expect(props.targetJobs).toHaveLength(35);
    const jids = props.targetJobs.map((j) => j.jid);
    expect(jids).toContain("JID_セイジ");
    expect(jids).toContain("JID_エンチャント");
    expect(jids).toContain("JID_マージカノン");
    const dragonKing = props.targetJobs.find((j) => j.jid === "JID_神竜ノ王")!;
    expect(dragonKing.uniquePid).toBe("PID_リュール");
    expect(dragonKing.name).toBe("신룡의 왕");
    const uniques = props.targetJobs.filter((j) => j.uniquePid !== undefined);
    expect(uniques).toHaveLength(14);
    const sage = props.targetJobs.find((j) => j.jid === "JID_セイジ")!;
    expect(sage.uniquePid).toBeUndefined();
    expect(sage.name).toBe("세이지"); // 헤더 성장률 행 직업명의 데이터 정본(로케일명)
  });

  it("내부 레벨 base = person → job 폴백 (사용자 앵커: 모브 = 20 + 12 − 1 = 31)", () => {
    const mauvier = props.chars.find((c) => c.pid === "PID_モーヴ")!;
    expect(mauvier.joinLevel).toBe(12);
    expect(mauvier.internalOffset).toBe(20);
    const gregory = props.chars.find((c) => c.pid === "PID_グレゴリー")!;
    expect(gregory.internalOffset).toBe(20);
  });

  /**
   * 왜 위험한가: 명단은 pid 문자열 직결이라 오타 하나면 그 캐릭터가 조용히 필터를 새어 나간다 —
   * 스포일러 방지는 새는 순간 기능 전체가 무의미해지므로 명단 전체를 박제한다.
   * 2026-08-31 재지정: 스포일러(모브·베일)와 DLC 사룡의 장 5인은 **별도 체커** — 표식도 갈린다.
   */
  it("스포일러 표식 = 본편 후반 2인(모브·베일) · DLC 표식 = 사룡의 장 5인 (2026-08-31 분리)", () => {
    expect(props.chars.filter((c) => c.spoiler === true).map((c) => c.pid)).toEqual([
      "PID_モーヴ", "PID_ヴェイル",
    ]);
    expect(props.chars.filter((c) => c.dlc === true).map((c) => c.pid)).toEqual([
      "PID_エル", "PID_ラファール", "PID_セレスティア", "PID_グレゴリー", "PID_マデリーン",
    ]);
  });

  /**
   * 왜 위험한가: 로케일 사전은 names/<locale>.json → DICTS → label 3층 배선이라
   * 한 층이 빠져도 pid 폴백으로 조용히 렌더된다 — ja 추가(2026-08-31 en·ja·ko)를 관통으로 박제.
   */
  it("ja 로케일 — 빌더 사영이 일본어 이름을 낸다", () => {
    const ja = builderPropsFor("ja");
    expect(ja.chars[0]!.name).toBe("リュール");
    expect(ja.targetJobs.find((j) => j.jid === "JID_セイジ")!.name).toBe("セイジ");
  });

  it("성옥의 가호 행(Work 3 · +15)이 props에 실린다 — 체커의 데이터 정본", () => {
    expect(props.starsphere?.Work).toBe(3);
    expect(props.starsphere?.WorkOperation).toBe("+");
    expect(props.starsphere?.WorkValue).toBe(15);
  });
});

/**
 * B5 대조 표본 — triangleattack Average Stats(Fixed mode·Show decimals) Alear 열.
 * 외부 참고 정본(설계 결정 2026-08-31: 어긋나면 우리 데이터가 진실 — 차이는 보고만).
 * 사영(builderPropsFor) → 엔진(growthPath) → 표시값(stats + acc/100)의 관통 앵커라서
 * 어느 층이 바뀌어도 소수부 단위로 깨진다(합산 rate·acc 초기값·전직 Base 교체를 한 번에 잡는다).
 */
describe("B5 대조 표본 — Alear 소수부까지", () => {
  const props = builderPropsFor("ko");
  const alear = props.chars[0]!;
  const run = (target: GrowthPathJob, targetInternal: number): GrowthPathResult =>
    growthPath({
      joinJob: { ...props.joinJobs[alear.joinJid]!, limit: mergeStatCap(props.joinJobs[alear.joinJid]!.limit, alear.personLimit) },
      targetJob: { ...target, limit: mergeStatCap(target.limit, alear.personLimit) },
      joinLevel: alear.joinLevel,
      internalOffset: alear.internalOffset,
      personGrowth: alear.personGrowth,
      personOffset: alear.personOffset,
      targetInternal,
    });
  const display = (r: GrowthPathResult): Record<string, number> =>
    Object.fromEntries(STAT_KEYS.map((k) => [k, r.stats[k] + r.acc[k] / 100]));

  it("합류 초기 행(신룡의 아이 Lv1) = 22.6/6.35/0.2/5.45/7.5/5.25/5.4/3.25/4.05", () => {
    const d = display(run(props.joinJobs[alear.joinJid]!, alear.internalOffset + alear.joinLevel - 1));
    expect(d["hp"]).toBeCloseTo(22.6, 5);
    expect(d["str"]).toBeCloseTo(6.35, 5);
    expect(d["mag"]).toBeCloseTo(0.2, 5);
    expect(d["dex"]).toBeCloseTo(5.45, 5);
    expect(d["spd"]).toBeCloseTo(7.5, 5);
    expect(d["lck"]).toBeCloseTo(5.25, 5);
    expect(d["def"]).toBeCloseTo(5.4, 5);
    expect(d["res"]).toBeCloseTo(3.25, 5);
    expect(d["bld"]).toBeCloseTo(4.05, 5);
  });

  it("내부 10 전직 직후 행(신룡의 왕 Lv1) = 30.9/12.4/3/12.4/14.35/8.95/10.9/8.4/7.95", () => {
    const target = props.targetJobs.find((j) => j.jid === "JID_神竜ノ王")!;
    const r = run(target, 9); // 0기점 — triangleattack 표기 Lv1^(9)와 동일
    expect(r.promoted).toBe(true);
    const d = display(r);
    expect(d["hp"]).toBeCloseTo(30.9, 5);
    expect(d["str"]).toBeCloseTo(12.4, 5);
    expect(d["mag"]).toBeCloseTo(3, 5);
    expect(d["dex"]).toBeCloseTo(12.4, 5);
    expect(d["spd"]).toBeCloseTo(14.35, 5);
    expect(d["lck"]).toBeCloseTo(8.95, 5);
    expect(d["def"]).toBeCloseTo(10.9, 5);
    expect(d["res"]).toBeCloseTo(8.4, 5);
    expect(d["bld"]).toBeCloseTo(7.95, 5);
  });
});

describe("builderPropsFor.weapons — 목록 불변식(2026-08-31)", () => {
  /**
   * 왜 위험한가: 엠블렘 무기 변형(접두·通常·챕터판)이 같은 표시명으로 목록에 줄지어 서고,
   * 정렬이 흔들리면 "상점 기본무기 약함→강함, 유니크·DLC 후열"이라는 사용자 규약이 조용히 깨진다.
   */
  it("표시명 중복 없음 · 문장사(엠블렘) 무기 제외 · 상점 전열 · 상점 무기군 안에서 랭크 오름차순", () => {
    const { weapons } = builderPropsFor("ko");
    const names = weapons.map((w) => w.name);
    expect(new Set(names).size).toBe(names.length);
    // 엠블렘 무기(Flag Engage=128)는 엔게이지 상태 한정이라 상시 장비 목록 밖(2026-08-31 사용자 지시).
    expect(weapons.every((w) => w.engage !== true)).toBe(true);
    expect(names).not.toContain("라그넬");
    const firstNonShop = weapons.findIndex((w) => w.shop !== true);
    expect(weapons.slice(firstNonShop).every((w) => w.shop !== true)).toBe(true);
    // 특효(2026-08-31) — EquipSids의 Efficacy 스킬을 아이콘·설명과 함께 싣는다.
    // 배선이 한 층이라도 끊기면(스킬 표·IconLabel·베이크) 특효 표기가 조용히 사라진다.
    const armorslayer = weapons.find((w) => w.name === "아머 킬러")!;
    expect(armorslayer.efficacies).toHaveLength(1);
    expect(armorslayer.efficacies![0]!.kind).toBe("Armor");
    expect(armorslayer.efficacies![0]!.icon).toContain("/assets/efficacy/Armor.webp");
    expect(armorslayer.efficacies![0]!.help).toContain("중갑");
    const ironBow = weapons.find((w) => w.name === "철의 활")!;
    expect(ironBow.efficacies![0]!.kind).toBe("Fly");
    const ironSword = weapons.find((w) => w.name === "철의 검")!;
    expect(ironSword.efficacies).toBeUndefined();
    const shopSwords = weapons.filter((w) => w.shop === true && w.kind === 1);
    for (let i = 1; i < shopSwords.length; i++) {
      expect(rankValue(shopSwords[i]!.rank)).toBeGreaterThanOrEqual(rankValue(shopSwords[i - 1]!.rank));
    }
  });
});

describe("builderPropsFor.engraves — 각인 사영(2026-08-31)", () => {
  /**
   * 왜 위험한가: 각인 목록은 gods.json에서 "각인 필드 비영 + 대표 신장(Gbid)" 필터로 선다 — 흔들리면
   * 적 변형(각인 0행)·팔찌 변신형(디미트리·클로드 = 삼정의 문장 중복)이 새어 들어도 오류가 없다.
   * 20행(본편 13 + DLC 7 — 각인 심볼 번들 20종·사용자 실기 "삼정의 문장" 1개와 교차 일치)과
   * 스포일러(불꽃의 문장 = 리유)·DLC 플래그, 수치 앵커(마르스)를 통째로 박제한다.
   */
  it("엠블렘 20행(팔찌는 대표 1행) — 리유 = 스포일러, DLC 7행, 마르스 수치 앵커, 심볼 전수", () => {
    const { engraves } = builderPropsFor("ko");
    expect(engraves).toHaveLength(20);
    expect(engraves.filter((g) => g.spoiler === true).map((g) => g.gid)).toEqual(["GID_リュール"]);
    expect(engraves.filter((g) => g.dlc === true)).toHaveLength(7);
    // 팔찌 변신형은 대표(에델가르트 = 삼정의 문장)만 남는다 — 실기 각인 목록과 동형.
    expect(engraves.find((g) => g.gid === "GID_エーデルガルト")!.name).toBe("삼정의 문장");
    expect(engraves.some((g) => g.gid === "GID_ディミトリ" || g.gid === "GID_クロード")).toBe(false);
    const marth = engraves.find((g) => g.gid === "GID_マルス")!;
    // god.xml 실측: Power 1 · Weight 0 · Hit 10 · Critical 10 · Avoid 5 · Secure 5.
    expect(marth).toMatchObject({ power: 1, weight: 0, hit: 10, crit: 10, avoid: 5, dodge: 5 });
    expect(marth.name).toBe("시작의 문장"); // EngraveWord(MGEID) 로케일명 — 인게임 각인 표기
    const lueur = engraves.find((g) => g.gid === "GID_リュール")!;
    expect(lueur.name).toBe("불꽃의 문장");
    expect(lueur.dlc).toBeUndefined(); // 불꽃의 문장은 본편(스포일러 축) — DLC 축에 얹으면 이중 게이트
    // 아이콘 = 각인 심볼(초상 아님) 전수 — 베이크·매니페스트가 빠지면 이름 칩으로 조용히 강하하므로 박제.
    expect(engraves.every((g) => g.icon?.includes("/assets/engraves/") === true)).toBe(true);
  });
});

describe("builderPropsFor.emblems — 문장사 반지 사영(2026-08-31)", () => {
  /**
   * 왜 위험한가: 絆 보너스는 growth SynchroSkills(SID) → skills EnhanceValue 2단 사영이라
   * 동계열 대체(力+1 → 力+2)가 무너지면 누적 합산(+1+2+3)으로 조용히 부풀고, 보드의 실사고
   * (decisions.md:215 — 싱크로 EnhanceValue 미탑재로 물공 11 vs 실기 12)와 같은 축이 빌더에서 재발한다.
   * 마르스 절대치(絆1 = 힘·기·속+1, 絆20 = 힘+3·기+4·속+4)를 앵커로 박제한다.
   */
  it("엠블렘 20행 — 마르스 絆 보너스 앵커, 반지 아이콘 전수, 스포일러·DLC 축, 레벨 상세", () => {
    const { emblems } = builderPropsFor("ko");
    expect(emblems).toHaveLength(20);
    expect(emblems.filter((e) => e.spoiler === true).map((e) => e.gid)).toEqual(["GID_リュール"]);
    expect(emblems.filter((e) => e.dlc === true)).toHaveLength(7);
    expect(emblems.every((e) => e.icon?.includes("/assets/rings/") === true)).toBe(true);
    const marth = emblems.find((e) => e.gid === "GID_マルス")!;
    expect(marth.name).toBe("마르스");
    expect(marth.bonuses).toHaveLength(20);
    expect(marth.bonuses[0]).toEqual({ str: 1, dex: 1, spd: 1 });
    expect(marth.bonuses[19]).toEqual({ str: 3, dex: 4, spd: 4 });
    // 레벨 상세 — 絆1에 싱크로(견제)·엔게이지 무기(레이피어)가 서고, 무기는 스펙 단면을 동봉한다.
    const lv1 = marth.levels.find((l) => l.bond === 1)!;
    expect(lv1.synchro?.some((s) => s.sid === "SID_見切り" && s.name.length > 0)).toBe(true);
    const rapier = lv1.weapons?.find((w) => w.iid === "IID_マルス_レイピア");
    expect(rapier?.weapon?.might).toBeGreaterThan(0);
  });
});

describe("builderPropsFor.targetJobs — 특수직(2026-08-31)", () => {
  /**
   * 왜 위험한가: 특수직(시프·댄서·사룡 계열)은 Rank 0 + MaxLevel 40 시그니처라 "랭크 1 = 상급직"
   * 필터가 조용히 떨어뜨린다 — 목록에 없으면 사용자는 결손을 알 길이 없다(실제 발견 경로 = 사용자 지적).
   */
  it("시프 = 범용, 댄서 = 세아다스 전용으로 목표 목록에 선다", () => {
    const { targetJobs } = builderPropsFor("ko");
    const thief = targetJobs.find((j) => j.jid === "JID_シーフ");
    expect(thief).toBeDefined();
    expect(thief!.uniquePid).toBeUndefined();
    const dancer = targetJobs.find((j) => j.jid === "JID_ダンサー");
    expect(dancer?.uniquePid).toBe("PID_セアダス");
    // 사룡 계열 전용(베일·DLC)도 가능자 판정으로 선다 — 적 변형(Flag 0)은 계속 밖.
    expect(targetJobs.some((j) => j.jid === "JID_邪竜ノ娘")).toBe(true);
    expect(targetJobs.some((j) => j.jid === "JID_邪竜ノ娘_敵")).toBe(false);
  });
});
