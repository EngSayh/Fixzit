import { test, expect } from '@playwright/test';
const bad = /(lorem ipsum|placeholder|coming soon|todo:|fixme|tbd|dummy|mock data)/i;

test('Scan common pages for placeholder strings', async ({ page }) => {
  for (const path of ['/', '/login', '/dashboard', '/properties', '/work-orders', '/marketplace']) {
    await page.goto(path);
    const html = await page.content();
    expect(html).not.toMatch(bad);
  }
});
