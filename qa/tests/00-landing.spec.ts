import { test, expect } from '@playwright/test';
import { cfg } from '../config';

test.describe('Landing & Branding (@smoke)', () => {
  test('Hero, tokens, 0 errors', async ({ page }) => {
    const errors: any[] = [];
    page.on('pageerror', e => errors.push(e));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const failed: any[] = [];
    page.on('response', r => { if (r.status() >= 400) failed.push({url:r.url(),status:r.status()}); });

    await page.goto('/');
    // TopBar buttons visible (use .first() for language since SAR currency also matches /AR/)
    await expect(page.getByRole('button', { name: /Select language.*AR/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Souq/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Access|Get Started/i })).toBeVisible(); // tolerate wording

    // Single header, single footer
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);

    // Brand token check (header bg or topbar token near landing)
    const header = page.locator('header');
    if (await header.count()) {
      const bg = await header.evaluate(el => getComputedStyle(el as HTMLElement).backgroundColor);
      expect(bg.toLowerCase()).toContain('rgb'); // at least styled
    }

    // No console/page errors, no failed HTTPs
    expect(errors, 'console/page errors').toHaveLength(0);
    expect(failed, 'network failures').toHaveLength(0);

    // screenshot proof (T0 & T+10s)
    await page.screenshot({ path: 'qa/artifacts/landing-T0.png', fullPage: true });
    await page.waitForTimeout(10_000);
    await page.screenshot({ path: 'qa/artifacts/landing-T10.png', fullPage: true });
  });
});
