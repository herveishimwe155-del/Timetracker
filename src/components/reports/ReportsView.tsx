"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shell/EmptyState";
import { useClients, useProjects, useTags } from "@/lib/queries/catalog";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { useReportEntries } from "@/lib/queries/reports";
import {
  buildReport,
  daysIn,
  NO_FILTERS,
  presetRange,
  type DayRange,
  type RangePreset,
  type ReportFilters,
} from "@/lib/reports";
import { addDaysToKey, dayKey, formatDuration } from "@/lib/time";
import { Breakdown } from "./Breakdown";
import { DailyChart } from "./DailyChart";

const PRESET_LABELS: Record<RangePreset, string> = {
  "this-week": "This week",
  "last-week": "Last week",
  "this-month": "This month",
  "last-month": "Last month",
  custom: "Custom range",
};
const MAX_DAYS = 92;

export function ReportsView() {
  const { timeZone, weekStart, durationFormat } = useSettings();
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: tags = [] } = useTags();

  // Ticks each minute: keeps "today" current and a running timer counted up to now.
  const now = useNow(60_000);
  const today = dayKey(now, timeZone);
  const [preset, setPreset] = useState<RangePreset>("this-week");
  // Custom dates are inclusive in the form; the range's `to` is exclusive.
  const [custom, setCustom] = useState(() => ({ from: addDaysToKey(today, -6), to: today }));
  const [filters, setFilters] = useState<ReportFilters>(NO_FILTERS);

  const customError =
    preset !== "custom"
      ? null
      : custom.from > custom.to
        ? "The start date must be on or before the end date."
        : daysIn({ from: custom.from, to: addDaysToKey(custom.to, 1) }).length > MAX_DAYS
          ? `Pick ${MAX_DAYS} days or fewer.`
          : null;

  const range: DayRange = useMemo(() => {
    if (preset !== "custom") return presetRange(preset, today, weekStart);
    if (customError) return presetRange("this-week", today, weekStart);
    return { from: custom.from, to: addDaysToKey(custom.to, 1) };
  }, [preset, today, weekStart, custom, customError]);

  const { data: entries, isPending, isError, refetch } = useReportEntries(range, timeZone);

  const report = useMemo(
    () =>
      buildReport({
        entries: entries ?? [],
        range,
        timeZone,
        nowMs: now,
        filters,
        projects,
        clients,
      }),
    [entries, range, timeZone, now, filters, projects, clients],
  );

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({
      from: range.from,
      to: range.to,
      client: filters.clientId,
      project: filters.projectId,
      tag: filters.tagId,
      billable: filters.billable,
    });
    return `/api/export?${params}`;
  }, [range, filters]);

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  return (
    <div className="flex flex-col gap-6">
      {/* Filters: one row above the charts. */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Period</span>
          <NativeSelect value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)} className="w-40">
            {Object.entries(PRESET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {preset === "custom" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">From</span>
              <Input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="tabular h-9 w-40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">To</span>
              <Input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="tabular h-9 w-40"
              />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Client</span>
          <NativeSelect value={filters.clientId} onChange={(e) => setFilter("clientId", e.target.value)} className="w-40">
            <option value="all">All clients</option>
            <option value="none">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Project</span>
          <NativeSelect value={filters.projectId} onChange={(e) => setFilter("projectId", e.target.value)} className="w-40">
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived ? " (archived)" : ""}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Tag</span>
          <NativeSelect value={filters.tagId} onChange={(e) => setFilter("tagId", e.target.value)} className="w-36">
            <option value="all">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Billable</span>
          <NativeSelect
            value={filters.billable}
            onChange={(e) => setFilter("billable", e.target.value as ReportFilters["billable"])}
            className="w-36"
          >
            <option value="all">All entries</option>
            <option value="billable">Billable</option>
            <option value="non-billable">Not billable</option>
          </NativeSelect>
        </label>
        {filtered && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </Button>
        )}
        <Button asChild variant="outline" className="ml-auto h-9">
          <a href={exportHref} download>
            <Download />
            Export CSV
          </a>
        </Button>
      </div>
      {customError && <p className="text-danger">{customError}</p>}

      {isPending ? (
        <div className="h-80 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label="Loading report" />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-md border border-danger/40 p-4">
          This report couldn&apos;t be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : report.entryCount === 0 ? (
        <EmptyState icon={BarChart3} title="No time in this period">
          {filtered ? "Nothing matches these filters. Try clearing them or picking another period." : "Track some time, or pick another period."}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="tabular text-5xl font-medium tracking-tight">{fmt(report.totalMs)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Billable</div>
              <div className="tabular text-xl">
                {fmt(report.billableMs)}
                <span className="ml-2 text-sm text-muted-foreground">
                  {report.totalMs > 0 ? Math.round((report.billableMs / report.totalMs) * 100) : 0}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Entries</div>
              <div className="tabular text-xl">{report.entryCount}</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <div className="rounded-md p-4 shadow-sm">
              <DailyChart days={report.days} format={durationFormat} />
            </div>
            <div className="rounded-md p-4 shadow-sm">
              <Breakdown report={report} format={durationFormat} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
