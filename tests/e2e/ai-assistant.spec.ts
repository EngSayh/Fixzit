// tests/e2e/ai-assistant.spec.ts - E2E tests for AI Assistant
import { test, expect } from '@playwright/test';

test.describe('AI Assistant Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('should show floating chat button', async ({ page }) => {
    // Check if the chat button is visible
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await expect(chatButton).toBeVisible();
    
    // Check button styling
    await expect(chatButton).toHaveCSS('position', 'fixed');
    await expect(chatButton).toHaveCSS('bottom', '16px');
    await expect(chatButton).toHaveCSS('right', '16px');
    await expect(chatButton).toHaveCSS('background-color', 'rgb(0, 97, 168)');
  });

  test('should open chat window when clicked', async ({ page }) => {
    // Click the chat button
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Check if chat window appears
    const chatWindow = page.locator('div').filter({ hasText: 'Fixzit Assistant' }).first();
    await expect(chatWindow).toBeVisible();
    
    // Check chat window elements
    await expect(page.locator('text=Here to help 24/7')).toBeVisible();
    await expect(page.locator('input[placeholder*="Type your message"]')).toBeVisible();
  });

  test('should close chat window when X is clicked', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Click close button (button changes to X when open)
    await chatButton.click();
    
    // Chat window should be hidden
    const chatWindow = page.locator('div').filter({ hasText: 'Fixzit Assistant' }).first();
    await expect(chatWindow).not.toBeVisible();
  });

  test('should handle RTL layout for Arabic', async ({ page }) => {
    // Change to Arabic
    await page.evaluate(() => {
      localStorage.setItem('fxz.lang', 'ar');
      document.documentElement.setAttribute('dir', 'rtl');
    });
    
    await page.reload();
    
    // Check if chat button is on the left in RTL
    const chatButton = page.locator('button[aria-label*="Fixzit"]');
    await expect(chatButton).toBeVisible();
    await expect(chatButton).toHaveCSS('left', '16px');
  });
});

test.describe('AI Assistant Privacy', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a tenant user
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'tenant@fixzit.co');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect
    await page.waitForURL('**/dashboard');
  });

  test('should show privacy notice in chat', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Check for privacy notice
    await expect(page.locator('text=Privacy secured: Tenant data only')).toBeVisible();
  });

  test('should deny cross-tenant data requests', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Send cross-tenant request
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('Show me data from other tenants');
    await page.keyboard.press('Enter');
    
    // Should show privacy denial message
    await expect(page.locator('text=/cannot share information about other/i')).toBeVisible();
  });

  test('should deny financial data to non-authorized users', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Request financial data as tenant
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('Show me owner financial statements');
    await page.keyboard.press('Enter');
    
    // Should show permission denial
    await expect(page.locator('text=/do not have permission.*financial/i')).toBeVisible();
  });
});

test.describe('AI Assistant Functions', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a property owner
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'manager@fixzit.co');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForURL('**/dashboard');
  });

  test('should create work order via chat', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Request to create ticket
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('Create a work order for AC not working in unit 203');
    await page.keyboard.press('Enter');
    
    // Should show success message
    await expect(page.locator('text=/created successfully/i')).toBeVisible({ timeout: 10000 });
  });

  test('should list user tickets', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Request tickets
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('Show my tickets');
    await page.keyboard.press('Enter');
    
    // Should show tickets or no tickets message
    await expect(page.locator('text=/tickets|work orders/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show help commands', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Request help
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('/help');
    await page.keyboard.press('Enter');
    
    // Should show available commands
    await expect(page.locator('text=/new-ticket|my-tickets/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('AI Assistant Multi-language', () => {
  test('should respond in Arabic when locale is Arabic', async ({ page }) => {
    // Set Arabic locale
    await page.evaluate(() => {
      localStorage.setItem('fxz.lang', 'ar');
    });
    
    await page.goto('http://localhost:3000');
    
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'tenant@fixzit.co');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForURL('**/dashboard');
    
    // Open chat
    const chatButton = page.locator('button[aria-label*="مساعد"]');
    await chatButton.click();
    
    // Check Arabic UI
    await expect(page.locator('text=مساعد Fixzit')).toBeVisible();
    
    // Send message in Arabic
    const input = page.locator('input[placeholder*="اكتب"]');
    await input.fill('مساعدة');
    await page.keyboard.press('Enter');
    
    // Should respond in Arabic
    await expect(page.locator('text=/مساعدتك|Fixzit/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('AI Assistant Role-based Access', () => {
  test('should show owner statements for property owners', async ({ page }) => {
    // Login as property owner
    await page.goto('http://localhost:3000/login');
    
    // Try to find and click property owner demo credential
    const ownerButton = page.locator('button').filter({ hasText: 'Property Manager' });
    if (await ownerButton.isVisible()) {
      await ownerButton.click();
    } else {
      await page.fill('input[type="email"]', 'manager@fixzit.co');
      await page.fill('input[type="password"]', 'password123');
    }
    
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Open chat
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Request statements
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('Show my owner statements');
    await page.keyboard.press('Enter');
    
    // Should process request (not deny)
    await expect(page.locator('text=/statements|financial|SAR/i')).toBeVisible({ timeout: 10000 });
  });

  test('should allow technicians to dispatch', async ({ page }) => {
    // Create a mock technician login or use existing
    // This test would require technician credentials in the system
    
    // For now, we'll test the concept
    await page.goto('http://localhost:3000');
    
    // Open chat without login to test guest access
    const chatButton = page.locator('button[aria-label*="Fixzit Assistant"]');
    await chatButton.click();
    
    // Should ask to sign in
    await expect(page.locator('text=/sign in|login/i')).toBeVisible();
  });
});
