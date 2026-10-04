import { describe, expect, it } from "vitest";
import { nextProjectColor, PROJECT_COLORS } from "@/lib/project-colors";

describe("nextProjectColor", () => {
  it("starts with the first palette colour", () => {
    expect(nextProjectColor([])).toBe("#3987E5");
  });

  it("picks the first unused colour, ignoring case", () => {
    expect(nextProjectColor(["#3987e5"])).toBe("#D95926");
  });

  it("cycles through every colour before reusing one", () => {
    const used: string[] = [];
    for (let i = 0; i < PROJECT_COLORS.length; i++) used.push(nextProjectColor(used));
    expect(new Set(used).size).toBe(PROJECT_COLORS.length);
    expect(nextProjectColor(used)).toBe("#3987E5");
  });

  it("ignores custom colours outside the palette", () => {
    expect(nextProjectColor(["#123456"])).toBe("#3987E5");
  });
});
