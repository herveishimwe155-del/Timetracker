import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test.describe("signed out", () => {
  test("settings need an account and remember where you were going", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
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

test.describe("guest mode", () => {
  test("the app opens without an account, empty, with a sign-up prompt", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/timer/);
    await expect(page.getByRole("complementary", { name: "Guest mode" })).toContainText("Sign up free to start tracking");
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expectAccessible(page);
  });

  test("starting the timer asks you to sign up, then comes back", async ({ page }) => {
    await page.goto("/timer");
    await page.getByLabel("What are you working on?").fill("Reading");
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page).toHaveURL(/\/login\?mode=signup&next=%2Ftimer/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("the N shortcut asks you to sign up", async ({ page }) => {
    await page.goto("/timer");
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await page.keyboard.press("n");
    await expect(page).toHaveURL(/\/login\?mode=signup/);
  });

  test("creating a project asks you to sign up", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("button", { name: "New project" }).click();
    await expect(page).toHaveURL(/\/login\?mode=signup&next=%2Fprojects/);
  });

  test("reports open empty", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole("complementary", { name: "Guest mode" })).toBeVisible();
  });
});

test.describe("guest mode: Toggl pages", () => {
  for (const [path, heading] of [
    ["/overview", "Overview"],
    ["/tags", "Tags"],
    ["/goals", "Goals"],
  ] as const) {
    test(`${heading} opens empty and is accessible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeAttached();
      await expectAccessible(page);
    });
  }

  test("creating a tag asks you to sign up", async ({ page }) => {
    await page.goto("/tags");
    await page.getByRole("button", { name: "New tag" }).click();
    await expect(page).toHaveURL(/\/login\?mode=signup&next=%2Ftags/);
  });

  test("manual mode adds an entry only after signing up", async ({ page }) => {
    await page.goto("/timer");
    await page.getByRole("button", { name: "Manual mode" }).click();
    await expect(page.getByLabel("Start time")).toBeVisible();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?mode=signup/);
  });
});

test.describe("guest mode: workspaces", () => {
  test("Members explains workspaces and asks guests to sign up to create one", async ({ page }) => {
    await page.goto("/members");
    await expect(page.getByText("Members are for team workspaces")).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Create a workspace" }).click();
    await expect(page).toHaveURL(/\/login\?mode=signup&next=%2Fmembers/);
  });

  test("an invite link sends signed-out visitors to sign in, then back to the invite", async ({ page }) => {
    await page.goto("/join/some-token");
    await expect(page).toHaveURL(/\/login\?next=%2Fjoin%2Fsome-token/);
  });
});
