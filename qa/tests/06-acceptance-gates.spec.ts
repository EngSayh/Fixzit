import { test, expect } from "@playwright/test";

const routes = [
  "/",
  "/login",
  "/dashboard",
  "/properties",
  "/work-orders",
  "/marketplace",
  "/reports",
];

test("Zero console errors & failed requests across key routes", async ({
  page,
}) => {
  const errors: any[] = [];
  const failed: any[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() });
  });

  for (const r of routes) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
    // Wait for DOM to settle (check if document.readyState is complete)
    await page.waitForFunction(() => document.readyState === "complete", {
      timeout: 2000,
    });
  }
  await page.screenshot({
    path: "qa/artifacts/acceptance-gates.png",
    fullPage: true,
  });
  expect(errors, "console/page errors").toHaveLength(0);
  expect(failed, "network failures (4xx/5xx)").toHaveLength(0);
});
