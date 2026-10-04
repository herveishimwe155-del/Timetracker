import { describe, expect, it } from "vitest";
import {
  buildTimesheet,
  groupSimilar,
  isoWeek,
  layoutDay,
  minutesToTime,
  parseDuration,
  slotForNewTime,
  snapMinutes,
  weekOf,
} from "@/lib/views";

const H = 3_600_000;
const span = (start: string, stop: string | null, extra: Record<string, unknown> = {}) => ({
  id: "",
  start_at: start,
  stop_at: stop,
  description: "",
  project_id: null as string | null,
  billable: false,
  time_entry_tags: [] as { tag_id: string }[],
  ...extra,
});

describe("weeks", () => {
  it("finds the week around a day for Monday and Sunday starts", () => {
    expect(weekOf("2026-10-04", 1)).toEqual({ from: "2026-09-28", to: "2026-10-05" });
    expect(weekOf("2026-10-04", 0)).toEqual({ from: "2026-10-04", to: "2026-10-11" });
  });

  it.each([
    ["2026-10-04", 40],
    ["2026-09-28", 40],
    ["2026-01-01", 1],
    ["2027-01-01", 53], // 2026 has 53 ISO weeks
    ["2025-12-29", 1],
  ])("ISO week of %s is %i", (key, week) => {
    expect(isoWeek(key)).toBe(week);
  });
});

describe("layoutDay", () => {
  it("places entries in minutes from local midnight and splits across days", () => {
    // Paris is UTC+2: 08:00Z = 10:00 local; 21:30Z–23:00Z = 23:30–01:00 local.
    const entries = [span("2026-10-04T08:00:00Z", "2026-10-04T09:30:00Z"), span("2026-10-03T21:30:00Z", "2026-10-03T23:00:00Z")];
    expect(layoutDay(entries, "2026-10-04", "Europe/Paris", 0).map((b) => [b.startMin, b.endMin])).toEqual([
      [0, 60],
      [600, 690],
    ]);
    expect(layoutDay(entries, "2026-10-03", "Europe/Paris", 0).map((b) => [b.startMin, b.endMin])).toEqual([[1410, 1440]]);
  });

  it("grows a running entry to now", () => {
    const now = Date.parse("2026-10-04T10:15:00Z");
    const [block] = layoutDay([span("2026-10-04T10:00:00Z", null)], "2026-10-04", "UTC", now);
    expect([block.startMin, block.endMin, block.running]).toEqual([600, 615, true]);
  });

  it("snaps and formats grid minutes", () => {
    expect(snapMinutes(607)).toBe(600);
    expect(snapMinutes(608)).toBe(615);
    expect(minutesToTime(615)).toBe("10:15");
    expect(minutesToTime(1440)).toBe("23:59");
  });
});

describe("parseDuration", () => {
  it.each([
    ["1:30", 5400],
    ["1:30:15", 5415],
    ["0:45", 2700],
    ["1.5", 5400],
    ["1,5", 5400],
    ["2", 7200],
    ["90m", 5400],
    ["2h", 7200],
    ["1h 30m", 5400],
    ["1.25h", 4500],
  ])("%s → %i s", (text, seconds) => {
    expect(parseDuration(text)).toBe(seconds);
  });

  it.each(["", "abc", "1:75", "-1"])("rejects %j", (text) => {
    expect(parseDuration(text)).toBeNull();
  });
});

describe("buildTimesheet", () => {
  const week = { from: "2026-09-28", to: "2026-10-05" };
  const entries = [
    span("2026-09-28T09:00:00Z", "2026-09-28T10:30:00Z", { project_id: "p1" }),
    span("2026-09-30T09:00:00Z", "2026-09-30T10:00:00Z", { project_id: "p1" }),
    span("2026-09-30T13:00:00Z", "2026-09-30T13:30:00Z"),
    span("2026-10-04T23:00:00Z", "2026-10-05T01:00:00Z", { project_id: "p2" }), // only 1 h falls in this UTC week
  ];

  it("sums per project per day, with day and week totals that add up", () => {
    const t = buildTimesheet({ entries, week, timeZone: "UTC", nowMs: 0, extraProjects: ["p3"] });
    const row = (id: string | null) => t.rows.find((r) => r.projectId === id)!;
    expect(row("p1").days.map((ms) => ms / H)).toEqual([1.5, 0, 1, 0, 0, 0, 0]);
    expect(row(null).days[2] / H).toBe(0.5);
    expect(row("p2").days[6] / H).toBe(1);
    expect(row("p3").totalMs).toBe(0); // a row the user added
    expect(t.dayTotals.map((ms) => ms / H)).toEqual([1.5, 0, 1.5, 0, 0, 0, 1]);
    expect(t.totalMs).toBe(t.rows.reduce((s, r) => s + r.totalMs, 0));
  });
});

describe("slotForNewTime", () => {
  it("starts after the day's last entry, rounded up to the minute", () => {
    const slot = slotForNewTime([span("2026-10-04T09:00:00Z", "2026-10-04T10:00:20Z")], "2026-10-04", 1800, "UTC", 0)!;
    expect(slot.start.toISOString()).toBe("2026-10-04T10:01:00.000Z");
    expect(slot.stop.toISOString()).toBe("2026-10-04T10:31:00.000Z");
  });

  it("starts at 09:00 on an empty day, and refuses time past midnight", () => {
    expect(slotForNewTime([], "2026-10-04", 3600, "Europe/Paris", 0)!.start.toISOString()).toBe("2026-10-04T07:00:00.000Z");
    expect(slotForNewTime([span("2026-10-04T20:00:00Z", "2026-10-04T23:30:00Z")], "2026-10-04", 3600, "UTC", 0)).toBeNull();
  });
});

describe("groupSimilar", () => {
  it("stacks entries with the same description, project, tags and billable", () => {
    const groups = groupSimilar([
      span("2026-10-04T12:00:00Z", "2026-10-04T13:00:00Z", { id: "a", description: "K-connect", project_id: "p1" }),
      span("2026-10-04T09:00:00Z", "2026-10-04T10:00:00Z", { id: "b", description: "Research", project_id: "p2" }),
      span("2026-10-04T08:00:00Z", "2026-10-04T08:30:00Z", { id: "c", description: "K-connect ", project_id: "p1" }),
      span("2026-10-04T07:00:00Z", "2026-10-04T07:30:00Z", { id: "d", description: "K-connect", project_id: "p1", billable: true }),
    ]);
    expect(groups.map((g) => g.entries.map((e) => e.id))).toEqual([["a", "c"], ["b"], ["d"]]);
  });
});
