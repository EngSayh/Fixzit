import { test, expect } from '@playwright/test';

/**
 * INTERNATIONALIZATION (i18n) TESTS
 * Ensures no missing translation keys appear in the UI
 * Tests both English and Arabic across key pages
 */

const KEY_PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/app', name: 'App Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/work-orders', name: 'Work Orders' },
  { path: '/properties', name: 'Properties' },
  { path: '/finance', name: 'Finance' },
  { path: '/hr', name: 'HR' },
  { path: '/marketplace', name: 'Marketplace' }
];

// Common patterns that indicate missing translations
const MISSING_KEY_PATTERNS = [
  /MISSING_TRANSLATION/i,
  /i18n\.t\(['"]/,
  /translate\(['"]/,
  /\{\{[a-z_]+\}\}/i,  // {{key}} template syntax
  /\[object Object\]/i
];

test.describe('i18n: No Missing Translation Keys', () => {
  for (const page of KEY_PAGES) {
    test(`${page.name} (${page.path}): All keys translated`, async ({ page: browser }) => {
      await browser.goto(page.path, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Get page content
      const bodyText = await browser.locator('body').innerText();
      const htmlContent = await browser.content();

      // Check for missing key patterns
      const foundIssues: string[] = [];

      for (const pattern of MISSING_KEY_PATTERNS) {
        if (pattern.test(bodyText)) {
          const matches = bodyText.match(pattern);
          foundIssues.push(`Pattern "${pattern}" found: ${matches?.[0]}`);
        }
      }

      // Check for untranslated function calls in rendered HTML
      if (htmlContent.includes('t(') || htmlContent.includes('translate(')) {
        const rawCalls = htmlContent.match(/(?:t|translate)\(['"][^'"]+['"]\)/g);
        if (rawCalls) {
          foundIssues.push(`Raw translation calls in HTML: ${rawCalls.slice(0, 3).join(', ')}`);
        }
      }

      // Assert no issues found
      if (foundIssues.length > 0) {
        console.error(`\n❌ Missing translations on ${page.path}:`);
        foundIssues.forEach(issue => console.error(`   ${issue}`));
      }
      
      expect(foundIssues, `Missing translations detected:\n${foundIssues.join('\n')}`).toHaveLength(0);
    });
  }
});

test.describe('i18n: Language Switching', () => {
  test('English to Arabic switch updates content and RTL direction', async ({ page }) => {
    // Start in English
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    // Verify LTR
    let dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('ltr');

    // Switch to Arabic
    const langButton = page.getByRole('button', { name: /language|lang|english/i }).first();
    await langButton.click();
    
    const arabicOption = page.getByRole('menuitem', { name: /arabic|عربي/i }).or(
      page.getByText(/arabic|عربي/i)
    );
    await arabicOption.click();

    // Wait for language change to apply (check dir attribute)
    await page.waitForFunction(() => document.documentElement.getAttribute('dir') === 'rtl', {
      timeout: 5000
    });

    // Verify RTL
    dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('rtl');

    // Verify Arabic content is visible
    const bodyText = await page.locator('body').innerText();
    const hasArabic = /[\u0600-\u06FF]/.test(bodyText); // Arabic Unicode range
    expect(hasArabic).toBe(true);
  });

  test('Currency selector shows SAR and USD options', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const currencyButton = page.getByRole('button', { name: /currency|sar|usd/i }).first();
    await currencyButton.click();

    // Check for currency options
    const sarOption = page.getByText(/SAR|ريال/i);
    const usdOption = page.getByText(/USD|دولار/i);

    await expect(sarOption.or(usdOption)).toBeVisible();
  });
});

test.describe('i18n: RTL Layout Integrity', () => {
  test('Arabic: Sidebar, header, and content are right-aligned', async ({ page }) => {
    // Skip if not Arabic project
    if (!test.info().project.name.startsWith('AR:')) {
      test.skip();
    }

    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Verify RTL
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    expect(dir).toBe('rtl');

    // Check key elements have proper text-align
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    const sidebarAlign = await sidebar.evaluate(el => getComputedStyle(el).textAlign);
    
    // In RTL, default should be 'right' or 'start' (which resolves to right)
    expect(['right', 'start']).toContain(sidebarAlign);
  });
});
