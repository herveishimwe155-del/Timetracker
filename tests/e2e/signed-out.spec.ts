import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test.describe("signed out", () => {
  test("app pages redirect to sign-in and remember where you were going", async ({ page }) => {
    await page.goto("/reports?period=last-week");
    await expect(page).toHaveURL(/\/login\?next=%2Freports%3Fperiod%3Dlast-week/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("the CSV export is not reachable", async ({ page }) => {
    const response = await page.request.get("/api/export?from=2026-09-28&to=2026-10-05", { maxRedirects: 0 });
    expect([302, 307, 401]).toContain(response.status());
  });

  test("sign-in validates the email before contacting Supabase", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("whatever123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("sign-up asks for a password of at least 8 characters", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 8 characters for your password.")).toBeVisible();
  });

  test("the sign-in page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expectAccessible(page);
  });

  test("the sign-in page fits a phone without sideways scrolling", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
