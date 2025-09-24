import { test, expect } from '@playwright/test';

test('Single header, footer present, lang + currency + back-home', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.getByTestId('global-footer')).toBeVisible();
  await expect(page.getByTestId('back-home')).toBeVisible();

  await page.getByTestId('language-selector').click();
  await expect(page.locator('text=English')).toBeVisible();
  await expect(page.locator('text=العربية')).toBeVisible();

  await page.getByTestId('currency-selector').click();
  await expect(page.getByText('SAR')).toBeVisible();
});


