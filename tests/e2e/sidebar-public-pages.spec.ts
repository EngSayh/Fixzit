// Playwright: No sidebar on public pages
import { test, expect } from '@playwright/test';

test.describe('Public pages hide sidebar', () => {
  for (const path of ['/', '/privacy', '/terms']) {
    test(`No sidebar on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Sidebar root must not exist on public pages
      await expect(page.locator('[data-testid="sidebar-root"]')).toHaveCount(0);
      // Header should exist
      await expect(page.locator('header')).toHaveCount(1);
      // Footer should exist
      await expect(page.locator('footer')).toHaveCount(1);
    });
  }
});

// Duplicate suite removed


