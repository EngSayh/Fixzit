import { test } from '@playwright/test';
import { assertNoConsoleErrors } from '../helpers/console';

test('Finance HFV - Invoice post', async ({ page }) => {
  await assertNoConsoleErrors(page, async () => {
    await page.goto('/finance');
    await page.screenshot({ path: 'artifacts/finance-before.png' });
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'artifacts/finance-after.png' });
  });
});
