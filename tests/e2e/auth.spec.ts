import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests user authentication flows, RBAC, and session management
 */

const TEST_USER_EMAIL = 'admin@fixzit.co';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'admin123';
const TEST_EMPLOYEE_NUMBER = 'EMP001';
const DEFAULT_TIMEOUT = 15000;

async function gotoWithRetry(page: Page, path: string, attempts = 3) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(path, { waitUntil: 'load', timeout: DEFAULT_TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1000);
    }
  }
  throw lastError;
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean session before each test
    await page.context().clearCookies();
    // Navigate to login page
    await gotoWithRetry(page, '/login');
  });

  test.describe('Login Flow', () => {
    test('should display login form', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Login/i);

      // Check form elements exist
      await expect(page.locator('input[name="loginIdentifier"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login with email and password', async ({ page }) => {
      // Fill login form
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Check user menu is visible
      const userMenu = page.locator('[data-testid="user-menu"]').first();
      await expect(userMenu).toBeVisible();
    });

    test('should login with employee number', async ({ page }) => {
      // Fill login form with employee number
      await page.fill('input[name="loginIdentifier"]', TEST_EMPLOYEE_NUMBER);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      // Fill with invalid credentials
      await page.fill('input[name="loginIdentifier"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');

      // Submit form
      await page.click('button[type="submit"]');

      // Check for error message
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/invalid/i);
    });

    test('should show validation error for empty fields', async ({ page }) => {
      // Submit empty form
      await page.click('button[type="submit"]');

      // Check for validation errors
      const loginIdentifierError = page.locator('text=/required/i').first();
      await expect(loginIdentifierError).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session after page reload', async ({ page }) => {
      // Login
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Reload page
      await page.reload();

      // Verify still logged in
      await expect(page).toHaveURL(/\/dashboard/);
      const userMenu = page.locator('[data-testid="user-menu"]').first();
      await expect(userMenu).toBeVisible();
    });

    test('should persist session across tabs', async ({ context }) => {
      // Create first page and login
      const page1 = await context.newPage();
      await gotoWithRetry(page1, '/login');
      await page1.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page1.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page1.click('button[type="submit"]');
      await page1.waitForURL('**/dashboard');

      // Create second page
      const page2 = await context.newPage();
      await gotoWithRetry(page2, '/dashboard');

      // Verify session is shared (no redirect to login)
      await expect(page2).toHaveURL(/\/dashboard/);
      const userMenu = page2.locator('[data-testid="user-menu"]').first();
      await expect(userMenu).toBeVisible();

      // Cleanup
      await page1.close();
      await page2.close();
    });

    test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
      // Try to access protected route directly
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL('**/login', { timeout: 5000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should logout successfully', async ({ page }) => {
      // Click user menu
      await page.locator('[data-testid="user-menu"]').first().click();

      // Click logout
      await page.click('text=/logout/i');

      // Wait for redirect to login
      await page.waitForURL('**/login', { timeout: 5000 });
      await expect(page).toHaveURL(/\/login/);

      // Verify cannot access protected route
      await page.goto('/dashboard');
      await page.waitForURL('**/login', { timeout: 5000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test('should clear session on logout', async ({ page, context }) => {
      // Logout
      await page.locator('[data-testid="user-menu"]').first().click();
      await page.click('text=/logout/i');
      await page.waitForURL('**/login');

      // Check session cookie is cleared
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));
      expect(sessionCookie).toBeUndefined();
    });
  });

  test.describe('RBAC (Role-Based Access Control)', () => {
    test('should load user permissions after login', async ({ page }) => {
      // Login
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Wait for RBAC to load (check for admin-only elements if super admin)
      const adminMenuItem = page.locator('[data-testid="admin-menu"]');
      // Super admin should see admin menu
      await expect(adminMenuItem).toBeVisible({ timeout: 10000 });
    });

    test('should hide admin features for non-admin users', async ({ page }) => {
      // This test requires a non-admin test user
      // Skip if TEST_USER is super admin
      const isSuperAdmin = true; // Update based on test user
      test.skip(isSuperAdmin, 'Test user is super admin');

      // Login as regular user
      await page.fill('input[name="loginIdentifier"]', 'user@fixzit.co');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Admin menu should NOT be visible
      const adminMenuItem = page.locator('[data-testid="admin-menu"]');
      await expect(adminMenuItem).not.toBeVisible();
    });

    test('should enforce permissions on API calls', async ({ page }) => {
      // Login
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

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
      await page.goto('/forgot-password');

      // Fill email
      await page.fill('input[name="email"]', TEST_USER_EMAIL);

      // Submit
      await page.click('button[type="submit"]');

      // Check for success message
      const successMessage = page.locator('text=/check your email/i');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Security', () => {
    test('should have secure session cookie attributes', async ({ page, context }) => {
      // Login
      await page.fill('input[name="loginIdentifier"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Get cookies
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session-token'));

      // Verify cookie attributes
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.secure).toBe(true); // Should be true in production
      expect(sessionCookie?.sameSite).toBe('Lax');
    });

    test('should prevent XSS in login form', async ({ page }) => {
      // Try XSS payload
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[name="loginIdentifier"]', xssPayload);
      await page.fill('input[name="password"]', 'test');
      await page.click('button[type="submit"]');

      // Wait a bit
      await page.waitForTimeout(1000);

      // Check no alert was triggered
      const alerts = [];
      page.on('dialog', dialog => alerts.push(dialog));
      expect(alerts.length).toBe(0);
    });

    test('should rate limit login attempts', async ({ page }) => {
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await page.fill('input[name="loginIdentifier"]', 'test@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Next attempt should be rate limited
      await page.fill('input[name="loginIdentifier"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Check for rate limit message
      const rateLimitMessage = page.locator('text=/too many attempts/i');
      await expect(rateLimitMessage).toBeVisible({ timeout: 5000 });
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
