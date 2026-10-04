import { TZDate } from "@date-fns/tz";

/**
 * Time helpers. All durations are whole seconds.
 */

/** Splits a duration into hours, minutes and seconds. Negative input counts as 0. */
export function splitDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a duration as a clock, H:MM:SS with at least two hour digits: 0 → "00:00:00", 3725 → "01:02:05". */
export function formatClock(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Spoken form for screen readers: 3725 → "1 hour 2 minutes 5 seconds". */
export function describeDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDuration(totalSeconds);
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const parts = [];
  if (hours) parts.push(part(hours, "hour"));
  if (minutes) parts.push(part(minutes, "minute"));
  if (seconds || parts.length === 0) parts.push(part(seconds, "second"));
  return parts.join(" ");
}

/* ---------- Instants, days and time zones ---------- */


type Instant = string | number | Date;
const toMs = (value: Instant) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

/** Whole seconds between start and stop (or `nowMs` while running). */
export function entrySeconds(entry: { start_at: string; stop_at: string | null }, nowMs: number): number {
  const end = entry.stop_at ? toMs(entry.stop_at) : nowMs;
  return Math.max(0, Math.floor((end - toMs(entry.start_at)) / 1000));
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(key: string, timeZone: string, options: Intl.DateTimeFormatOptions, locale = "en-GB") {
  const id = `${key}|${timeZone}`;
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone, ...options });
    formatters.set(id, f);
  }
  return f;
}

/** Calendar day of an instant in a time zone, as "YYYY-MM-DD". */
export function dayKey(value: Instant, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return formatter("day", timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA").format(toMs(value));
}

/** Wall-clock time of an instant in a time zone, 24-hour "HH:mm". */
export function timeOfDay(value: Instant, timeZone: string): string {
  return formatter("time", timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(toMs(value));
}

/** Adds whole days to a "YYYY-MM-DD" key. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "Yesterday", or e.g. "Mon, 28 Sep" (with the year when it isn't this year). */
export function dayLabel(key: string, timeZone: string, nowMs: number): string {
  const today = dayKey(nowMs, timeZone);
  if (key === today) return "Today";
  if (key === addDaysToKey(today, -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const label = `${weekday}, ${d} ${MONTHS[m - 1]}`;
  return key.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${y}`;
}

/**
 * The instant for a wall-clock date and time in a time zone:
 * ("2026-10-04", "09:30", "Africa/Kigali") → 2026-10-04T07:30:00Z.
 */
export function wallTimeToInstant(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, 0, timeZone).getTime());
}

export type DayGroup<T> = { key: string; label: string; seconds: number; entries: T[] };

/**
 * Groups entries by the day they started (in the user's time zone), newest day
 * first, newest entry first within a day, with each day's total.
 */
export function groupByDay<T extends { start_at: string; stop_at: string | null }>(
  entries: T[],
  timeZone: string,
  nowMs: number,
): DayGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = dayKey(entry.start_at, timeZone);
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, list]) => {
      list.sort((a, b) => toMs(b.start_at) - toMs(a.start_at));
      return {
        key,
        label: dayLabel(key, timeZone, nowMs),
        seconds: list.reduce((sum, e) => sum + entrySeconds(e, nowMs), 0),
        entries: list,
      };
    });
}

/* ---------- Duration formats (user setting) ---------- */

export type DurationFormat = "clock" | "decimal" | "classic";

/**
 * A duration in the user's chosen style:
 * clock 5400 → "01:30:00", decimal → "1.50 h", classic → "1h 30m".
 */
export function formatDuration(totalSeconds: number, format: DurationFormat): string {
  if (format === "decimal") return `${(Math.max(0, totalSeconds) / 3600).toFixed(2)} h`;
  if (format === "classic") {
    const { hours, minutes, seconds } = splitDuration(totalSeconds);
    if (hours) return `${hours}h ${pad(minutes)}m`;
    if (minutes) return `${minutes}m`;
    return `${seconds}s`;
  }
  return formatClock(totalSeconds);
}

/* ---------- Weeks ---------- */

/** Day of the week for a "YYYY-MM-DD" key: 0 = Sunday … 6 = Saturday. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** First day of the week containing `key`, for a week starting on `weekStart` (0 = Sunday). */
export function startOfWeekKey(key: string, weekStart: number): string {
  return addDaysToKey(key, -((weekdayOfKey(key) - weekStart + 7) % 7));
}

/** Short label for chart axes: "Mon 28". */
export function shortDayLabel(key: string): string {
  return `${WEEKDAYS[weekdayOfKey(key)]} ${Number(key.slice(8, 10))}`;
}
