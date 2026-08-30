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

export default function BuilderIsland({ chars, joinJobs, targetJobs, labels }: BuilderIslandProps) {
  const [jid, setJid] = useState("");
  const [internal, setInternal] = useState(40);
  const [sort, setSort] = useState<BuilderSort | undefined>(undefined);

  const job = targetJobs.find((j) => j.jid === jid);
  const rows = useMemo(
    () => sortBuilderRows(builderRows({ chars, joinJobs }, job, internal), sort),
    [chars, joinJobs, job, internal, sort],
  );

  // 첫 클릭은 내림차순 — 스탯 표에서 먼저 보고 싶은 것은 상위값이다.
  const toggle = (key: StatKey): void =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  const selectClass =
    "rounded border border-rule bg-sunken px-2 py-1 text-[13px] text-ink focus:outline-none focus-visible:outline-2";
  const legendClass = "text-[11px] font-medium uppercase tracking-[0.14em] text-muted";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-x-5 gap-y-3">
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

        <p className="pb-1 text-[11px] text-muted">{job === undefined ? labels.joinedNote : labels.cappedNote}</p>
      </div>

      <div className="overflow-x-auto rounded border border-rule bg-panel">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-rule">
              <th className="sticky left-0 z-10 bg-panel px-3 py-2 text-left font-normal" scope="col">
                <span className={legendClass}>{chars.length}</span>
              </th>
              <th className="px-2 py-2 text-right font-normal" scope="col">
                <span className={`${legendClass} text-gold`}>{labels.internalShort}</span>
              </th>
              {STAT_KEYS.map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-1 py-1 font-normal"
                  aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex w-full flex-col items-end gap-0.5 rounded px-1 py-1 hover:bg-sunken"
                  >
                    <span className={sort?.key === key ? "text-gold" : "text-ink"}>
                      {labels.stats[key]}
                      {sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                    </span>
                    <span className="text-[10px] text-muted" title={labels.growth}>
                      {job === undefined ? " " : `${job.diffGrow[key]}%`}
                    </span>
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
                  className="sticky left-0 z-10 min-w-[12rem] bg-panel px-2 py-[3px] text-left font-normal group-hover:bg-sunken"
                >
                  <span className="entry-wrap block">
                    <span className="entry-card">
                      {row.face !== undefined && (
                        <img src={row.face} alt="" width={54} height={44} loading="lazy" className="entry-face shrink-0" />
                      )}
                      <span className="truncate text-[17px] font-semibold text-ink">{row.name}</span>
                    </span>
                  </span>
                </th>
                <td className={`px-2 py-1 text-right text-gold ${row.projected ? "" : "opacity-55"}`}>
                  {row.projected ? row.internal : `(${row.internal})`}
                </td>
                {STAT_KEYS.map((key) => {
                  const cell = row.cells[key];
                  return (
                    <td
                      key={key}
                      className={`px-2 py-1 text-right ${cell.capped ? "font-semibold text-cap" : "text-ink"}`}
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
