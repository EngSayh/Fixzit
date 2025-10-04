import { test, expect } from '@playwright/test';
import { cfg } from '../config';

async function login(page: any){
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(cfg.users.admin.email);
  await page.getByPlaceholder(/password/i).fill(cfg.users.admin.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('Login & Sidebar (@smoke)', () => {
  test('Admin sees authoritative modules', async ({ page }) => {
    await login(page);
    // Navigate to a core page if not redirected
    if (page.url().endsWith('/login')) await page.goto('/dashboard');

    // single header and presence of language/currency/back-to-home (at least language)
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /EN|AR|العربية/i })).toBeVisible();

    // Sidebar modules baseline (presence, no duplicates)
    for (const mod of cfg.modules) {
      await expect(page.getByRole('button', { name: new RegExp(mod, 'i') })).toBeVisible();
    }
    const texts = await page.locator('aside button').allTextContents();
    const dupes = texts.filter((t,i)=> texts.indexOf(t)!==i);
    expect(dupes, 'duplicate sidebar labels').toHaveLength(0);

    await page.screenshot({ path: 'qa/artifacts/sidebar-admin.png', fullPage: true });
  });
});
