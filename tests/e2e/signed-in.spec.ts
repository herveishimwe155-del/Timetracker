import { expect, test } from "@playwright/test";
import { deleteTestEntries, expectAccessible, hasAccount, PREFIX, signIn, stopTimerIfRunning } from "./helpers";

test.describe("signed in", () => {
  test.skip(!hasAccount, "Set E2E_EMAIL and E2E_PASSWORD for a dedicated test account");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await stopTimerIfRunning(page);
  });

  test.afterEach(async ({ page }) => {
    await stopTimerIfRunning(page);
    await deleteTestEntries(page);
  });

  test("timer: start with a description, tick, stop, and see the entry", async ({ page }) => {
    const description = `${PREFIX} timer ${Date.now()}`;
    await page.getByLabel("What are you working on?").fill(description);
    await page.getByLabel("What are you working on?").press("Enter");

    const stop = page.getByRole("button", { name: "Stop timer" });
    await expect(stop).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`· ${description}`));
    // The clock ticks: wait until it shows at least one second.
    await expect(page.getByRole("region", { name: "Current timer" }).locator("time")).not.toHaveText("00:00:00");

    await page.keyboard.press("Escape"); // leave the text field so the shortcut applies
    await page.keyboard.press("s");
    await expect(page.getByRole("button", { name: "Start timer" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: description })).toBeVisible();
  });

  test("entries: add one by hand, and overlaps are refused", async ({ page }) => {
    const description = `${PREFIX} manual ${Date.now()}`;
    // Today in the test time zone (Europe/Paris), early morning, so afterEach can find and delete it.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

    await page.keyboard.press("n");
    const dialog = page.getByRole("dialog", { name: "New time entry" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Description").fill(description);
    await dialog.getByLabel("Date").fill(today);
    await dialog.getByLabel("Start").fill("03:00");
    await dialog.getByLabel("End").fill("04:30");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(page.getByText("Entry added")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: description })).toContainText("01:30:00");

    // An overlapping slot must be refused by the database.
    await page.keyboard.press("n");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Description").fill(`${description} overlap`);
    await dialog.getByLabel("Date").fill(today);
    await dialog.getByLabel("Start").fill("04:00");
    await dialog.getByLabel("End").fill("05:00");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(dialog.getByText("This entry overlaps another one.", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("reports: totals, chart, breakdown and CSV export", async ({ page }) => {
    const description = `${PREFIX} report ${Date.now()}`;
    await page.getByLabel("What are you working on?").fill(description);
    await page.getByLabel("What are you working on?").press("Enter");
    await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
    await page.waitForTimeout(2_000);
    await page.getByRole("button", { name: "Stop timer" }).click();

    await page.goto("/reports");
    await expect(page.getByText("Hours per day")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Breakdown" })).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^time-entries_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await (await file.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString("utf8"));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Date,Start,End,Duration,Duration (hours),Description,Project,Client,Tags,Billable");
    expect(csv).toContain(description);
  });

  for (const path of ["/timer", "/projects", "/clients", "/reports", "/settings"]) {
    test(`${path} is accessible and fits the screen`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectAccessible(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
