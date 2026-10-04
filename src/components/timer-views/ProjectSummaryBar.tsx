"use client";

import { useMemo } from "react";
import { useClients, useProjects } from "@/lib/queries/catalog";
import { useSettings } from "@/lib/queries/profile";
import { buildReport, NO_FILTERS, type DayRange, type ReportEntry } from "@/lib/reports";
import { formatDuration } from "@/lib/time";

/**
 * The week's time split by project, as proportional segments (like Toggl's strip).
 * Names are text in ink; the thin bar underneath carries the project colour.
 */
export function ProjectSummaryBar({
  entries,
  week,
  timeZone,
  nowMs,
}: {
  entries: ReportEntry[];
  week: DayRange;
  timeZone: string;
  nowMs: number;
}) {
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const { durationFormat } = useSettings();

  const report = useMemo(
    () => buildReport({ entries, range: week, timeZone, nowMs, filters: NO_FILTERS, projects, clients }),
    [entries, week, timeZone, nowMs, projects, clients],
  );

  if (report.totalMs === 0) return null;

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="sr-only">Time per project this week</figcaption>
      <ul className="flex w-full gap-0.5" aria-label="Time per project this week">
        {report.projects.map((p) => (
          <li
            key={p.id ?? "none"}
            style={{ flexGrow: p.ms, flexBasis: 0 }}
            className="min-w-1 overflow-hidden"
            title={`${p.name}: ${formatDuration(Math.floor(p.ms / 1000), durationFormat)} (${Math.round(p.share * 100)}%)`}
          >
            <span className="block truncate pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {p.share >= 0.04 ? p.name : " "}
              <span className="sr-only">
                {" "}
                {formatDuration(Math.floor(p.ms / 1000), durationFormat)}, {Math.round(p.share * 100)}%
              </span>
            </span>
            <span aria-hidden className="block h-1 rounded-full" style={{ backgroundColor: p.color }} />
          </li>
        ))}
      </ul>
    </figure>
  );
}
