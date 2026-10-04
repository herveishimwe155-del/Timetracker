import { describe, expect, it } from "vitest";
import { nextProjectColor, PROJECT_COLORS } from "@/lib/project-colors";

describe("nextProjectColor", () => {
  it("starts with emerald", () => {
    expect(nextProjectColor([])).toBe("#10B981");
  });

  it("picks the first unused colour, ignoring case", () => {
    expect(nextProjectColor(["#10b981"])).toBe("#22D3EE");
  });

  it("cycles through every colour before reusing one", () => {
    const used: string[] = [];
    for (let i = 0; i < PROJECT_COLORS.length; i++) used.push(nextProjectColor(used));
    expect(new Set(used).size).toBe(PROJECT_COLORS.length);
    expect(nextProjectColor(used)).toBe("#10B981");
  });

  it("ignores custom colours outside the palette", () => {
    expect(nextProjectColor(["#123456"])).toBe("#10B981");
  });
});
