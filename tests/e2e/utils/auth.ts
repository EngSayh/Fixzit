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
  await page.fill(loginSelectors.identifier, identifier);
  await page.fill(loginSelectors.password, password);
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
    const raceResult = await Promise.race([
      page.waitForURL(successPattern, { timeout: 15000 }).then(() => ({ success: true })),
      errorLocator.first().waitFor({ state: 'visible', timeout: 15000 }).then(async () => ({
        success: false,
        errorText: await errorLocator.first().innerText().catch(() => undefined),
      })),
      page.waitForTimeout(15000).then(() => ({ success: false, errorText: 'timeout waiting for login result' })),
    ]);

    resultDetails.success = raceResult.success;
    resultDetails.errorText = raceResult.errorText;

    if (!resultDetails.success) {
      // Fallback: programmatic login via API (ensures CSRF handled)
      try {
        const csrfResp = await page.request.get('/api/auth/csrf');
        const csrfJson = await csrfResp.json();
        const csrfToken = csrfJson?.csrfToken;
        if (csrfToken) {
          const form = new URLSearchParams({
            identifier,
            password,
            csrfToken,
            rememberMe: 'on',
            redirect: 'false',
            callbackUrl: '/dashboard',
            json: 'true',
          });

          const resp = await page.request.post('/api/auth/callback/credentials', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: form.toString(),
          });

          if (resp.status() === 200 || resp.status() === 302) {
            await page.goto('/dashboard');
            resultDetails.success = true;
            resultDetails.errorText = undefined;
            return resultDetails;
          }
          resultDetails.errorText = `fallback login failed: ${resp.status()}`;
        }
      } catch (fallbackErr) {
        resultDetails.errorText = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      }
    }

    return resultDetails;
  } catch (err) {
    resultDetails.success = false;
    resultDetails.errorText = err instanceof Error ? err.message : 'unexpected login error';
    return resultDetails;
  }
}
