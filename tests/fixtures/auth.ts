/**
 * E2E Test Authentication Fixtures
 * 
 * Provides role-based login helpers for Playwright E2E tests.
 * Prevents hardcoded credentials and ensures consistent authentication.
 * 
 * Usage:
 * ```typescript
 * import { loginAs } from './fixtures/auth';
 * await loginAs(page, 'FM_MANAGER');
 * ```
 */

import { Page } from '@playwright/test';

/**
 * Available test roles with credentials
 * NOTE: These are TEST ACCOUNTS ONLY - never use production credentials
 */
export const TEST_CREDENTIALS = {
  FM_MANAGER: {
    email: 'fm.manager@fixzit.test',
    password: 'Test123!@#',
    role: 'FM_MANAGER',
    displayName: 'FM Manager (Test)',
  },
  FM_TECHNICIAN: {
    email: 'fm.tech@fixzit.test',
    password: 'Test123!@#',
    role: 'FM_TECHNICIAN',
    displayName: 'FM Technician (Test)',
  },
  AQAR_AGENT: {
    email: 'aqar.agent@fixzit.test',
    password: 'Test123!@#',
    role: 'AQAR_AGENT',
    displayName: 'Aqar Agent (Test)',
  },
  CRM_AGENT: {
    email: 'crm.agent@fixzit.test',
    password: 'Test123!@#',
    role: 'CRM_AGENT',
    displayName: 'CRM Agent (Test)',
  },
  HR_MANAGER: {
    email: 'hr.manager@fixzit.test',
    password: 'Test123!@#',
    role: 'HR_MANAGER',
    displayName: 'HR Manager (Test)',
  },
  FINANCE_ACCOUNTANT: {
    email: 'finance.accountant@fixzit.test',
    password: 'Test123!@#',
    role: 'FINANCE_ACCOUNTANT',
    displayName: 'Finance Accountant (Test)',
  },
  ADMIN: {
    email: 'admin@fixzit.test',
    password: 'Test123!@#',
    role: 'ADMIN',
    displayName: 'System Admin (Test)',
  },
} as const;

export type TestRole = keyof typeof TEST_CREDENTIALS;

/**
 * Login helper - authenticates user and waits for session establishment
 * 
 * @param page - Playwright page object
 * @param role - Test role to authenticate as
 * @returns Promise that resolves when login is complete
 * 
 * @throws Error if login fails or times out
 */
export async function loginAs(page: Page, role: TestRole): Promise<void> {
  const credentials = TEST_CREDENTIALS[role];
  
  if (!credentials) {
    throw new Error(`Unknown test role: ${role}`);
  }

  console.log(`🔐 Logging in as ${credentials.displayName}...`);

  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Fill credentials using data-testid selectors
  await page.locator('[data-testid="login-email"]').fill(credentials.email);
  await page.locator('[data-testid="login-password"]').fill(credentials.password);

  // Submit login form
  await page.locator('[data-testid="login-submit"]').click();

  // Wait for successful navigation (redirect after login)
  await page.waitForURL(url => !url.pathname.includes('/login'), {
    timeout: 10000,
  });

  // Verify session is established by checking for auth cookie or user menu
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
    console.log(`✅ Logged in as ${credentials.displayName}`);
  } catch (error) {
    throw new Error(`Login failed for ${role}: Session not established`);
  }
}

/**
 * Logout helper - clears session and returns to login page
 * 
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  console.log('🚪 Logging out...');

  try {
    // Click user menu
    await page.locator('[data-testid="user-menu"]').click();
    
    // Click logout option
    await page.locator('[data-testid="logout-button"]').click();

    // Wait for redirect to login page
    await page.waitForURL('/login', { timeout: 5000 });
    
    console.log('✅ Logged out successfully');
  } catch (error) {
    console.warn('⚠️  Logout may have failed, clearing cookies as fallback');
    await page.context().clearCookies();
  }
}

/**
 * Setup authenticated session for test suite
 * Use in beforeEach/beforeAll hooks
 * 
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupAuthSession(page, 'FM_MANAGER');
 * });
 * ```
 */
export async function setupAuthSession(page: Page, role: TestRole): Promise<void> {
  await loginAs(page, role);
}

/**
 * Cleanup authenticated session
 * Use in afterEach/afterAll hooks
 * 
 * @example
 * ```typescript
 * test.afterEach(async ({ page }) => {
 *   await cleanupAuthSession(page);
 * });
 * ```
 */
export async function cleanupAuthSession(page: Page): Promise<void> {
  await logout(page);
}

/**
 * Check if user is authenticated (has valid session)
 * 
 * @param page - Playwright page object
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current authenticated user role from page
 * Useful for verification in tests
 * 
 * @param page - Playwright page object
 * @returns Current user role or null if not authenticated
 */
export async function getCurrentRole(page: Page): Promise<string | null> {
  try {
    const roleElement = await page.locator('[data-testid="user-role"]').textContent();
    return roleElement;
  } catch {
    return null;
  }
}
