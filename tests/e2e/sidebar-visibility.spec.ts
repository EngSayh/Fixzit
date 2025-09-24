// Playwright: Sidebar visibility by role
import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

async function setRole(page: Page, role: string) {
  await page.addInitScript((r: string) => {
    document.cookie = `fxz_role=${r}; path=/`;
    sessionStorage.setItem('role', r);
  }, role);
}

test.describe('Sidebar visibility by role', () => {
  test('Super Admin sees Finance & System', async ({ page }) => {
    await setRole(page, 'SUPER_ADMIN');
    await page.goto('/fm/finance');
    await expect(page.locator('[data-testid="sidebar-finance"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-system"]')).toBeVisible();
  });

  test('Tenant sees Marketplace but not System', async ({ page }) => {
    await setRole(page, 'TENANT');
    await page.goto('/souq');
    await expect(page.locator('[data-testid="sidebar-marketplace"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-system"]')).toHaveCount(0);
  });

  test('Technician sees Work Orders, not Finance', async ({ page }) => {
    await setRole(page, 'TECHNICIAN');
    await page.goto('/fm/work-orders');
    await expect(page.locator('[data-testid="sidebar-work-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-finance"]')).toHaveCount(0);
  });
});

// Duplicate suite removed


