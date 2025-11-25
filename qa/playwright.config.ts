import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 10_000 },
  testDir: "./tests",
  outputDir: "./qa/artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./qa/artifacts/html-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
