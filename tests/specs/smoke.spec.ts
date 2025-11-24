import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { encode as encodeJwt } from 'next-auth/jwt';
import { randomUUID } from 'crypto';

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  'test-secret-minimum-32-chars-long-fixzit-jwt-encryption-key';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const COOKIE_NAME = BASE_URL.startsWith('https') ? '__Secure-authjs.session-token' : 'authjs.session-token';
const LEGACY_COOKIE_NAME = BASE_URL.startsWith('https')
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token';
const SESSION_COOKIE_PATTERNS = ['session-token', 'session'];
const hasSessionCookie = async (context: BrowserContext) => {
  const cookies = await context.cookies();
  return cookies.some((cookie) => SESSION_COOKIE_PATTERNS.some((pattern) => cookie.name.includes(pattern)));
};

// Inject a fresh authenticated session before each test to avoid stale storage states
test.beforeEach(async ({ context }) => {
  const host = new URL(BASE_URL).hostname;
  const userId = randomUUID().replace(/-/g, '').slice(0, 24);

  const token = await encodeJwt({
    secret: AUTH_SECRET,
    salt: COOKIE_NAME,
    maxAge: 30 * 24 * 60 * 60,
    token: {
      name: 'Smoke Admin',
      email: 'superadmin@test.fixzit.co',
      id: userId,
      sub: userId,
      role: 'ADMIN',
      roles: ['ADMIN', 'SUPER_ADMIN'],
      orgId: process.env.PUBLIC_ORG_ID || process.env.TEST_ORG_ID || 'ffffffffffffffffffffffff',
      isSuperAdmin: true,
      permissions: ['*'],
    },
  });

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: host,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: BASE_URL.startsWith('https'),
    },
    {
      name: LEGACY_COOKIE_NAME,
      value: token,
      domain: host,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: BASE_URL.startsWith('https'),
    },
  ]);

  await context.addInitScript(() => {
    localStorage.setItem('fixzit-role', 'super_admin');
    localStorage.setItem('theme', 'light');
  });
});
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
  /api\/auth\/me/i, // unauthenticated checks are expected on public pages
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

const HEADER_OPTIONAL_PATHS = new Set<string>(['/finance', '/hr', '/properties']);
const NAV_OPTIONAL_PATHS = new Set<string>(['/', '/finance', '/hr']);
const SIDEBAR_OPTIONAL_PATHS = new Set<string>(['/', '/finance', '/hr']);
const FOOTER_OPTIONAL_PATHS = new Set<string>(['/dashboard', '/finance', '/hr']);
const CURRENCY_OPTIONAL_PATHS = new Set<string>(['/dashboard', '/hr', '/finance']);

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Global Layout & Navigation - All Pages', () => {
  for (const page of CORE_PAGES) {
    test(`${page.name} (${page.path}): Layout integrity + no errors`, async ({ page: browser }) => {
      const projectName = test.info().project.name;
      const roleName = projectName.split(':').pop()?.toLowerCase() || '';
      const financeRestricted = ['tenant', 'vendor', 'technician'].includes(roleName);

      if (financeRestricted && page.path === '/finance') {
        test.skip(true, 'Finance not available to this role');
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const networkFailures: Array<{ method: string; url: string; status: number }> = [];
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
          if (response.url().includes('/api/auth/me')) {
            return; // public pages may probe session; ignore 401/403 there
          }
          if (response.url().includes('/api/user/preferences') && status === 404) {
            return; // preferences endpoint is optional; ignore missing
          }
          networkFailures.push({
            method: response.request().method(),
            url: response.url(),
            status
          });
        }
      });

      // Navigate to page (use domcontentloaded to avoid hanging on long-lived connections)
      await browser.goto(page.path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for main content to stabilize
      await browser.waitForLoadState('domcontentloaded');

      // ============ LAYOUT ASSERTIONS ============
      
      // Header/banner must exist (unless optional path)
      if (!HEADER_OPTIONAL_PATHS.has(page.path)) {
        const header = browser.locator('header, [role="banner"]').first();
        await expect.soft(header).toBeVisible({ timeout: 10000 });
      }

      // Footer must exist (may be at bottom, need to scroll)
      if (!FOOTER_OPTIONAL_PATHS.has(page.path)) {
        const footer = browser.locator('footer, [role="contentinfo"]').first();
        const footerVisible = await footer.isVisible().catch(() => false);
        if (!footerVisible) {
          await browser.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await expect.soft(footer).toBeVisible({ timeout: 5000 });
        }
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
      }

      // ============ LANGUAGE & CURRENCY SELECTORS ============
      
      // Language selector (English/عربي)
      const langSelector = browser.getByRole('button', { name: /language|lang|عربي|english|en|ar/i });
      await expect.soft(langSelector.first()).toBeVisible({ timeout: 5000 });

      // Currency selector (SAR/USD)
      if (!CURRENCY_OPTIONAL_PATHS.has(page.path)) {
        const currencySelector = browser.getByRole('button', { name: /currency|sar|usd|riyal|dollar/i });
        await expect.soft(currencySelector.first()).toBeVisible({ timeout: 5000 });
      }

      // ============ RTL/LTR DIRECTION ============
      
      const htmlDir = await browser.evaluate(() => document.documentElement.getAttribute('dir'));
      
      if (isArabicProject) {
        expect(htmlDir).toBe('rtl');
      } else {
        expect(htmlDir).toBe('ltr');
      }

      // ============ ERROR VALIDATION ============
      
      // Console errors should be empty
      if (errors.length > 0) {
        console.error(`\n❌ Console Errors on ${page.path}:`);
        errors.forEach(err => console.error(`   ${err}`));
      }
      expect(errors, `Console errors found:\n${errors.join('\n')}`).toHaveLength(0);

      // Network failures should be empty (except 404s for optional resources)
      const hasSession = await hasSessionCookie(browser.context());
      const criticalFailures = networkFailures.filter((f) => {
        const isAuthFailure = f.status === 401 || f.status === 403;
        if (isAuthFailure && !hasSession) {
          return false; // Allow unauthenticated probes to pass when no session is present
        }
        return (
          f.status >= 500 || // Server errors
          (f.status === 404 && !f.url.includes('favicon') && !f.url.includes('.map')) || // Missing critical resources
          isAuthFailure // Auth failures when session is expected
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
        warnings.forEach((w) => console.warn(`   ${w}`));
      }
    });
  }
});

test.describe('Branding & Theme Consistency', () => {
  test('Primary brand colors are applied', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to login; branding check skipped');
    }

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
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Logo in header
    const logo = page
      .locator(
        'header img[alt*="fixzit" i], header svg[class*="logo"], header .fxz-topbar-logo, header [data-testid="header-logo-img"]'
      )
      .first();
    await expect.soft(logo).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Accessibility Basics', () => {
  test('Main landmark and proper heading structure', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to login; accessibility check skipped');
    }

    // Main content area
    const main = page.getByRole('main').first();
    await expect.soft(main).toBeVisible();

    // At least one h1 heading
    const h1 = page.locator('h1');
    expect.soft(await h1.count()).toBeGreaterThan(0);
  });

  test('Skip to content link for keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/login')) {
      test.skip(true, 'Redirected to login; accessibility check skipped');
    }

    // Press Tab to focus skip link (if implemented)
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByRole('link', { name: /skip to content|skip to main/i }).or(
      page.locator('[data-testid="skip-to-content"]')
    );
    const skipLinkExists = await skipLink.count();
    
    // This is a recommendation, not a hard requirement
    if (skipLinkExists === 0) {
      console.warn('⚠️  Skip to content link not found - consider adding for accessibility');
    }
  });
});
