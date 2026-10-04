/**
 * Report maths: date ranges, filters, splitting entries across days, totals and
 * CSV rows. Pure functions, shared by the Reports page and the CSV export route.
 * All sums are in milliseconds so the parts always add up to the total exactly.
 */
import {
  addDaysToKey,
  dayKey,
  formatClock,
  shortDayLabel,
  startOfWeekKey,
  timeOfDay,
  wallTimeToInstant,
} from "@/lib/time";

export type ReportEntry = {
  start_at: string;
  stop_at: string | null;
  description: string;
  project_id: string | null;
  billable: boolean;
  time_entry_tags: { tag_id: string }[];
};
type Named = { id: string; name: string };
export type ReportProject = Named & { color: string; client_id: string | null };

/* ---------- Ranges ---------- */

export const RANGE_PRESETS = ["this-week", "last-week", "this-month", "last-month", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** A range of whole days: `from` inclusive, `to` exclusive, both "YYYY-MM-DD". */
export type DayRange = { from: string; to: string };

export function presetRange(preset: Exclude<RangePreset, "custom">, todayKey: string, weekStart: number): DayRange {
  switch (preset) {
    case "this-week": {
      const from = startOfWeekKey(todayKey, weekStart);
      return { from, to: addDaysToKey(from, 7) };
    }
    case "last-week": {
      const to = startOfWeekKey(todayKey, weekStart);
      return { from: addDaysToKey(to, -7), to };
    }
    case "this-month": {
      const from = `${todayKey.slice(0, 7)}-01`;
      return { from, to: firstOfNextMonth(from) };
    }
    case "last-month": {
      const to = `${todayKey.slice(0, 7)}-01`;
      return { from: `${addDaysToKey(to, -1).slice(0, 7)}-01`, to };
    }
  }
}

function firstOfNextMonth(firstKey: string): string {
  const [y, m] = firstKey.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Every day key in a range. */
export function daysIn(range: DayRange): string[] {
  const days: string[] = [];
  for (let k = range.from; k < range.to; k = addDaysToKey(k, 1)) days.push(k);
  return days;
}

/** The range's exact instants in a time zone. */
export function rangeInstants(range: DayRange, timeZone: string) {
  return {
    fromMs: wallTimeToInstant(range.from, "00:00", timeZone).getTime(),
    toMs: wallTimeToInstant(range.to, "00:00", timeZone).getTime(),
  };
}

/* ---------- Filters ---------- */

/** "all" = no filter; "none" = entries without one (client/project only). */
export type ReportFilters = {
  clientId: string; // "all" | "none" | id
  projectId: string; // "all" | "none" | id
  tagId: string; // "all" | id
  billable: "all" | "billable" | "non-billable";
};
export const NO_FILTERS: ReportFilters = { clientId: "all", projectId: "all", tagId: "all", billable: "all" };

export function matchesFilters(entry: ReportEntry, filters: ReportFilters, projects: Map<string, ReportProject>) {
  const clientId = entry.project_id ? (projects.get(entry.project_id)?.client_id ?? null) : null;
  if (filters.projectId === "none" ? entry.project_id !== null : filters.projectId !== "all" && entry.project_id !== filters.projectId)
    return false;
  if (filters.clientId === "none" ? clientId !== null : filters.clientId !== "all" && clientId !== filters.clientId)
    return false;
  if (filters.tagId !== "all" && !entry.time_entry_tags.some((t) => t.tag_id === filters.tagId)) return false;
  if (filters.billable === "billable" && !entry.billable) return false;
  if (filters.billable === "non-billable" && entry.billable) return false;
  return true;
}

/* ---------- Splitting by day ---------- */

/**
 * The milliseconds an entry spends on each calendar day (in the time zone),
 * clipped to [fromMs, toMs). A running entry counts up to `nowMs`.
 */
export function splitByDay(
  entry: Pick<ReportEntry, "start_at" | "stop_at">,
  timeZone: string,
  nowMs: number,
  fromMs: number,
  toMs: number,
): { key: string; ms: number }[] {
  const start = Math.max(Date.parse(entry.start_at), fromMs);
  const end = Math.min(entry.stop_at ? Date.parse(entry.stop_at) : nowMs, toMs);
  const parts: { key: string; ms: number }[] = [];
  let cursor = start;
  while (cursor < end) {
    const key = dayKey(cursor, timeZone);
    const nextMidnight = wallTimeToInstant(addDaysToKey(key, 1), "00:00", timeZone).getTime();
    const stop = Math.min(nextMidnight, end);
    parts.push({ key, ms: stop - cursor });
    cursor = stop;
  }
  return parts;
}

/* ---------- The report ---------- */

export type Report = {
  totalMs: number;
  billableMs: number;
  entryCount: number;
  days: { key: string; label: string; ms: number }[];
  projects: { id: string | null; name: string; color: string; clientName: string | null; ms: number; share: number }[];
  clients: { id: string | null; name: string; ms: number; share: number }[];
};

/** Neutral grey for "No project", per theme (see --no-project in globals.css). */
export const NO_PROJECT_COLOR = "var(--no-project)";

export function buildReport(input: {
  entries: ReportEntry[];
  range: DayRange;
  timeZone: string;
  nowMs: number;
  filters: ReportFilters;
  projects: ReportProject[];
  clients: Named[];
}): Report {
  const { range, timeZone, nowMs, filters } = input;
  const projects = new Map(input.projects.map((p) => [p.id, p]));
  const clients = new Map(input.clients.map((c) => [c.id, c]));
  const { fromMs, toMs } = rangeInstants(range, timeZone);

  const byDay = new Map(daysIn(range).map((k) => [k, 0]));
  const byProject = new Map<string | null, number>();
  const byClient = new Map<string | null, number>();
  let totalMs = 0;
  let billableMs = 0;
  let entryCount = 0;

  for (const entry of input.entries) {
    if (!matchesFilters(entry, filters, projects)) continue;
    const parts = splitByDay(entry, timeZone, nowMs, fromMs, toMs);
    const ms = parts.reduce((sum, p) => sum + p.ms, 0);
    if (ms <= 0) continue;

    entryCount++;
    totalMs += ms;
    if (entry.billable) billableMs += ms;
    for (const part of parts) byDay.set(part.key, (byDay.get(part.key) ?? 0) + part.ms);

    const project = entry.project_id ? projects.get(entry.project_id) : undefined;
    const projectKey = project ? project.id : null;
    const clientKey = project?.client_id ?? null;
    byProject.set(projectKey, (byProject.get(projectKey) ?? 0) + ms);
    byClient.set(clientKey, (byClient.get(clientKey) ?? 0) + ms);
  }

  const share = (ms: number) => (totalMs > 0 ? ms / totalMs : 0);
  const byMsDesc = <T extends { ms: number }>(a: T, b: T) => b.ms - a.ms;

  return {
    totalMs,
    billableMs,
    entryCount,
    days: [...byDay.entries()].map(([key, ms]) => ({ key, label: shortDayLabel(key), ms })),
    projects: [...byProject.entries()]
      .map(([id, ms]) => {
        const p = id ? projects.get(id) : undefined;
        return {
          id,
          name: p?.name ?? "No project",
          color: p?.color ?? NO_PROJECT_COLOR,
          clientName: p?.client_id ? (clients.get(p.client_id)?.name ?? null) : null,
          ms,
          share: share(ms),
        };
      })
      .sort(byMsDesc),
    clients: [...byClient.entries()]
      .map(([id, ms]) => ({ id, name: id ? (clients.get(id)?.name ?? "Unknown client") : "No client", ms, share: share(ms) }))
      .sort(byMsDesc),
  };
}

/* ---------- CSV ---------- */

export const CSV_HEADER = [
  "Date",
  "Start",
  "End",
  "Duration",
  "Duration (hours)",
  "Description",
  "Project",
  "Client",
  "Tags",
  "Billable",
];

/** One CSV row per finished entry, times in the user's zone, oldest first. */
export function csvRows(input: {
  entries: (ReportEntry & { stop_at: string })[];
  timeZone: string;
  projects: ReportProject[];
  clients: Named[];
  tags: Named[];
}): string[][] {
  const projects = new Map(input.projects.map((p) => [p.id, p]));
  const clients = new Map(input.clients.map((c) => [c.id, c.name]));
  const tags = new Map(input.tags.map((t) => [t.id, t.name]));
  return [...input.entries]
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
    .map((e) => {
      const seconds = Math.floor((Date.parse(e.stop_at) - Date.parse(e.start_at)) / 1000);
      const project = e.project_id ? projects.get(e.project_id) : undefined;
      return [
        dayKey(e.start_at, input.timeZone),
        timeOfDay(e.start_at, input.timeZone),
        timeOfDay(e.stop_at, input.timeZone),
        formatClock(seconds),
        (seconds / 3600).toFixed(2),
        e.description,
        project?.name ?? "",
        project?.client_id ? (clients.get(project.client_id) ?? "") : "",
        e.time_entry_tags
          .map((t) => tags.get(t.tag_id))
          .filter(Boolean)
          .join(", "),
        e.billable ? "Yes" : "No",
      ];
    });
}

/**
 * RFC 4180 CSV with a UTF-8 byte-order mark (so Excel reads accents) and CRLF line
 * ends. Cells that a spreadsheet would run as a formula are prefixed with an
 * apostrophe, so a description like "=HYPERLINK(...)" stays plain text.
 */
export function toCsv(rows: string[][]): string {
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
