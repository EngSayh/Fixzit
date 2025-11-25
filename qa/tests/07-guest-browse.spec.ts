import { test, expect } from "@playwright/test";

test("Guest can browse Aqar (real estate) without login", async ({ page }) => {
  await page.goto("/aqar");
  await expect(page.getByRole("heading", { name: /Aqar/i })).toBeVisible();
  // Follow link to properties list
  await page
    .getByRole("link", { name: /Properties|Search/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/aqar\//);
});

test("Guest can browse Souq catalog without login", async ({ page }) => {
  await page.goto("/souq/catalog");
  await expect(
    page.getByRole("heading", {
      name: /Fixzit Souq|Materials Marketplace|Catalog/i,
    }),
  ).toBeVisible();
});
