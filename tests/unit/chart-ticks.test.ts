import { describe, expect, it } from "vitest";
import { hourTicks, hoursTick } from "@/components/reports/DailyChart";

describe("hourTicks", () => {
  it.each([
    [0, [0, 0.25]],
    [1.0033, [0, 0.5, 1, 1.5]],
    [3.5, [0, 1, 2, 3, 4]],
    [7, [0, 2, 4, 6, 8]],
    [10, [0, 3, 6, 9, 12]],
  ])("max %f h → %j", (max, expected) => {
    expect(hourTicks(max)).toEqual(expected);
  });
});

describe("hoursTick", () => {
  it("labels short steps in minutes", () => {
    expect([0, 0.25, 0.5, 1, 1.5, 2].map(hoursTick)).toEqual(["0", "15m", "30m", "1h", "1.5h", "2h"]);
  });
});
