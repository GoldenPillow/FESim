import type { BattleAction, BattleEvent, Difficulty } from "./battle.js";

/**
 * ephemeris(.eph) 기보 포맷 헤더 — 타이틀 중립 원칙:
 * 게임ID(fe17 등)와 룰 버전이 네임스페이스라서, 엔진이 시리즈 확장돼도 기보가 충돌하지 않는다.
 * 스키마의 정본은 이 타입이다(산문 명세 이중화 금지).
 */
export interface EphemerisHeader {
  game: string;
  ruleVersion: string;
}

/**
 * 한 행동의 기록 — rolls·events 병기:
 * 재생 정본 = events(절대값 적용이라 공식이 바뀌어도 열람 결과가 불변),
 * rolls = 검증 전용(engine의 verify가 reduce 재계산으로 대조).
 */
export interface EphemerisStep {
  action: BattleAction;
  rolls?: number[];
  events?: BattleEvent[];
}

/** 평문 JSON 기보. setup(초기 세팅 diff)은 M4 — 부재 = dispos 기본 배치. */
export interface EphemerisFile extends EphemerisHeader {
  eph: 1;
  chapter: { cid: string; difficulty: Difficulty; scenario?: string };
  log: EphemerisStep[];
  meta?: { title?: string; author?: string; created?: string };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function assert(ok: unknown, why: string): asserts ok {
  if (!ok) throw new Error(`.eph 파싱 실패: ${why}`);
}

const DIFFICULTIES: readonly unknown[] = ["n", "h", "l"];
const ACTION_TYPES: readonly unknown[] = ["move", "attack", "wait", "endPhase"];

/**
 * 남이 만든 파일이 들어오는 신뢰 경계 — 뼈대만 검사한다.
 * rolls·events의 정합은 재생 시 engine의 verify가 실제 재계산으로 판정하므로 여기서 흉내내지 않는다.
 */
export function parseEphemeris(text: string): EphemerisFile {
  const raw: unknown = JSON.parse(text);
  assert(isRecord(raw), "최상위가 객체가 아니다");
  assert(raw.eph === 1, "eph 버전이 1이 아니다");
  assert(typeof raw.game === "string", "game이 문자열이 아니다");
  assert(typeof raw.ruleVersion === "string", "ruleVersion이 문자열이 아니다");
  const chapter = raw.chapter;
  assert(isRecord(chapter), "chapter가 객체가 아니다");
  assert(typeof chapter.cid === "string", "chapter.cid가 문자열이 아니다");
  assert(DIFFICULTIES.includes(chapter.difficulty), "chapter.difficulty가 n|h|l이 아니다");
  const log = raw.log;
  assert(Array.isArray(log), "log가 배열이 아니다");
  for (const step of log) {
    assert(isRecord(step), "log 원소가 객체가 아니다");
    const action = step.action;
    assert(isRecord(action) && ACTION_TYPES.includes(action.type), "log 원소의 action이 불량이다");
  }
  return raw as unknown as EphemerisFile;
}

/** 압축 JSON — 링크(KV) 페이로드와 클립보드 전송량이 곧 비용이다. 키는 전체 단어라 그대로 읽힌다. */
export function serializeEphemeris(file: EphemerisFile): string {
  return JSON.stringify(file);
}
