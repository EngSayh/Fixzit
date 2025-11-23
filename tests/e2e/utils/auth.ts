import { Page } from '@playwright/test';

/**
 * Selectors for login form fields
 */
export const loginSelectors = {
  identifier: 'input[name="identifier"], input[name="email"], input[name="employeeNumber"]',
  password: 'input[name="password"]',
  submit: 'button[type="submit"], [data-testid="login-submit"]',
};

/**
 * Test user interface
 */
export interface TestUser {
  email?: string;
  employeeNumber?: string;
  password: string;
}

/**
 * Fill the login form with identifier and password
 */
export async function fillLoginForm(page: Page, identifier: string, password: string): Promise<void> {
  await page.fill(loginSelectors.identifier, identifier);
  await page.fill(loginSelectors.password, password);
}

/**
 * Attempt login and return result
 */
export async function attemptLogin(
  page: Page,
  identifier: string,
  password: string
): Promise<{ success: boolean; errorText?: string }> {
  await fillLoginForm(page, identifier, password);
  await page.click(loginSelectors.submit);

  // Wait for navigation or error
  try {
    await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 5000 });
    return { success: true };
  } catch (e) {
    // Check for error message
    const errorLocator = getErrorLocator(page);
    const errorText = (await errorLocator.first().textContent()) || '';
    return { success: false, errorText };
  }
}

/**
 * Get locator for error message on login form
 */
export function getErrorLocator(page: Page) {
  // Try common error selectors
  return page.locator(
    '[data-testid="login-error"], .error-message, .MuiAlert-message, .ant-alert-message, text=/invalid|incorrect|try again/i'
  );
}

/**
 * Get test user from environment variables
 */
export function getTestUserFromEnv(): TestUser | null {
  const email = process.env.TEST_USER_EMAIL || process.env.TEST_SUPERADMIN_EMAIL;
  const employeeNumber = process.env.TEST_USER_EMPLOYEE || process.env.TEST_SUPERADMIN_EMPLOYEE;
  const password = process.env.TEST_USER_PASSWORD || process.env.TEST_SUPERADMIN_PASSWORD;

  if (!password || (!email && !employeeNumber)) {
    return null;
  }

  return {
    email: email || undefined,
    employeeNumber: employeeNumber || undefined,
    password,
  };
}

/**
 * Get non-admin test user from environment variables
 */
export function getNonAdminUserFromEnv(): TestUser | null {
  const email = process.env.TEST_NONADMIN_EMAIL;
  const employeeNumber = process.env.TEST_NONADMIN_EMPLOYEE;
  const password = process.env.TEST_NONADMIN_PASSWORD;

  if (!password || (!email && !employeeNumber)) {
    return null;
  }

  return {
    email: email || undefined,
    employeeNumber: employeeNumber || undefined,
    password,
  };
}
