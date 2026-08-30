import { useMemo, useState } from "react";
import { STAT_KEYS, type StatKey } from "@fesim/engine";
import { builderRows, sortBuilderRows, type BuilderSort } from "../lib/builder";
import type { BuilderProps } from "../lib/fe17";
import type { BuilderLabels } from "../lib/i18n";

/**
 * 캐릭터 빌더 — "상급직 하나 x 전 캐릭터" 비교표(design/avg_stats_builder.md §4).
 * 입력 테이블은 빌드 타임(builderPropsFor)이 직렬화해 주고, 직업 x 내부 레벨 조합은 곱집합이라
 * 여기서 계산한다. 계산은 lib/builder(→ 엔진 growthPath)가 소유하고 이 파일은 표시만 한다.
 */

const INTERNAL_LEVELS = [10, 15, 20, 25, 30, 35, 40, 45, 50];

export interface BuilderIslandProps extends BuilderProps {
  labels: BuilderLabels;
}

const STAT_EN: Record<StatKey, string> = {
  hp: "HP", str: "STR", mag: "MAG", dex: "DEX", spd: "SPD", lck: "LCK", def: "DEF", res: "RES", bld: "BLD",
};

export default function BuilderIsland({ chars, joinJobs, targetJobs, starsphere, labels }: BuilderIslandProps) {
  const [jid, setJid] = useState("");
  const [internal, setInternal] = useState(40);
  const [sort, setSort] = useState<BuilderSort | undefined>(undefined);
  const [star, setStar] = useState(false);

  const job = targetJobs.find((j) => j.jid === jid);
  const extraSkills = star && starsphere !== undefined ? [starsphere] : undefined;
  const rows = useMemo(
    // 표기는 1기점(사용자 결정 2026-08-31) — 계산·정본은 0기점이라 여기서만 ±1 변환한다.
    () => sortBuilderRows(builderRows({ chars, joinJobs }, job, internal - 1, extraSkills), sort),
    [chars, joinJobs, job, internal, sort, extraSkills],
  );

  // 첫 클릭은 내림차순 — 스탯 표에서 먼저 보고 싶은 것은 상위값이다.
  const toggle = (key: StatKey): void =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  const selectClass =
    "rounded border border-rule bg-sunken px-2 py-1 text-[14px] text-ink focus:outline-none focus-visible:outline-2";
  const legendClass = "text-[14px] font-medium text-muted";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-end gap-x-5 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className={legendClass}>{labels.job}</span>
          <select className={selectClass} value={jid} onChange={(e) => setJid(e.target.value)}>
            <option value="">{labels.jobNone}</option>
            {targetJobs.map((j) => (
              <option key={j.jid} value={j.jid}>
                {j.name}
              </option>
            ))}
          </select>
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

        {starsphere !== undefined && (
          <label className="flex items-center gap-1.5 pb-1.5 text-[12px] text-ink">
            <input
              type="checkbox"
              checked={star}
              onChange={(e) => setStar(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--gold)]"
            />
            {labels.starsphere}
          </label>
        )}
        {job === undefined && <p className="pb-1 text-[11px] text-muted">{labels.joinedNote}</p>}
      </div>

      <div className="min-h-0 flex-1 w-fit max-w-full overflow-auto rounded border border-rule bg-panel [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-rule [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-muted">
        <table className="builder-table border-collapse text-[14px] md:text-[17px]">
          <thead className="[font-family:'JetBrains_Mono',ui-monospace,monospace]">
            <tr className="border-b border-rule">
              <th className="sticky left-0 top-0 z-30 bg-panel px-3 py-1 text-left align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                {job !== undefined && (
                  <span className="corner-job flex flex-col justify-center gap-0.5 px-1 py-2 text-ink md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1">
                    <span className="uppercase">{job.nameEn}</span>
                    <span className="text-[14px]">{"\u00A0"}</span>
                  </span>
                )}
              </th>
              <th className="sticky top-0 z-20 bg-panel p-0 text-center align-middle font-normal shadow-[inset_0_-1px_0_var(--rule)]" scope="col">
                <span className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-gold md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1" title={labels.internalShort}>
                  <span>IN.LV</span>
                  {job !== undefined && <span className="text-[14px]">{"\u00A0"}</span>}
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
                    className="flex w-full flex-col items-center justify-center gap-0.5 rounded px-1 py-2 hover:bg-sunken md:px-2 md:py-[18px] [@media(max-height:520px)]:py-1"
                  >
                    <span className={sort?.key === key ? "text-gold" : "text-ink"} title={labels.stats[key]}>
                      {STAT_EN[key]}
                      {sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </span>
                    {job !== undefined && (
                      <span className="grow-note text-[12px] md:text-[14px] text-gold" title={labels.growth}>
                        {`${job.diffGrow[key]}%`}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.pid}
                className={`group border-b border-rule last:border-b-0 hover:bg-sunken ${row.ineligible ? "opacity-45" : ""}`}
                {...(row.ineligible ? { title: labels.unavailable } : {})}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-panel px-2 py-[3px] text-left font-normal group-hover:bg-sunken"
                >
                  <span className="entry-wrap block">
                    <span className="entry-card">
                      {row.face !== undefined && (
                        <img src={row.face} alt="" width={106} height={44} loading="lazy" className="entry-face shrink-0" />
                      )}
                      <span className="entry-name inline-block w-[5em] truncate md:w-[6em] text-[15px] md:text-[17px] font-semibold text-ink">{row.name}</span>
                    </span>
                  </span>
                </th>
                <td className={`inlv-col px-2 py-1 text-center text-gold ${row.projected ? "" : "opacity-55"}`}>
                  {row.projected ? row.internal + 1 : `(${row.internal + 1})`}
                </td>
                {STAT_KEYS.map((key) => {
                  const cell = row.cells[key];
                  return (
                    <td
                      key={key}
                      className={`stat-col min-w-[3.7rem] px-1 py-1 text-center font-bold md:min-w-[5.5rem] md:px-2 ${cell.capped ? "text-cap" : "text-ink"}`}
                    >
                      {cell.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
