/**
 * E2E Test: Authentication Flow
 * Tests complete user authentication journey including signup, login, and logout
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check page loads
    await expect(page).toHaveTitle(/Login|Fixzit/i);
    
    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check language selector
    await expect(page.locator('[aria-label*="language" i], [aria-label*="اللغة" i], [data-testid="language-selector"]')).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Should see validation errors and remain on login
    const errors = page.locator('[role="alert"], [data-testid*="error"], text=/required/i');
    await expect(errors.first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Should show error message and remain on login
    const error = page.locator('[role="alert"], [data-testid="auth-error"], text=/invalid|incorrect|failed/i');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    
    // Find and click signup link
    const signupLink = page.locator('a[href*="/signup"], [data-testid="go-to-signup"]');
    await expect(signupLink.first()).toBeVisible();
    await signupLink.first().click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup');
    
    // Check page loads
    await expect(page).toHaveTitle(/Sign.*Up|Fixzit/i);
    
    // Check form elements exist
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in weak password
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').first().fill('123');
    
    // Try to submit
    await page.locator('button[type="submit"]').click();
    
    // Should show validation error
    const pwError = page.locator('[role="alert"], [data-testid*="password-error"], text=/password/i');
    await expect(pwError.first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/login');
    
    // Find forgot password link
    const forgotLink = page.locator('a[href*="forgot"], [data-testid="forgot-password-link"]');
    await expect(forgotLink.first()).toBeVisible();
    await forgotLink.first().click();
    await expect(page).toHaveURL(/\/forgot/);
    
    // Check email input exists
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should switch language on auth pages', async ({ page }) => {
    await page.goto('/login');
    
    // Find language selector
    const langSelector = page.locator('[aria-label*="language" i], [aria-label*="اللغة" i], button:has-text("العربية"), button:has-text("English"), [data-testid="language-selector"]').first();
    
    await expect(langSelector).toBeVisible();
    await langSelector.click();
    
    // Wait for dropdown and ensure dir attribute is set to ltr or rtl
    await expect(page.locator('html')).toHaveAttribute('dir', /ltr|rtl/, { timeout: 3000 });
  });
});

test.describe('Authentication - Guest User', () => {
  test('guest user should see public pages', async ({ page }) => {
    await page.goto('/');
    
    // Home page should load
    await expect(page).toHaveTitle(/Fixzit/i);
    
    // Check for login/signup buttons
    const hasAuthButtons = await page.locator('a[href*="/login"], a[href*="/signup"]').count() > 0;
    expect(hasAuthButtons).toBeTruthy();
  });

  test('guest user should be redirected from protected routes', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to login or show access denied
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
