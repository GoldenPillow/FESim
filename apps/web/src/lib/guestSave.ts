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

/* ── 빌더 체커 저장 — 체커는 전부 localStorage 부울린(2026-08-31 사용자 지시, rules/feature-ui.md).
   ☠"1"/"0"만 유효로 읽는다 — 이물·예외는 각 체커의 안전 기본값으로 강하한다
   (스포일러 표시가 새면 조용한 스포일러다). */

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

export const saveShowSpoilers = (show: boolean): void => savePref(SPOILER_KEY, show);
/** 기본 = 숨김: 첫 방문(저장 없음)에 후반 캐릭터·각인이 보이면 방지가 아니다. */
export const loadShowSpoilers = (): boolean => loadPref(SPOILER_KEY, false);
export const saveShowDlc = (show: boolean): void => savePref(DLC_KEY, show);
/** DLC·사룡의 장 체커(스포일러와 분리, 2026-08-31) — 기본 숨김(미보유자 기준이 안전측). */
export const loadShowDlc = (): boolean => loadPref(DLC_KEY, false);
export const saveStarsphere = (on: boolean): void => savePref(STAR_KEY, on);
export const loadStarsphere = (): boolean => loadPref(STAR_KEY, false);
export const saveShowGrowth = (on: boolean): void => savePref(PGROWTH_KEY, on);
export const loadShowGrowth = (): boolean => loadPref(PGROWTH_KEY, false);

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
}

const ENTRY_LOCKS_KEY = "fesim:ui:entrylocks";

export function saveEntryLocks(locks: readonly EntryLock[]): void {
  try {
    storage()?.setItem(ENTRY_LOCKS_KEY, JSON.stringify(locks));
  } catch {
    // 쿼터·프라이빗 모드 = 저장 스킵.
  }
}

/** 손상·이물·구버전(pid 문자열 배열)은 원소 단위로 걸러 강하 — 이물 스냅샷이 표 상단을 붙들면 되돌릴 UI가 없다. */
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
    return list.flatMap((e: unknown): EntryLock[] => {
      const raw = e as Partial<EntryLock> | null;
      if (typeof raw?.pid !== "string" || typeof raw.internal !== "number") return [];
      return [
        {
          pid: raw.pid,
          internal: raw.internal,
          ...(typeof raw.jid === "string" ? { jid: raw.jid } : {}),
          ...(raw.star === true ? { star: true } : {}),
          ...(typeof raw.iid === "string" ? { iid: raw.iid } : {}),
          ...(typeof raw.plus === "number" ? { plus: raw.plus } : {}),
          ...(typeof raw.engrave === "string" ? { engrave: raw.engrave } : {}),
          ...(typeof raw.gid === "string" ? { gid: raw.gid } : {}),
          ...(typeof raw.bond === "number" ? { bond: raw.bond } : {}),
        },
      ];
    });
  } catch {
    return [];
  }
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
