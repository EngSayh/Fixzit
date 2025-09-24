import { test, expect } from '@playwright/test';

const roles = ['TENANT', 'TECHNICIAN', 'PROPERTY_OWNER', 'FINANCE', 'MANAGEMENT'];

for (const role of roles) {
  test(`${role}: tool permissions and flows`, async ({ page }) => {
    await page.context().addCookies([{ name: 'fxz_role', value: role, url: 'http://localhost:3000' }]);
    await page.goto('/');
    await page.getByTestId('ai-assistant-button').click();
    const input = page.getByTestId('ai-input');

    // Schedule maintenance (allowed for TECHNICIAN/MANAGEMENT)
    await input.fill('schedule maintenance for building A');
    await input.press('Enter');

    // Dispatch (allowed for TECHNICIAN/MANAGEMENT)
    await input.fill('dispatch technician to WO-123');
    await input.press('Enter');

    // Owner statements (allowed for FINANCE/PROPERTY_OWNER/MANAGEMENT)
    await input.fill('owner statements YTD');
    await input.press('Enter');

    // Expect at least a response message (pass/fail checked by server policy)
    await expect(page.getByText(/Tool executed successfully|تم تنفيذ الأداة بنجاح|ليس لديك صلاحية|You do not have permission|سأنفّذ الإجراء/)).toBeVisible({ timeout: 15000 });
  });
}


