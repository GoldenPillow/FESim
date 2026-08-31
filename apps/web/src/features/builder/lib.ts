import {
  STAT_KEYS,
  combatEnv,
  createCalculator,
  growthPath,
  mergeStatCap,
  type GrowthPathJob,
  type SkillRow,
  type StatBlock,
  type StatKey,
} from "@fesim/engine";
import type { CalculatorData } from "@fesim/shared";
import calculatorRaw from "../../../../../data/fe17/tables/calculator.json?raw";
import { rankValue, type BuilderCharProp, type BuilderEmblemProp, type BuilderEngraveProp, type BuilderJobProp, type BuilderProps, type BuilderWeaponProp } from "../../lib/fe17";
import type { EntryLock } from "../../lib/guestSave";

/**
 * 엔트리 빌더 표시층 — 클라이언트 안전 순수 함수(☠fe17.ts는 타입만 참조한다).
 * 계산 자체는 엔진 growthPath 하나가 답한다(설계 design/avg_stats_builder.md §3 — 복제 금지).
 * 여기가 소유하는 것은 **표시 규약**뿐이다: 소수 1자리 · 캡 도달은 정수 · 전용직 가능자 상단.
 */

export interface BuilderCell {
  /** 표시 문자열 — 캡 도달은 정수(캡값), 그 외는 소수 1자리(정수 스탯 + 누적기/100). */
  text: string;
  /** 정렬 비교값 — 캡 정수도 같은 축에서 비교한다. */
  value: number;
  capped: boolean;
  /** 문장사 絆 보너스로 오른 셀 — 블루 표기 신호(SPD 무게 감소 레드보다 우선, 2026-08-31 사용자 지시). */
  buffed?: boolean;
}

export interface BuilderRow {
  pid: string;
  name: string;
  face?: string;
  /** 도달 내부 레벨(0기점 = 성장 레벨 수 — 内部レベル計算 정본, 모브 앵커 31). */
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

/** 헤더 클릭 순환 — 내림 → 오름 → 초기화(합류순 = undefined). 다른 열 클릭은 그 열 내림부터. */
export const nextSort = (sort: BuilderSort | undefined, key: StatKey): BuilderSort | undefined =>
  sort?.key !== key ? { key, dir: "desc" } : sort.dir === "desc" ? { key, dir: "asc" } : undefined;

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
  extraSkills?: readonly SkillRow[],
): BuilderRow {
  const ineligible = job !== undefined && job.uniquePid !== undefined && job.uniquePid !== char.pid;
  const asJoined = job === undefined || ineligible;
  const join = withPersonCap(joinJob, char.personLimit);
  const target = asJoined ? join : withPersonCap(job, char.personLimit);
  // 합류 내부(0기점) = base + 레벨 − 1 — growthPath의 산식과 같은 값을 목표로 줘야 "합류 상태"가 된다.
  const goal = asJoined ? char.internalOffset + char.joinLevel - 1 : targetInternal;
  const path = growthPath({
    joinJob: join,
    targetJob: target,
    joinLevel: char.joinLevel,
    internalOffset: char.internalOffset,
    personGrowth: char.personGrowth,
    personOffset: char.personOffset,
    targetInternal: goal,
    ...(() => {
      const workSkills = [...(char.workSkills ?? []), ...(extraSkills ?? [])];
      return workSkills.length > 0 ? { workSkills } : {};
    })(),
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
  extraSkills?: readonly SkillRow[],
): BuilderRow[] {
  const rows: BuilderRow[] = [];
  for (const char of props.chars) {
    const joinJob = props.joinJobs[char.joinJid];
    if (joinJob === undefined) continue;
    rows.push(builderRow(char, joinJob, job, targetInternal, extraSkills));
  }
  return rows;
}

/** 비교 슬롯 — 직업 + 그 슬롯의 목표 내부 레벨(0기점 · 2026-08-31: 슬롯마다 선택기, 기본은 1번 추종).
    equipped는 전투력 행에서만 소비된다(성장 스탯은 장비 무관). */
export interface BuilderCompare {
  job: BuilderJobProp;
  internal: number;
  equipped?: EquippedWeapon;
}

/**
 * 멀티클래스 비교 — 캐릭터당 [슬롯별 라인] 묶음(선택 순서 = 라인 순서 = 헤더 성장률 행 순서).
 * 직업 미선택(빈 배열)은 합류 상태 1라인. ☠슬롯별 builderRows는 같은 로스터를 돌므로 zip이 안전하다.
 */
export function builderRowGroups(
  props: Pick<BuilderProps, "chars" | "joinJobs">,
  compares: readonly BuilderCompare[],
  extraSkills?: readonly SkillRow[],
): BuilderRow[][] {
  if (compares.length === 0) return builderRows(props, undefined, 0, extraSkills).map((r) => [r]);
  const perJob = compares.map((c) => builderRows(props, c.job, c.internal, extraSkills));
  return perJob[0]!.map((_, i) => perJob.map((rows) => rows[i]!));
}

/**
 * 표시 순서 — 전용직 가능자가 항상 위, 그 안에서 정렬(미지정이면 입력 순서).
 * 기준은 **첫 직업 라인**(비교 라인은 따라간다). Array.sort는 안정 정렬이라 동값은 합류순을 지킨다.
 */
/** 잠금 순서 이동(드래그 커밋) — 순수 이동: 원본 불변이어야 상태·저장분이 안 어긋난다. */
export function moveLock(locked: readonly EntryLock[], from: number, to: number): EntryLock[] {
  const next = [...locked];
  const [entry] = next.splice(from, 1);
  if (entry !== undefined) next.splice(to, 0, entry);
  return next;
}

/**
 * 문장사 絆 보너스 합산 — 성장 경로(growthPath) 밖 평면 가산(EnhanceValue 층, 보드 staticEnhances와 동축).
 * 셀 표시·정렬값·상승 표식(buffed)을 함께 움직인다 — 원본 불변(정렬·유령 카드가 같은 행을 공유한다).
 */
export function applyEmblemBonus(row: BuilderRow, delta: Partial<Record<StatKey, number>>): BuilderRow {
  const cells = { ...row.cells };
  for (const [key, d] of Object.entries(delta) as [StatKey, number][]) {
    if (d === 0) continue;
    const cell = cells[key];
    const text = cell.capped ? String(Number(cell.text) + d) : (parseFloat(cell.text) + d).toFixed(1);
    cells[key] = { ...cell, text, value: cell.value + d, ...(d > 0 ? { buffed: true as const } : {}) };
  }
  return { ...row, cells };
}

/** 대기 목록 한 묶음 — ghost = 엔트리에 잠긴 캐릭터의 비교용 임시 카드(반투명·무반응, 정렬·비교표에는 참가). */
export interface WaitingGroup {
  rows: BuilderRow[];
  ghost: boolean;
}

/** 대기 목록 — 잠긴 캐릭터도 유령 카드로 남아 전체 정렬을 지난다(2026-08-31: 엔트리 멤버 비교분석). */
export function waitingRowGroups(
  groups: readonly BuilderRow[][],
  locked: readonly EntryLock[],
  sort: BuilderSort | undefined,
): WaitingGroup[] {
  const pids = new Set(locked.map((e) => e.pid));
  return sortRowGroups(groups, sort).map((g) => ({ rows: g, ghost: pids.has(g[0]!.pid) }));
}

export interface LockedDisplay {
  row: BuilderRow;
  /** 스냅샷 직업 — 직업 미선택 잠금·사라진 jid는 없음(합류 상태 표시). 이름·무기군 아이콘이 소비. */
  job?: BuilderJobProp;
  /** 스냅샷 무기(iid·강화) — 사라진 iid는 맨손으로 강하. */
  equipped?: EquippedWeapon;
}

/**
 * 잠금 스냅샷 표시행 — 잠근 순서 그대로, 잠금 당시 (직업, 내부 레벨, 성옥, 무기)만 소비한다("고정"의 실체).
 * 로스터에 없는 pid(스포일러 숨김·이물 저장값)는 건너뛰고, 사라진 jid는 합류 상태로 강하한다
 * (괄호·흐림 표시가 강하를 드러낸다 — 조용히 다른 직업 수치를 파는 것보다 낫다).
 */
export function lockedDisplayRows(
  props: Pick<BuilderProps, "chars" | "joinJobs">,
  jobs: readonly BuilderJobProp[],
  locked: readonly EntryLock[],
  starsphere?: SkillRow,
  weapons: readonly BuilderWeaponProp[] = [],
  engraves: readonly BuilderEngraveProp[] = [],
  emblems: readonly BuilderEmblemProp[] = [],
): LockedDisplay[] {
  const byPid = new Map(props.chars.map((c) => [c.pid, c]));
  const out: LockedDisplay[] = [];
  for (const entry of locked) {
    const char = byPid.get(entry.pid);
    if (char === undefined) continue;
    const joinJob = props.joinJobs[char.joinJid];
    if (joinJob === undefined) continue;
    const job = entry.jid === undefined ? undefined : jobs.find((j) => j.jid === entry.jid);
    const extra = entry.star === true && starsphere !== undefined ? [starsphere] : undefined;
    const row = builderRow(char, joinJob, job, entry.internal, extra);
    const weapon = entry.iid === undefined ? undefined : weapons.find((w) => w.iid === entry.iid);
    // 각인도 무기처럼 강하 — 목록 밖 gid(체커 숨김·이물)는 무각인으로(괄호 표시는 없지만 값 오염보다 낫다).
    const engrave = entry.engrave === undefined ? undefined : engraves.find((g) => g.gid === entry.engrave);
    // 문장사 반지도 같은 강하 축 — 목록 밖 gid는 무보정. 보너스는 스냅샷 셀에 직접 붙는다(블루 표기).
    const emblem = entry.gid === undefined ? undefined : emblems.find((m) => m.gid === entry.gid);
    const delta = emblem === undefined || entry.bond === undefined ? undefined : emblem.bonuses[entry.bond - 1];
    out.push({
      row: delta === undefined ? row : applyEmblemBonus(row, delta),
      ...(job !== undefined ? { job } : {}),
      ...(weapon !== undefined
        ? { equipped: { weapon, plus: entry.plus ?? 0, ...(engrave !== undefined ? { engrave } : {}) } }
        : {}),
    });
  }
  return out;
}

/* ── 장착 게이트 — 무기군(Kind) + 랭크(WeaponLevel ≤ MaxWeaponLevel). ── */

// 랭크 서열은 fe17(목록 정렬과 공용 정본)이 소유한다 — 여기서 재정의하면 서열이 갈라진다.
export { rankValue };

/** 클래스가 이 무기를 들 수 있나 — 무기군 적성 + 랭크 게이트(Flag 256 = 랭크 무시). */
export const canEquip = (job: BuilderJobProp, weapon: BuilderWeaponProp): boolean => {
  const max = job.weaponRanks[weapon.kind];
  if (max === undefined) return false;
  return weapon.ignoreRank === true || rankValue(weapon.rank) <= rankValue(max);
};

/** 장착 상태 — plus 0 = 노강화, 1~5 = 錬成 단계(refine 누적 보정). engrave = 각인(무기 실효치에 직접 가산). */
export interface EquippedWeapon {
  weapon: BuilderWeaponProp;
  plus: number;
  engrave?: BuilderEngraveProp;
}

/** 강화·각인 반영 실효 무기 수치 — 스펙 표시·전투력 env가 같은 값을 쓴다(이중화 금지).
    각인은 인게임에서도 무기 스탯 게터 안 직접 가산이다(fidelity weapons.forge-engrave §11).
    무게만 0 하한 — 각인 감량(음수)으로 내려가도 공속식의 max 게이트라 결과는 0과 동일하고,
    음수 무게 표기는 인게임에 없다. */
export function weaponAt(weapon: BuilderWeaponProp, plus: number, engrave?: BuilderEngraveProp): {
  might: number; hit: number; crit: number; weight: number; avoid: number; dodge: number; magic: boolean;
} {
  const stage = plus > 0 ? weapon.refine?.[plus - 1] : undefined;
  return {
    might: weapon.might + (stage?.power ?? 0) + (engrave?.power ?? 0),
    hit: weapon.hit + (stage?.hit ?? 0) + (engrave?.hit ?? 0),
    crit: weapon.crit + (stage?.crit ?? 0) + (engrave?.crit ?? 0),
    weight: Math.max(0, weapon.weight + (stage?.weight ?? 0) + (engrave?.weight ?? 0)),
    avoid: weapon.avoid + (engrave?.avoid ?? 0),
    dodge: weapon.dodge + (engrave?.dodge ?? 0),
    magic: weapon.magic,
  };
}

/* ── 전투력 사영 — 인게임 유닛 단면(전투 능력)의 self-only 식을 정본(calculator.json) 그대로 평가한다.
   맨손 = 무기·지원·지형 항 전부 0. 장착 = 정본 식의 무기 변수를 채우는 것만이 합산이다(2026-08-31). */

const calculator = createCalculator(JSON.parse(calculatorRaw) as CalculatorData);

/** 전투 능력 순서(인게임 유닛 화면 순, 공격은 물공·마공 분리 — 2026-08-31 사용자 지시).
    맨손 물공·마공 = 순수 힘·마력. ☠공속(攻撃速度計算)은 표시하지 않는다 — 인게임 전투 능력에 없는
    항목(2026-08-31 사용자 지시로 추가했다 철회). 무게 페널티는 회피 하락(레드)으로 드러난다.
    장착 = Combatant.weapon만 채우면 정본 식이 그대로 합산. */
export const COMBAT_KEYS = ["patk", "matk", "hit", "avoid", "crit", "ddg"] as const;
export type CombatKey = (typeof COMBAT_KEYS)[number];

const COMBAT_FORMULAS: Record<Exclude<CombatKey, "matk">, string> = {
  patk: "攻撃力計算",
  hit: "命中値計算",
  avoid: "回避値計算",
  crit: "必殺値計算",
  ddg: "必殺回避計算",
};

/** 평균 스탯의 전투력 — 소수를 유지한 채 정본 식을 평가한다(표시 반올림은 표시층 소관).
    장착 시: Enhance는 스탯에 합산 후 평가, 무기 항은 env 변수로 채운다(공속 게이트가 회피에 산다).
    공격은 무기 속성 쪽에만 위력이 합산되고 반대쪽은 순수 스탯이다(물공·마공 분리 표기). */
export function combatOf(row: BuilderRow, equipped?: EquippedWeapon): Record<CombatKey, number> {
  const enhance = equipped?.weapon.enhance;
  const v = (key: StatKey): number => row.cells[key].value + (enhance?.[key] ?? 0);
  const weapon = equipped === undefined ? undefined : weaponAt(equipped.weapon, equipped.plus, equipped.engrave);
  const env = combatEnv({
    stats: {
      maxHp: v("hp"),
      hp: v("hp"),
      str: v("str"),
      mag: v("mag"),
      dex: v("dex"),
      spd: v("spd"),
      lck: v("lck"),
      def: v("def"),
      res: v("res"),
      bld: v("bld"),
    },
    ...(weapon !== undefined ? { weapon } : {}),
  });
  const out = {} as Record<CombatKey, number>;
  for (const key of Object.keys(COMBAT_FORMULAS) as (keyof typeof COMBAT_FORMULAS)[]) {
    out[key] = calculator.eval(COMBAT_FORMULAS[key], env) as number;
  }
  // 攻撃力計算은 무기 속성이 힘/마력을 고른다 — 반대쪽 공격은 순수 스탯으로 되돌린다(중복 합산 금지).
  if (weapon?.magic === true) {
    out.matk = out.patk;
    out.patk = v("str");
  } else {
    out.matk = v("mag");
  }
  return out;
}

export function sortRowGroups(groups: readonly BuilderRow[][], sort: BuilderSort | undefined): BuilderRow[][] {
  const out = [...groups];
  out.sort((a, b) => {
    const first = a[0]!;
    const second = b[0]!;
    const group = Number(first.ineligible) - Number(second.ineligible);
    if (group !== 0) return group;
    if (sort === undefined) return 0;
    const diff = first.cells[sort.key].value - second.cells[sort.key].value;
    return sort.dir === "asc" ? diff : -diff;
  });
  return out;
}
