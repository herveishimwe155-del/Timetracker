/**
 * Logic for the Timer page's Calendar, Timesheet and grouped List views.
 * Pure functions (no React, no Supabase) so they are unit-tested.
 */
import { splitByDay, type DayRange } from "@/lib/reports";
import { addDaysToKey, startOfWeekKey, wallTimeToInstant } from "@/lib/time";

const MINUTE = 60_000;
type Span = { start_at: string; stop_at: string | null };

/* ---------- Weeks ---------- */

/** The week containing `key`, starting on `weekStart` (0 = Sunday). */
export function weekOf(key: string, weekStart: number): DayRange {
  const from = startOfWeekKey(key, weekStart);
  return { from, to: addDaysToKey(from, 7) };
}

/** ISO 8601 week number: weeks start Monday, and week 1 holds the year's first Thursday. */
export function isoWeek(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.getUTCDay() || 7; // Monday 1 … Sunday 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // that week's Thursday
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/* ---------- Calendar ---------- */

export type CalendarBlock<T> = { entry: T; startMin: number; endMin: number; running: boolean };

/**
 * Where entries sit on one day's grid, in minutes from that day's local midnight
 * (0–1440). Entries crossing midnight are cut at the day's edges; a running entry
 * reaches `nowMs`.
 */
export function layoutDay<T extends Span>(entries: T[], key: string, timeZone: string, nowMs: number): CalendarBlock<T>[] {
  const dayStart = wallTimeToInstant(key, "00:00", timeZone).getTime();
  const dayEnd = wallTimeToInstant(addDaysToKey(key, 1), "00:00", timeZone).getTime();
  const blocks: CalendarBlock<T>[] = [];
  for (const entry of entries) {
    const start = Date.parse(entry.start_at);
    const end = entry.stop_at ? Date.parse(entry.stop_at) : nowMs;
    if (end <= dayStart || start >= dayEnd) continue;
    blocks.push({
      entry,
      startMin: Math.max(0, (start - dayStart) / MINUTE),
      endMin: Math.min(1440, (Math.min(end, dayEnd) - dayStart) / MINUTE),
      running: entry.stop_at === null,
    });
  }
  return blocks.sort((a, b) => a.startMin - b.startMin);
}

/** Rounds minutes to the nearest step (default 15). */
export const snapMinutes = (minutes: number, step = 15) => Math.max(0, Math.min(1440, Math.round(minutes / step) * step));

/** "HH:mm" for minutes since midnight (1440 → "24:00" is clamped to "23:59"). */
export function minutesToTime(minutes: number): string {
  const m = Math.min(1439, Math.max(0, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/* ---------- Timesheet ---------- */

export type TimesheetRow = { projectId: string | null; days: number[]; totalMs: number };
export type Timesheet = { days: string[]; rows: TimesheetRow[]; dayTotals: number[]; totalMs: number };

/**
 * Time per project per day for a week, in milliseconds. Rows are listed for every
 * project with time that week plus any `extraProjects` (rows the user added).
 */
export function buildTimesheet<T extends Span & { project_id: string | null }>(input: {
  entries: T[];
  week: DayRange;
  timeZone: string;
  nowMs: number;
  extraProjects?: (string | null)[];
}): Timesheet {
  const days: string[] = [];
  for (let k = input.week.from; k < input.week.to; k = addDaysToKey(k, 1)) days.push(k);
  const index = new Map(days.map((k, i) => [k, i]));
  const fromMs = wallTimeToInstant(input.week.from, "00:00", input.timeZone).getTime();
  const toMs = wallTimeToInstant(input.week.to, "00:00", input.timeZone).getTime();

  const rows = new Map<string | null, number[]>();
  const rowFor = (id: string | null) => {
    if (!rows.has(id)) rows.set(id, days.map(() => 0));
    return rows.get(id)!;
  };
  for (const id of input.extraProjects ?? []) rowFor(id);

  for (const entry of input.entries) {
    for (const part of splitByDay(entry, input.timeZone, input.nowMs, fromMs, toMs)) {
      const i = index.get(part.key);
      if (i !== undefined) rowFor(entry.project_id)[i] += part.ms;
    }
  }

  const list = [...rows.entries()].map(([projectId, d]) => ({ projectId, days: d, totalMs: d.reduce((a, b) => a + b, 0) }));
  const dayTotals = days.map((_, i) => list.reduce((sum, r) => sum + r.days[i], 0));
  return { days, rows: list, dayTotals, totalMs: dayTotals.reduce((a, b) => a + b, 0) };
}

/**
 * Reads a duration typed into a timesheet cell, in seconds:
 * "1:30" → 5400, "1:30:15" → 5415, "1.5" or "1,5" → 5400 (hours), "90m" → 5400,
 * "2h" → 7200, "1h 30m" → 5400. Empty or invalid → null.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  m = s.match(/^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (m && (m[1] || m[2])) return Math.round(Number((m[1] ?? "0").replace(",", ".")) * 3600) + Number(m[2] ?? 0) * 60;
  m = s.match(/^\d+(?:[.,]\d+)?$/);
  if (m) return Math.round(Number(s.replace(",", ".")) * 3600);
  return null;
}

/**
 * Where to place `seconds` of new time on a day: right after the day's last entry
 * (rounded up to the minute), or from 09:00 on an empty day. Null if it won't fit
 * before midnight.
 */
export function slotForNewTime(dayEntries: Span[], key: string, seconds: number, timeZone: string, nowMs: number) {
  const dayStart = wallTimeToInstant(key, "00:00", timeZone).getTime();
  const dayEnd = wallTimeToInstant(addDaysToKey(key, 1), "00:00", timeZone).getTime();
  const lastEnd = Math.max(
    0,
    ...dayEntries
      .map((e) => (e.stop_at ? Date.parse(e.stop_at) : nowMs))
      .filter((end) => end > dayStart && end <= dayEnd),
  );
  const start = lastEnd ? Math.ceil(lastEnd / MINUTE) * MINUTE : wallTimeToInstant(key, "09:00", timeZone).getTime();
  const stop = start + seconds * 1000;
  return stop <= dayEnd ? { start: new Date(start), stop: new Date(stop) } : null;
}

/* ---------- Grouped list ---------- */

type Groupable = Span & { description: string; project_id: string | null; billable: boolean; time_entry_tags: { tag_id: string }[] };

export type EntryGroup<T> = { key: string; entries: T[] };

/**
 * Groups a day's entries that share description, project, tags and billable
 * (Toggl's stacked rows). Groups keep the order of their newest entry.
 */
export function groupSimilar<T extends Groupable>(entries: T[]): EntryGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const e of entries) {
    const key = [
      e.description.trim(),
      e.project_id ?? "",
      e.billable ? "1" : "0",
      e.time_entry_tags.map((t) => t.tag_id).sort().join(","),
    ].join("|");
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, entries: list }));
}

