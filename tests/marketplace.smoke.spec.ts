import { test, expect } from "@playwright/test";

test("marketplace search to cart flow", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByTestId("marketplace-topbar")).toBeVisible();
  await page
    .getByPlaceholder("Search materials, SKUs, ASTM, BS EN…")
    .fill("filter");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await page
    .getByTestId("product-card")
    .first()
    .getByRole("link")
    .first()
    .click();
  await expect(page).toHaveURL(/\/marketplace\/product\//);
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.goto("/marketplace/cart");
  await expect(page.getByText("Order summary")).toBeVisible();
});
