import type { Page } from '@playwright/test';
import { encode as encodeJwt } from 'next-auth/jwt';
import crypto from 'node:crypto';
import fs from 'node:fs';

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
  
  // Wait for form validation to complete (button becomes enabled)
  await page.locator(loginSelectors.submit).waitFor({ state: 'attached', timeout: 5000 });
  // Give React/validation a tick to process
  await page.waitForLoadState('domcontentloaded');
  
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
  let formFilled = false;

  // Prime CSRF cookie/session before hitting the login form
  await warmUpAuthSession(page);

  try {
    await fillLoginForm(page, identifier, password);
    formFilled = true;
  } catch (formErr) {
    // If the login UI is missing/disabled, fall back to programmatic/offline flows
    resultDetails.errorText = formErr instanceof Error ? formErr.message : String(formErr);
  }

  const errorLocator = getErrorLocator(page);

  try {
    // Wait for either success redirect, error message, or timeout
    // Each branch has catch handler to prevent unhandled rejections from losing promises
    if (formFilled) {
      const raceResult = await Promise.race([
        page.waitForURL(successPattern, { timeout: 20000 })
          .then(() => ({ success: true }))
          .catch(() => null), // Losing branch - swallow rejection
        errorLocator.first().waitFor({ state: 'visible', timeout: 20000 })
          .then(async () => ({
            success: false,
            errorText: await errorLocator.first().innerText().catch(() => 'Login error displayed'),
          }))
          .catch(() => null), // Losing branch - swallow rejection
        page.waitForTimeout(20000).then(() => ({ success: false, errorText: 'Login timeout - no redirect or error' })),
      ]).then(result => result || { success: false, errorText: 'All branches timed out' });

      resultDetails.success = raceResult.success;
      resultDetails.errorText = raceResult.errorText;
    }

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

    // Last-resort offline session injection (mock JWT or storageState)
    // AUDIT-2025-11-30: Made opt-in via ALLOW_OFFLINE_LOGIN to prevent masking real auth failures
    // In RBAC-critical E2E suites, this should be OFF to catch real regressions
    const allowOfflineFallback = process.env.ALLOW_OFFLINE_LOGIN === 'true';
    if (!resultDetails.success && allowOfflineFallback) {
      console.warn('[auth.ts] Using SUPER_ADMIN offline fallback - real auth may be broken!');
      try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const secret =
          process.env.NEXTAUTH_SECRET ||
          process.env.AUTH_SECRET ||
          'playwright-secret';
        const userId = crypto.randomUUID();
        const role = 'SUPER_ADMIN';
        const sessionToken = await encodeJwt({
          secret,
          maxAge: 30 * 24 * 60 * 60,
          token: {
            id: userId,
            sub: userId,
            email: identifier || `${role.toLowerCase()}@offline.test`,
            role,
            roles: [role],
            orgId: 'ffffffffffffffffffffffff',
            permissions: ['*'],
          },
        });

        const origin = new URL(baseUrl);
        await page.context().addCookies([
          {
            name: baseUrl.startsWith('https') ? '__Secure-authjs.session-token' : 'authjs.session-token',
            value: sessionToken,
            domain: origin.hostname,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: origin.protocol === 'https:',
          },
          {
            name: baseUrl.startsWith('https') ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            value: sessionToken,
            domain: origin.hostname,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: origin.protocol === 'https:',
          },
        ]);

        // Also set localStorage role for client-side guards
        await page.addInitScript(({ r }) => localStorage.setItem('fixzit-role', r.toLowerCase()), { r: role });

        await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        const finalUrl = page.url();
        if (finalUrl.includes('/dashboard') && !finalUrl.includes('/login')) {
          resultDetails.success = true;
          resultDetails.errorText = undefined;
        } else {
          // As a fallback, load storage state if available
          const statePath = process.env.AUTH_STORAGE_STATE || 'tests/state/superadmin.json';
          if (fs.existsSync(statePath)) {
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            if (Array.isArray(state.cookies)) {
              await page.context().addCookies(
                state.cookies.map((c: any) => ({
                  ...c,
                  domain: origin.hostname,
                })),
              );
            }
            if (Array.isArray(state.origins)) {
              for (const originState of state.origins) {
                if (originState.origin === baseUrl && Array.isArray(originState.localStorage)) {
                  await page.addInitScript((entries) => {
                    entries.forEach(({ name, value }) => localStorage.setItem(name, value));
                  }, originState.localStorage);
                }
              }
            }
            await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
            const finalUrl2 = page.url();
            if (finalUrl2.includes('/dashboard') && !finalUrl2.includes('/login')) {
              resultDetails.success = true;
              resultDetails.errorText = undefined;
            }
          }
        }
      } catch (fallbackErr) {
        resultDetails.errorText = resultDetails.errorText || (fallbackErr as Error)?.message;
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

  // Wait for dropdown menu to become visible (animation complete)
  await page.locator('[data-testid="logout-button"]').waitFor({ state: 'visible', timeout: 5000 });

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

    // Wait for session cookies to be cleared (poll with timeout)
    await expect(async () => {
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => 
        c.name.includes('session-token') || 
        c.name.includes('next-auth') ||
        c.name.includes('authjs')
      );
      expect(sessionCookie).toBeUndefined();
    }).toPass({ timeout: 5000 });

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
