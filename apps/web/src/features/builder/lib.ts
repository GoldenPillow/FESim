import {
  STAT_KEYS,
  combatEnv,
  createCalculator,
  growthPath,
  mergeStatCap,
  staticEnhances,
  type GrowthPathJob,
  type SkillRow,
  type StatBlock,
  type StatKey,
} from "@fesim/engine";
import type { CalculatorData } from "@fesim/shared";
import calculatorRaw from "../../../../../data/fe17/tables/calculator.json?raw";
import type {
  BuilderCharProp,
  BuilderEmblemProp,
  BuilderEngraveProp,
  BuilderJobProp,
  BuilderProps,
  BuilderWeaponProp,
} from "../../lib/fe17";
import { rankValue } from "../../lib/weaponRank";
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
  /** 도달 상한(mergeStatCap 합성값) — 기본치의 캡 표기(정수) 판정용. ☠강화치는 이 위를 넘는다(GetCapability 0x1A2DD80). */
  cap: number;
  /** 문장사 絆 보너스·계승 스킬로 오른 셀 — 블루 표기 신호(SPD 무게 감소 레드보다 우선, 2026-08-31 사용자 지시). */
  buffed?: boolean;
  /** 합산 내역(호버 오버레이, 2026-09-02) — 기본값 위에 얹힌 층만 순서대로(캡 클램프 후 실가산치). */
  parts?: { source: BonusSource; value: number }[];
}

export type BonusSource = "emblem" | "skill";

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
  /** 문장사 絆 보너스 델타(비영 키만) — 카드 하단 "+N" 행이 소비(2026-08-31 사용자 지시). */
  emblemDelta?: Partial<Record<StatKey, number>>;
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

/** In.Lv 하한(0기점) = clamp(내부 base + 합류 레벨 − 1, 0, 50) — 엔진 growthPath의 joinInternal과 같은 식.
    ☠식을 복제하지 말 것: 층마다 다르면 한 층은 "In.lv 24", 다른 층은 합류 직업 스탯을 말한다(2026-09-07 시작 레벨 불변). */
export const joinInternalOf = (c: Pick<BuilderCharProp, "internalOffset" | "joinLevel">): number =>
  Math.min(Math.max(c.internalOffset + c.joinLevel - 1, 0), 50);

/**
 * 한 캐릭터의 표시행 — growthPath 호출 1회.
 * 미선택(job === undefined)과 전용직 불가·여성 전용 불가 행은 **합류 상태**로 낸다(같은 직업·같은 내부 레벨을 목표로 준다).
 * 목표 내부는 합류 하한으로 올린다(하한 밑 목표 = 목표 직업 @ 합류 레벨, 2026-09-07).
 */
export function builderRow(
  char: BuilderCharProp,
  joinJob: GrowthPathJob,
  job: BuilderJobProp | undefined,
  targetInternal: number,
  extraSkills?: readonly SkillRow[],
): BuilderRow {
  const ineligible =
    job !== undefined &&
    ((job.uniquePid !== undefined && job.uniquePid !== char.pid) || (job.female === true && char.female !== true));
  const asJoined = job === undefined || ineligible;
  const join = withPersonCap(joinJob, char.personLimit);
  const target = asJoined ? join : withPersonCap(job, char.personLimit);
  // 합류 상태 = 목표를 하한에 둔다(growthPath의 joinInternal과 같은 값 = 성장 0회).
  const floor = joinInternalOf(char);
  const goal = asJoined ? floor : Math.max(targetInternal, floor);
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
    cells[key] = { text: hit ? String(stat) : tenth.toFixed(1), value, capped: hit, cap: target.limit[key] };
  }
  return {
    pid: char.pid,
    name: char.name,
    ...(char.face !== undefined ? { face: char.face } : {}),
    internal: path.internal,
    // 합류 직업 자체가 목표면 승급이 필요 없다 — 리셋 상태(영입 시점 @ 시작 레벨)를 "미적용"으로 위장하지 않는다.
    projected: job !== undefined && !ineligible && (path.promoted || job.jid === char.joinJid),
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
/** 카드 개별 클래스·In.Lv(세션) — jid 없음 = 글로벌 직업(없으면 영입 시점 직업) · internal 미지정 = 글로벌 In.Lv 추종(직업이 없으면 시작 레벨). */
export interface CardClass {
  jid?: string;
  internal?: number;
}

/**
 * 카드 클래스·In.Lv 패치 — 첫 터치에 글로벌 직업만 분기(카피 온 라이트)한다.
 * ☠internal은 사용자가 직접 고른 값만 박는다 — 직업 변경 때 글로벌 In.Lv를 숫자로 스냅샷하면
 * 그 카드는 이후 글로벌 In.Lv 변경을 못 따라간다(2026-09-05 실사고: 직업만 바꿨는데 40에 고정).
 */
export function patchCardClass(
  cur: CardClass | undefined,
  globalJid: string | undefined,
  patch: { jid?: string; internal?: number },
): CardClass {
  const base = cur ?? (globalJid !== undefined ? { jid: globalJid } : {});
  const jid = patch.jid !== undefined ? (patch.jid === "" ? undefined : patch.jid) : base.jid;
  const internal = patch.internal ?? base.internal;
  return { ...(jid !== undefined ? { jid } : {}), ...(internal !== undefined ? { internal } : {}) };
}

/** 잠금 카드 리셋(2026-09-05 사용자 지시) — 영입 시점(jid 없음 = 합류 직업 · 내부 0 = 시작 레벨, lockClassOf가 하한으로
    읽는다)으로, 장비·반지·계승 스킬 전부 제거. 성옥 체커 스냅샷만 남긴다(카드 편집값이 아니라 글로벌 체커의 박제). */
export function resetEntryLock(e: EntryLock): EntryLock {
  return { pid: e.pid, internal: 0, ...(e.star === true ? { star: true } : {}) };
}

/** 잠금 스냅샷의 실효 (직업, 내부) — jid 없음 = 영입 시점 직업, 내부는 합류 하한으로 올려 읽는다(구 저장분 `internal 0`
    = 시작 레벨). 표시(lockedDisplayRows)·편집(patchLockClass)이 같은 답변자를 쓴다(2026-09-07). */
export function lockClassOf(e: EntryLock, c: BuilderCharProp): { jid: string; internal: number } {
  return { jid: e.jid ?? c.joinJid, internal: Math.max(e.internal, joinInternalOf(c)) };
}

/** `${pid}:${li}` 키 맵(카드 개인 장비 오버라이드)에서 그 카드 것만 걷는다 — 잠금·리셋·글로벌 추종 복귀 공용. */
export function dropCardKeys<T>(map: Record<string, T>, pid: string): Record<string, T> {
  return Object.fromEntries(Object.entries(map).filter(([k]) => !k.startsWith(`${pid}:`)));
}

/** 무게 페널티 — 정본 `攻撃速度計算 = 速さ − max(武器の重さ − 体格, 0)`의 감산항. 인게임 상태 화면은
    이 값을 뺀 속도를 붉게 보인다(2026-09-05 사용자 관측: "붉게만 되고 스탯이 안 빠진다"). 체격은 무기 Enhance 포함. */
export function weightPenalty(row: BuilderRow, equipped: EquippedWeapon | undefined): number {
  if (equipped === undefined) return 0;
  const w = weaponAt(equipped.weapon, equipped.plus, equipped.engrave).weight;
  return Math.max(0, w - (row.cells.bld.value + (equipped.weapon.enhance?.bld ?? 0)));
}

/** 페널티를 뺀 표시 문자열 — cell.text의 소수 자리를 지킨다(평균 체격이 소수면 페널티도 소수 → 1자리). */
export function penalizedText(cell: BuilderCell, penalty: number): string {
  if (penalty <= 0) return cell.text;
  const dot = cell.text.indexOf(".");
  const dec = Math.max(dot < 0 ? 0 : cell.text.length - dot - 1, Number.isInteger(penalty) ? 0 : 1);
  return (Number(cell.text) - penalty).toFixed(dec);
}

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
  return applyStatBonus(row, delta, "emblem");
}

/** 평면 스탯 가산의 공용 본체(2026-09-02: 문장사 絆 + 계승 스킬) — 층별 내역(parts)을 누적하고,
    emblemDelta(카드 +N 행)는 문장사 층만 갱신한다. 캡 클램프 뒤 실제 오른 만큼만 내역에 적는다. */
export function applyStatBonus(row: BuilderRow, delta: Partial<Record<StatKey, number>>, source: BonusSource): BuilderRow {
  const cells = { ...row.cells };
  for (const [key, d] of Object.entries(delta) as [StatKey, number][]) {
    if (d === 0) continue;
    const cell = cells[key];
    // ★정본 `Unit.GetCapability` 0x1A2DD80 = Clamp(Clamp(base, 0, Limit) + Enhance, min, 255) — 강화치(문장사·스킬
    //   EnhanceValue)는 **상한 클램프 뒤에** 더해져 캡을 넘는다(il2cpp/STATS_GROWTH §2-1). 2026-09-01의 캡 클램프는
    //   이를 잘라 캡 근처에서 문장사만 남거나 둘 다 사라졌다(2026-09-05 사용자 관측) → 정본대로 255만 상한.
    const value = Math.min(cell.value + d, 255);
    const text = cell.capped ? String(Number(cell.text) + d) : (parseFloat(cell.text) + d).toFixed(1);
    const parts = [...(cell.parts ?? []), { source, value: d }];
    cells[key] = { ...cell, text, value, parts, ...(d > 0 ? { buffed: true as const } : {}) };
  }
  return source === "emblem" ? { ...row, cells, emblemDelta: delta } : { ...row, cells };
}

/** 계승 스킬의 정적 스탯 델타 — 엔진 staticEnhances(EnhanceValue.* 층)와 동축, 비영 키만.
    이동(Move)은 표 열이 없어 여기 안 실린다. */
export function skillStatDelta(rows: readonly SkillRow[]): Partial<Record<StatKey, number>> {
  const zero = {} as StatBlock;
  for (const key of STAT_KEYS) zero[key] = 0;
  const sum = staticEnhances(zero, rows);
  const out: Partial<Record<StatKey, number>> = {};
  for (const key of STAT_KEYS) if (sum[key] !== 0) out[key] = sum[key];
  return out;
}

/** 계승 슬롯 드롭다운 옵션 — 문장사 영입 순서(emblems 순)로 [문장사 헤더][스킬(들여쓰기)]…, 맨 앞 = 빈 칸.
    다른 칸이 든 sid는 비활성(같은 스킬 2개 장착 불가). 헤더는 선택 불가 라벨(반지 아이콘). */
export interface InheritOption {
  value: string;
  label: string;
  icon?: string;
  header?: true;
  indent?: true;
  disabled?: true;
  help?: string;
  /** 계승 SP 비용(숫자만 표기 — 2026-09-02 사용자 지시). */
  cost?: number;
}
export function inheritOptions(emblems: readonly BuilderEmblemProp[], noneLabel: string, takenSid?: string): InheritOption[] {
  const out: InheritOption[] = [{ value: "", label: noneLabel }];
  for (const e of emblems) {
    if (e.inherits.length === 0) continue;
    out.push({ value: `#${e.gid}`, label: e.name, header: true, ...(e.icon !== undefined ? { icon: e.icon } : {}) });
    for (const s of e.inherits) {
      out.push({
        value: s.sid,
        label: s.name,
        indent: true,
        ...(s.icon !== undefined ? { icon: s.icon } : {}),
        ...(s.help !== undefined ? { help: s.help } : {}),
        ...(s.cost !== undefined ? { cost: s.cost } : {}),
        ...(takenSid !== undefined && takenSid === s.sid ? { disabled: true as const } : {}),
      });
    }
  }
  return out;
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
 * jid 없음 = 영입 시점 직업(lockClassOf). 로스터에 없는 pid(스포일러 숨김·이물 저장값)는 건너뛰고, 사라진 jid는
 * 합류 상태로 강하한다(괄호·흐림 표시가 강하를 드러낸다 — 조용히 다른 직업 수치를 파는 것보다 낫다).
 */
export function lockedDisplayRows(
  props: Pick<BuilderProps, "chars" | "joinJobs">,
  jobs: readonly BuilderJobProp[],
  locked: readonly EntryLock[],
  starsphere?: SkillRow,
  weapons: readonly BuilderWeaponProp[] = [],
  engraves: readonly BuilderEngraveProp[] = [],
): LockedDisplay[] {
  const byPid = new Map(props.chars.map((c) => [c.pid, c]));
  const out: LockedDisplay[] = [];
  for (const entry of locked) {
    const char = byPid.get(entry.pid);
    if (char === undefined) continue;
    const joinJob = props.joinJobs[char.joinJid];
    if (joinJob === undefined) continue;
    const cls = lockClassOf(entry, char);
    const job = jobs.find((j) => j.jid === cls.jid);
    const extra = entry.star === true && starsphere !== undefined ? [starsphere] : undefined;
    const row = builderRow(char, joinJob, job, cls.internal, extra);
    const weapon = entry.iid === undefined ? undefined : weapons.find((w) => w.iid === entry.iid);
    // 각인도 무기처럼 강하 — 목록 밖 gid(체커 숨김·이물)는 무각인으로(괄호 표시는 없지만 값 오염보다 낫다).
    // ☠반지(gid·bond)는 여기서 합산하지 않는다 — 본스탯 행은 순수값, 최종스탯은 반지 행이 소유
    //   (applyEmblemBonus를 렌더 층이 호출, 2026-08-31 사용자 지시).
    const engrave = entry.engrave === undefined ? undefined : engraves.find((g) => g.gid === entry.engrave);
    out.push({
      row,
      ...(job !== undefined ? { job } : {}),
      ...(weapon !== undefined
        ? { equipped: { weapon, plus: entry.plus ?? 0, ...(engrave !== undefined ? { engrave } : {}) } }
        : {}),
    });
  }
  return out;
}

/* ── 장착 게이트 — 무기군(Kind) + 랭크(WeaponLevel ≤ MaxWeaponLevel). ── */

// 랭크 서열은 weaponRank(목록 정렬과 공용 정본)가 소유한다 — 여기서 재정의하면 서열이 갈라진다.
export { rankValue };

/** 무기군 하나의 실효 랭크 단면 — innate = 캐릭터 고유 적성(person.Aptitude)이 이 무기군을 포함. */
export interface WeaponRankView {
  kind: number;
  rank: string;
  innate: boolean;
}

const RANK_STEPS = ["N", "E", "D", "C", "B", "A", "S"] as const;

/** 실효 무기 랭크 — 인게임 JobData.GetMaxWeaponLevel(index, originalAptitude)(RVA 0x2056C30):
    직업 랭크의 '+'(WeaponLevelPlusMask)와 캐릭터 고유 적성(비트 = 1<<kind)이 둘 다 맞을 때만 한 단계
    승격(S 상한), 아니면 '+'를 뗀 값. originalAptitude = person.Aptitude만(Unit.Create 0x1A086E0 —
    SubAptitude는 전직 자격 마스크에만 OR). 클래스에 없는 무기군은 적성이 있어도 목록에 없다. */
export const effectiveWeaponRanks = (weaponRanks: Record<number, string>, aptitude = 0): WeaponRankView[] =>
  Object.entries(weaponRanks)
    .map(([k, raw]) => {
      const kind = Number(k);
      const innate = (aptitude & (1 << kind)) !== 0;
      const base = raw.replace("+", "");
      const idx = RANK_STEPS.indexOf(base as (typeof RANK_STEPS)[number]);
      const up = raw.endsWith("+") && innate && idx >= 0;
      return { kind, rank: up ? RANK_STEPS[Math.min(idx + 1, RANK_STEPS.length - 1)] as string : base, innate };
    })
    .sort((a, b) => a.kind - b.kind);

/** 클래스가 이 무기를 들 수 있나 — 무기군 적성 + 실효 랭크 게이트(Flag 256 = 랭크 무시).
    aptitude = 캐릭터 고유 적성 비트마스크(캐릭터가 특정되지 않는 글로벌 목록은 0 = 보정 없음). */
export const canEquip = (job: BuilderJobProp, weapon: BuilderWeaponProp, aptitude = 0): boolean => {
  const max = job.weaponRanks[weapon.kind];
  if (max === undefined) return false;
  if (weapon.ignoreRank === true) return true;
  const eff = effectiveWeaponRanks({ [weapon.kind]: max }, aptitude)[0]?.rank ?? max;
  return rankValue(weapon.rank) <= rankValue(eff);
};

/** 직업 변경 시 장비 승계 판정(2026-09-01 사용자 지시) — 씨드 장비(그 슬롯 현재분, 없으면 메인 슬롯)를
    새 직업이 들 수 있으면 그대로 장착(강화·각인 동반), 못 들거나 직업·씨드 미지정이면 미장착(undefined). */
export function carriedEquip(
  job: BuilderJobProp | undefined,
  seed: { iid?: string; plus?: number; engrave?: string },
  weapons: readonly BuilderWeaponProp[],
  aptitude = 0,
): { iid: string; plus?: number; engrave?: string } | undefined {
  if (job === undefined || seed.iid === undefined) return undefined;
  const weapon = weapons.find((w) => w.iid === seed.iid);
  if (weapon === undefined || !canEquip(job, weapon, aptitude)) return undefined;
  return {
    iid: weapon.iid,
    ...(seed.plus !== undefined ? { plus: seed.plus } : {}),
    ...(seed.engrave !== undefined ? { engrave: seed.engrave } : {}),
  };
}

/** 메인(1번) 슬롯 강화·각인 변경의 적용 대상(2026-09-01 사용자 지시: 메인 무기와 동일하면 업그레이드도
    변경시마다 따라 적용) — 메인에서 바꾸면 같은 무기를 든 비교 슬롯까지, 비교 슬롯에서 바꾸면 그 슬롯만. */
export function upgradeTargets(slots: readonly { iid?: string }[], i: number): Set<number> {
  const main = slots[0]?.iid;
  const follow = i === 0 && main !== undefined;
  return new Set(slots.flatMap((v, idx) => (idx === i || (follow && idx > 0 && v.iid === main) ? [idx] : [])));
}

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
export function combatOf(
  row: BuilderRow,
  equipped?: EquippedWeapon,
  skills: readonly SkillRow[] = [],
): Record<CombatKey, number> {
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
    // 계승 스킬의 전투 보정(命中値 + 10 등)은 엔진 makeSkillModifier가 식 평가 안에서 건다(2026-09-02).
    // 정적 EnhanceValue 층은 row.cells에 이미 합산돼 있다(applyStatBonus) — 여기서 다시 더하지 않는다.
    ...(skills.length > 0 ? { skills } : {}),
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

/* ── 표시 규약 상수 — ☠BuilderIsland에서 이사왔다(2026-09-07). 공유 산출물(HTML·카드 이미지)이 표와
   **같은 라벨·같은 포맷터**를 쓰게 하려면 컴포넌트 밖에 있어야 한다. 컴포넌트 안에 두면 생성기가
   자기 것을 새로 만들고, 표와 공유물이 다른 숫자를 말하면서 오류도 경고도 안 난다. ── */

/** 스탯 열 헤더 영문 라벨 — 표 헤더와 산출물이 공유(표기는 영문 고정, 툴팁만 로케일). */
export const STAT_EN: Record<StatKey, string> = {
  hp: "HP", str: "STR", mag: "MAG", dex: "DEX", spd: "SPD", lck: "LCK", def: "DEF", res: "RES", bld: "BLD",
};

/** 전투력 → 스탯 열 배정(그리드 정렬용 — 의미는 캡션이 말한다). HP 열은 비움, RES·BLD 열 = 무기군 아이콘. */
export const COMBAT_COL: Partial<Record<StatKey, CombatKey>> = {
  str: "patk", mag: "matk", dex: "hit", spd: "avoid", lck: "crit", def: "ddg",
};

/** 전투력 표시 — 스탯과 같은 소수 1자리(☠toFixed 단독 금지 규약과 같은 이유로 반올림을 먼저 정수화). */
export const fmtCombat = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/** 스탯 합산 표시 — ☠toFixed 단독 금지(13.35 → "13.3"). 소수 2자리 정수화 후 1자리로 half-up
    (셀 텍스트의 누적기 반올림과 일치). 정수면 소수점을 안 붙인다. */
export const fmtStat = (n: number): string => {
  const c = Math.round(n * 100);
  return c % 100 === 0 ? String(c / 100) : (Math.round(c / 10) / 10).toFixed(1);
};

/* ── 공유 산출물 팔레트 — ☠**두 산출물(HTML·카드)이 같은 값을 읽어야** 한 쪽만 낡지 않는다.
   값의 정본은 `styles/global.css`(`:root` = 다크 · `[data-theme="light"]` = 라이트)이고 여기는 그 사본이다.
   ☠런타임 `getComputedStyle`로 읽지 않는 이유 = (1) HTML 산출물은 **남의 페이지에서 자기완결**로 살아야 하고
   (2) 카드는 같은 입력이 같은 픽셀이어야 회귀 테스트가 선다. 사본이므로 global.css를 고치면 여기도 고친다. ── */

export type ShareTheme = "dark" | "light";

export interface SharePalette {
  ground: string; panel: string; sunken: string; rule: string;
  ink: string; muted: string; gold: string;
  cap: string; pgrow: string; danger: string; engage: string;
}

/** ★빌더 기본 테마는 다크다(라이트가 `[data-theme="light"]` 옵트인) — 그래서 dark가 앞이고 기본값이다. */
export const PALETTES: Record<ShareTheme, SharePalette> = {
  dark: {
    ground: "#12161b", panel: "#1a2028", sunken: "#151a21", rule: "#2b333d",
    ink: "#e3e9ef", muted: "#909dab", gold: "#d9b878",
    cap: "#3fd873", pgrow: "#5b9dff", danger: "#f2555c", engage: "#3b96ee",
  },
  light: {
    ground: "#e9ecf0", panel: "#ffffff", sunken: "#f2f5f8", rule: "#d3dae2",
    ink: "#171d24", muted: "#5b6773", gold: "#96712c",
    cap: "#1e9e50", pgrow: "#1f5fd0", danger: "#c62f35", engage: "#0060c8",
  },
};

/** 색조 → 색. 표의 판정(絆 상승=블루 · 무게 하락=레드 · 캡 도달=그린)을 그대로 옮긴다. */
export const toneColor = (p: SharePalette, tone: ExportTone): string =>
  tone === "cap" ? p.cap : tone === "buffed" ? p.pgrow : tone === "down" ? p.danger : p.ink;

/* ── 공유 산출물 사영 — HTML 생성기와 카드 렌더러가 **둘 다 이것만** 읽는다.
   ★이 층이 존재하는 이유 = 표와 산출물이 갈리는 조용한 실패를 구조로 막는 것(rules/seams.md).
   ☠여기에 계산을 새로 쓰지 마라 — 값은 전부 표가 쓰는 함수(builderRow·combatOf·weaponAt·
   penalizedText·effectiveWeaponRanks)를 그대로 통과시킨다. ── */

/** 셀 색조 — 표의 판정과 **같은 우선순위**(絆·스킬 상승 > 무게 하락 > 캡 도달 > 기본, 2026-08-31 사용자 지시). */
export type ExportTone = "buffed" | "down" | "cap" | "ink";

export interface ExportStat {
  key: StatKey;
  /** 표에 그려지는 문자 그대로 — SPD는 무게 페널티가 이미 빠진 값이다. */
  text: string;
  tone: ExportTone;
  /** 고유 성장률 %(showGrowth일 때만). */
  growth?: number;
}

export interface ExportChip {
  name: string;
  icon?: string;
}

/** 무기 적성 1종 — innate = 캐릭터 고유 적성(승격 반영된 실효 랭크). */
export interface ExportRank {
  kind: number;
  rank: string;
  innate: boolean;
  icon?: string;
}

export interface ExportRow {
  pid: string;
  name: string;
  face?: string;
  /** 스냅샷 직업명 — 없음 = 직업 미선택(합류 상태). */
  job?: string;
  /** 표시 내부 레벨(1기점) = 도달값 `row.internal + 1` — 표의 카드 In.Lv와 같은 소스. 하한 통일(2026-09-07) 뒤
      도달값 = max(선택, 합류)라 선택값과 어긋나지 않는다(그 전엔 합류 상태 행에서 표 40 / 산출 16이 갈렸다). */
  internal: number;
  /** 전용직 대상 밖 — 합류 상태 값이라는 표식. */
  ineligible: boolean;
  stats: ExportStat[];
  /** 전투력 6종 — 표시 문자열 + 색조. ★색조는 표의 `deltaCls`와 같은 판정이다:
      맨손 대비 오르면 블루(buffed) · 내리면 레드(down) · 같으면 기본. 장비·스킬 효과가 눈에 보이는 자리다. */
  combat: Record<CombatKey, { text: string; tone: ExportTone }>;
  /** 장착 무기의 실효 위력·무게(강화·각인 반영). 맨손이면 없음. */
  might?: string;
  weight?: string;
  weapon?: { name: string; plus: number; icon?: string };
  engrave?: ExportChip;
  ring?: { name: string; bond: number; icon?: string };
  /** 계승 스킬 — 빈 칸은 뺀다(2칸 중 채운 것만). */
  inherits: ExportChip[];
  ownSkill?: ExportChip;
  /** 직업 고유(兵種) 스킬 — 기본직은 없다(빈 슬롯이라 칩 자체를 안 그린다). */
  jobSkill?: ExportChip;
  ranks: ExportRank[];
  efficacies: ExportChip[];
}

/** 산출물 생성에 필요한 사영 테이블 — ☠맵이 아니라 원본 배열을 받는다(호출부가 자기 맵을 만들어
    넘기면 그 맵의 필터가 표와 갈릴 수 있다. 여기서 만들면 규칙이 한 곳이다). */
export interface ExportContext {
  chars: readonly BuilderCharProp[];
  emblems: readonly BuilderEmblemProp[];
  /** 무기군 아이콘(kind → URL). */
  kindIcons?: Readonly<Record<number, string>>;
  /** 특효 명칭 사전(labels.efficacyNames) — ☠표와 같은 폴백 규칙(`?? kind`)을 여기서도 쓴다. */
  efficacyNames?: Readonly<Record<string, string>>;
  /** 고유 성장률 행을 담을지 — 표의 체커와 같은 값을 넘긴다. */
  showGrowth?: boolean;
}

/**
 * 잠긴 엔트리 → 산출물 행. **표에 그려지는 것과 같은 배열**(`lockedDisplayRows` 결과 + 絆·스킬 보너스가
 * 얹힌 것)을 입력으로 받는다.
 * ☠`locked`(원시 EntryLock)를 직접 소비하지 마라 — 그 배열에는 표시층이 얹는 보너스가 없다.
 * ☠대기 목록은 절대 섞이지 않는다(사용자 지시 2026-09-07: "쉐어의 기준은 현재 엔트리에 포함된 부분").
 */
export function entryExportRows(
  display: readonly LockedDisplay[],
  locked: readonly EntryLock[],
  ctx: ExportContext,
): ExportRow[] {
  const charByPid = new Map(ctx.chars.map((c) => [c.pid, c]));
  const emblemByGid = new Map(ctx.emblems.map((e) => [e.gid, e]));
  const inheritBySid = new Map(ctx.emblems.flatMap((e) => e.inherits.map((s) => [s.sid, s] as const)));
  const out: ExportRow[] = [];
  for (const { row, job, equipped } of display) {
    const entry = locked.find((e) => e.pid === row.pid);
    const sids = entry?.skills ?? ["", ""];
    // 전투력은 표(CombatCells)와 같은 인자로 같은 함수를 부른다 — 여기가 관통 지점이다.
    const skillRows = sids.flatMap((sid) => {
      const s = inheritBySid.get(sid);
      return s === undefined ? [] : [s.row];
    });
    // 색조 판정은 표(CombatCells.deltaCls)와 같은 대조다 — 맨손값 대비 올랐나 내렸나.
    const bare = combatOf(row);
    const combatRaw = combatOf(row, equipped, skillRows);
    const combat = {} as Record<CombatKey, { text: string; tone: ExportTone }>;
    for (const key of COMBAT_KEYS) {
      const v = combatRaw[key];
      const tone: ExportTone = v > bare[key] + 1e-9 ? "buffed" : v < bare[key] - 1e-9 ? "down" : "ink";
      combat[key] = { text: fmtCombat(v), tone };
    }

    const penalty = weightPenalty(row, equipped);
    const growth = ctx.showGrowth === true ? charByPid.get(row.pid)?.personGrowth : undefined;
    const stats = STAT_KEYS.map((key): ExportStat => {
      const cell = row.cells[key];
      const down = key === "spd" && penalty > 0;
      const tone: ExportTone = cell.buffed === true ? "buffed" : down ? "down" : cell.capped ? "cap" : "ink";
      return {
        key,
        text: penalizedText(cell, down ? penalty : 0),
        tone,
        ...(growth !== undefined ? { growth: growth[key] } : {}),
      };
    });

    const spec = equipped === undefined ? undefined : weaponAt(equipped.weapon, equipped.plus, equipped.engrave);
    const ring = entry?.gid === undefined ? undefined : emblemByGid.get(entry.gid);
    const char = charByPid.get(row.pid);
    const kinds = ctx.kindIcons ?? {};
    out.push({
      pid: row.pid,
      name: row.name,
      ...(row.face !== undefined ? { face: row.face } : {}),
      ...(job !== undefined ? { job: job.name } : {}),
      internal: row.internal + 1,
      ineligible: row.ineligible,
      stats,
      combat,
      ...(spec !== undefined ? { might: fmtStat(spec.might), weight: fmtStat(spec.weight) } : {}),
      ...(equipped !== undefined
        ? {
            weapon: {
              name: equipped.weapon.name,
              plus: equipped.plus,
              ...(equipped.weapon.icon !== undefined ? { icon: equipped.weapon.icon } : {}),
            },
          }
        : {}),
      ...(equipped?.engrave !== undefined
        ? {
            engrave: {
              name: equipped.engrave.name,
              ...(equipped.engrave.icon !== undefined ? { icon: equipped.engrave.icon } : {}),
            },
          }
        : {}),
      ...(ring !== undefined
        ? { ring: { name: ring.name, bond: entry?.bond ?? 20, ...(ring.icon !== undefined ? { icon: ring.icon } : {}) } }
        : {}),
      inherits: sids.flatMap((sid) => {
        const s = inheritBySid.get(sid);
        return s === undefined ? [] : [{ name: s.name, ...(s.icon !== undefined ? { icon: s.icon } : {}) }];
      }),
      ...(char?.personalSkills[0] !== undefined
        ? {
            ownSkill: {
              name: char.personalSkills[0].name,
              ...(char.personalSkills[0].icon !== undefined ? { icon: char.personalSkills[0].icon } : {}),
            },
          }
        : {}),
      ...(job?.jobSkill !== undefined
        ? {
            jobSkill: {
              name: job.jobSkill.name,
              ...(job.jobSkill.icon !== undefined ? { icon: job.jobSkill.icon } : {}),
            },
          }
        : {}),
      ranks:
        job === undefined
          ? []
          : effectiveWeaponRanks(job.weaponRanks, char?.aptitude ?? 0).map((r) => ({
              ...r,
              ...(kinds[r.kind] !== undefined ? { icon: kinds[r.kind] as string } : {}),
            })),
      efficacies: (equipped?.weapon.efficacies ?? []).map((e) => ({
        name: ctx.efficacyNames?.[e.kind] ?? e.kind,
        ...(e.icon !== undefined ? { icon: e.icon } : {}),
      })),
    });
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
