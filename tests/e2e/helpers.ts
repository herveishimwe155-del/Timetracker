import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;
export const hasAccount = Boolean(E2E_EMAIL && E2E_PASSWORD);

/** Every test entry and project name starts with this, so cleanup can find them. */
export const PREFIX = "e2e";

/** Fails the test on any WCAG 2.1 A/AA or best-practice violation, listing them. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  const summary = results.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, "accessibility violations").toEqual([]);
}

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_EMAIL!);
  await page.getByLabel("Password").fill(E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/timer/);
}

/** Stops a running timer, if any, so each test starts from a known state. */
export async function stopTimerIfRunning(page: Page) {
  const stop = page.getByRole("button", { name: "Stop timer" });
  if (await stop.isVisible()) {
    await stop.click();
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
  }
}

/** Deletes every visible entry whose description starts with PREFIX. */
export async function deleteTestEntries(page: Page) {
  await page.goto("/timer");
  for (let i = 0; i < 20; i++) {
    const row = page.getByRole("listitem").filter({ hasText: new RegExp(`^${PREFIX}`) }).first();
    if (!(await row.isVisible().catch(() => false))) return;
    await row.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByText("Entry deleted")).toBeVisible();
  }
}
