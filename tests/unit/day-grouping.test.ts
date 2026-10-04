import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  dayKey,
  dayLabel,
  displayTime,
  hourLabel,
  entrySeconds,
  groupByDay,
  timeOfDay,
  wallTimeToInstant,
} from "@/lib/time";

const NOW = Date.parse("2026-10-04T12:00:00Z"); // a Sunday

describe("entrySeconds", () => {
  it("measures finished entries", () => {
    expect(entrySeconds({ start_at: "2026-10-04T09:00:00Z", stop_at: "2026-10-04T10:30:15Z" }, NOW)).toBe(5415);
  });

  it("measures running entries up to now", () => {
    expect(entrySeconds({ start_at: "2026-10-04T11:59:00Z", stop_at: null }, NOW)).toBe(60);
  });

  it("never goes negative when the clock is behind", () => {
    expect(entrySeconds({ start_at: "2026-10-04T12:00:05Z", stop_at: null }, NOW)).toBe(0);
  });
});

describe("dayKey and timeOfDay", () => {
  it("uses the user's time zone, not UTC", () => {
    const instant = "2026-10-04T23:30:00Z";
    expect(dayKey(instant, "UTC")).toBe("2026-10-04");
    expect(dayKey(instant, "Africa/Kigali")).toBe("2026-10-05"); // UTC+2
    expect(dayKey(instant, "America/New_York")).toBe("2026-10-04"); // UTC-4
    expect(timeOfDay(instant, "Africa/Kigali")).toBe("01:30");
  });
});

describe("dayLabel", () => {
  it("names today and yesterday", () => {
    expect(dayLabel("2026-10-04", "UTC", NOW)).toBe("Today");
    expect(dayLabel("2026-10-03", "UTC", NOW)).toBe("Yesterday");
  });

  it("shows the weekday and date, adding the year only for other years", () => {
    expect(dayLabel("2026-09-28", "UTC", NOW)).toBe("Mon, 28 Sep");
    expect(dayLabel("2025-12-31", "UTC", NOW)).toBe("Wed, 31 Dec 2025");
  });

  it("decides 'today' in the user's zone", () => {
    // 23:30 UTC on Oct 4 is already Oct 5 in Kigali.
    const late = Date.parse("2026-10-04T23:30:00Z");
    expect(dayLabel("2026-10-05", "Africa/Kigali", late)).toBe("Today");
  });
});

describe("addDaysToKey", () => {
  it("crosses month and year ends", () => {
    expect(addDaysToKey("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("wallTimeToInstant", () => {
  it("converts a wall-clock time in a zone to the exact instant", () => {
    expect(wallTimeToInstant("2026-10-04", "09:30", "Africa/Kigali").toISOString()).toBe("2026-10-04T07:30:00.000Z");
    expect(wallTimeToInstant("2026-10-04", "09:30", "UTC").toISOString()).toBe("2026-10-04T09:30:00.000Z");
  });

  it("handles daylight saving changes", () => {
    // Europe/Paris switches from UTC+2 to UTC+1 on 2026-10-25.
    expect(wallTimeToInstant("2026-10-24", "12:00", "Europe/Paris").toISOString()).toBe("2026-10-24T10:00:00.000Z");
    expect(wallTimeToInstant("2026-10-26", "12:00", "Europe/Paris").toISOString()).toBe("2026-10-26T11:00:00.000Z");
  });

  it("round-trips with dayKey and timeOfDay", () => {
    const instant = wallTimeToInstant("2026-03-15", "18:45", "America/New_York");
    expect(dayKey(instant, "America/New_York")).toBe("2026-03-15");
    expect(timeOfDay(instant, "America/New_York")).toBe("18:45");
  });
});

describe("groupByDay", () => {
  const entries = [
    { id: "a", start_at: "2026-10-03T08:00:00Z", stop_at: "2026-10-03T09:00:00Z" },
    { id: "b", start_at: "2026-10-04T09:00:00Z", stop_at: "2026-10-04T10:00:00Z" },
    { id: "c", start_at: "2026-10-04T11:00:00Z", stop_at: null },
    { id: "d", start_at: "2026-10-03T22:30:00Z", stop_at: "2026-10-03T23:00:00Z" },
  ];

  it("groups newest day first with totals including the running entry", () => {
    const groups = groupByDay(entries, "UTC", NOW);
    expect(groups.map((g) => g.key)).toEqual(["2026-10-04", "2026-10-03"]);
    expect(groups[0].label).toBe("Today");
    expect(groups[0].entries.map((e) => e.id)).toEqual(["c", "b"]);
    expect(groups[0].seconds).toBe(3600 + 3600); // 1 h finished + 1 h running
    expect(groups[1].seconds).toBe(3600 + 1800);
  });

  it("moves late-evening entries to the next day in a zone ahead of UTC", () => {
    const groups = groupByDay(entries, "Africa/Kigali", NOW);
    // d starts 00:30 on Oct 4 in Kigali.
    expect(groups[0].entries.map((e) => e.id)).toEqual(["c", "b", "d"]);
  });

  it("returns nothing for no entries", () => {
    expect(groupByDay([], "UTC", NOW)).toEqual([]);
  });
});

describe("displayTime and hourLabel", () => {
  it("shows 24-hour or 12-hour clocks", () => {
    const instant = "2026-10-04T12:16:00Z"; // 14:16 in Paris
    expect(displayTime(instant, "Europe/Paris", "24h")).toBe("14:16");
    expect(displayTime(instant, "Europe/Paris", "12h")).toBe("2:16 PM");
    expect(displayTime("2026-10-04T22:05:00Z", "Europe/Paris", "12h")).toBe("12:05 AM");
  });

  it("labels grid hours", () => {
    expect([0, 9, 12, 14].map((h) => hourLabel(h, "24h"))).toEqual(["00:00", "09:00", "12:00", "14:00"]);
    expect([0, 9, 12, 14].map((h) => hourLabel(h, "12h"))).toEqual(["12 AM", "9 AM", "12 PM", "2 PM"]);
  });
});
