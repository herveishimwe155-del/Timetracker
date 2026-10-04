import { describe, expect, it } from "vitest";
import { resolveTimes, type OriginalTimes } from "@/lib/entry-times";

const tz = "Europe/Paris"; // UTC+2 in October
const original: OriginalTimes = {
  date: "2026-10-04",
  start: "15:51",
  end: "15:52",
  startAt: "2026-10-04T13:51:20.000Z",
  stopAt: "2026-10-04T13:52:35.000Z",
};
const iso = (d: Date) => d.toISOString();

describe("resolveTimes", () => {
  it("keeps exact seconds when nothing changed", () => {
    const r = resolveTimes(original, original, tz);
    expect(iso(r.startAt)).toBe(original.startAt);
    expect(iso(r.stopAt)).toBe(original.stopAt);
    expect(r.endsNextDay).toBe(false);
  });

  it("does not turn a sub-minute entry into a next-day entry", () => {
    const short = { ...original, end: "15:51", stopAt: "2026-10-04T13:51:50.000Z" };
    const r = resolveTimes(short, short, tz);
    expect(iso(r.stopAt)).toBe(short.stopAt);
    expect(r.endsNextDay).toBe(false);
  });

  it("rebuilds only the field that changed", () => {
    const r = resolveTimes({ ...original, end: "16:30" }, original, tz);
    expect(iso(r.startAt)).toBe(original.startAt);
    expect(iso(r.stopAt)).toBe("2026-10-04T14:30:00.000Z");
  });

  it("moves both times when the date changes", () => {
    const r = resolveTimes({ ...original, date: "2026-10-03" }, original, tz);
    expect(iso(r.startAt)).toBe("2026-10-03T13:51:00.000Z");
    expect(iso(r.stopAt)).toBe("2026-10-03T13:52:00.000Z");
  });

  it("treats a changed end before the start as the next day", () => {
    const r = resolveTimes({ date: "2026-10-04", start: "22:00", end: "01:00" }, null, tz);
    expect(iso(r.stopAt)).toBe("2026-10-04T23:00:00.000Z");
    expect(r.endsNextDay).toBe(true);
  });

  it("builds new entries from the fields alone", () => {
    const r = resolveTimes({ date: "2026-10-04", start: "09:00", end: "10:15" }, null, tz);
    expect(iso(r.startAt)).toBe("2026-10-04T07:00:00.000Z");
    expect(iso(r.stopAt)).toBe("2026-10-04T08:15:00.000Z");
  });
});
