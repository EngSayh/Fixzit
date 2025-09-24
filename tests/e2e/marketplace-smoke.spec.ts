// tests/e2e/marketplace-smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Marketplace smoke', () => {
  test('list → detail navigation works', async ({ page }) => {
    await page.goto('/marketplace/properties');
    const firstCard = page.locator('[data-testid="property-card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page.locator('[data-testid="property-title"]')).toBeVisible();
    await expect(page.url()).toMatch(/\/marketplace\/properties\//);
  });

  test('Aqar properties redirects to marketplace (no duplicates)', async ({ page }) => {
    await page.goto('/aqar/properties');
    await expect(page).toHaveURL(/\/marketplace\/properties/);
    await expect(page.locator('[data-testid="property-card"]').first()).toBeVisible();
  });
});


