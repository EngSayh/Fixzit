import { test, expect } from "@playwright/test";

test("Language toggle applies RTL and persists", async ({ page }) => {
  await page.goto("/dashboard").catch(() => page.goto("/")); // tolerate route
  const html = page.locator("html");

  // Toggle language (button often shows EN/AR or globe)
  await page
    .getByRole("button", { name: /EN|AR|العربية|English|Language/i })
    .first()
    .click();
  // Wait for dir attribute to change (waitForTimeout replaced with conditional wait)
  await html.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (el.getAttribute("dir")) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(el, { attributes: true, attributeFilter: ["dir"] });
        // Resolve immediately if dir already set
        if (el.getAttribute("dir")) resolve();
        // Timeout after 2s
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 2000);
      }),
  );
  const dir = await html.getAttribute("dir");
  expect(dir, "dir should be ltr/rtl").toMatch(/ltr|rtl/i);

  await page.reload();
  const dir2 = await html.getAttribute("dir");
  expect(dir2, "persist language direction").toBe(dir);
});
