import type { Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
  employeeNumber?: string;
};

export const loginSelectors = {
  identifier: '[data-testid="login-email"], input[name="loginIdentifier"], input[name="identifier"], input[type="email"]',
  password: '[data-testid="login-password"], input[name="password"]',
  submit: '[data-testid="login-submit"], button[type="submit"], [data-testid="auth-submit"]',
  // Exclude Next.js announcer which is role="alert" but empty
  errorSelectors: ['[role="alert"]:not(#__next-route-announcer__)', '[data-testid="auth-error"]'],
};

export function getTestUserFromEnv(): TestUser | null {
  const email = process.env.TEST_USER_EMAIL || process.env.TEST_SUPERADMIN_IDENTIFIER;
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_SUPERADMIN_PASSWORD;
  const employeeNumber = process.env.TEST_EMPLOYEE_NUMBER || process.env.TEST_SUPERADMIN_EMPLOYEE || 'EMP001';

  if (!email || !password) {
    return null;
  }

  return { email, password, employeeNumber };
}

export function getNonAdminUserFromEnv(): TestUser | null {
  const email =
    process.env.TEST_NONADMIN_IDENTIFIER ||
    process.env.TEST_MANAGER_IDENTIFIER ||
    process.env.TEST_TENANT_IDENTIFIER ||
    process.env.TEST_USER_NONADMIN_EMAIL;

  const password =
    process.env.TEST_NONADMIN_PASSWORD ||
    process.env.TEST_MANAGER_PASSWORD ||
    process.env.TEST_TENANT_PASSWORD ||
    process.env.TEST_USER_NONADMIN_PASSWORD;

  const employeeNumber =
    process.env.TEST_NONADMIN_EMPLOYEE ||
    process.env.TEST_MANAGER_EMPLOYEE ||
    process.env.TEST_TENANT_EMPLOYEE;

  if (!email || !password) {
    return null;
  }

  return { email, password, employeeNumber };
}

export async function fillLoginForm(page: Page, identifier: string, password: string) {
  await page.waitForSelector(loginSelectors.identifier, { timeout: 20000 });
  await page.waitForSelector(loginSelectors.password, { timeout: 20000 });
  await page.waitForSelector(loginSelectors.submit, { timeout: 20000 });
  
  // Wait for form to be fully interactive
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  
  await page.fill(loginSelectors.identifier, identifier);
  await page.fill(loginSelectors.password, password);
  
  // Wait a bit for any validation to complete
  await page.waitForTimeout(500);
  
  await page.click(loginSelectors.submit);
}

export function getErrorLocator(page: Page) {
  const locator = page.locator(loginSelectors.errorSelectors.join(', '));
  return locator.or(page.getByText(/invalid|incorrect|try again/i));
}

export async function attemptLogin(page: Page, identifier: string, password: string, successPattern = /\/dashboard/) {
  const resultDetails: { success: boolean; errorText?: string } = { success: false };

  // Prime CSRF cookie/session before hitting the login form
  await page.request.get('/api/auth/csrf').catch(() => {});

  await fillLoginForm(page, identifier, password);

  const errorLocator = getErrorLocator(page);

  try {
    // Wait for either success redirect, error message, or timeout
    const raceResult = await Promise.race([
      page.waitForURL(successPattern, { timeout: 20000 }).then(() => ({ success: true })),
      errorLocator.first().waitFor({ state: 'visible', timeout: 20000 }).then(async () => ({
        success: false,
        errorText: await errorLocator.first().innerText().catch(() => 'Login error displayed'),
      })),
      page.waitForTimeout(20000).then(() => ({ success: false, errorText: 'Login timeout - no redirect or error' })),
    ]);

    resultDetails.success = raceResult.success;
    resultDetails.errorText = raceResult.errorText;

    // If still on login page after timeout, check if we're actually logged in
    if (!resultDetails.success) {
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/home')) {
        resultDetails.success = true;
        resultDetails.errorText = undefined;
      } else {
        // Try to manually navigate to dashboard to see if session exists
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        const finalUrl = page.url();
        if (finalUrl.includes('/dashboard') && !finalUrl.includes('/login')) {
          resultDetails.success = true;
          resultDetails.errorText = undefined;
        }
      }
    }

    return resultDetails;
  } catch (err) {
    resultDetails.success = false;
    resultDetails.errorText = err instanceof Error ? err.message : 'unexpected login error';
    return resultDetails;
  }
}
