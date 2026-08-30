import { useEffect, useMemo, useRef, useState } from "react";
import { STAT_KEYS, type StatKey } from "@fesim/engine";
import { builderRowGroups, nextSort, sortRowGroups, type BuilderCompare, type BuilderSort } from "./lib";
import type { BuilderProps } from "../../lib/fe17";
import {
  loadShowGrowth,
  loadShowSpoilers,
  loadStarsphere,
  saveShowGrowth,
  saveShowSpoilers,
  saveStarsphere,
} from "../../lib/guestSave";
import type { BuilderLabels } from "../../lib/i18n";

/**
 * 캐릭터 빌더 — "상급직 xN x 전 캐릭터" 비교표(design/avg_stats_builder.md §4).
 * 입력 테이블은 빌드 타임(builderPropsFor)이 직렬화해 주고, 직업 x 내부 레벨 조합은 곱집합이라
 * 여기서 계산한다. 계산은 features/builder/lib(→ 엔진 growthPath)가 소유하고 이 파일은 표시만 한다.
 * 멀티클래스 비교(2026-08-31): 슬롯(직업+내부 레벨)마다 헤더 성장률 행 1줄 + 캐릭터마다 본문 라인 1줄 —
 * 두 줄의 순서 동치는 builderRowGroups 테스트가 지킨다. 고유 성장 체커는 블록 첫 줄에 개인 성장률(블루).
 */

const INTERNAL_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50];
/** 비교 상한(기본 1 + 추가 3) — 캐릭터당 라인이 이 배수로 늘므로 가독 한계에서 자른다. */
const MAX_JOBS = 4;

/** 비교 슬롯 상태 — [0] = 기본 선택기. internal 미지정 = 1번(메인 내부 레벨) 추종(2026-08-31 사용자 지시). */
interface BuilderSlot {
  jid: string;
  internal?: number;
}

export interface BuilderIslandProps extends BuilderProps {
  labels: BuilderLabels;
}

const STAT_EN: Record<StatKey, string> = {
  hp: "HP", str: "STR", mag: "MAG", dex: "DEX", spd: "SPD", lck: "LCK", def: "DEF", res: "RES", bld: "BLD",
};

export default function BuilderIsland({ chars, joinJobs, targetJobs, starsphere, labels }: BuilderIslandProps) {
  const [slots, setSlots] = useState<BuilderSlot[]>([{ jid: "" }]);
  const [internal, setInternal] = useState(40);
  const [sort, setSort] = useState<BuilderSort | undefined>(undefined);
  // 체커는 전부 localStorage 저장(2026-08-31 사용자 지시) — SSG HTML은 기본값(전부 off)으로 굽고
  // 저장값은 하이드레이션 뒤에 읽는다(SSR 불일치 방지).
  const [star, setStar] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);
  useEffect(() => {
    setStar(loadStarsphere());
    setShowGrowth(loadShowGrowth());
    setShowSpoilers(loadShowSpoilers());
  }, []);

  const compares: BuilderCompare[] = useMemo(
    () =>
      slots.flatMap((s, i) => {
        const job = targetJobs.find((t) => t.jid === s.jid);
        if (job === undefined) return [];
        // 표기는 1기점(사용자 결정 2026-08-31) — 계산·정본은 0기점이라 여기서만 ±1 변환한다.
        const level = i === 0 ? internal : (s.internal ?? internal);
        return [{ job, internal: level - 1 }];
      }),
    [slots, internal, targetJobs],
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
    () => sortRowGroups(builderRowGroups({ chars: visibleChars, joinJobs }, compares, extraSkills), sort),
    [visibleChars, joinJobs, compares, sort, extraSkills],
  );
  // 고유 성장 라인의 데이터 — 행(BuilderRow)은 계산 결과만 들므로 pid로 원본 개인 성장률을 찾는다.
  const growthByPid = useMemo(() => new Map(chars.map((c) => [c.pid, c.personGrowth])), [chars]);

  // 첫 클릭은 내림차순 — 스탯 표에서 먼저 보고 싶은 것은 상위값이다. 3클릭째 = 합류순 복귀.
  const toggle = (key: StatKey): void => setSort((s) => nextSort(s, key));
  const patchSlot = (i: number, patch: Partial<BuilderSlot>): void =>
    setSlots((s) => s.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const selectClass =
    "rounded border border-rule bg-sunken px-2 py-1 text-[14px] text-ink focus:outline-none focus-visible:outline-2";
  const legendClass = "text-[14px] font-medium text-muted";
  const checkerClass = "flex items-center gap-1.5 pb-1.5 text-[12px] text-ink";

  const jobSelect = (i: number): React.JSX.Element => (
    <select className={selectClass} value={slots[i]?.jid ?? ""} onChange={(e) => patchSlot(i, { jid: e.target.value })}>
      <option value="">{labels.jobNone}</option>
      {targetJobs.map((j) => (
        <option key={j.jid} value={j.jid}>
          {j.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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

        <button
          type="button"
          onClick={() => setSlots((s) => [...s, { jid: "" }])}
          disabled={slots.length >= MAX_JOBS}
          className="rounded px-3 py-[5px] text-[14px] font-bold text-gold hover:bg-sunken disabled:opacity-40"
        >
          {`+ ${labels.addCompare}`}
        </button>

        {compares.length === 0 && <p className="pb-1 text-[11px] text-muted">{labels.joinedNote}</p>}

        <span className="ml-auto flex flex-wrap items-end gap-x-5 gap-y-3">
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
        </span>
      </div>

      {slots.length > 1 && (
        <div className="-mt-2 mb-4 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          {slots.slice(1).map((slot, i) => (
            <span key={i} className="flex items-center gap-1">
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
          {groups.map((g, gi) => {
            const first = g[0]!;
            // 캐릭터 사이 구분선 = 각 묶음 첫 라인 셀의 border-t(첫 묶음 제외) — separate 모델에서 tr 보더는 안 그려진다.
            const sep = gi > 0 ? "border-t border-rule" : "";
            // 멀티 모드는 라인마다 단일 모드 행 높이만큼 여백(2026-08-31 사용자 지시 — 답답함 방지,
            // 포트레이트 1장 + 스탯 라인 x직업 수). 세로·가로폰은 builder.css !important가 압축을 유지한다.
            const roomy = g.length > 1 ? "py-[15px]" : "py-1";
            const nameTh = (
              <th
                scope="row"
                rowSpan={g.length + (showGrowth ? 1 : 0)}
                className={`sticky left-0 z-10 bg-panel px-2 py-[3px] text-left align-middle font-normal group-hover:bg-sunken ${sep}`}
              >
                <span className="entry-wrap block">
                  <span className="entry-card">
                    {first.face !== undefined && (
                      <img src={first.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                    )}
                    <span className="entry-name inline-block w-[5em] truncate md:w-[6em] text-[15px] md:text-[17px] font-semibold text-ink">{first.name}</span>
                  </span>
                </span>
              </th>
            );
            return (
              <tbody key={first.pid} className="group">
                {showGrowth && (
                  // 고유 성장 라인 — 블록 첫 줄(기존 행은 한 칸씩 아래로), 개인 성장률을 블루로(2026-08-31 사용자 지시).
                  <tr className="group-hover:bg-sunken">
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
                {g.map((row, li) => (
                  <tr key={li} className="group-hover:bg-sunken" {...(row.ineligible ? { title: labels.unavailable } : {})}>
                    {li === 0 && !showGrowth && nameTh}
                    <td className={`inlv-col px-2 ${roomy} text-center text-gold ${row.projected ? "" : "opacity-55"} ${li === 0 && !showGrowth ? sep : ""}`}>
                      {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                    </td>
                    {STAT_KEYS.map((key) => {
                      const cell = row.cells[key];
                      return (
                        <td
                          key={key}
                          className={`stat-col min-w-[3.7rem] px-1 ${roomy} text-center font-bold md:min-w-[5.5rem] md:px-2 ${cell.capped ? "text-cap" : "text-ink"} ${row.ineligible ? "opacity-45" : ""} ${li === 0 && !showGrowth ? sep : ""}`}
                        >
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
