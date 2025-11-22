import { Page } from '@playwright/test';

export async function assertNoConsoleErrors(page: Page, scenario: () => Promise<void>) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() !== 'error') return;

    const text = msg.text();
    // Ignore dev-only noise (common Next.js 404s)
    const ignored = ['_devMiddlewareManifest.json', 'favicon.ico'];
    if (ignored.some(token => text.includes(token))) return;

    errors.push(text);
  });

  await scenario();

  if (errors.length > 0) {
    throw new Error(`Console errors:\n${errors.join('\n')}`);
  }
}
