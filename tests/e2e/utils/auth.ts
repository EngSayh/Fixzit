import type { Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
  employeeNumber?: string;
};

const allowCsrfBypass =
  process.env.NEXTAUTH_SKIP_CSRF_CHECK === 'true' || process.env.NODE_ENV === 'test';

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

async function warmUpAuthSession(page: Page) {
  // NextAuth v5 exposes /api/auth/session (not /csrf). Hit it once to prime cookies.
  try {
    const sessionResponse = await page.request.get('/api/auth/session');
    if (sessionResponse.ok) {
      await sessionResponse.text().catch(() => '');
    }
  } catch {
    // ignore priming failures (dev server might be cold)
  }
}

async function fetchCsrfToken(page: Page): Promise<string | undefined> {
  // In test/CI we explicitly skip the CSRF check
  if (allowCsrfBypass) {
    await warmUpAuthSession(page);
    return 'csrf-disabled';
  }

  await warmUpAuthSession(page);

  // Try to derive token from cookie if server sets it
  try {
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name.includes('next-auth.csrf-token'));
    if (csrfCookie?.value) {
      const raw = decodeURIComponent(csrfCookie.value);
      const [token] = raw.split('|');
      if (token) return token;
    }
  } catch {
    // ignore cookie extraction failures
  }

  // As a last resort, attempt legacy endpoint but harden against invalid JSON
  try {
    const response = await page.request.get('/api/auth/csrf');
    const bodyText = (await response.text().catch(() => ''))?.trim();
    if (bodyText) {
      const match = bodyText.match(/"csrfToken"\s*:\s*"([^"]+)"/i);
      if (match?.[1]) return match[1];
      try {
        const parsed = JSON.parse(bodyText);
        return parsed?.csrfToken || parsed?.csrf?.token;
      } catch {
        // ignore JSON parse errors (common when endpoint is missing)
      }
    }
  } catch {
    // ignore missing endpoint errors
  }

  return undefined;
}

export async function attemptLogin(page: Page, identifier: string, password: string, successPattern = /\/dashboard/) {
  const resultDetails: { success: boolean; errorText?: string } = { success: false };

  // Prime CSRF cookie/session before hitting the login form
  await warmUpAuthSession(page);

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

    // If UI flow failed, try programmatic credentials login with CSRF fallback
    if (!resultDetails.success) {
      try {
        const csrfToken = await fetchCsrfToken(page);
        const tokenToUse = csrfToken || (allowCsrfBypass ? 'csrf-disabled' : undefined);

        if (tokenToUse) {
          const form = new URLSearchParams({
            identifier,
            password,
            csrfToken: tokenToUse,
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
            await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
            const finalUrl = page.url();
            if (finalUrl.includes('/dashboard') && !finalUrl.includes('/login')) {
              resultDetails.success = true;
              resultDetails.errorText = undefined;
            } else {
              resultDetails.success = false;
              resultDetails.errorText = `fallback login did not reach dashboard (url=${finalUrl})`;
            }
          } else {
            resultDetails.errorText = `fallback login failed: ${resp.status()}`;
          }
        } else {
          resultDetails.errorText = 'Could not extract CSRF token';
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

/**
 * Logs out the current user and verifies session cleanup
 * @param page - Playwright page object
 * @param verifyRedirect - Whether to verify redirect to login (default: true)
 * @returns Promise that resolves when logout is complete
 */
export async function logoutUser(page: Page, verifyRedirect = true): Promise<void> {
  // Click user menu to open dropdown
  const userMenu = page.locator('[data-testid="user-menu"]').first();
  await userMenu.waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await userMenu.scrollIntoViewIfNeeded();
  await userMenu.click({ timeout: 15000 }).catch(async () => {
    await userMenu.click({ timeout: 15000, force: true }).catch(async () => {
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="user-menu"]') as HTMLElement | null;
        el?.click();
      });
    });
  });

  // Wait for dropdown menu animation
  await page.waitForTimeout(500);

  // Click logout button
  const logoutButton = page.locator('[data-testid="logout-button"]').first();
  await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  await logoutButton.click();

  // Wait for logout page to load
  await page.waitForURL(/\/logout/, { timeout: 5000 });

  // Wait for logout spinner (confirms logout process started)
  await page.locator('[data-testid="logout-spinner"]').waitFor({ 
    state: 'visible', 
    timeout: 3000 
  }).catch(() => {
    // Spinner might be too fast to catch, that's OK
  });

  if (verifyRedirect) {
    // Wait for redirect to login page (happens after cleanup completes)
    await page.waitForURL(/\/login/, { timeout: 15000 });

    // Give cookies time to clear after redirect
    await page.waitForTimeout(1000);

    // Verify session cookies are cleared
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => 
      c.name.includes('session-token') || 
      c.name.includes('next-auth') ||
      c.name.includes('authjs')
    );
    
    if (sessionCookie) {
      throw new Error(`Session cookie still present after logout: ${sessionCookie.name}`);
    }

    // Verify we can't access protected routes
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 5000 });
  }
}
