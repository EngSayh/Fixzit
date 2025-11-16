import { Page } from '@playwright/test';

export async function assertNoConsoleErrors(page: Page, scenario: () => Promise<void>) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await scenario();

  if (errors.length > 0) {
    throw new Error(`Console errors:\n${errors.join('\n')}`);
  }
}
