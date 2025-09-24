import { test, expect } from '@playwright/test';

test.describe('Context-aware sidebar', () => {
  test('FM context (default)', async ({ page }) => {
    await page.goto('/fm/dashboard');
    const root = page.locator('[data-testid="sidebar-root"]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-context', 'FM');
    await expect(page.locator('[data-testid="sidebar-dashboard"]')).toBeVisible();
  });

  test('Aqar context', async ({ page }) => {
    await page.goto('/aqar');
    const root = page.locator('[data-testid="sidebar-root"]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-context', 'AQAR');
    await expect(page.locator('[data-testid="sidebar-properties"]')).toBeVisible();
  });

  test('Market context', async ({ page }) => {
    await page.goto('/souq');
    const root = page.locator('[data-testid="sidebar-root"]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-context', 'MARKET');
    await expect(page.locator('[data-testid="sidebar-marketplace"]')).toBeVisible();
  });
});


