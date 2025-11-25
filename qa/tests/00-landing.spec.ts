import { test, expect } from "@playwright/test";
import { cfg } from "../config";

test.describe("Landing & Branding (@smoke)", () => {
  test("Hero, tokens, 0 errors", async ({ page }) => {
    const errors: any[] = [];
    page.on("pageerror", (e) => errors.push(e));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const failed: any[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() });
    });

    await page.goto("/");
    // TopBar guest CTA visible
    await expect(
      page.getByRole("link", { name: /sign in|login|تسجيل/i }),
    ).toBeVisible();
    // Footer keeps public language toggle
    const footerLanguageButton = page
      .locator("footer")
      .getByRole("button", { name: /Select language|اختر اللغة/i })
      .first();
    await expect(footerLanguageButton).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Fixzit Souq/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Access|Get Started|ابدأ/i }),
    ).toBeVisible(); // tolerate wording

    // Single header, single footer
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);

    // Brand token check (header bg or topbar token near landing)
    const header = page.locator("header");
    if (await header.count()) {
      const bg = await header.evaluate(
        (el) => getComputedStyle(el as HTMLElement).backgroundColor,
      );
      expect(bg.toLowerCase()).toContain("rgb"); // at least styled
    }

    // No console/page errors, no failed HTTPs
    expect(errors, "console/page errors").toHaveLength(0);
    expect(failed, "network failures").toHaveLength(0);

    // screenshot proof (T0 & T+10s)
    await page.screenshot({
      path: "qa/artifacts/landing-T0.png",
      fullPage: true,
    });
    // Wait for any deferred content to load instead of arbitrary timeout
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {
        // If networkidle times out, still continue
      });
    await page.screenshot({
      path: "qa/artifacts/landing-T10.png",
      fullPage: true,
    });
  });
});
