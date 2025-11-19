import { test, expect } from '@playwright/test';
import { setLocaleToArabic } from './utils/rtl-helpers';

test.describe('RTL layout smoke', () => {
  test('switches to Arabic and sets rtl direction', async ({ page }) => {
    await page.goto('/');
    await setLocaleToArabic(page);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=احجز عرضًا مباشرًا')).toBeVisible({ timeout: 45000 });

    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('rtl');
  });
});
