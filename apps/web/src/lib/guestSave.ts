import { parseEphemeris, serializeEphemeris, type Difficulty, type EphemerisFile, type SetupUnit } from "@fesim/shared";

/**
 * 게스트 자동 저장 — 무계정으로도 판이 이어지는 게이트 제로의 최소형.
 * 저장 계층을 여기로 격리한다(IndexedDB 교체 시 이 파일만 바뀐다). 저장 실패는 언제나 무해화:
 * 프라이빗 모드·쿼터 초과에서 판이 죽는 것보다 저장을 포기하는 편이 낫다.
 */

export interface SaveKey {
  game: string;
  mapId: string;
  difficulty: Difficulty;
  scenario?: string;
}

/** (게임, 맵, 난이도, 국면)당 1슬롯 — 같은 조합으로 돌아오면 그 판이 이어진다. */
export const slotKey = (key: SaveKey): string =>
  `fesim:eph:${key.game}:${key.mapId}:${key.difficulty}:${key.scenario ?? "-"}`;

const storage = (): Storage | undefined => {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

export function saveSlot(key: SaveKey, file: EphemerisFile): void {
  try {
    storage()?.setItem(slotKey(key), serializeEphemeris(file));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵. 진행 중인 판은 건드리지 않는다.
  }
}

/** 손상·이물 슬롯은 조용히 버린다(콘솔 경고만) — 복원 실패로 새 판을 못 시작하면 안 된다. */
export function loadSlot(key: SaveKey): EphemerisFile | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(slotKey(key));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const file = parseEphemeris(text);
    if (file.chapter.cid !== key.mapId || file.chapter.difficulty !== key.difficulty) {
      throw new Error("슬롯의 챕터 정보가 현재 판과 다르다");
    }
    if ((file.chapter.scenario ?? undefined) !== key.scenario) {
      throw new Error("슬롯의 국면이 현재 판과 다르다");
    }
    return file;
  } catch (e) {
    console.warn("게스트 저장 복원 실패 — 새 판으로 시작한다", e);
    clearSlot(key);
    return undefined;
  }
}

/**
 * 이 맵에 이어하던 판이 있나 — 난이도·국면을 가리지 않고 하나라도 있으면 참.
 * 쓰임: 맵 진입 시 기본 기보 자동 재생 여부. ☠남의 시연이 내 진행을 덮으면 안 된다.
 */
export function hasGuestSave(mapId: string, game = "fe17"): boolean {
  const s = storage();
  if (s === undefined) return false;
  const prefix = `fesim:eph:${game}:${mapId}:`;
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k !== null && k.startsWith(prefix)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function clearSlot(key: SaveKey): void {
  try {
    storage()?.removeItem(slotKey(key));
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}

/* ── 런(캠페인) — 챕터 사슬의 진행 상태. 게이트 제로 유지(서버 저장은 M4 로그인 선행).
   ☠챕터 자동 저장(fesim:eph:*)과 다른 축이다: 저쪽은 판 하나의 기보, 이쪽은 판을 잇는 로스터다. */

export interface RunState {
  game: string;
  difficulty: Difficulty;
  /** 다음에 플레이할 챕터(cid). */
  chapter: string;
  /** 완료한 챕터(cid) — 진행 순서 그대로. */
  cleared: string[];
  /** 인계 로스터 = 다음 챕터 setup에 그대로 들어간다(키 = pid, carryover 산출물). */
  roster: Record<string, SetupUnit>;
  updated: string;
}

/** 게임당 런 1개 — 다중 런 슬롯은 M4 보관함 소관이다. */
export const runKey = (game: string): string => `fesim:run:${game}`;

export function saveRun(run: RunState): void {
  try {
    storage()?.setItem(runKey(run.game), JSON.stringify(run));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵. 진행 중인 판은 건드리지 않는다.
  }
}

/** 손상·이물 런은 조용히 버린다 — 복원 실패로 캠페인 진입이 막히면 안 된다. */
export function loadRun(game = "fe17"): RunState | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(runKey(game));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const run = JSON.parse(text) as RunState;
    if (run.game !== game || typeof run.chapter !== "string" || typeof run.roster !== "object") {
      throw new Error("런 슬롯의 형태가 계약과 다르다");
    }
    return { ...run, cleared: run.cleared ?? [] };
  } catch (e) {
    console.warn("런 복원 실패 — 새 런으로 시작한다", e);
    clearRun(game);
    return undefined;
  }
}

export function clearRun(game = "fe17"): void {
  try {
    storage()?.removeItem(runKey(game));
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}

/* ── 맵 줌 배율 — 전 맵 공용 1값. 디폴트 0.9 = 현행 타일 공식 대비 -10%(2026-08-18 사용자 지시).
   ☠board-metrics.css --m-zoom-default와 동기(SSR·리플레이의 CSS 폴백이 그 값을 쓴다).
   로그인 영구저장은 M4 소셜 로그인 선행 — 그때 이 계층만 서버 동기로 확장한다. */

export const ZOOM_DEFAULT = 0.9;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;
const ZOOM_KEY = "fesim:ui:zoom";

/** 상·하한 절단 + 0.1 스텝 잔차 반올림 — 부동소수 누적이 저장·표시로 새면 안 된다. */
export const clampZoom = (zoom: number): number =>
  Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) * 10) / 10;

export function saveZoom(zoom: number): void {
  try {
    storage()?.setItem(ZOOM_KEY, String(clampZoom(zoom)));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵.
  }
}

/** 손상·범위 밖 값은 디폴트로 강하 — 이물 배율이 보드를 0px·거대 렌더로 죽이면 안 된다. */
export function loadZoom(): number {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(ZOOM_KEY);
  } catch {
    return ZOOM_DEFAULT;
  }
  if (text === null || text === undefined) return ZOOM_DEFAULT;
  const zoom = Number(text);
  return Number.isFinite(zoom) && zoom >= ZOOM_MIN && zoom <= ZOOM_MAX ? clampZoom(zoom) : ZOOM_DEFAULT;
}

/* ── 빌더 체커 구 키 — ★비계: 체커 4종의 정본은 **엔트리 프리셋**으로 옮겨갔다(2026-09-05 사용자 판정:
   체커를 빼면 성옥·캐릭터가 빠지는 사고가 난다). 여기 로더는 프리셋 승격(migrateLegacy) 전용이고,
   저장 함수는 없다 — 남기면 다음 사람이 옛 키에 쓰는 코드를 태연히 추가한다.
   제거 조건 = 구 키를 쓰는 배포본이 라이브에서 사라진 뒤(design/entry_preset.md §0 이월).
   ☠"1"/"0"만 유효로 읽는다 — 이물·예외는 안전 기본값으로 강하한다(스포일러가 새면 조용한 스포일러다). */

const savePref = (key: string, on: boolean): void => {
  try {
    storage()?.setItem(key, on ? "1" : "0");
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵.
  }
};

const loadPref = (key: string, fallback: boolean): boolean => {
  try {
    const v = storage()?.getItem(key);
    return v === "1" ? true : v === "0" ? false : fallback;
  } catch {
    return fallback;
  }
};

const SPOILER_KEY = "fesim:ui:spoilers";
const DLC_KEY = "fesim:ui:dlc";
const STAR_KEY = "fesim:ui:starsphere";
const PGROWTH_KEY = "fesim:ui:pgrowth";

/** 기본 = 숨김: 첫 방문(저장 없음)에 후반 캐릭터·각인이 보이면 방지가 아니다. */
export const loadShowSpoilers = (): boolean => loadPref(SPOILER_KEY, false);
/** DLC·사룡의 장 체커(스포일러와 분리, 2026-08-31) — 기본 숨김(미보유자 기준이 안전측). */
export const loadShowDlc = (): boolean => loadPref(DLC_KEY, false);
export const loadStarsphere = (): boolean => loadPref(STAR_KEY, false);
export const loadShowGrowth = (): boolean => loadPref(PGROWTH_KEY, false);

/** 프리셋 첫 저장 안내를 봤나 — 브라우저 저장의 한계 고지 1회(2026-09-05). 표시 취향이라 프리셋 밖이다.
    ☠이 플래그 자체가 지워지면 안내가 다시 뜨는데, 그 재노출은 오히려 정확한 신호다(저장소가 비워진 것). */
const PRESET_NOTICE_KEY = "fesim:ui:presetnotice";
export const loadPresetNoticeSeen = (): boolean => loadPref(PRESET_NOTICE_KEY, false);
export const savePresetNoticeSeen = (): void => savePref(PRESET_NOTICE_KEY, true);

/* ── 엔트리 잠금(빌더) — 잠근 순서 = 표 상단 고정 순서. 잠금 온오프 순간이 저장 시점(2026-08-31 사용자 지시).
   로스터·직업 대조는 표시층(features/builder/lib)이 하므로 여기는 스냅샷 형태만 지킨다. */

/** 잠금 스냅샷 — 잠근 순간의 (직업, 내부 레벨, 성옥 체커, 무기)를 박제한다(2026-08-31: 잠김은 당시 값으로 고정). */
export interface EntryLock {
  pid: string;
  /** 목표 내부 레벨(0기점). 직업 미선택 잠금은 0(합류 상태라 소비되지 않는다). */
  internal: number;
  /** 잠금 당시 직업(jid). 없음 = 직업 미선택(합류 상태) 잠금. */
  jid?: string;
  /** 잠금 당시 성옥의 가호 체커 — 현재 체커와 무관하게 이 값만 반영한다. */
  star?: boolean;
  /** 잠금 당시 장착 무기(iid) — 없음 = 맨손. */
  iid?: string;
  /** 잠금 당시 강화 단계(0 = 노강화). */
  plus?: number;
  /** 잠금 당시 각인(GID) — 없음 = 무각인. */
  engrave?: string;
  /** 문장사 반지(GID) — 잠금 카드에서만 편집(2026-08-31 사용자 지시: 반지는 엔트리 멤버 개인 장착). */
  gid?: string;
  /** 인연(絆) 레벨 1~20 — 반지 선택 시 기본 20. gid 없이 단독으로는 무의미. */
  bond?: number;
  /** 계승 스킬 2칸(sid, "" = 빈 칸) — 카드 스킬 열의 계승 1·2(2026-09-02). */
  skills?: [string, string];
}

const ENTRY_LOCKS_KEY = "fesim:ui:entrylocks";

/**
 * 구 잠금 키 로더 — ★비계: 프리셋 승격(migrateLegacy) 전용이다.
 * 제거 조건 = 구 키를 쓰는 배포본이 라이브에서 사라진 뒤(design/entry_preset.md §0 이월).
 * ☠강하 규칙 본문은 parseEntryLock이 소유한다 — 프리셋 파서와 같은 것을 불러야 한 쪽만 낡는 일이 없다.
 */
export function loadEntryLocks(): EntryLock[] {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(ENTRY_LOCKS_KEY);
  } catch {
    return [];
  }
  if (text === null || text === undefined) return [];
  try {
    const list: unknown = JSON.parse(text);
    if (!Array.isArray(list)) throw new Error("잠금 목록이 배열이 아니다");
    return list.flatMap(parseEntryLock);
  } catch {
    return [];
  }
}

/* ── 엔트리 프리셋 — 빌더 화면 한 벌의 저장 슬롯 (2026-09-05 사용자 지시, 정본 = design/entry_preset.md).
   ☠넘버링 세이브(fesim:save:*)와 다른 축이다: 저쪽은 사용자가 찍는 순간의 보관,
   이쪽은 조작마다 자동 저장되는 작업공간이다(저장 버튼이 없다).
   ☠인덱스 + 슬롯 2축인 이유 = 자동 저장이 활성 슬롯 하나만 쓰고, 한 슬롯이 깨져도 목록은 살아
   사용자가 스스로 다른 프리셋으로 빠져나간다(단일 키였다면 파싱 1회 실패 = 전 빌드 소멸). */

/** 글로벌 비교 슬롯 — [0] = 메인. internal 미지정 = 메인 추종. 저장 형태를 소유하는 층이 타입도 소유한다. */
export interface BuilderSlot {
  jid: string;
  internal?: number;
  iid?: string;
  plus?: number;
  engrave?: string;
}

/** 카드 개별 클래스 — jid 없음 = 직업 미선택(합류 상태) · internal 미지정 = 글로벌 추종. */
export interface CardClass {
  jid?: string;
  internal?: number;
}

/** 카드 개인 장비 1건. */
export interface CardEquip {
  iid?: string;
  plus?: number;
  engrave?: string;
}

/** 카드 반지 — 絆 1~20. */
export interface CardRing {
  gid: string;
  bond: number;
}

/**
 * 빌더 화면 한 벌 = Reset All(BuilderIsland reset())이 건드리는 집합과 **정확히 같다**.
 * ☠체커 4종을 담는 이유(2026-09-05 사용자 판정) = 빼면 성옥·캐릭터가 빠지는 사고가 난다:
 *   성옥은 성장 경로 입력이라 스탯이 바뀌고, 스포일러·DLC 숨김은 문장사 絆 보너스를 소실시키고
 *   각인을 무각인으로 강하시키며 캐릭터를 표에서 통째로 뺀다 — 오류도 경고도 없다.
 * ☠기점을 건드리지 말 것: internal·cardClass.internal = 1기점 표기값 / EntryLock.internal = 0기점.
 * ☠type 별칭이다(interface 금지) — 인터페이스는 암묵 인덱스 시그니처가 없어 파서의 Record<string, unknown>
 *   경유가 컴파일되지 않는다.
 */
export type BuilderSnapshot = {
  /** ☠빈 배열은 만들지 않는다 — 최소 1칸([{ jid: "" }])이 올리셋 상태다. 상한은 표시층이 자른다. */
  slots: BuilderSlot[];
  /** 글로벌 내부 레벨(1기점 표기값). */
  internal: number;
  /** key 검증(StatKey 대조)은 표시층이 한다 — 저장층은 엔진 타입을 모른다. */
  sort?: { key: string; dir: "asc" | "desc" };
  /** 엔트리(잠금) — ★배열 순서 = 표 상단 순서 = 캐릭터 순번(2026-09-05 사용자 지시로 프리셋에 포함). */
  locked: EntryLock[];
  /** 카드 개인 장비 — 키 `${pid}:${li}`(li = 비교 라인 인덱스, ☠슬롯 인덱스가 아니다). */
  overrides: Record<string, CardEquip>;
  cardClass: Record<string, CardClass>;
  rings: Record<string, CardRing>;
  /** 계승 스킬 2칸(sid, "" = 빈 칸). */
  inherits: Record<string, [string, string]>;
  /** 성옥의 가호 — 유일하게 성장 경로 입력이다(스탯이 바뀐다). */
  star: boolean;
  showGrowth: boolean;
  showSpoilers: boolean;
  showDlc: boolean;
};

/**
 * 올리셋 상태 = Reset All의 결과이자 "+ 새 프리셋"의 내용물 — 체커까지 전부 초기값이다
 * (2026-09-05 사용자 확정, 2026-08-31 "체커 저장값은 유지"를 **대체**).
 * ☠상수가 아니라 팩토리 — 단일 객체를 여러 프리셋·setState가 참조로 공유하면 나중에 제자리 변경
 *   하나로 전 프리셋이 상태를 공유한다.
 */
export const emptySnapshot = (): BuilderSnapshot => ({
  slots: [{ jid: "" }],
  internal: 40,
  locked: [],
  overrides: {},
  cardClass: {},
  rings: {},
  inherits: {},
  star: false,
  showGrowth: false,
  showSpoilers: false,
  showDlc: false,
});

/** 목록 1행 — 드롭다운은 스냅샷을 안 읽고 이것만으로 그린다(열 때마다 N개 파싱 = INP 낭비). */
export interface PresetSummary {
  /** 발급 연번(1부터). ☠삭제해도 재사용 금지 — 이름을 바꿔도 프리셋의 정체는 이 번호다. */
  n: number;
  /** 사용자 이름. "" = 미명명 → 표시는 presetName()이 답한다(기본 이름을 저장물에 굽지 않는다). */
  name: string;
  /** 엔트리(잠금) 수 — 목록이 "엔트리 N"으로 읽는다. ☠슬롯을 열지 않고 그리려고 인덱스가 든다. */
  entries: number;
}

/** ★active·seq를 봉투 안에 둔다 — 별개 state로 들면 삭제 후 인덱스에 없는 키에 계속 쓴다(오류 없음·전손). */
export interface PresetIndex {
  v: 1;
  /** 활성 프리셋 n — 목록에 없으면 첫 항목으로 강하한다. */
  active: number;
  /** 다음 발급 번호 — 삭제해도 줄지 않는다. */
  seq: number;
  /** ☠빈 배열은 만들지 않는다 — openPresets가 항상 최소 1개를 보장한다. */
  list: PresetSummary[];
}

const PRESET_PREFIX = "fesim:preset:fe17:";
const PRESET_INDEX = `${PRESET_PREFIX}index`;

/** 3자리 패딩 = 기본 이름과 같은 주소(003 → "Preset 003"). */
export const presetKey = (n: number): string => `${PRESET_PREFIX}${String(n).padStart(3, "0")}`;

/** 미명명 프리셋의 표시 이름 — 로케일 불문 영문 고정(사용자 스펙 "기본값은 Preset 001부터 넘버링"). */
export const presetName = (s: PresetSummary): string =>
  s.name !== "" ? s.name : `Preset ${String(s.n).padStart(3, "0")}`;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

/* 범위 상한 — 표시층 상수(INTERNAL_LEVELS·BOND_OPTIONS·연성 5단계)의 사본이다.
   ☠갈리면 **표시층이 이긴다**(여기는 손상값이 엔진 루프에 들어가는 것만 막는 하한선이다).
   버리지 않고 클램프하는 이유 = 원소를 통째로 잃는 것보다 의도에 가깝다. */
const clamp = (v: unknown, lo: number, hi: number): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Math.min(hi, Math.max(lo, Math.round(n)));
};
/** 내부 레벨 표기값(1기점). */
const inLv = (v: unknown): number | undefined => clamp(v, 10, 50);
/** 연성 단계 0 = 노강화. */
const plusOf = (v: unknown): number | undefined => clamp(v, 0, 5);
const bondOf = (v: unknown): number | undefined => clamp(v, 1, 20);

/**
 * 잠금 원소 하나의 강하 — 구 키 로더(loadEntryLocks)와 프리셋 파서가 **같은 것을 부른다**.
 * ☠두 벌로 적으면 반드시 하나가 낡는다(강하 규칙의 답변자는 하나).
 */
export function parseEntryLock(e: unknown): EntryLock[] {
  const raw = e as Partial<EntryLock> | null;
  if (typeof raw?.pid !== "string" || typeof raw.internal !== "number") return [];
  const internal = clamp(raw.internal, 0, 50);
  if (internal === undefined) return [];
  return [
    {
      pid: raw.pid,
      internal,
      ...(typeof raw.jid === "string" ? { jid: raw.jid } : {}),
      ...(raw.star === true ? { star: true } : {}),
      ...(typeof raw.iid === "string" ? { iid: raw.iid } : {}),
      ...(plusOf(raw.plus) !== undefined ? { plus: plusOf(raw.plus) as number } : {}),
      ...(typeof raw.engrave === "string" ? { engrave: raw.engrave } : {}),
      ...(typeof raw.gid === "string" ? { gid: raw.gid } : {}),
      ...(bondOf(raw.bond) !== undefined ? { bond: bondOf(raw.bond) as number } : {}),
      ...(Array.isArray(raw.skills) && raw.skills.length === 2 && raw.skills.every((s) => typeof s === "string")
        ? { skills: [raw.skills[0], raw.skills[1]] as [string, string] }
        : {}),
    },
  ];
}

interface FieldCodec<T> {
  /** 저장 형태에서 값 하나를 복원. 이물이면 undefined → 기본값 강하. */
  parse: (v: unknown) => T | undefined;
}

const recordOf =
  <T,>(one: (v: unknown) => T | undefined, keyOk: (k: string) => boolean = () => true) =>
  (v: unknown): Record<string, T> | undefined =>
    !isObj(v)
      ? undefined
      : Object.fromEntries(
          Object.entries(v).flatMap(([k, raw]) => {
            const got = keyOk(k) ? one(raw) : undefined;
            return got === undefined ? [] : [[k, got] as const];
          }),
        );

const equipFields = (v: Record<string, unknown>): CardEquip => ({
  ...(str(v.iid) !== undefined ? { iid: v.iid as string } : {}),
  ...(plusOf(v.plus) !== undefined ? { plus: plusOf(v.plus) as number } : {}),
  ...(str(v.engrave) !== undefined ? { engrave: v.engrave as string } : {}),
});

const parseSlots = (v: unknown): BuilderSlot[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const list = v.flatMap((s): BuilderSlot[] =>
    isObj(s) && typeof s.jid === "string"
      ? [{ jid: s.jid, ...(inLv(s.internal) !== undefined ? { internal: inLv(s.internal) as number } : {}), ...equipFields(s) }]
      : [],
  );
  // ☠최소 1칸 — 0칸이면 비교 라인이 사라지고 되돌릴 UI가 없다.
  return list.length > 0 ? list : [{ jid: "" }];
};

const parseSort = (v: unknown): { key: string; dir: "asc" | "desc" } | undefined =>
  isObj(v) && typeof v.key === "string" && (v.dir === "asc" || v.dir === "desc") ? { key: v.key, dir: v.dir } : undefined;

const parseCardClass = (v: unknown): CardClass | undefined =>
  !isObj(v)
    ? undefined
    : {
        ...(str(v.jid) !== undefined ? { jid: v.jid as string } : {}),
        ...(inLv(v.internal) !== undefined ? { internal: inLv(v.internal) as number } : {}),
      };

const parseCardEquip = (v: unknown): CardEquip | undefined => (isObj(v) ? equipFields(v) : undefined);

const parseRing = (v: unknown): CardRing | undefined =>
  isObj(v) && typeof v.gid === "string" ? { gid: v.gid, bond: bondOf(v.bond) ?? 20 } : undefined;

const parsePair = (v: unknown): [string, string] | undefined =>
  Array.isArray(v) && v.length === 2 && v.every((s) => typeof s === "string")
    ? [v[0] as string, v[1] as string]
    : undefined;

/** ★배열 순서를 건드리지 않는다(정렬·중복 제거 금지) — 이 순서가 캐릭터 순번이다. */
const parseLocks = (v: unknown): EntryLock[] | undefined => (Array.isArray(v) ? v.flatMap(parseEntryLock) : undefined);

/** ☠overrides 키는 `${pid}:${li}` 복합 — 형식이 깨진 키는 정규화가 pid를 못 떼어 조용히 살아남는다. */
const isEquipKey = (k: string): boolean => /^.+:\d+$/.test(k);

/**
 * ★전수성 게이트 — BuilderSnapshot에 필드를 더하고 코덱을 안 더하면 pnpm typecheck가 즉시 레드다.
 * ☠이 satisfies를 as로 바꾸거나 지우면 새 필드가 저장은 되고 복원은 안 되는 상태가 되어,
 *   프리셋을 갈아탈 때 그 값만 조용히 옛것으로 남는다(오류 없음·경고 없음).
 */
const SNAP_CODEC = {
  slots: { parse: parseSlots },
  internal: { parse: inLv },
  sort: { parse: parseSort },
  locked: { parse: parseLocks },
  overrides: { parse: recordOf(parseCardEquip, isEquipKey) },
  cardClass: { parse: recordOf(parseCardClass) },
  rings: { parse: recordOf(parseRing) },
  inherits: { parse: recordOf(parsePair) },
  star: { parse: bool },
  showGrowth: { parse: bool },
  showSpoilers: { parse: bool },
  showDlc: { parse: bool },
} satisfies { readonly [K in keyof Required<BuilderSnapshot>]: FieldCodec<Required<BuilderSnapshot>[K]> };

/**
 * ☠불변식: 같은 pid가 locked와 세션 맵에 동시에 있으면 카드가 정본을 둘 갖는다
 *   (잠금 = 세션에서 걷힌 상태가 정본). 런타임 왕복은 지키지만 손편집 JSON·구버전·M4 서버 병합본은
 *   안 지킨다 — 읽을 때 항상 한 번 친다(멱등).
 */
export function normalizeSnapshot(s: BuilderSnapshot): BuilderSnapshot {
  const pids = new Set(s.locked.map((e) => e.pid));
  if (pids.size === 0) return s;
  const byPid = <T,>(m: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(m).filter(([k]) => !pids.has(k)));
  return {
    ...s,
    overrides: Object.fromEntries(
      Object.entries(s.overrides).filter(([k]) => {
        // ☠키는 `${pid}:${li}` — lastIndexOf가 -1이면 slice(0, -1)이 마지막 글자를 잘라 엉뚱한 pid가 된다.
        const i = k.lastIndexOf(":");
        return i < 0 || !pids.has(k.slice(0, i));
      }),
    ),
    cardClass: byPid(s.cardClass),
    rings: byPid(s.rings),
    inherits: byPid(s.inherits),
  };
}

/** 필드 열거는 코덱이 소유 — 손으로 적은 parse 체인은 두지 않는다(적는 순간 타입과 조용히 분기한다). */
export function parseSnapshot(v: unknown): BuilderSnapshot {
  const out: Record<string, unknown> = emptySnapshot();
  if (isObj(v)) {
    for (const [k, codec] of Object.entries(SNAP_CODEC)) {
      const got = (codec as FieldCodec<unknown>).parse(v[k]);
      if (got !== undefined) out[k] = got;
    }
  }
  return normalizeSnapshot(out as BuilderSnapshot);
}

/** 슬롯 1개의 저장 형태. ★name을 슬롯에도 굽는다 — 인덱스 1회 손상이 전 프리셋 이름을 지우면 안 된다. */
interface StoredPreset {
  v: 1;
  /** 마지막 저장(ISO) — M4 서버 병합의 last-write-wins 축. */
  updated: string;
  name: string;
  snap: BuilderSnapshot;
}

/**
 * 실패를 반환값으로 알린다 — 프리셋은 사용자가 손으로 쌓은 데이터라 조용히 사라지면 안 된다(putSave 선례).
 * ☠storage() 부재를 먼저 걸러야 한다 — `storage()?.setItem(...)`은 저장소 차단 브라우저에서 no-op으로
 *   지나가므로, 그대로 true를 돌려주면 아무것도 저장되지 않는데 경고가 영원히 안 뜬다.
 */
export function writePreset(n: number, snap: BuilderSnapshot, name: string): boolean {
  const s = storage();
  if (s === undefined) return false;
  const doc: StoredPreset = { v: 1, updated: new Date().toISOString(), name, snap };
  try {
    s.setItem(presetKey(n), JSON.stringify(doc));
    return true;
  } catch (e) {
    console.warn("프리셋 저장 실패 — 화면 상태는 그대로다", e);
    return false;
  }
}

export function writePresetIndex(index: PresetIndex): boolean {
  const s = storage();
  if (s === undefined) return false;
  try {
    s.setItem(PRESET_INDEX, JSON.stringify(index));
    return true;
  } catch (e) {
    console.warn("프리셋 목록 저장 실패 — 슬롯은 남는다", e);
    return false;
  }
}

/** ☠손상 슬롯을 자동 삭제하지 않는다(readSave→dropSave와 다른 유일한 지점) — 기보는 다시 둘 수 있지만
    빌드는 사용자가 손으로 쌓은 것이다. 목록에 "불러오지 못한 프리셋"으로 남겨 사용자가 지우게 한다. */
function readDoc(n: number): { name: string; snap: BuilderSnapshot } | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(presetKey(n));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const doc: unknown = JSON.parse(text);
    if (!isObj(doc) || doc.v !== 1) throw new Error("프리셋 문서 형식이 아니다");
    return { name: str(doc.name) ?? "", snap: parseSnapshot(doc.snap) };
  } catch (e) {
    console.warn(`프리셋 ${n} 복원 실패 — 슬롯은 지우지 않는다`, e);
    return undefined;
  }
}

export const readPreset = (n: number): BuilderSnapshot | undefined => readDoc(n)?.snap;

export function dropPreset(n: number): void {
  try {
    storage()?.removeItem(presetKey(n));
  } catch {
    // 못 지워도 인덱스에서 빠지면 목록에 안 보인다. 다음 회수에서 되살아나는 건 손실보다 낫다.
  }
}

function readPresetIndex(): PresetIndex | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(PRESET_INDEX);
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) return undefined;
  try {
    const raw: unknown = JSON.parse(text);
    if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.list)) throw new Error("프리셋 인덱스 형식이 아니다");
    const list = raw.list.flatMap((e): PresetSummary[] =>
      isObj(e) && typeof e.n === "number"
        ? [{ n: e.n, name: str(e.name) ?? "", entries: clamp(e.entries, 0, 999) ?? 0 }]
        : [],
    );
    if (list.length === 0) throw new Error("살아남은 프리셋이 없다");
    return { v: 1, active: num(raw.active) ?? list[0]!.n, seq: seqAbove(num(raw.seq) ?? 1, list), list };
  } catch (e) {
    // ☠키는 지우지 않는다 — 슬롯 회수가 실물을 되살린다(건질 여지를 남긴다).
    console.warn("프리셋 인덱스 손상 — 슬롯에서 되살린다", e);
    return undefined;
  }
}

/** ☠발급기는 항상 최대 번호 위로 — 손상된 seq가 번호를 되쓰면 옛 대화의 앵커가 딴 빌드를 가리킨다. */
const seqAbove = (seq: number, list: readonly PresetSummary[]): number =>
  Math.max(1, seq, ...list.map((p) => p.n + 1));

/**
 * 새 번호 발급 — ☠**디스크를 다시 읽는다**. seq는 탭마다 메모리에만 있어서, 다른 탭이 003을 만든 뒤
 * 이 탭이 stale seq로 같은 003을 발급하면 저쪽 빌드를 덮고 인덱스에서도 지운다.
 */
export function nextPresetNo(index: PresetIndex): number {
  const disk = readPresetIndex();
  return Math.max(seqAbove(index.seq, index.list), disk === undefined ? 1 : seqAbove(disk.seq, disk.list));
}

/**
 * 인덱스에 없는 슬롯 키를 목록으로 회수한다(이름까지).
 * ☠쓰기는 슬롯 먼저·인덱스 나중이라, 인덱스 쓰기만 실패하면 그 빌드는 저장소에 살아 있는 채 목록에
 *   영원히 안 나온다 = 조용한 소실. 인덱스 통째 손상의 복구 경로도 겸한다.
 */
function recoverOrphans(index: PresetIndex): PresetIndex {
  const s = storage();
  if (s === undefined) return index;
  const known = new Set(index.list.map((p) => p.n));
  const found: PresetSummary[] = [];
  try {
    for (let i = 0; i < s.length; i += 1) {
      const k = s.key(i);
      if (k === null || !k.startsWith(PRESET_PREFIX)) continue;
      const n = Number(k.slice(PRESET_PREFIX.length)); // "index"는 NaN → 걸러진다
      if (!Number.isInteger(n) || n < 1 || known.has(n)) continue;
      const got = readDoc(n);
      found.push({ n, name: got?.name ?? "", entries: got?.snap.locked.length ?? 0 });
    }
  } catch {
    return index;
  }
  if (found.length === 0) return index;
  const list = [...index.list, ...found].sort((a, b) => a.n - b.n);
  return { ...index, seq: seqAbove(index.seq, list), list };
}

/**
 * 구 키 5개(잠금 + 체커 4) → 프리셋 001 승격(2026-09-05). 세션 상태는 원래 새로고침에 휘발이었으므로
 * 빈 값이 정확한 복원이다 — 없던 것을 지어내지 않는다.
 * ★비계: 이 함수와 loadEntryLocks·load{Starsphere,ShowGrowth,ShowSpoilers,ShowDlc}는 승격이 끝나면 걷는다.
 *   제거 조건 = 구 키를 쓰는 배포본이 라이브에서 사라진 뒤(design/entry_preset.md §0 이월).
 * ☠승격 저장이 실패하면 구 키를 지우지 않는다 — 지우고 못 쓰면 사용자 잠금이 증발한다. 순서가 안전측을 정한다.
 */
function migrateLegacy(): { index: PresetIndex; snapshot: BuilderSnapshot; failed: boolean } {
  const snapshot: BuilderSnapshot = {
    ...emptySnapshot(),
    locked: loadEntryLocks(),
    star: loadStarsphere(),
    showGrowth: loadShowGrowth(),
    showSpoilers: loadShowSpoilers(),
    showDlc: loadShowDlc(),
  };
  const index: PresetIndex = { v: 1, active: 1, seq: 2, list: [{ n: 1, name: "", entries: snapshot.locked.length }] };
  const ok = writePreset(1, snapshot, "") && writePresetIndex(index);
  if (ok) {
    for (const key of [ENTRY_LOCKS_KEY, STAR_KEY, PGROWTH_KEY, SPOILER_KEY, DLC_KEY]) {
      try {
        storage()?.removeItem(key);
      } catch {
        // 못 지워도 프리셋이 정본이라 다시 읽히지 않는다(승격은 인덱스 부재일 때만 돈다).
      }
    }
  }
  return { index, snapshot, failed: !ok };
}

/**
 * 마운트 1회 진입점 — 마이그레이션·강하·고아 회수·활성 결정을 여기서 끝내고 아일랜드엔 결과만 준다.
 * failed = 쓰기 실패(시크릿 창·쿼터) · broken = **활성 슬롯 복원 실패**.
 * ☠broken을 안 알리면 아일랜드가 빈 스냅샷을 그리고, 사용자의 첫 조작 한 번이 자동 저장으로 그 슬롯을
 *   덮어 원본 회수 기회가 영구히 사라진다(목록엔 "12 엔트리"가 서 있는 채로).
 */
export function openPresets(): {
  index: PresetIndex;
  snapshot: BuilderSnapshot;
  failed: boolean;
  broken: boolean;
} {
  const found = readPresetIndex();
  // ☠인덱스가 없거나 깨져도 슬롯이 살아 있으면 그것이 정본 — 회수가 승격보다 먼저다(안 그러면 001을 덮는다).
  const rec = recoverOrphans(found ?? { v: 1, active: 0, seq: 1, list: [] });
  if (rec.list.length === 0) return { ...migrateLegacy(), broken: false };
  const index: PresetIndex = {
    ...rec,
    active: rec.list.some((p) => p.n === rec.active) ? rec.active : rec.list[0]!.n,
  };
  const doc = readDoc(index.active);
  const dirty = found === undefined || rec !== found || index.active !== rec.active;
  return {
    index,
    snapshot: doc?.snap ?? emptySnapshot(),
    failed: dirty && !writePresetIndex(index),
    broken: doc === undefined,
  };
}

/* ── 넘버링 세이브 — 사용자가 찍은 지점의 보관. ☠자동 저장(fesim:eph:*)과 다른 축이다:
   저쪽은 챕터당 1슬롯이 계속 덮어써지는 이어하기, 이쪽은 **번호가 붙어 남는** 보관이다.
   번호의 쓸모 = 대화 앵커("세이브 7의 국면") — 그래서 번호는 절대 재사용하지 않는다. */

export interface SaveSummary {
  /** 전역 연번(챕터 무관, 1부터). ☠삭제해도 재사용 금지 — 옛 대화의 번호가 딴 판을 가리키면 안 된다. */
  n: number;
  game: string;
  cid: string;
  difficulty: Difficulty;
  /** 국면 주소 — 목록이 기보를 파싱하지 않고 읽는다(기보는 챕터당 수십 KB). */
  turn: number;
  phase: number;
  /** 둔 수 = log 길이. */
  steps: number;
  alive: number;
  total: number;
  created: string;
  /** ★난입 계보 — 처음부터 둔 판인지, 남의 기보 도중에 끼어든 판인지. */
  origin: "play" | "replay";
  /** 난입 원본(기본 기보 = cid, 공유 기보 = 그 id). */
  from?: string;
  label?: string;
}

/** 저장 시점에 스토어가 아는 것 전부 — n·created는 저장 계층이 발급한다. */
export type SaveDraft = Omit<SaveSummary, "n" | "created">;

const SAVE_SEQ = "fesim:save:seq";
const SAVE_INDEX = "fesim:save:index";

/** 3자리 패딩 = 파일 미러의 이름과 같은 주소(007 → data/fe17/saves/007.eph.json). */
export const saveKey = (n: number): string => `fesim:save:${String(n).padStart(3, "0")}`;

/** 발급 즉시 소비한다 — 저장이 실패해 번호가 비어도 재사용보다 낫다(앵커 안정성 > 번호 밀도). */
function takeSaveNo(): number {
  const s = storage();
  let next = 1;
  try {
    next = Math.max(1, Math.trunc(Number(s?.getItem(SAVE_SEQ))) || 1);
    s?.setItem(SAVE_SEQ, String(next + 1));
  } catch {
    // 읽기·쓰기 실패 = 1번부터. 같은 번호가 겹쳐도 저장 자체를 막지는 않는다.
  }
  return next;
}

function writeIndex(list: SaveSummary[]): void {
  try {
    storage()?.setItem(SAVE_INDEX, JSON.stringify(list));
  } catch {
    // 인덱스를 못 써도 슬롯은 남는다 — 목록에서 사라질 뿐 데이터는 살아 있다.
  }
}

/** 최신이 앞. 손상 인덱스는 빈 목록으로 강하한다(보관함 전체가 막히면 안 된다). */
export function listSaves(): SaveSummary[] {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(SAVE_INDEX);
  } catch {
    return [];
  }
  if (text === null || text === undefined) return [];
  try {
    const list: unknown = JSON.parse(text);
    if (!Array.isArray(list)) throw new Error("인덱스가 배열이 아니다");
    return list.filter((s): s is SaveSummary => typeof (s as SaveSummary)?.n === "number");
  } catch (e) {
    console.warn("세이브 인덱스 손상 — 빈 목록으로 시작한다", e);
    return [];
  }
}

export function putSave(draft: SaveDraft, file: EphemerisFile): SaveSummary | undefined {
  const summary: SaveSummary = { ...draft, n: takeSaveNo(), created: new Date().toISOString() };
  try {
    storage()?.setItem(saveKey(summary.n), serializeEphemeris(file));
  } catch (e) {
    console.warn("세이브 저장 실패 — 진행 중인 판은 그대로다", e);
    return undefined;
  }
  writeIndex([summary, ...listSaves().filter((s) => s.n !== summary.n)]);
  mirrorSave(summary, file);
  return summary;
}

/** 슬롯이 사라진 인덱스 항목은 읽는 순간 걷힌다 — 없는 세이브를 목록이 계속 광고하면 안 된다. */
export function readSave(n: number): EphemerisFile | undefined {
  let text: string | null | undefined;
  try {
    text = storage()?.getItem(saveKey(n));
  } catch {
    return undefined;
  }
  if (text === null || text === undefined) {
    const list = listSaves();
    if (list.some((s) => s.n === n)) writeIndex(list.filter((s) => s.n !== n));
    return undefined;
  }
  try {
    return parseEphemeris(text);
  } catch (e) {
    console.warn(`세이브 ${n} 복원 실패 — 슬롯을 버린다`, e);
    dropSave(n);
    return undefined;
  }
}

export function dropSave(n: number): void {
  try {
    storage()?.removeItem(saveKey(n));
  } catch {
    // 슬롯을 못 지워도 인덱스에서 빠지면 목록에는 안 보인다.
  }
  writeIndex(listSaves().filter((s) => s.n !== n));
  mirrorDrop(n);
}

/* ── 저장소 파일 미러(로컬 dev 전용) — ★이것이 대화 앵커의 실체다.
   브라우저 저장소는 Claude가 못 읽는다. dev 서버가 켜져 있을 때만 같은 세이브를
   data/fe17/saves/{NNN}.eph.json에 복제해, 번호 하나로 국면을 읽게 한다.
   ☠import.meta.env.DEV 가드 = 프로덕션 번들에서 통째로 걷힌다(열람 경로 예산·공개 쓰기 경로 차단).
   베타(워커)에는 미러가 없다 — 그쪽 세이브는 목록의 복사 버튼으로 옮긴다. */

const mirror = (path: string, body: unknown): void => {
  if (!import.meta.env.DEV) return;
  try {
    void fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // dev 미들웨어 부재 = 미러 없음. 세이브는 이미 브라우저에 있다.
    });
  } catch {
    // fetch 부재(테스트 환경 등) = 미러 스킵.
  }
};

const mirrorSave = (summary: SaveSummary, file: EphemerisFile): void =>
  mirror("/__fesim/save", { summary, eph: serializeEphemeris(file) });

const mirrorDrop = (n: number): void => mirror("/__fesim/save/delete", { n });
