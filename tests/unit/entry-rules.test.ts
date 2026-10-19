import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, missingRequired } from "@/lib/queries/profile";

const entry = { description: "", projectId: null, tagIds: [] as string[] };

describe("missingRequired", () => {
  it("accepts anything with the default rules", () => {
    expect(missingRequired(DEFAULT_RULES, entry)).toBeNull();
  });

  it("lists every missing field in one sentence", () => {
    const rules = { ...DEFAULT_RULES, requireDescription: true, requireProject: true, requireTags: true };
    expect(missingRequired(rules, entry)).toBe("Your settings require a description, a project and at least one tag.");
    expect(missingRequired(rules, { description: "  ", projectId: "p", tagIds: ["t"] })).toBe(
      "Your settings require a description.",
    );
    expect(missingRequired(rules, { description: "Writing", projectId: "p", tagIds: ["t"] })).toBeNull();
  });

  it("enforces the tag limit", () => {
    const rules = { ...DEFAULT_RULES, maxTags: 1 };
    expect(missingRequired(rules, { ...entry, tagIds: ["a"] })).toBeNull();
    expect(missingRequired(rules, { ...entry, tagIds: ["a", "b"] })).toBe("Use at most 1 tag per entry.");
  });
});
