import { describe, expect, it } from "vitest";
import { HOME_PATH, safeNextPath, safeTimeZone } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/reports?week=2")).toBe("/reports?week=2");
  });

  it.each([null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "reports"])(
    "falls back to home for %s",
    (next) => {
      expect(safeNextPath(next)).toBe(HOME_PATH);
    },
  );

  it("never loops back into the auth pages", () => {
    expect(safeNextPath("/login")).toBe(HOME_PATH);
    expect(safeNextPath("/auth/callback")).toBe(HOME_PATH);
  });
});

describe("safeTimeZone", () => {
  it("accepts IANA zones", () => {
    expect(safeTimeZone("Africa/Kigali")).toBe("Africa/Kigali");
  });

  it("falls back to UTC", () => {
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
    expect(safeTimeZone(null)).toBe("UTC");
  });
});
