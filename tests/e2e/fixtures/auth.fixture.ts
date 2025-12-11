/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Playwright Auth Fixtures (PROC-002)
 *
 * Provides reusable, role-based authentication fixtures for stable E2E tests.
 * Each role gets its own authenticated browser context with pre-seeded storage state.
 *
 * Usage:
 *   import { test, expect } from '@tests/e2e/fixtures/auth.fixture';
 *
 *   test('admin can access dashboard', async ({ adminPage }) => {
 *     await adminPage.goto('/dashboard');
 *     await expect(adminPage.locator('h1')).toContainText('Dashboard');
 *   });
 *
 * @see https://playwright.dev/docs/test-fixtures
 * @see https://playwright.dev/docs/auth
 */

// Role configurations with storage state paths
const ROLES = {
  superadmin: {
    storageState: 'tests/state/superadmin.json',
    displayName: 'Super Admin',
  },
  admin: {
    storageState: 'tests/state/admin.json',
    displayName: 'Admin',
  },
  manager: {
    storageState: 'tests/state/manager.json',
    displayName: 'Manager',
  },
  employee: {
    storageState: 'tests/state/employee.json',
    displayName: 'Employee',
  },
  vendor: {
    storageState: 'tests/state/vendor.json',
    displayName: 'Vendor',
  },
  seller: {
    storageState: 'tests/state/seller.json',
    displayName: 'Seller',
  },
  buyer: {
    storageState: 'tests/state/buyer.json',
    displayName: 'Buyer',
  },
} as const;

type RoleName = keyof typeof ROLES;

// Fixture types
interface AuthFixtures {
  // Authenticated pages per role
  superadminPage: Page;
  adminPage: Page;
  managerPage: Page;
  employeePage: Page;
  vendorPage: Page;
  sellerPage: Page;
  buyerPage: Page;

  // Authenticated contexts per role
  superadminContext: BrowserContext;
  adminContext: BrowserContext;
  managerContext: BrowserContext;
  employeeContext: BrowserContext;
  vendorContext: BrowserContext;
  sellerContext: BrowserContext;
  buyerContext: BrowserContext;

  // Utility to get page for any role
  getAuthenticatedPage: (role: RoleName) => Promise<Page>;

  // Utility to refresh auth state
  refreshAuthState: (role: RoleName) => Promise<void>;
}

/**
 * Ensure storage state directory exists
 */
function ensureStateDir() {
  const stateDir = path.join(process.cwd(), 'tests', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
}

/**
 * Check if storage state exists and is valid
 */
function hasValidStorageState(role: RoleName): boolean {
  const statePath = path.join(process.cwd(), ROLES[role].storageState);

  if (!existsSync(statePath)) {
    return false;
  }

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    // Check if cookies exist and are not expired
    if (!state.cookies || state.cookies.length === 0) {
      return false;
    }

    // Check for session cookie
    const hasSession = state.cookies.some(
      (c: { name: string }) =>
        c.name.includes('session') || c.name.includes('next-auth')
    );

    return hasSession;
  } catch {
    return false;
  }
}

/**
 * Create authenticated context for a role
 */
async function createAuthContext(
  browser: BrowserContext['browser'],
  role: RoleName
): Promise<BrowserContext> {
  const statePath = path.join(process.cwd(), ROLES[role].storageState);

  if (hasValidStorageState(role)) {
    // Use existing storage state
    return browser!.newContext({
      storageState: statePath,
    });
  }

  // Create new context without storage state
  // The global setup should have created the state
  console.warn(
    `⚠️ No valid storage state for ${role}. Run global setup first.`
  );
  return browser!.newContext();
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Super Admin
  superadminContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'superadmin');
    await use(context);
    await context.close();
  },
  superadminPage: async ({ superadminContext }, use) => {
    const page = await superadminContext.newPage();
    await use(page);
    await page.close();
  },

  // Admin
  adminContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'admin');
    await use(context);
    await context.close();
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },

  // Manager
  managerContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'manager');
    await use(context);
    await context.close();
  },
  managerPage: async ({ managerContext }, use) => {
    const page = await managerContext.newPage();
    await use(page);
    await page.close();
  },

  // Employee
  employeeContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'employee');
    await use(context);
    await context.close();
  },
  employeePage: async ({ employeeContext }, use) => {
    const page = await employeeContext.newPage();
    await use(page);
    await page.close();
  },

  // Vendor
  vendorContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'vendor');
    await use(context);
    await context.close();
  },
  vendorPage: async ({ vendorContext }, use) => {
    const page = await vendorContext.newPage();
    await use(page);
    await page.close();
  },

  // Seller
  sellerContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'seller');
    await use(context);
    await context.close();
  },
  sellerPage: async ({ sellerContext }, use) => {
    const page = await sellerContext.newPage();
    await use(page);
    await page.close();
  },

  // Buyer
  buyerContext: async ({ browser }, use) => {
    const context = await createAuthContext(browser, 'buyer');
    await use(context);
    await context.close();
  },
  buyerPage: async ({ buyerContext }, use) => {
    const page = await buyerContext.newPage();
    await use(page);
    await page.close();
  },

  // Utility: Get authenticated page for any role
  getAuthenticatedPage: async ({ browser }, use) => {
    const pages: Page[] = [];

    const getPage = async (role: RoleName): Promise<Page> => {
      const context = await createAuthContext(browser, role);
      const page = await context.newPage();
      pages.push(page);
      return page;
    };

    await use(getPage);

    // Cleanup
    for (const page of pages) {
      await page.close();
    }
  },

  // Utility: Refresh auth state for a role
  refreshAuthState: async ({ browser }, use) => {
    const refresh = async (role: RoleName): Promise<void> => {
      ensureStateDir();
      const statePath = path.join(process.cwd(), ROLES[role].storageState);

      // Create new context and perform login
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login
      await page.goto('/login');

      // Wait for login to complete (this would be customized per auth flow)
      // For now, save current state
      await context.storageState({ path: statePath });

      await page.close();
      await context.close();
    };

    await use(refresh);
  },
});

// Re-export expect for convenience
export { expect };

// Export role names for use in tests
export { ROLES, type RoleName };

// Default export for ESM compatibility
export default test;
