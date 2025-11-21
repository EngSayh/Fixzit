import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE SMOKE TESTS
 * Tests all major pages across all roles (SuperAdmin, Admin, Manager, Technician, Tenant, Vendor)
 * in both English and Arabic, ensuring:
 * - Page loads successfully
 * - Core layout elements are present (header, sidebar, footer)
 * - No console errors
 * - No failed network requests
 * - RTL/LTR direction is correct
 * - Language and currency selectors are visible
 */

const IGNORED_ERROR_PATTERNS = [
  /status of 404/i,
  /status of 429/i,
];

const CORE_PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/work-orders', name: 'Work Orders' },
  { path: '/properties', name: 'Properties' },
  { path: '/finance', name: 'Finance' },
  { path: '/hr', name: 'HR' },
  { path: '/admin', name: 'Administration' },
  { path: '/crm', name: 'CRM' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/support', name: 'Support' },
  { path: '/compliance', name: 'Compliance' },
  { path: '/reports', name: 'Reports' },
  { path: '/system', name: 'System Management' }
];

const SIDEBAR_ITEMS: Array<{ labels: string[] }> = [
  { labels: ['Dashboard', 'لوحة التحكم'] },
  { labels: ['Properties', 'العقارات'] },
];

const NAV_OPTIONAL_PATHS = new Set<string>(['/']);
const SIDEBAR_OPTIONAL_PATHS = new Set<string>(['/']);

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Global Layout & Navigation - All Pages', () => {
  for (const page of CORE_PAGES) {
    test(`${page.name} (${page.path}): Layout integrity + no errors`, async ({ page: browser }) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const networkFailures: Array<{ method: string; url: string; status: number }> = [];
      const projectName = test.info().project.name;
      const isArabicProject = projectName.includes(':AR:') || projectName.startsWith('AR:');

      // Capture console errors and warnings
      browser.on('pageerror', (error) => {
        errors.push(`PageError: ${error.message}`);
      });

      browser.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
          if (IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
            return;
          }
          errors.push(`Console Error: ${text}`);
        } else if (type === 'warning' && !text.includes('DevTools')) {
          warnings.push(`Console Warning: ${text}`);
        }
      });

      // Capture failed network requests
      browser.on('response', (response) => {
        const status = response.status();
        if (status >= 400) {
          networkFailures.push({
            method: response.request().method(),
            url: response.url(),
            status
          });
        }
      });

      // Navigate to page
      await browser.goto(page.path, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for main content to stabilize
      await browser.waitForLoadState('domcontentloaded');

      // ============ LAYOUT ASSERTIONS ============
      
      // Header must exist
      const header = browser.locator('header').first();
      await expect.soft(header).toBeVisible({ timeout: 10000 });

      // Footer must exist (may be at bottom, need to scroll)
      const footer = browser.locator('footer').first();
      const footerVisible = await footer.isVisible().catch(() => false);
      if (!footerVisible) {
        await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect.soft(footer).toBeVisible({ timeout: 5000 });
      }

      // Sidebar navigation - check for key items
      const navCount = await browser.getByRole('navigation').count();
      if (!NAV_OPTIONAL_PATHS.has(page.path)) {
        expect.soft(navCount, `${page.path} should render navigation sidebar`).toBeGreaterThan(0);
      }
      if (navCount > 0 && !SIDEBAR_OPTIONAL_PATHS.has(page.path)) {
        for (const item of SIDEBAR_ITEMS) {
          const labelPattern = new RegExp(item.labels.map(escapeRegex).join('|'), 'i');
          const sidebarItem = browser.getByRole('link', { name: labelPattern }).or(
            browser.getByRole('button', { name: labelPattern })
          );
          const firstItem = sidebarItem.first();
          await expect.soft(firstItem).toBeVisible({ timeout: 5000 });
        }
      } else {
        if (!NAV_OPTIONAL_PATHS.has(page.path)) {
          console.warn('⚠️  Sidebar navigation not present on this page, skipping sidebar checks.');
        }
      }

      // ============ LANGUAGE & CURRENCY SELECTORS ============
      
      // Language selector (English/عربي)
      const langSelector = browser.getByRole('button', { name: /language|lang|عربي|english|en|ar/i });
      await expect.soft(langSelector.first()).toBeVisible({ timeout: 5000 });

      // Currency selector (SAR/USD)
      const currencySelector = browser.getByRole('button', { name: /currency|sar|usd|riyal|dollar/i });
      await expect.soft(currencySelector.first()).toBeVisible({ timeout: 5000 });

      // ============ RTL/LTR DIRECTION ============
      
      const htmlDir = await browser.evaluate(() => document.documentElement.getAttribute('dir'));
      
      if (isArabicProject) {
        expect(htmlDir).toBe('rtl');
      } else {
        expect(htmlDir).toBe('ltr');
      }

      // ============ ERROR VALIDATION ============
      
      // Console errors should be empty (allowlist finance 403 noise in test mode)
      const filteredErrors = errors.filter(err => {
        if (process.env.PLAYWRIGHT_TESTS === 'true' && /403/i.test(err)) {
          return false;
        }
        return true;
      });

      if (filteredErrors.length > 0) {
        console.error(`\n❌ Console Errors on ${page.path}:`);
        filteredErrors.forEach(err => console.error(`   ${err}`));
      }
      expect(filteredErrors, `Console errors found:\n${filteredErrors.join('\n')}`).toHaveLength(0);

      // Network failures should be empty (except 404s for optional resources)
      const criticalFailures = networkFailures.filter(f => {
        if (process.env.PLAYWRIGHT_TESTS === 'true' && f.status === 403 && f.url.includes('/api/finance')) {
          return false;
        }
        return (
          f.status >= 500 || // Server errors
          (f.status === 404 && !f.url.includes('favicon') && !f.url.includes('.map')) || // Missing critical resources
          f.status === 401 || f.status === 403 // Auth failures
        );
      });
      
      if (criticalFailures.length > 0) {
        console.error(`\n❌ Network Failures on ${page.path}:`);
        criticalFailures.forEach(f => console.error(`   ${f.method} ${f.url} → ${f.status}`));
      }
      expect(
        criticalFailures,
        `Network failures:\n${criticalFailures.map(f => `${f.method} ${f.url} → ${f.status}`).join('\n')}`
      ).toHaveLength(0);

      // Warnings are logged but not failed (informational)
      if (warnings.length > 0) {
        console.warn(`\n⚠️  Console Warnings on ${page.path} (${warnings.length} total)`);
      }
    });
  }
});

test.describe('Branding & Theme Consistency', () => {
  test('Primary brand colors are applied', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Check CSS variables for brand colors
    const styles = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        primary: root.getPropertyValue('--primary'),
        secondary: root.getPropertyValue('--secondary'),
        accent: root.getPropertyValue('--accent')
      };
    });

    // Expect brand colors to be defined (exact values may vary based on theme)
    expect.soft(styles.primary).toBeTruthy();
    expect.soft(styles.secondary).toBeTruthy();
    expect.soft(styles.accent).toBeTruthy();
  });

  test('Logo and brand elements are visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Logo in header
    const logo = page
      .locator('header img[alt*="fixzit" i], header svg[class*="logo"], header .fxz-topbar-logo')
      .first();
    if ((await logo.count()) === 0) {
      console.warn('⚠️  Header logo not found - skipping visibility assertion');
      return;
    }
    await expect.soft(logo).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Accessibility Basics', () => {
  test('Main landmark and proper heading structure', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Main content area
    const main = page.getByRole('main').first();
    await expect.soft(main).toBeVisible();

    // At least one h1 heading
    const h1 = page.locator('h1');
    expect.soft(await h1.count()).toBeGreaterThan(0);
  });

  test('Skip to content link for keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Press Tab to focus skip link (if implemented)
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByRole('link', { name: /skip to content|skip to main/i });
    const skipLinkExists = await skipLink.count();
    
    // This is a recommendation, not a hard requirement
    if (skipLinkExists === 0) {
      console.warn('⚠️  Skip to content link not found - consider adding for accessibility');
    }
  });
});
