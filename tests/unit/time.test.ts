import { describe, expect, it } from "vitest";
import { describeDuration, formatClock, splitDuration } from "@/lib/time";

describe("splitDuration", () => {
  it("splits seconds into h, m, s", () => {
    expect(splitDuration(3725)).toEqual({ hours: 1, minutes: 2, seconds: 5 });
  });

  it("treats negative and fractional input safely", () => {
    expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    expect(splitDuration(59.9)).toEqual({ hours: 0, minutes: 0, seconds: 59 });
  });
});

describe("formatClock", () => {
  it.each([
    [0, "00:00:00"],
    [59, "00:00:59"],
    [60, "00:01:00"],
    [3725, "01:02:05"],
    [36000, "10:00:00"],
    [360000, "100:00:00"],
  ])("formats %i as %s", (input, expected) => {
    expect(formatClock(input)).toBe(expected);
  });

  it("keeps the same length for every value under 100 hours", () => {
    const lengths = new Set([0, 1, 61, 3599, 3600, 86399, 359999].map((s) => formatClock(s).length));
    expect(lengths).toEqual(new Set([8]));
  });
});

describe("describeDuration", () => {
  it("reads naturally", () => {
    expect(describeDuration(0)).toBe("0 seconds");
    expect(describeDuration(1)).toBe("1 second");
    expect(describeDuration(3725)).toBe("1 hour 2 minutes 5 seconds");
    expect(describeDuration(7200)).toBe("2 hours");
  });
});
