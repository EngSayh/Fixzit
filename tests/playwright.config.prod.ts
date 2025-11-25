import { defineConfig, devices } from "@playwright/test";

/**
 * Production-Ready E2E Test Configuration
 *
 * Tests REAL system behavior with:
 * - Real MongoDB database
 * - Real API routes
 * - Real browser interactions
 * - No mocking
 */

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts", "**/*.smoke.spec.ts", "**/e2e/**/*.ts"],

  // Ignore mock-based unit tests
  testIgnore: ["**/unit/**/*.test.ts", "**/unit/**/*.test.tsx"],

  fullyParallel: false, // Run tests sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker for DB tests

  reporter: [
    ["html", { outputFolder: "_artifacts/playwright-report" }],
    ["json", { outputFile: "_artifacts/test-results.json" }],
    ["list"],
  ],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start dev server for tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
