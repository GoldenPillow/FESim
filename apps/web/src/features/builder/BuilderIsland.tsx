import { useEffect, useMemo, useRef, useState } from "react";
import { STAT_KEYS, type StatKey } from "@fesim/engine";
import {
  builderRowGroups,
  canEquip,
  combatOf,
  COMBAT_KEYS,
  lockedDisplayRows,
  moveLock,
  nextSort,
  waitingRowGroups,
  weaponAt,
  type BuilderCompare,
  type BuilderRow,
  type BuilderSort,
  type EquippedWeapon,
} from "./lib";
import type { BuilderJobProp, BuilderProps, BuilderWeaponProp } from "../../lib/fe17";
import {
  loadEntryLocks,
  loadShowGrowth,
  loadShowSpoilers,
  loadStarsphere,
  saveEntryLocks,
  saveShowGrowth,
  saveShowSpoilers,
  saveStarsphere,
  type EntryLock,
} from "../../lib/guestSave";
import type { BuilderLabels } from "../../lib/i18n";

/**
 * 엔트리 빌더 — "상급직 xN x 전 캐릭터" 비교표(design/avg_stats_builder.md §4).
 * 입력 테이블은 빌드 타임(builderPropsFor)이 직렬화해 주고, 직업 x 내부 레벨 조합은 곱집합이라
 * 여기서 계산한다. 계산은 features/builder/lib(→ 엔진 growthPath)가 소유하고 이 파일은 표시만 한다.
 * 멀티클래스 비교(2026-08-31): 슬롯(직업+내부 레벨)마다 헤더 성장률 행 1줄 + 캐릭터마다 본문 라인 1줄 —
 * 두 줄의 순서 동치는 builderRowGroups 테스트가 지킨다. 고유 성장 체커는 블록 첫 줄에 개인 성장률(블루).
 * 잠금(2026-08-31): 스탯 행 클릭 = 잠금 당시 (직업, 레벨, 성옥) 스냅샷으로 최상단 고정(행 전체
 * 인게이지 블루 테두리 + 잠그는 순간 충격파 1회) + 비교표 제외. 해제 = 대기 목록 복귀.
 * 호버·잠금 행 아래에는 전투력 행(맨손 기준, 정본 self-only 식 — lib.combatOf)이 선다.
 * 전용직 불가(ineligible) 행은 호버·클릭 무반응 — 해당 캐릭터만 반응한다.
 */

const INTERNAL_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
/** 비교 상한(기본 1 + 추가 3) — 캐릭터당 라인이 이 배수로 늘므로 가독 한계에서 자른다. */
const MAX_JOBS = 4;

/** 비교 슬롯 상태 — [0] = 기본 선택기. internal 미지정 = 1번(메인 내부 레벨) 추종(2026-08-31 사용자 지시).
    iid = 장착 무기(빈 문자열 = 맨손), plus = 강화 단계(0 = 노강화). 직업이 바뀌면 무기는 초기화된다. */
interface BuilderSlot {
  jid: string;
  internal?: number;
  iid?: string;
  plus?: number;
}

export interface BuilderIslandProps extends BuilderProps {
  labels: BuilderLabels;
}

const STAT_EN: Record<StatKey, string> = {
  hp: "HP", str: "STR", mag: "MAG", dex: "DEX", spd: "SPD", lck: "LCK", def: "DEF", res: "RES", bld: "BLD",
};

/** 전투력 → 스탯 열 배정(그리드 정렬용 — 의미는 캡션이 말한다). HP 열은 비움, RES·BLD 열 = 무기군 아이콘. */
const COMBAT_COL: Partial<Record<StatKey, (typeof COMBAT_KEYS)[number]>> = {
  str: "patk", mag: "matk", dex: "hit", spd: "avoid", lck: "crit", def: "ddg",
};

/** 자물쇠 아이콘(머티리얼 계열 근사) — 대기 행 호버 = 잠김 형상 예고(클릭 = 잠금),
    잠금 블록 호버 = 열린 형상(클릭 = 해제 — 행·배경 클릭으로는 안 풀린다, 2026-08-31 부주의 방지). */
const LockIcon = ({ open = false }: { open?: boolean }): React.JSX.Element => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path
      d={
        open
          ? "M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6-9H9V6a3 3 0 0 1 5.91-.74l1.94-.49A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z"
          : "M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6-9h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9V6Z"
      }
    />
  </svg>
);

export default function BuilderIsland({
  chars,
  joinJobs,
  targetJobs,
  starsphere,
  weapons,
  kindIcons,
  labels,
}: BuilderIslandProps) {
  const [slots, setSlots] = useState<BuilderSlot[]>([{ jid: "" }]);
  const [internal, setInternal] = useState(40);
  const [sort, setSort] = useState<BuilderSort | undefined>(undefined);
  // 체커는 전부 localStorage 저장(2026-08-31 사용자 지시) — SSG HTML은 기본값(전부 off)으로 굽고
  // 저장값은 하이드레이션 뒤에 읽는다(SSR 불일치 방지).
  const [star, setStar] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);
  // 잠금도 브라우저 저장 — 온오프 순간이 저장 시점(2026-08-31 사용자 지시).
  const [locked, setLocked] = useState<EntryLock[]>([]);
  const [hoverRow, setHoverRow] = useState<{ pid: string; li: number } | null>(null);
  /** 잠그는 순간의 1회 충격파 — ☠잠금 상태 클래스에 묶으면 저장 복원·재정렬 때마다 다시 터진다. */
  const [pulsePid, setPulsePid] = useState<string | null>(null);
  useEffect(() => {
    setStar(loadStarsphere());
    setShowGrowth(loadShowGrowth());
    setShowSpoilers(loadShowSpoilers());
    setLocked(loadEntryLocks());
  }, []);

  /** 잠금 = 클릭한 라인의 (직업, 레벨, 무기, 강화) + 현재 성옥 체커를 스냅샷으로 박제. 해제 = 폐기. */
  const toggleLock = (pid: string, li: number): void => {
    const on = !locked.some((e) => e.pid === pid);
    let next: EntryLock[];
    if (on) {
      // 고유 성장 라인(li = -1)에서 잠그면 메인 슬롯 기준. 직업 미선택이면 합류 상태 잠금.
      const c = li >= 0 ? compares[li] : compares[0];
      next = [
        ...locked,
        {
          pid,
          internal: c?.internal ?? 0,
          ...(c !== undefined ? { jid: c.job.jid } : {}),
          ...(star ? { star: true } : {}),
          ...(c?.equipped !== undefined ? { iid: c.equipped.weapon.iid, plus: c.equipped.plus } : {}),
        },
      ];
    } else {
      next = locked.filter((e) => e.pid !== pid);
    }
    saveEntryLocks(next);
    setLocked(next);
    setPulsePid(on ? pid : null);
    // 행이 상단으로 이동하면 옛 자리의 mouseleave가 안 온다 — 호버 흔적을 지운다.
    setHoverRow(null);
  };

  /* ── 잠금 블록 드래그 재정렬(2026-08-31) — 마우스 전용(터치는 탭 = 토글·스크롤 유지).
     끌리는 블록은 반투명으로 목표 자리를 미리 보이고, 나머지는 자리 양보 애니메이션(builder.css).
     놓는 순간 순서 확정 + 저장(온오프와 같은 저장 시점 규약). */
  const lockedRefs = useRef(new Map<string, HTMLTableSectionElement>());
  /** 잠금 블록 호버 — 열린 자물쇠(해제 버튼)를 이 블록에만 띄운다. */
  const [lockHover, setLockHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{
    pid: string;
    from: number;
    to: number;
    dy: number;
    heights: number[];
    active: boolean;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const beginDrag = (e: React.PointerEvent, pid: string, index: number): void => {
    if (e.pointerType !== "mouse" || e.button !== 0 || locked.length < 2) return;
    e.preventDefault(); // 드래그 중 텍스트 선택 방지.
    const heights = locked.map((l) => lockedRefs.current.get(l.pid)?.getBoundingClientRect().height ?? 0);
    const startY = e.clientY;
    const onMove = (ev: PointerEvent): void => {
      const dy = ev.clientY - startY;
      const active = Math.abs(dy) > 4 || (dragRef.current?.active ?? false);
      if (!active) return;
      // 목표 슬롯 = 이웃 블록 높이의 절반을 넘을 때마다 한 칸씩 걷는다(블록 높이 비균일 대응).
      let to = index;
      let rest = dy;
      while (rest > 0 && to < heights.length - 1 && rest > heights[to + 1]! / 2) {
        rest -= heights[to + 1]!;
        to += 1;
      }
      while (rest < 0 && to > 0 && -rest > heights[to - 1]! / 2) {
        rest += heights[to - 1]!;
        to -= 1;
      }
      setDrag({ pid, from: index, to, dy, heights, active: true });
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const cur = dragRef.current;
      setDrag(null);
      if (cur !== null && cur.active && cur.to !== cur.from) {
        const next = moveLock(locked, cur.from, cur.to);
        saveEntryLocks(next);
        setLocked(next);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /** 드래그 중 각 잠금 블록의 시각 이동 — 끌리는 블록은 포인터 추종, 사이 블록은 자리 양보. */
  const dragStyle = (gi: number): React.CSSProperties | undefined => {
    if (drag === null || !drag.active) return undefined;
    const h = drag.heights[drag.from] ?? 0;
    if (gi === drag.from) return { transform: `translateY(${drag.dy}px)` };
    if (drag.from < gi && gi <= drag.to) return { transform: `translateY(${-h}px)` };
    if (drag.to <= gi && gi < drag.from) return { transform: `translateY(${h}px)` };
    return { transform: "translateY(0)" };
  };

  /** Reset = 잠금 전체 해제 + 직업 미선택 디폴트(2026-08-31 사용자 확정) — 체커 저장값은 유지. */
  const reset = (): void => {
    saveEntryLocks([]);
    setLocked([]);
    setPulsePid(null);
    setSlots([{ jid: "" }]);
    setInternal(40);
    setSort(undefined);
  };

  const compares: BuilderCompare[] = useMemo(
    () =>
      slots.flatMap((s, i) => {
        const job = targetJobs.find((t) => t.jid === s.jid);
        if (job === undefined) return [];
        // 표기는 1기점(사용자 결정 2026-08-31) — 계산·정본은 0기점이라 여기서만 ±1 변환한다.
        const level = i === 0 ? internal : (s.internal ?? internal);
        // 장착 무기 — 직업 변경 뒤 남은 부적합 iid는 조용히 맨손 강하(장착 게이트가 정본).
        const weapon = weapons.find((w) => w.iid === s.iid);
        const equipped =
          weapon !== undefined && canEquip(job, weapon)
            ? { equipped: { weapon, plus: s.plus ?? 0 } }
            : {};
        return [{ job, internal: level - 1, ...equipped }];
      }),
    [slots, internal, targetJobs, weapons],
  );

  // 헤더 1행(스탯명)·성장률 행의 실측 높이 — 성장률 행 i의 sticky top = row1H + i x jobRowH.
  // ☠같은 top을 주면 행들이 같은 자리에 포개져 마지막 직업만 보인다(실측 결함). 미디어별 패딩이 달라 CSS 상수로 못 박는다.
  const headRowRef = useRef<HTMLTableRowElement | null>(null);
  const jobRowRef = useRef<HTMLTableRowElement | null>(null);
  const [row1H, setRow1H] = useState(0);
  const [jobRowH, setJobRowH] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      setRow1H(headRowRef.current?.getBoundingClientRect().height ?? 0);
      setJobRowH(jobRowRef.current?.getBoundingClientRect().height ?? 0);
    });
    if (headRowRef.current !== null) ro.observe(headRowRef.current);
    if (jobRowRef.current !== null) ro.observe(jobRowRef.current);
    setRow1H(headRowRef.current?.getBoundingClientRect().height ?? 0);
    setJobRowH(jobRowRef.current?.getBoundingClientRect().height ?? 0);
    return () => ro.disconnect();
  }, [compares.length]);
  const extraSkills = star && starsphere !== undefined ? [starsphere] : undefined;
  const visibleChars = useMemo(
    () => (showSpoilers ? chars : chars.filter((c) => c.spoiler !== true)),
    [chars, showSpoilers],
  );
  const groups = useMemo(
    () => waitingRowGroups(builderRowGroups({ chars: visibleChars, joinJobs }, compares, extraSkills), locked, sort),
    [visibleChars, joinJobs, compares, sort, extraSkills, locked],
  );
  // 잠금 스냅샷 표시행 — 현재 슬롯·정렬·성옥 체커와 무관하다(잠금 당시 값만 소비 = "고정"의 실체).
  const lockedRows = useMemo(
    () => lockedDisplayRows({ chars: visibleChars, joinJobs }, targetJobs, locked, starsphere, weapons),
    [visibleChars, joinJobs, targetJobs, locked, starsphere, weapons],
  );
  // 고유 성장 라인의 데이터 — 행(BuilderRow)은 계산 결과만 들므로 pid로 원본 개인 성장률을 찾는다.
  const growthByPid = useMemo(() => new Map(chars.map((c) => [c.pid, c.personGrowth])), [chars]);

  // 첫 클릭은 내림차순 — 스탯 표에서 먼저 보고 싶은 것은 상위값이다. 3클릭째 = 합류순 복귀.
  const toggle = (key: StatKey): void => setSort((s) => nextSort(s, key));

  /** 전투력 표시 — 스탯과 같은 소수 1자리(☠toFixed 단독 금지 규약과 같은 이유로 반올림을 먼저 정수화). */
  const fmtCombat = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
  /** 무게 페널티(실효 무게 > 체격) — SPD 스탯 숫자까지 레드(2026-08-31 지시). 공속은 미표시라 여기서 경고. */
  const spdPenalty = (row: BuilderRow, equipped: EquippedWeapon | undefined): boolean =>
    equipped !== undefined &&
    weaponAt(equipped.weapon, equipped.plus).weight >
      row.cells.bld.value + (equipped.weapon.enhance?.bld ?? 0);
  /**
   * 전투력 행의 셀 묶음 — 잠금·호버 공용(2026-08-31 배치 지시). 아이템 = IN.LV 하단, 전투력 = 스탯쪽
   * 그리드 정렬(물공→STR … 필살회피→DEF), RES+BLD 병합 칸 = 클래스 무기군 흰 아이콘(지팡이 포함, 좌정렬).
   * 무기 합산 델타: 상승 = 블루(pgrow) · 하락 = 레드(danger) — 무게의 악영향은 회피 하락으로 나타난다.
   * 세로 모바일 = 흐름 배치(combat-flow) — 표시는 builder.css 미디어가 가른다.
   */
  const combatCells = (
    row: BuilderRow,
    job: BuilderJobProp | undefined,
    equipped: EquippedWeapon | undefined,
  ): React.JSX.Element => {
    const bare = combatOf(row);
    const c = equipped !== undefined ? combatOf(row, equipped) : bare;
    const deltaCls = (key: (typeof COMBAT_KEYS)[number]): string =>
      c[key] > bare[key] + 1e-9 ? "text-pgrow" : c[key] < bare[key] - 1e-9 ? "text-danger" : "text-ink";
    const kinds =
      job === undefined
        ? []
        : Object.keys(job.weaponRanks)
            .map(Number)
            .sort((a, b) => a - b);
    return (
      <>
        <td className="inlv-col px-1 pb-[10px] pt-[2px] text-center align-middle">
          {equipped !== undefined && (
            <span
              className={`flex items-center justify-center gap-0.5 whitespace-nowrap text-[14px] font-semibold leading-tight ${equipped.weapon.engage === true ? "text-engage" : "text-ink"}`}
              title={`${equipped.weapon.name}${equipped.plus > 0 ? ` +${equipped.plus}` : ""}`}
            >
              {equipped.weapon.icon !== undefined && (
                <img src={equipped.weapon.icon} alt="" className="h-5 w-5 shrink-0" loading="lazy" />
              )}
              <span className="max-w-[5.2rem] truncate">
                {equipped.weapon.name}
                {equipped.plus > 0 ? `+${equipped.plus}` : ""}
              </span>
            </span>
          )}
        </td>
        {STAT_KEYS.map((key) => {
          // RES = 클래스 적성(무기군) 아이콘 · BLD = 실효 무기 무게(2026-08-31 배치 지시).
          if (key === "res") {
            return (
              <td key={key} className="combat-grid stat-col px-1 pb-[10px] pt-[2px] text-left align-middle md:px-2">
                <span className="flex items-center justify-start gap-1">
                  {kinds.map((k) =>
                    kindIcons[k] !== undefined ? (
                      <img key={k} src={kindIcons[k]} alt="" className="h-4 w-4" loading="lazy" />
                    ) : null,
                  )}
                </span>
              </td>
            );
          }
          if (key === "bld") {
            const eff = equipped === undefined ? undefined : weaponAt(equipped.weapon, equipped.plus);
            return (
              <td key={key} className="combat-grid stat-col min-w-[3.7rem] px-1 pb-[10px] pt-[2px] text-center align-top md:min-w-[5.5rem] md:px-2">
                {eff !== undefined && (
                  <>
                    <span className="block text-[14px] font-semibold leading-5 text-ink opacity-70">
                      {labels.weight}
                    </span>
                    <span
                      className={`block text-[14px] font-bold leading-5 ${spdPenalty(row, equipped) ? "text-danger" : "text-ink"}`}
                    >
                      {eff.weight}
                    </span>
                  </>
                )}
              </td>
            );
          }
          const ck = COMBAT_COL[key];
          return (
            <td
              key={key}
              className="combat-grid stat-col min-w-[3.7rem] px-1 pb-[10px] pt-[2px] text-center align-top md:min-w-[5.5rem] md:px-2"
            >
              {ck !== undefined && (
                <>
                  <span className="block text-[14px] font-semibold leading-5 text-ink opacity-70">
                    {labels.combat[ck]}
                  </span>
                  <span className={`block text-[14px] font-bold leading-5 ${deltaCls(ck)}`}>{fmtCombat(c[ck])}</span>
                </>
              )}
            </td>
          );
        })}
        <td colSpan={STAT_KEYS.length} className="combat-flow px-2 pb-[10px] pt-[2px] text-left">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[14px] font-bold leading-tight text-ink">
            {equipped !== undefined && (
              <span className={equipped.weapon.engage === true ? "text-engage" : ""}>
                {equipped.weapon.name}
                {equipped.plus > 0 ? `+${equipped.plus}` : ""}
              </span>
            )}
            {COMBAT_KEYS.map((key) => (
              <span key={key} className="whitespace-nowrap">
                <span className="font-semibold opacity-70">{labels.combat[key]}</span>{" "}
                <span className={deltaCls(key)}>{fmtCombat(c[key])}</span>
              </span>
            ))}
            {equipped !== undefined && (
              <span className="whitespace-nowrap">
                <span className="font-semibold opacity-70">{labels.weight}</span>{" "}
                <span className={spdPenalty(row, equipped) ? "text-danger" : ""}>
                  {weaponAt(equipped.weapon, equipped.plus).weight}
                </span>
              </span>
            )}
          </span>
        </td>
      </>
    );
  };
  const patchSlot = (i: number, patch: Partial<BuilderSlot>): void =>
    setSlots((s) => s.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  /** 직업 변경 = 무기 초기화(장착 게이트가 직업 소유) — 내부 레벨만 승계한다. */
  const setSlotJob = (i: number, jid: string): void =>
    setSlots((s) =>
      s.map((v, idx) => (idx === i ? { jid, ...(v.internal !== undefined ? { internal: v.internal } : {}) } : v)),
    );
  const setSlotItem = (i: number, iid: string): void =>
    setSlots((s) =>
      s.map((v, idx) => {
        if (idx !== i) return v;
        const { iid: _iid, plus: _plus, ...rest } = v;
        return iid === "" ? rest : { ...rest, iid };
      }),
    );

  const selectClass =
    "rounded border border-rule bg-sunken px-2 py-1 text-[14px] text-ink focus:outline-none focus-visible:outline-2";
  const legendClass = "text-[14px] font-medium text-muted";
  // 컨트롤 영역 문자들은 전부 14px 통일(2026-08-31 사용자 지시 — 통일감).
  const checkerClass = "flex items-center gap-1.5 pb-1.5 text-[14px] text-ink";

  // 동명 전용직 구분(사룡의 아이 x3: 베일·엘·라파르) — 목록에서만 가능자 이름을 덧단다.
  const jobNameDups = useMemo(() => {
    const count = new Map<string, number>();
    for (const j of targetJobs) count.set(j.name, (count.get(j.name) ?? 0) + 1);
    return new Set([...count].filter(([, n]) => n > 1).map(([name]) => name));
  }, [targetJobs]);
  const jobLabel = (j: BuilderJobProp): string =>
    jobNameDups.has(j.name) && j.uniquePid !== undefined
      ? `${j.name}(${chars.find((c) => c.pid === j.uniquePid)?.name ?? ""})`
      : j.name;

  const jobSelect = (i: number): React.JSX.Element => (
    <select className={selectClass} value={slots[i]?.jid ?? ""} onChange={(e) => setSlotJob(i, e.target.value)}>
      <option value="">{labels.jobNone}</option>
      {targetJobs.map((j) => (
        <option key={j.jid} value={j.jid}>
          {jobLabel(j)}
        </option>
      ))}
    </select>
  );

  /** 무기 스펙 한 줄 — 강화 반영값, 변화는 블루/레드(무게는 반대: 증가가 악화다, 2026-08-31). */
  const specSpan = (weapon: BuilderWeaponProp, plus: number): React.JSX.Element => {
    const eff = weaponAt(weapon, plus);
    const base = weaponAt(weapon, 0);
    const cls = (v: number, b: number, invert = false): string =>
      v === b ? "text-ink" : (v > b) !== invert ? "text-pgrow" : "text-danger";
    const entry = (name: string, v: number, b: number, invert = false): React.JSX.Element => (
      <span key={name} className="whitespace-nowrap">
        {name} <span className={`font-semibold ${cls(v, b, invert)}`}>{v}</span>
      </span>
    );
    return (
      <span className="flex flex-wrap items-center gap-x-2.5 pb-[6px] text-[14px] leading-tight text-muted">
        <span className="rounded border border-rule px-1.5 text-[14px]">{weapon.rank}</span>
        {entry(labels.might, eff.might, base.might)}
        {entry(labels.combat.hit, eff.hit, base.hit)}
        {entry(labels.combat.crit, eff.crit, base.crit)}
        {entry(labels.weight, eff.weight, base.weight, true)}
        {/* 장비 중 스탯 강화(Enhance) — 조용히 스탯을 바꾸는 무기 35종을 드러낸다(상승 블루·하락 레드). */}
        {weapon.enhance !== undefined &&
          (Object.entries(weapon.enhance) as [StatKey, number][]).map(([key, v]) => (
            <span key={key} className="whitespace-nowrap">
              {labels.stats[key]}{" "}
              <span className={`font-semibold ${v > 0 ? "text-pgrow" : "text-danger"}`}>
                {v > 0 ? `+${v}` : v}
              </span>
            </span>
          ))}
      </span>
    );
  };

  /** 아이템 + 강화 선택기(슬롯별) — 강화·스펙은 아이템이 정해진 뒤에만 선다(2026-08-31). */
  const itemControls = (i: number): React.JSX.Element => {
    const slot = slots[i];
    const job = targetJobs.find((t) => t.jid === slot?.jid);
    // 클래스 무기군만 표시, 랭크 밖은 회색 비활성(2026-08-31) — 게이트 정본 = canEquip.
    const options = job === undefined ? [] : weapons.filter((w) => job.weaponRanks[w.kind] !== undefined);
    const weapon = job === undefined ? undefined : options.find((w) => w.iid === slot?.iid && canEquip(job, w));
    const plus = slot?.plus ?? 0;
    return (
      <>
        <label className="flex flex-col gap-1">
          {i === 0 && <span className={legendClass}>{labels.item}</span>}
          <span className="flex items-center gap-1">
            {/* 아이콘 + 아이템명 — option 안에는 이미지가 못 들어가 아이콘은 선택기 옆에 선다. */}
            <span className="flex h-[30px] w-5 shrink-0 items-center justify-center">
              {weapon?.icon !== undefined && <img src={weapon.icon} alt="" className="h-5 w-5" />}
            </span>
            <select
              className={`${selectClass} max-w-[10.5rem]`}
              value={weapon?.iid ?? ""}
              disabled={job === undefined}
              onChange={(e) => setSlotItem(i, e.target.value)}
            >
              <option value="">{labels.itemNone}</option>
              {options.map((w) => (
                <option key={w.iid} value={w.iid} disabled={job !== undefined && !canEquip(job, w)}>
                  {w.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        {weapon !== undefined && (
          <select
            className={selectClass}
            value={plus}
            disabled={weapon.refine === undefined}
            onChange={(e) => patchSlot(i, { plus: Number(e.target.value) })}
          >
            <option value={0}>{labels.refineNone}</option>
            {(weapon.refine ?? []).map((_stage, si) => (
              <option key={si} value={si + 1}>
                {`+${si + 1}`}
              </option>
            ))}
          </select>
        )}
        {weapon !== undefined && specSpan(weapon, plus)}
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 윗줄 = 미선택 안내(좌, 고정 높이) + 체커·Reset(우) — 아이템 선택기가 아랫줄 우측 공간을
          쓰도록 체커를 올렸다(2026-08-31). 항상 렌더 = 선택·Reset에도 표가 안 움직인다. */}
      <div className="-mt-4 mb-3 flex shrink-0 flex-wrap items-end justify-between gap-x-5 gap-y-1">
        <p className="h-5 text-[14px] leading-5 text-muted [@media(max-height:520px)]:hidden">
          {compares.length === 0 ? labels.joinedNote : ""}
        </p>
        <span className="ml-auto flex flex-wrap items-end gap-x-5 gap-y-2">
          {starsphere !== undefined && (
            <label className={checkerClass}>
              <input
                type="checkbox"
                checked={star}
                onChange={(e) => {
                  setStar(e.target.checked);
                  saveStarsphere(e.target.checked);
                }}
                className="h-3.5 w-3.5 accent-[var(--gold)]"
              />
              {labels.starsphere}
            </label>
          )}
          <label className={checkerClass}>
            <input
              type="checkbox"
              checked={showGrowth}
              onChange={(e) => {
                setShowGrowth(e.target.checked);
                saveShowGrowth(e.target.checked);
              }}
              className="h-3.5 w-3.5 accent-[var(--pgrow)]"
            />
            {labels.personalGrowth}
          </label>
          <label className={checkerClass}>
            <input
              type="checkbox"
              checked={showSpoilers}
              onChange={(e) => {
                setShowSpoilers(e.target.checked);
                saveShowSpoilers(e.target.checked);
              }}
              className="h-3.5 w-3.5 accent-[var(--gold)]"
            />
            {labels.showSpoilers}
          </label>
          <button
            type="button"
            onClick={reset}
            className="mb-0.5 rounded border border-rule px-2.5 py-[3px] text-[14px] text-muted hover:bg-sunken hover:text-ink"
          >
            {labels.reset}
          </button>
        </span>
      </div>
      <div className="mb-4 flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className={legendClass}>{labels.job}</span>
          {jobSelect(0)}
        </label>

        <label className="flex flex-col gap-1">
          <span className={legendClass}>{labels.internal}</span>
          <select className={selectClass} value={internal} onChange={(e) => setInternal(Number(e.target.value))}>
            {INTERNAL_LEVELS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {itemControls(0)}

        <button
          type="button"
          onClick={() => setSlots((s) => [...s, { jid: "" }])}
          disabled={slots.length >= MAX_JOBS}
          className="rounded px-3 py-[5px] text-[14px] font-bold text-gold hover:bg-sunken disabled:opacity-40"
        >
          {`+ ${labels.addCompare}`}
        </button>
      </div>

      {slots.length > 1 && (
        <div className="-mt-2 mb-4 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          {slots.slice(1).map((slot, i) => (
            <span key={i} className="flex flex-wrap items-center gap-1.5">
              {jobSelect(i + 1)}
              {/* 슬롯 내부 레벨 — 값 미지정이면 1번(메인) 추종, 고르면 그 슬롯만 고정(2026-08-31). */}
              <select
                className={selectClass}
                value={slot.internal ?? internal}
                onChange={(e) => patchSlot(i + 1, { internal: Number(e.target.value) })}
              >
                {INTERNAL_LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {itemControls(i + 1)}
              <button
                type="button"
                aria-label={labels.removeCompare}
                title={labels.removeCompare}
                onClick={() => setSlots((s) => s.filter((_v, idx) => idx !== i + 1))}
                className="rounded px-1.5 py-0.5 text-[15px] text-muted hover:bg-sunken hover:text-ink"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="builder-scroll min-h-0 flex-1 w-fit max-w-full overflow-auto rounded border border-rule bg-panel [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-rule [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted">
        {/* ☠border-collapse 금지 — collapse 모델에서는 sticky 헤더 셀의 배경 페인트가 스크롤에 뒤처져
            본문 글자가 헤더를 뚫고 비친다(가로폰 실측, Chromium). 구분선은 셀이 소유한다. */}
        <table className="builder-table border-separate [border-spacing:0] text-[14px] md:text-[17px]">
          {/* 모노 폰트는 1행(스탯명)만 — 성장률 행은 본문과 같은 서체(2026-08-31 사용자 지시). */}
          <thead>
            <tr ref={headRowRef} className="[font-family:'JetBrains_Mono',ui-monospace,monospace]">
              <th className="sticky left-0 top-0 z-30 bg-panel px-3 py-1 text-left align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                <span className="corner-label block px-1 text-muted md:px-2">Character</span>
              </th>
              <th className="inlv-col sticky top-0 z-20 bg-panel p-0 text-center align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                <span className="flex items-center justify-center px-1 py-2 text-gold md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1" title={labels.internalShort}>
                  IN.LV
                </span>
              </th>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="stat-col sticky top-0 z-20 min-w-[3.7rem] bg-panel p-0 align-middle md:min-w-[5.5rem] font-normal shadow-[inset_0_-1px_0_var(--rule)]"
                  aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex w-full items-center justify-center rounded px-1 py-2 hover:bg-sunken md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1"
                  >
                    <span className={sort?.key === key ? "text-gold" : "text-ink"} title={labels.stats[key]}>
                      {STAT_EN[key]}
                      {sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
            {compares.map((c, ci) => {
              const top = row1H + ci * jobRowH;
              return (
                // 성장률 행 — 본문 각 캐릭터의 ci번째 라인과 같은 슬롯(builderRowGroups의 순서 동치).
                <tr key={`${c.job.jid}-${ci}`} className="job-row" ref={ci === 0 ? jobRowRef : undefined}>
                  <th scope="row" style={{ top }} className="sticky left-0 z-30 bg-panel px-3 py-[9px] text-left font-normal shadow-[inset_0_-1px_0_var(--rule)]">
                    <span className="job-name block truncate px-1 text-[15px] font-semibold text-ink md:px-2 md:text-[17px]">{c.job.name}</span>
                  </th>
                  <td style={{ top }} className="inlv-col sticky z-20 bg-panel text-center text-gold shadow-[inset_0_-1px_0_var(--rule)]">
                    {c.internal + 1}
                  </td>
                  {STAT_KEYS.map((key) => (
                    <td key={key} style={{ top }} className="stat-col sticky z-20 bg-panel px-1 py-[9px] text-center shadow-[inset_0_-1px_0_var(--rule)]">
                      <span className="grow-note font-bold text-gold" title={labels.growth}>
                        {`${c.job.diffGrow[key]}%`}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </thead>
          {/* ── 잠금 블록 — 스냅샷 1행 + 전투력 행. 블록 전체 인게이지 블루 테두리(builder.css ::after).
              자물쇠 아이콘은 잠금 후 사라진다(테두리가 상태 표지) — 슬롯은 공백으로 남아 표가 안 움직인다. ── */}
          {lockedRows.map(({ row, job, equipped }, gi) => {
            const sep = gi > 0 ? "border-t border-rule" : "";
            const isPulse = pulsePid === row.pid;
            // ☠행·배경 클릭으로는 안 풀린다(부주의 방지, 2026-08-31) — 마우스 해제 = 호버 자물쇠 버튼만.
            // 터치(세로폰)는 자물쇠 슬롯이 숨어 있어 탭 = 해제를 유지한다.
            const touchUnlock = (e: React.MouseEvent): void => {
              const native = e.nativeEvent as PointerEvent;
              if (native.pointerType === "touch") toggleLock(row.pid, -1);
            };
            const dragCls =
              drag !== null && drag.active ? (drag.from === gi ? " entry-dragging" : " entry-drag-shift") : "";
            return (
              <tbody
                key={`lock-${row.pid}`}
                ref={(el) => {
                  if (el !== null) lockedRefs.current.set(row.pid, el);
                  else lockedRefs.current.delete(row.pid);
                }}
                style={dragStyle(gi)}
                onPointerDown={(e) => beginDrag(e, row.pid, gi)}
                onMouseEnter={() => setLockHover(row.pid)}
                onMouseLeave={() => setLockHover(null)}
                className={`group entry-locked-block${isPulse ? " entry-lock-pulse" : ""}${dragCls}`}
                onAnimationEnd={isPulse ? () => setPulsePid(null) : undefined}
              >
                <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock}>
                  {/* rowSpan 2 = 스탯 행 + 전투력 행 — 포트레이트가 블록 세로 중앙에 선다(2026-08-31 지시). */}
                  <th scope="row" rowSpan={2} className={`sticky left-0 z-10 bg-panel px-2 py-[3px] text-left align-middle font-normal ${sep}`}>
                    <span className="entry-wrap flex items-center">
                      <span className="entry-card">
                        {row.face !== undefined && (
                          <img src={row.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                        )}
                        <span className="entry-name inline-block w-[5em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{row.name}</span>
                      </span>
                      {/* 해제 = 이 버튼만(호버 시 열린 자물쇠) — 행·배경 클릭은 무반응(부주의 방지). */}
                      {lockHover === row.pid ? (
                        <button
                          type="button"
                          aria-label={labels.unlock}
                          title={labels.unlock}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLock(row.pid, -1);
                          }}
                          className="entry-lock text-muted hover:text-engage"
                        >
                          <LockIcon open />
                        </button>
                      ) : (
                        <span className="entry-lock" aria-hidden="true" />
                      )}
                    </span>
                    {/* 스냅샷 클래스명 — 캐릭터(카드) 하단(2026-08-31 배치 지시). */}
                    {job !== undefined && (
                      <span className="block px-1 pt-[3px] text-[14px] font-semibold leading-tight text-engage">
                        {job.name}
                      </span>
                    )}
                  </th>
                  <td className={`inlv-col px-2 py-1 text-center text-gold ${row.projected ? "" : "opacity-55"} ${sep}`}>
                    {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                  </td>
                  {STAT_KEYS.map((key) => {
                    const cell = row.cells[key];
                    const down = key === "spd" && spdPenalty(row, equipped);
                    return (
                      <td
                        key={key}
                        className={`stat-col min-w-[3.7rem] px-1 py-1 text-center font-bold md:min-w-[5.5rem] md:px-2 ${down ? "text-danger" : cell.capped ? "text-cap" : "text-ink"} ${sep}`}
                      >
                        {cell.text}
                      </td>
                    );
                  })}
                </tr>
                {/* 전투력 행 — 잠금은 상시 표시. 아이템 = IN.LV 하단, 전투력 = 스탯쪽(2026-08-31). */}
                <tr className="cursor-grab hover:bg-sunken" onClick={touchUnlock}>
                  {combatCells(row, job, equipped)}
                </tr>
              </tbody>
            );
          })}
          {groups.map((g, gi) => {
            const first = g[0]!;
            // 캐릭터 사이 구분선 = 각 묶음 첫 라인 셀의 border-t(맨 첫 묶음 제외 — 잠금 블록 포함 계산).
            const sep = lockedRows.length + gi > 0 ? "border-t border-rule" : "";
            // 멀티 모드는 라인마다 단일 모드 행 높이만큼 여백(2026-08-31 사용자 지시 — 답답함 방지,
            // 포트레이트 1장 + 스탯 라인 x직업 수). 세로·가로폰은 builder.css !important가 압축을 유지한다.
            const roomy = g.length > 1 ? "py-[15px]" : "py-1";
            const hovered = hoverRow !== null && hoverRow.pid === first.pid;
            // 호버한 스탯 라인 아래에 전투력 행이 선다(고유 성장 라인 제외) — th rowSpan도 한 칸 는다.
            const combatLi = hovered && hoverRow.li >= 0 ? hoverRow.li : undefined;
            // 전 라인이 전용직 불가면 캐릭터 자체가 무반응 — 고유 성장 라인이 차단을 우회하면 안 된다(헤드리스 실측 결함).
            const groupInert = g.every((r) => r.ineligible);
            /** 행 단위 호버·클릭 반응 — 전용직 불가(ineligible) 행은 차단: 해당 캐릭터만 반응(2026-08-31). */
            const rowActs = (inert: boolean, li: number) =>
              inert
                ? {}
                : {
                    onMouseEnter: () => setHoverRow({ pid: first.pid, li }),
                    onMouseLeave: () => setHoverRow(null),
                    onClick: () => toggleLock(first.pid, li),
                  };
            const nameTh = (
              <th
                scope="row"
                rowSpan={g.length + (showGrowth ? 1 : 0) + (combatLi !== undefined ? 1 : 0)}
                className={`sticky left-0 z-10 bg-panel px-2 py-[3px] text-left align-middle font-normal ${sep}`}
              >
                <span className="entry-wrap flex items-center">
                  <span className="entry-card">
                    {first.face !== undefined && (
                      <img src={first.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[5em] truncate text-[15px] md:text-[17px] font-semibold text-ink">{first.name}</span>
                  </span>
                  {/* 자물쇠 슬롯 — 카드와 IN.LV 사이, 기본 공백(표가 안 움직인다).
                      호버 = 잠긴 자물쇠(= "이렇게 잠긴다" 예고, 2026-08-31 변경). */}
                  {hovered ? (
                    <button
                      type="button"
                      aria-label={labels.lock}
                      title={labels.lock}
                      aria-pressed="false"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(first.pid, hoverRow.li);
                      }}
                      className="entry-lock text-muted hover:text-engage"
                    >
                      <LockIcon />
                    </button>
                  ) : (
                    <span className="entry-lock" aria-hidden="true" />
                  )}
                </span>
                {/* 호버 라인의 클래스명 — 캐릭터(카드) 하단(2026-08-31 배치 지시). 전투력 행이 열린
                    동안만 = th가 한 칸 늘어 있어 행 높이를 안 민다. */}
                {combatLi !== undefined && compares[combatLi]?.job.name !== undefined && (
                  <span className="block px-1 pt-[3px] text-[14px] font-semibold leading-tight text-engage">
                    {compares[combatLi].job.name}
                  </span>
                )}
              </th>
            );
            return (
              <tbody key={first.pid} className="group">
                {showGrowth && (
                  // 고유 성장 라인 — 블록 첫 줄(기존 행은 한 칸씩 아래로), 개인 성장률을 블루로(2026-08-31 사용자 지시).
                  <tr className={groupInert ? "" : "cursor-pointer hover:bg-sunken"} {...rowActs(groupInert, -1)}>
                    {nameTh}
                    <td className={`inlv-col px-2 ${roomy} ${sep}`} />
                    {STAT_KEYS.map((key) => (
                      <td
                        key={key}
                        title={labels.personalGrowth}
                        className={`stat-col min-w-[3.7rem] px-1 ${roomy} text-center font-bold text-pgrow md:min-w-[5.5rem] md:px-2 ${sep}`}
                      >
                        {`${growthByPid.get(first.pid)?.[key] ?? 0}%`}
                      </td>
                    ))}
                  </tr>
                )}
                {g.flatMap((row, li) => {
                  const line = (
                    <tr
                      key={li}
                      className={row.ineligible ? "" : "cursor-pointer hover:bg-sunken"}
                      {...rowActs(row.ineligible, li)}
                      {...(row.ineligible ? { title: labels.unavailable } : {})}
                    >
                      {li === 0 && !showGrowth && nameTh}
                      <td className={`inlv-col px-2 ${roomy} text-center text-gold ${row.projected ? "" : "opacity-55"} ${li === 0 && !showGrowth ? sep : ""}`}>
                        {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                      </td>
                      {STAT_KEYS.map((key) => {
                        const cell = row.cells[key];
                        const down = key === "spd" && li === combatLi && spdPenalty(row, compares[li]?.equipped);
                        return (
                          <td
                            key={key}
                            className={`stat-col min-w-[3.7rem] px-1 ${roomy} text-center font-bold md:min-w-[5.5rem] md:px-2 ${down ? "text-danger" : cell.capped ? "text-cap" : "text-ink"} ${row.ineligible ? "opacity-45" : ""} ${li === 0 && !showGrowth ? sep : ""}`}
                          >
                            {cell.text}
                          </td>
                        );
                      })}
                    </tr>
                  );
                  if (combatLi !== li) return [line];
                  // 호버 전투력 행 — 같은 호버 상태를 유지해야 커서가 내려와도 안 사라진다(깜빡임 방지).
                  return [
                    line,
                    <tr key={`combat-${li}`} className="cursor-pointer hover:bg-sunken" {...rowActs(false, li)}>
                      {combatCells(row, compares[li]?.job, compares[li]?.equipped)}
                    </tr>,
                  ];
                })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
