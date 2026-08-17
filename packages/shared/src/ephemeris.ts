import type { BattleAction, BattleEvent, BattleWeapon, ConsumableItem, Difficulty, SkillRow, StaffItem, StatBlock } from "./battle.js";

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

/**
 * 유닛 1기의 초기 세팅 diff — 전부 선택적, 부재 = dispos 기본. 키 정본 = 보드 유닛 id(u{순번}).
 * 이원 표현: stats(+이하 스냅숏)는 **열람 경로의 정본**(원천 테이블 없이 결정적 재구성 — /s/ 워커에
 * 대용량 테이블 반입 금지), level·items·sids·god·bond는 **편집기 복원용 의도**다.
 * 편집기는 의도를 바꿀 때마다 스냅숏을 재산출해 함께 기록한다(불일치 = 편집기 결함).
 */
export interface SetupUnit {
  x?: number;
  y?: number;
  removed?: boolean;
  level?: number;
  /** 소지품 교체(아이템 id 순서 그대로 — [0] = 장비 무기) */
  items?: string[];
  /** 장착 스킬 교체(스킬 id) */
  sids?: string[];
  /** 엠블렘(紋章士) 교체 — 싱크로 층만 반영(인게이지 발동 미룸, m4_plan §2 정직 경계) */
  god?: string;
  /** 絆 레벨 */
  bond?: number;
  /** 산출 스탯 스냅숏(레벨·스킬 정적 보정 반영 결과) — 열람 초기화의 정본 */
  stats?: StatBlock;
  /** 소지 공격 무기 스냅숏([0] = 장비) — items 의도의 산출 결과, attack.weapon 인덱스의 해석 대상 */
  weapons?: BattleWeapon[];
  /** 소지 지팡이 스냅숏 — items 의도의 산출 결과, staff.staff 인덱스의 해석 대상 */
  staves?: StaffItem[];
  /** 사용형 아이템 스냅숏 — items 의도의 산출 결과, item.item 인덱스의 해석 대상 */
  consumables?: ConsumableItem[];
  /** 장착 스킬 행 스냅숏 — sids 의도의 산출 결과(행 원형 그대로) */
  skills?: SkillRow[];
}

/** 초기 세팅 diff 전체 — dispos 기본 대비 변경분만 담는다. */
export interface EphemerisSetup {
  units?: Record<string, SetupUnit>;
}

/** 평문 JSON 기보. setup 부재 = dispos 기본 배치. */
export interface EphemerisFile extends EphemerisHeader {
  eph: 1;
  chapter: { cid: string; difficulty: Difficulty; scenario?: string };
  setup?: EphemerisSetup;
  log: EphemerisStep[];
  meta?: { title?: string; author?: string; created?: string };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function assert(ok: unknown, why: string): asserts ok {
  if (!ok) throw new Error(`.eph 파싱 실패: ${why}`);
}

const DIFFICULTIES: readonly unknown[] = ["n", "h", "l"];
const ACTION_TYPES: readonly unknown[] = ["move", "attack", "staff", "item", "wait", "endPhase"];

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
  if (raw.setup !== undefined) {
    assert(isRecord(raw.setup), "setup이 객체가 아니다");
    const units = raw.setup.units;
    if (units !== undefined) {
      assert(isRecord(units), "setup.units가 객체가 아니다");
      for (const u of Object.values(units)) assert(isRecord(u), "setup.units 원소가 객체가 아니다");
    }
  }
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
