import { describe, expect, it } from "vitest";
import {
  buildReport,
  csvRows,
  daysIn,
  matchesFilters,
  NO_FILTERS,
  presetRange,
  splitByDay,
  toCsv,
  type ReportEntry,
  type ReportProject,
} from "@/lib/reports";
import { formatDuration, startOfWeekKey } from "@/lib/time";

const H = 3_600_000;
const entry = (start: string, stop: string | null, extra: Partial<ReportEntry> = {}): ReportEntry => ({
  start_at: start,
  stop_at: stop,
  description: "",
  project_id: null,
  billable: false,
  time_entry_tags: [],
  ...extra,
});

describe("formatDuration", () => {
  it.each([
    [5400, "clock", "01:30:00"],
    [5400, "decimal", "1.50 h"],
    [5400, "classic", "1h 30m"],
    [125, "classic", "2m"],
    [45, "classic", "45s"],
    [0, "decimal", "0.00 h"],
  ] as const)("%i s as %s → %s", (seconds, format, expected) => {
    expect(formatDuration(seconds, format)).toBe(expected);
  });
});

describe("ranges", () => {
  // 2026-10-04 is a Sunday.
  it("starts weeks on Monday or Sunday", () => {
    expect(startOfWeekKey("2026-10-04", 1)).toBe("2026-09-28");
    expect(startOfWeekKey("2026-10-04", 0)).toBe("2026-10-04");
    expect(startOfWeekKey("2026-09-28", 1)).toBe("2026-09-28");
  });

  it("builds week and month presets", () => {
    expect(presetRange("this-week", "2026-10-04", 1)).toEqual({ from: "2026-09-28", to: "2026-10-05" });
    expect(presetRange("last-week", "2026-10-04", 1)).toEqual({ from: "2026-09-21", to: "2026-09-28" });
    expect(presetRange("this-month", "2026-10-04", 1)).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(presetRange("last-month", "2026-10-04", 1)).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(presetRange("this-month", "2026-12-15", 1)).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(presetRange("last-month", "2026-01-10", 1)).toEqual({ from: "2025-12-01", to: "2026-01-01" });
  });

  it("lists every day", () => {
    expect(daysIn({ from: "2026-09-28", to: "2026-10-05" })).toHaveLength(7);
  });
});

describe("splitByDay", () => {
  const all = [0, Number.MAX_SAFE_INTEGER] as const;

  it("splits an entry across midnight in the user's zone", () => {
    // 21:00–01:00 UTC is 23:00–03:00 in Paris (UTC+2).
    const parts = splitByDay(entry("2026-10-03T21:00:00Z", "2026-10-04T01:00:00Z"), "Europe/Paris", 0, ...all);
    expect(parts).toEqual([
      { key: "2026-10-03", ms: 1 * H },
      { key: "2026-10-04", ms: 3 * H },
    ]);
  });

  it("keeps it on one day in a zone where it doesn't cross midnight", () => {
    const parts = splitByDay(entry("2026-10-03T21:00:00Z", "2026-10-04T01:00:00Z"), "America/New_York", 0, ...all);
    expect(parts).toEqual([{ key: "2026-10-03", ms: 4 * H }]);
  });

  it("clips to the range and counts a running entry up to now", () => {
    const from = Date.parse("2026-10-04T00:00:00Z");
    const now = Date.parse("2026-10-04T02:30:00Z");
    const parts = splitByDay(entry("2026-10-03T23:00:00Z", null), "UTC", now, from, Number.MAX_SAFE_INTEGER);
    expect(parts).toEqual([{ key: "2026-10-04", ms: 2.5 * H }]);
  });

  it("handles the 25-hour day when clocks go back", () => {
    // Europe/Paris falls back on 2026-10-25: that day lasts 25 hours.
    const parts = splitByDay(entry("2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"), "Europe/Paris", 0, ...all);
    expect(parts).toEqual([{ key: "2026-10-25", ms: 25 * H }]);
  });
});

describe("filters", () => {
  const projects = new Map<string, ReportProject>([
    ["p1", { id: "p1", name: "Site", color: "#10B981", client_id: "c1" }],
    ["p2", { id: "p2", name: "Internal", color: "#22D3EE", client_id: null }],
  ]);
  const e = entry("2026-10-04T09:00:00Z", "2026-10-04T10:00:00Z", {
    project_id: "p1",
    billable: true,
    time_entry_tags: [{ tag_id: "t1" }],
  });

  it("matches by client, project, tag and billable", () => {
    expect(matchesFilters(e, NO_FILTERS, projects)).toBe(true);
    expect(matchesFilters(e, { ...NO_FILTERS, clientId: "c1" }, projects)).toBe(true);
    expect(matchesFilters(e, { ...NO_FILTERS, clientId: "none" }, projects)).toBe(false);
    expect(matchesFilters(e, { ...NO_FILTERS, projectId: "p2" }, projects)).toBe(false);
    expect(matchesFilters(e, { ...NO_FILTERS, tagId: "t1" }, projects)).toBe(true);
    expect(matchesFilters(e, { ...NO_FILTERS, tagId: "t2" }, projects)).toBe(false);
    expect(matchesFilters(e, { ...NO_FILTERS, billable: "non-billable" }, projects)).toBe(false);
  });

  it("treats entries without a project as 'no client'", () => {
    const loose = entry("2026-10-04T09:00:00Z", "2026-10-04T10:00:00Z");
    expect(matchesFilters(loose, { ...NO_FILTERS, projectId: "none" }, projects)).toBe(true);
    expect(matchesFilters(loose, { ...NO_FILTERS, clientId: "none" }, projects)).toBe(true);
  });
});

describe("buildReport", () => {
  const projects: ReportProject[] = [
    { id: "p1", name: "Site", color: "#10B981", client_id: "c1" },
    { id: "p2", name: "Internal", color: "#22D3EE", client_id: null },
  ];
  const clients = [{ id: "c1", name: "Acme" }];
  const entries = [
    entry("2026-09-28T08:00:00Z", "2026-09-28T10:00:00Z", { project_id: "p1", billable: true }),
    entry("2026-09-29T22:00:00Z", "2026-09-30T00:30:00Z", { project_id: "p2" }), // crosses midnight in Kigali
    entry("2026-10-01T09:00:00Z", "2026-10-01T09:45:00Z"),
    entry("2026-09-20T09:00:00Z", "2026-09-20T17:00:00Z", { project_id: "p1" }), // outside the range
  ];

  for (const timeZone of ["UTC", "Africa/Kigali", "America/Los_Angeles"]) {
    it(`totals match the raw entries in ${timeZone}`, () => {
      const r = buildReport({
        entries,
        range: { from: "2026-09-21", to: "2026-10-12" },
        timeZone,
        nowMs: 0,
        filters: NO_FILTERS,
        projects,
        clients,
      });
      // Every entry is fully inside this wide range, except the one on Sep 20.
      const raw = entries.slice(0, 3).reduce((s, e) => s + Date.parse(e.stop_at!) - Date.parse(e.start_at), 0);
      expect(r.totalMs).toBe(raw);
      expect(r.days.reduce((s, d) => s + d.ms, 0)).toBe(raw);
      expect(r.projects.reduce((s, p) => s + p.ms, 0)).toBe(raw);
      expect(r.clients.reduce((s, c) => s + c.ms, 0)).toBe(raw);
      expect(r.projects.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1, 10);
    });
  }

  it("breaks down by project, client and billable for one week", () => {
    const r = buildReport({
      entries,
      range: { from: "2026-09-28", to: "2026-10-05" },
      timeZone: "Africa/Kigali",
      nowMs: 0,
      filters: NO_FILTERS,
      projects,
      clients,
    });
    expect(r.entryCount).toBe(3);
    expect(r.totalMs).toBe(2 * H + 2.5 * H + 0.75 * H);
    expect(r.billableMs).toBe(2 * H);
    expect(r.days.map((d) => d.ms / H)).toEqual([2, 0, 2.5, 0.75, 0, 0, 0]); // 00:00–02:30 Kigali on Sep 30
    expect(r.projects.map((p) => [p.name, p.ms / H])).toEqual([
      ["Internal", 2.5],
      ["Site", 2],
      ["No project", 0.75],
    ]);
    expect(r.projects[1].clientName).toBe("Acme");
    expect(r.clients.map((c) => [c.name, c.ms / H])).toEqual([
      ["No client", 3.25],
      ["Acme", 2],
    ]);
  });

  it("applies filters to every total", () => {
    const r = buildReport({
      entries,
      range: { from: "2026-09-28", to: "2026-10-05" },
      timeZone: "UTC",
      nowMs: 0,
      filters: { ...NO_FILTERS, billable: "billable" },
      projects,
      clients,
    });
    expect(r.totalMs).toBe(2 * H);
    expect(r.projects).toHaveLength(1);
  });
});

describe("CSV", () => {
  it("writes rows in the user's zone, oldest first", () => {
    const rows = csvRows({
      entries: [
        { ...entry("2026-10-04T13:00:00Z", "2026-10-04T14:30:00Z", { description: "Later" }), stop_at: "2026-10-04T14:30:00Z" },
        {
          ...entry("2026-10-04T07:00:00Z", "2026-10-04T08:00:00Z", {
            description: "Design",
            project_id: "p1",
            billable: true,
            time_entry_tags: [{ tag_id: "t1" }, { tag_id: "t2" }],
          }),
          stop_at: "2026-10-04T08:00:00Z",
        },
      ],
      timeZone: "Europe/Paris",
      projects: [{ id: "p1", name: "Site", color: "#10B981", client_id: "c1" }],
      clients: [{ id: "c1", name: "Acme" }],
      tags: [
        { id: "t1", name: "deep work" },
        { id: "t2", name: "ux" },
      ],
    });
    expect(rows[0]).toEqual(["2026-10-04", "09:00", "10:00", "01:00:00", "1.00", "Design", "Site", "Acme", "deep work, ux", "Yes"]);
    expect(rows[1].slice(0, 6)).toEqual(["2026-10-04", "15:00", "16:30", "01:30:00", "1.50", "Later"]);
  });

  it("quotes commas, quotes and line breaks, and neutralises formulas", () => {
    const csv = toCsv([
      ["a,b", 'say "hi"', "two\nlines"],
      ["=SUM(A1)", "+1", "-x", "@cmd", "plain"],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿"a,b","say ""hi""","two\nlines"\r\n\'=SUM(A1),\'+1,\'-x,\'@cmd,plain\r\n');
  });
});
