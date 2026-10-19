import { TZDate } from "@date-fns/tz";

/**
 * Reading time entries from CSV, for Settings → Import. Pure functions (tested in
 * tests/unit/csv-import.test.ts). Accepts Tickr's own export and Toggl Track's
 * detailed export; columns are matched by name, in any order.
 */

export type ImportRow = {
  line: number;
  description: string;
  project: string | null;
  client: string | null;
  tags: string[];
  billable: boolean;
  startAt: Date;
  stopAt: Date;
};

export type ImportProblem = { line: number; message: string };

/** RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF or LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const COLUMN_NAMES = {
  description: ["description"],
  project: ["project"],
  client: ["client"],
  tags: ["tags", "tag"],
  billable: ["billable"],
  startDate: ["start date", "date"],
  startTime: ["start time", "start"],
  endDate: ["end date"],
  endTime: ["end time", "end"],
} as const;
type Column = keyof typeof COLUMN_NAMES;

/** Our export prefixes formula-like cells with an apostrophe; undo that. */
const clean = (value: string | undefined) => {
  const v = (value ?? "").trim();
  return /^'[=+\-@]/.test(v) ? v.slice(1) : v;
};

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function toInstant(date: string, time: string, timeZone: string): Date | null {
  const d = DATE.exec(date);
  const t = TIME.exec(time);
  if (!d || !t) return null;
  const [hh, mm, ss] = [Number(t[1]), Number(t[2]), Number(t[3] ?? 0)];
  if (hh > 23 || mm > 59 || ss > 59) return null;
  return new Date(new TZDate(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hh, mm, ss, 0, timeZone).getTime());
}

/** Turns CSV text into entries to import, with a list of rows that couldn't be read. */
export function readImport(text: string, timeZone: string): { rows: ImportRow[]; problems: ImportProblem[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], problems: [{ line: 1, message: "The file has no entries." }] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const index = {} as Record<Column, number>;
  for (const key of Object.keys(COLUMN_NAMES) as Column[]) {
    index[key] = header.findIndex((h) => (COLUMN_NAMES[key] as readonly string[]).includes(h));
  }
  if (index.startDate < 0 || index.startTime < 0 || index.endTime < 0) {
    return {
      rows: [],
      problems: [{ line: 1, message: "Couldn't find the date, start and end columns. Use a Tickr or Toggl CSV export." }],
    };
  }

  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (key: Column) => (index[key] >= 0 ? clean(cells[index[key]]) : "");
    const startDate = get("startDate");
    const startAt = toInstant(startDate, get("startTime"), timeZone);
    let stopAt = toInstant(get("endDate") || startDate, get("endTime"), timeZone);
    if (!startAt || !stopAt) {
      problems.push({ line, message: "Date or time isn't in YYYY-MM-DD and HH:MM form." });
      return;
    }
    // Tickr's export has no end date: an end before the start means the next day.
    if (stopAt.getTime() === startAt.getTime()) {
      problems.push({ line, message: "The entry has no duration." });
      return;
    }
    if (!get("endDate") && stopAt < startAt) {
      stopAt = new Date(stopAt.getTime() + 86_400_000);
    }
    if (stopAt < startAt) {
      problems.push({ line, message: "The end is before the start." });
      return;
    }
    const billable = get("billable").toLowerCase();
    rows.push({
      line,
      description: get("description").slice(0, 2000),
      project: get("project") || null,
      client: get("client") || null,
      tags: [...new Set(get("tags").split(",").map((t) => t.trim()).filter(Boolean))],
      billable: billable === "yes" || billable === "true" || billable === "1",
      startAt,
      stopAt,
    });
  });
  return { rows, problems };
}
