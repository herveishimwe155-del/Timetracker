import { describe, expect, it } from "vitest";
import { defaultRange } from "@/lib/entry-range";

const at = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString().slice(11, 16);
const range = (r: { start: number; end: number }) => `${iso(r.start)}-${iso(r.end)}`;

describe("defaultRange", () => {
  it("fills the gap after the latest entry up to now", () => {
    const entries = [{ start_at: "2026-10-04T08:00:00Z", stop_at: "2026-10-04T09:00:00Z" }];
    expect(range(defaultRange(entries, null, at("2026-10-04T10:15:40Z")))).toBe("09:00-10:15");
  });

  it("rounds a mid-minute stop up so the new entry can't overlap it", () => {
    const entries = [{ start_at: "2026-10-04T08:00:00Z", stop_at: "2026-10-04T09:00:23Z" }];
    expect(range(defaultRange(entries, null, at("2026-10-04T10:00:00Z")))).toBe("09:01-10:00");
  });

  it("ends where the running timer started", () => {
    const entries = [{ start_at: "2026-10-04T08:00:00Z", stop_at: "2026-10-04T09:00:00Z" }];
    const running = { start_at: "2026-10-04T09:40:10Z", stop_at: null };
    expect(range(defaultRange(entries, running, at("2026-10-04T10:00:00Z")))).toBe("09:00-09:40");
  });

  it("offers the half hour after the latest entry when there is no gap", () => {
    const entries = [{ start_at: "2026-10-04T09:00:00Z", stop_at: "2026-10-04T09:59:50Z" }];
    expect(range(defaultRange(entries, null, at("2026-10-04T10:00:10Z")))).toBe("10:00-10:30");
  });

  it("offers the last half hour after a long break or with no entries", () => {
    const old = [{ start_at: "2026-10-03T08:00:00Z", stop_at: "2026-10-03T09:00:00Z" }];
    expect(range(defaultRange(old, null, at("2026-10-04T10:00:00Z")))).toBe("09:30-10:00");
    expect(range(defaultRange([], null, at("2026-10-04T10:00:00Z")))).toBe("09:30-10:00");
  });
});
