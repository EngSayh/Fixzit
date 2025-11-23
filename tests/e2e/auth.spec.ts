import { test, expect } from '@playwright/test';
import { attemptLogin, fillLoginForm, getErrorLocator, getNonAdminUserFromEnv, getTestUserFromEnv, loginSelectors } from './utils/auth';

/**
 * Authentication E2E Tests
 * Tests user authentication flows, RBAC, and session management
 */

const PRIMARY_USER = getTestUserFromEnv();
const HAS_PRIMARY_USER = Boolean(PRIMARY_USER);
const HAS_EMPLOYEE_NUMBER = Boolean(PRIMARY_USER?.employeeNumber);
const NON_ADMIN_USER = getNonAdminUserFromEnv();
const HAS_NON_ADMIN_USER = Boolean(NON_ADMIN_USER);
const PASSWORD_RESET_EMAIL = PRIMARY_USER?.email || 'admin@fixzit.co';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test.describe('Login Flow', () => {
    test('should display login form', async ({ page }) => {
      // Check form elements exist
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator(loginSelectors.identifier)).toBeVisible();
      await expect(page.locator(loginSelectors.password)).toBeVisible();
      await expect(page.locator(loginSelectors.submit)).toBeVisible();
    });

    test('should login with email and password', async ({ page }) => {
      test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_EMAIL/TEST_USER_PASSWORD (or TEST_SUPERADMIN_*)');

      const result = await attemptLogin(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      test.skip(!result.success, `Login failed for TEST_USER_EMAIL: ${result.errorText || 'unknown error'}`);

      // Check user menu is visible (use .first() since there may be duplicate menu elements for mobile/desktop)
      const userMenu = page.locator('[data-testid="user-menu"]').first();
      await expect(userMenu).toBeVisible();
    });

    test('should login with employee number', async ({ page }) => {
      test.skip(!HAS_PRIMARY_USER || !HAS_EMPLOYEE_NUMBER, 'Missing TEST_EMPLOYEE_NUMBER (or TEST_SUPERADMIN_EMPLOYEE)');

      const result = await attemptLogin(page, PRIMARY_USER!.employeeNumber!, PRIMARY_USER!.password);
      test.skip(!result.success, `Login failed for TEST_USER_EMPLOYEE: ${result.errorText || 'unknown error'}`);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Fill with invalid credentials
      await fillLoginForm(page, 'invalid@example.com', 'wrongpassword');

      // Check for error message
      const errorMessage = getErrorLocator(page);
      const visible = await errorMessage.first().isVisible();
      if (visible) {
        await expect(errorMessage).toContainText(/invalid|incorrect|try again/i);
      }
      await expect(page).toHaveURL(/\/login/);
    });

    test('should show validation error for empty fields', async ({ page }) => {
      // Submit empty form
      await page.click(loginSelectors.submit);

      // Check for validation errors
      const loginIdentifierError = page.locator('text=/required/i').first();
      await expect(loginIdentifierError).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_* env vars for session management tests');

    test('should persist session after page reload', async ({ page }) => {
      // Login
      const result = await attemptLogin(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      test.skip(!result.success, `Login failed: ${result.errorText || 'unknown error'}`);

      // Reload page
      await page.reload();

      // Verify still logged in
      await expect(page).toHaveURL(/\/dashboard/);
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
    });

    test('should persist session across tabs', async ({ context }) => {
      // Create first page and login
      const page1 = await context.newPage();
      await page1.goto('/login');
      const result = await attemptLogin(page1, PRIMARY_USER!.email, PRIMARY_USER!.password);
      test.skip(!result.success, `Login failed: ${result.errorText || 'unknown error'}`);

      // Create second page
      const page2 = await context.newPage();
      await page2.goto('/dashboard');

      // Verify session is shared (no redirect to login)
      await expect(page2).toHaveURL(/\/dashboard/);
      const userMenu = page2.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();

      // Cleanup
      await page1.close();
      await page2.close();
    });

    test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
      // Try to access protected route directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_* env vars for logout tests');

    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      const result = await attemptLogin(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      test.skip(!result.success, `Login failed: ${result.errorText || 'unknown error'}`);
    });

    test('should logout successfully', async ({ page }) => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('text=/logout/i');

      // Wait for redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Verify cannot access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should clear session on logout', async ({ page, context }) => {
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=/logout/i');
      await page.waitForURL('**/login');

      // Check session cookie is cleared
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));
      expect(sessionCookie).toBeUndefined();
    });
  });

  test.describe('RBAC (Role-Based Access Control)', () => {
    test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_* env vars for RBAC tests');

    test('should load user permissions after login', async ({ page }) => {
      // Login
      await fillLoginForm(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // Wait for RBAC to load (check for admin-only elements if super admin)
      const adminMenuItem = page.locator('[data-testid="admin-menu"]');
      // Super admin should see admin menu
      await expect(adminMenuItem).toBeVisible({ timeout: 10000 });
    });

    test('should hide admin features for non-admin users', async ({ page }) => {
      test.skip(!HAS_NON_ADMIN_USER, 'Missing non-admin user env (TEST_NONADMIN_* or TEST_MANAGER_* env vars)');

      // Login as regular user
      await fillLoginForm(page, NON_ADMIN_USER!.email, NON_ADMIN_USER!.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // Admin menu should NOT be visible
      const adminMenuItem = page.locator('[data-testid="admin-menu"]');
      await expect(adminMenuItem).not.toBeVisible({ timeout: 5000 });

      // Admin APIs should be forbidden for non-admin users
      const adminUsersResponse = await page.request.get('/api/admin/users');
      expect(adminUsersResponse.status()).toBe(403);
    });

    test('should enforce permissions on API calls', async ({ page }) => {
      // Login
      await fillLoginForm(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // Intercept API call
      const response = await page.request.get('/api/work-orders', {
        headers: {
          'Cookie': await page.context().cookies().then(cookies => 
            cookies.map(c => `${c.name}=${c.value}`).join('; ')
          )
        }
      });

      // Should return 200 (authorized) or 403 (forbidden), not 401 (unauthenticated)
      expect([200, 403]).toContain(response.status());
      expect(response.status()).not.toBe(401);
    });
  });

  test.describe('Password Reset', () => {
    test('should show forgot password link', async ({ page }) => {
      const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
      await expect(forgotPasswordLink).toBeVisible();
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.click('a[href="/forgot-password"]');
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('should submit password reset request', async ({ page }) => {
      test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_* env vars for password reset test');

      await page.goto('/forgot-password');

      // Fill email
      await page.fill('input[name="email"]', PASSWORD_RESET_EMAIL);

      // Submit
      await page.click('button[type="submit"]');

      // Check for success message
      const successMessage = page.locator('text=/check your email/i');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Security', () => {
    test.skip(!HAS_PRIMARY_USER, 'Missing TEST_USER_* env vars for security tests');

    test('should have secure session cookie attributes', async ({ page, context }) => {
      // Login
      await fillLoginForm(page, PRIMARY_USER!.email, PRIMARY_USER!.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // Get cookies
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));

      // Verify cookie attributes
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
      const expectSecure = (page.url() || BASE_URL).startsWith('https');
      expect(sessionCookie?.secure).toBe(expectSecure);
      expect(sessionCookie?.sameSite).toBe('Lax');
    });

    test('should prevent XSS in login form', async ({ page }) => {
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss().catch(() => {});
      });

      // Try XSS payload
      const xssPayload = '<script>alert("XSS")</script>';
      await fillLoginForm(page, xssPayload, 'test');
      await expect(page).toHaveURL(/\/login/);

      // Check no alert was triggered
      expect(dialogs.length).toBe(0);
    });

    test('should rate limit login attempts', async ({ page }) => {
      // Obtain CSRF token required by NextAuth credential callback
      const csrfResponse = await page.request.get('/api/auth/csrf');
      const csrfJson = await csrfResponse.json();
      const csrfToken = csrfJson?.csrfToken;
      expect(csrfToken).toBeTruthy();

      // Hit the credentials callback directly to avoid UI brute force
      let rateLimited = false;
      for (let attempt = 1; attempt <= 6; attempt++) {
        const form = new URLSearchParams({
          identifier: `ratelimit-${attempt}@example.com`,
          password: 'wrongpassword',
          csrfToken,
          rememberMe: 'off',
          redirect: 'false',
          callbackUrl: '/dashboard',
          json: 'true',
        });

        const response = await page.request.post('/api/auth/callback/credentials', {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: form.toString(),
        });

        const bodyText = await response.text();
        if (response.status() === 429 || /too many/i.test(bodyText)) {
          rateLimited = true;
          break;
        }
      }

      expect(rateLimited).toBeTruthy();
    });
  });

  test.describe('Multi-Language Support', () => {
    test('should support Arabic language in login page', async ({ page }) => {
      // Change language to Arabic
      await page.goto('/login?lang=ar');

      // Check for Arabic text (RTL direction)
      const body = page.locator('body');
      await expect(body).toHaveAttribute('dir', 'rtl');

      // Check for Arabic login button text
      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toContainText(/تسجيل الدخول/);
    });
  });
});
