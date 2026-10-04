import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (tests/e2e). Starts the dev server on port 3100 unless
 * E2E_BASE_URL points at an already running app (for example a Vercel preview).
 *
 * Signed-in tests need a dedicated test account in the Supabase project:
 *   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
 * Without them, only the signed-out tests run.
 */
const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // signed-in tests share one account and its single running timer
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    timezoneId: "Europe/Paris",
    locale: "en-GB",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
