import { parseEphemeris, serializeEphemeris, type Difficulty, type EphemerisFile } from "@fesim/shared";

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

export function clearSlot(key: SaveKey): void {
  try {
    storage()?.removeItem(slotKey(key));
  } catch {
    // 지우지 못해도 다음 저장이 덮어쓴다.
  }
}
