"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/EmptyState";
import { CountUp } from "@/components/motion/CountUp";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { DailyChart } from "@/components/reports/DailyChart";
import { Breakdown } from "@/components/reports/Breakdown";
import { useClients, useProjects } from "@/lib/queries/catalog";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { useReportEntries } from "@/lib/queries/reports";
import { NO_FILTERS, NO_PROJECT_COLOR, buildReport, type DayRange } from "@/lib/reports";
import { addDaysToKey, dayKey, dayLabel, displayTime, formatDuration } from "@/lib/time";

/** The Overview page: the last seven days at a glance. */
export function OverviewDashboard() {
  const { timeZone, durationFormat, timeFormat } = useSettings();
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const now = useNow(60_000);
  const today = dayKey(now, timeZone);
  const range: DayRange = useMemo(() => ({ from: addDaysToKey(today, -6), to: addDaysToKey(today, 1) }), [today]);
  const { data: entries = [], isPending } = useReportEntries(range, timeZone);

  const report = useMemo(
    () => buildReport({ entries, range, timeZone, nowMs: now, filters: NO_FILTERS, projects, clients }),
    [entries, range, timeZone, now, projects, clients],
  );
  const todayMs = report.days.find((d) => d.key === today)?.ms ?? 0;
  const activeDays = report.days.filter((d) => d.ms > 0).length;
  const top = report.projects[0];
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const recent = useMemo(
    () => [...entries].sort((a, b) => Date.parse(b.start_at) - Date.parse(a.start_at)).slice(0, 6),
    [entries],
  );
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);

  if (isPending) {
    return <div className="h-64 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading overview" />;
  }

  if (report.entryCount === 0) {
    return (
      <EmptyState icon={Clock} title="Nothing tracked in the last 7 days">
        Start a timer from the bar above, or{" "}
        <Link href="/timer" className="rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          open the Timer
        </Link>{" "}
        to add time by hand.
      </EmptyState>
    );
  }

  const tiles = [
    { label: "Today", value: <CountUp value={todayMs} format={fmt} jump={1500} /> },
    { label: "Last 7 days", value: <CountUp value={report.totalMs} format={fmt} jump={1500} /> },
    {
      label: "Daily average",
      value: <CountUp value={activeDays ? report.totalMs / activeDays : 0} format={fmt} jump={1500} />,
      hint: `over ${activeDays} active ${activeDays === 1 ? "day" : "days"}`,
    },
    {
      label: "Top project",
      value: (
        <span className="flex min-w-0 items-center gap-2 text-xl">
          <ProjectDot color={top?.color ?? NO_PROJECT_COLOR} />
          <span className="truncate">{top?.name ?? "—"}</span>
        </span>
      ),
      hint: top ? `${fmt(top.ms)} · ${Math.round(top.share * 100)}%` : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile, i) => (
          <li
            key={tile.label}
            data-reveal
            data-tilt="6"
            style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
            className="flex min-w-0 flex-col gap-1 rounded-md bg-surface p-4 shadow-sm"
          >
            <span className="text-muted-foreground">{tile.label}</span>
            <span className="tabular truncate text-3xl font-medium tracking-tight">{tile.value}</span>
            {tile.hint && <span className="text-xs text-muted-foreground">{tile.hint}</span>}
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-md p-4 shadow-sm" data-reveal>
          <DailyChart days={report.days} format={durationFormat} />
        </div>
        <div className="rounded-md p-4 shadow-sm" data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
          <Breakdown report={report} format={durationFormat} />
        </div>
      </div>

      <section aria-labelledby="recent-title" className="rounded-md shadow-sm" data-reveal>
        <header className="flex h-10 items-center justify-between border-b border-line px-3">
          <h2 id="recent-title" className="font-medium">
            Recent entries
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/timer?view=list">
              All entries
              <ArrowRight />
            </Link>
          </Button>
        </header>
        <ul>
          {recent.map((e) => {
            const project = e.project_id ? projectMap.get(e.project_id) : undefined;
            const seconds = Math.floor(((e.stop_at ? Date.parse(e.stop_at) : now) - Date.parse(e.start_at)) / 1000);
            return (
              <li key={e.id} className="flex min-h-11 items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{e.description || <span className="text-muted-foreground">No description</span>}</p>
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <ProjectDot color={project?.color ?? NO_PROJECT_COLOR} />
                    <span className="truncate">{project?.name ?? "No project"}</span>
                  </p>
                </div>
                <span className="tabular hidden text-xs text-muted-foreground sm:inline">
                  {dayLabel(dayKey(e.start_at, timeZone), timeZone, now)} · {displayTime(e.start_at, timeZone, timeFormat)}
                </span>
                <span className="tabular w-[8ch] text-right">{e.stop_at ? formatDuration(seconds, durationFormat) : "Running"}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
