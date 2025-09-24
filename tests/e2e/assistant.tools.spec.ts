import { test, expect } from '@playwright/test';

test.describe('AI Assistant tools', () => {
  test('creates ticket and lists tickets under tenant scope', async ({ page }) => {
    await page.context().addCookies([{ name: 'fxz_role', value: 'TENANT', url: 'http://localhost:3000' }]);
    await page.goto('/');
    await page.getByTestId('ai-assistant-button').click();
    const input = page.getByTestId('ai-input');
    await input.fill('Create maintenance ticket for AC leak desc:water dripping');
    await input.press('Enter');
    await expect(page.getByText(/Processing|جاري المعالجة/)).toBeVisible();
    await expect(page.getByText(/Tool executed successfully|تم تنفيذ الأداة بنجاح/)).toBeVisible({ timeout: 10000 });

    await input.fill('Show my tickets');
    await input.press('Enter');
    await expect(page.getByText(/Tool executed successfully|تم تنفيذ الأداة بنجاح/)).toBeVisible({ timeout: 10000 });
  });

  test('refuses finance statements for TENANT', async ({ page }) => {
    await page.context().addCookies([{ name: 'fxz_role', value: 'TENANT', url: 'http://localhost:3000' }]);
    await page.goto('/');
    await page.getByTestId('ai-assistant-button').click();
    const input = page.getByTestId('ai-input');
    await input.fill('Show owner statements');
    await input.press('Enter');
    await expect(page.getByText(/You do not have permission|ليس لديك صلاحية/)).toBeVisible({ timeout: 10000 });
  });
});


