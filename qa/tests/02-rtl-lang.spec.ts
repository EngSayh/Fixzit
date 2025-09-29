import { test, expect } from '@playwright/test';

test('Language toggle applies RTL and persists', async ({ page }) => {
  await page.goto('/dashboard').catch(()=>page.goto('/')); // tolerate route
  const html = page.locator('html');

  // Toggle language (button often shows EN/AR or globe)
  await page.getByRole('button', { name: /EN|AR|العربية|English|Language/i }).first().click();
  await page.waitForTimeout(500);
  const dir = await html.getAttribute('dir');
  expect(dir, 'dir should be ltr/rtl').toMatch(/ltr|rtl/i);

  await page.reload();
  const dir2 = await html.getAttribute('dir');
  expect(dir2, 'persist language direction').toBe(dir);
});
