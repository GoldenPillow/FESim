import {
  STAT_KEYS,
  growthPath,
  mergeStatCap,
  type GrowthPathJob,
  type StatBlock,
  type StatKey,
} from "@fesim/engine";
import type { BuilderCharProp, BuilderJobProp, BuilderProps } from "./fe17";

/**
 * 캐릭터 빌더 표시층 — 클라이언트 안전 순수 함수(☠fe17.ts는 타입만 참조한다).
 * 계산 자체는 엔진 growthPath 하나가 답한다(설계 design/avg_stats_builder.md §3 — 복제 금지).
 * 여기가 소유하는 것은 **표시 규약**뿐이다: 소수 1자리 · 캡 도달은 정수 · 전용직 가능자 상단.
 */

export interface BuilderCell {
  /** 표시 문자열 — 캡 도달은 정수(캡값), 그 외는 소수 1자리(정수 스탯 + 누적기/100). */
  text: string;
  /** 정렬 비교값 — 캡 정수도 같은 축에서 비교한다. */
  value: number;
  capped: boolean;
}

export interface BuilderRow {
  pid: string;
  name: string;
  face?: string;
  /** 도달 내부 레벨(1기점). */
  internal: number;
  /** 목표 직업 값이 실제로 반영됐는가 — false면 합류 상태 표시(괄호·흐림). */
  projected: boolean;
  /** 전용직 대상 밖 — 합류 상태 값으로 남긴다(회색 표시 신호). */
  ineligible: boolean;
  cells: Record<StatKey, BuilderCell>;
}

export interface BuilderSort {
  key: StatKey;
  dir: "asc" | "desc";
}

/** 상한 = job.Limit + person.Limit(mergeStatCap 정본) — ☠job.Limit 단독으로 계산하면 도달 불가 수치가 표에 선다. */
const withPersonCap = (job: GrowthPathJob, personLimit: StatBlock): GrowthPathJob => ({
  ...job,
  limit: mergeStatCap(job.limit, personLimit),
});

/**
 * 한 캐릭터의 표시행 — growthPath 호출 1회.
 * 미선택(job === undefined)과 전용직 불가 행은 **합류 상태**로 낸다(같은 직업·같은 내부 레벨을 목표로 준다).
 */
export function builderRow(
  char: BuilderCharProp,
  joinJob: GrowthPathJob,
  job: BuilderJobProp | undefined,
  targetInternal: number,
): BuilderRow {
  const ineligible = job !== undefined && job.uniquePid !== undefined && job.uniquePid !== char.pid;
  const asJoined = job === undefined || ineligible;
  const join = withPersonCap(joinJob, char.personLimit);
  const target = asJoined ? join : withPersonCap(job, char.personLimit);
  const goal = asJoined ? char.internalOffset + char.joinLevel : targetInternal;
  const path = growthPath({
    joinJob: join,
    targetJob: target,
    joinLevel: char.joinLevel,
    internalOffset: char.internalOffset,
    personGrowth: char.personGrowth,
    personOffset: char.personOffset,
    targetInternal: goal,
    ...(char.workSkills !== undefined ? { workSkills: char.workSkills } : {}),
  });
  const capped = new Set(path.capped);
  const cells = {} as Record<StatKey, BuilderCell>;
  for (const key of STAT_KEYS) {
    const stat = path.stats[key];
    const hit = capped.has(key);
    // 캡에 닿으면 누적기가 멈추므로(growthPath의 상한 게이트) 소수부는 표시하지 않는다.
    const value = hit ? stat : stat + path.acc[key] / 100;
    // ☠toFixed 금지 — 이진 부동소수에서 6.35가 "6.3"으로 떨어진다. 누적기가 정수라
    //   (스탯*100 + acc)/10을 정수 반올림하면 반올림 자리가 정확하다(half-up).
    const tenth = Math.round((stat * 100 + path.acc[key]) / 10) / 10;
    cells[key] = { text: hit ? String(stat) : tenth.toFixed(1), value, capped: hit };
  }
  return {
    pid: char.pid,
    name: char.name,
    ...(char.face !== undefined ? { face: char.face } : {}),
    internal: path.internal,
    projected: !asJoined && path.promoted,
    ineligible,
    cells,
  };
}

/** 로스터 전체(합류순 입력 그대로). 합류 직업 단면이 없는 캐릭터는 계산 입력이 없어 표에서 빠진다. */
export function builderRows(
  props: Pick<BuilderProps, "chars" | "joinJobs">,
  job: BuilderJobProp | undefined,
  targetInternal: number,
): BuilderRow[] {
  const rows: BuilderRow[] = [];
  for (const char of props.chars) {
    const joinJob = props.joinJobs[char.joinJid];
    if (joinJob === undefined) continue;
    rows.push(builderRow(char, joinJob, job, targetInternal));
  }
  return rows;
}

/**
 * 표시 순서 — 전용직 가능자가 항상 위, 그 안에서 정렬(미지정이면 입력 순서).
 * Array.sort는 안정 정렬이라 동값은 합류순을 지킨다.
 */
export function sortBuilderRows(rows: readonly BuilderRow[], sort: BuilderSort | undefined): BuilderRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    const group = Number(a.ineligible) - Number(b.ineligible);
    if (group !== 0) return group;
    if (sort === undefined) return 0;
    const diff = a.cells[sort.key].value - b.cells[sort.key].value;
    return sort.dir === "asc" ? diff : -diff;
  });
  return out;
}
