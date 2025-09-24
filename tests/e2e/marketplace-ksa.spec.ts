// tests/e2e/marketplace-ksa.spec.ts - E2E tests for marketplace with KSA compliance
import { test, expect } from '@playwright/test';

test.describe('Marketplace Guest Browsing', () => {
  test('should allow guests to browse properties without login', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace/properties');
    
    // Should see properties without login prompt
    await expect(page.locator('h1')).toContainText(/Properties|العقارات/);
    await expect(page.locator('[data-testid="property-card"]').first()).toBeVisible();
    
    // Should show filters
    await expect(page.locator('[data-testid="city-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-filter"]')).toBeVisible();
    
    // Should NOT show exact contact info
    await expect(page.locator('text=/[0-9]{10}/')).not.toBeVisible();
    await expect(page.locator('text=/@/')).not.toBeVisible();
  });

  test('should show masked contact info for guests', async ({ page }) => {
    await page.goto('/marketplace/properties');
    
    // Click on first property
    await page.locator('[data-testid="property-card"]').first().click();
    
    // Should see property details
    await expect(page.locator('[data-testid="property-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-price"]')).toBeVisible();
    
    // Should see masked contact
    await expect(page.locator('text=/\+966 5\*\* \*\*\* \d{3}/')).toBeVisible();
    
    // Contact button should prompt login
    await page.locator('button:has-text("Contact Seller")').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show verification badges', async ({ page }) => {
    await page.goto('/marketplace/properties');
    
    // Look for verification badges
    const verifiedBadge = page.locator('[data-testid="verified-badge"]');
    const falBadge = page.locator('[data-testid="fal-badge"]');
    
    // At least some properties should have badges
    const verifiedCount = await verifiedBadge.count();
    expect(verifiedCount).toBeGreaterThan(0);
  });

  test('should allow filtering by city and price', async ({ page }) => {
    await page.goto('/marketplace/properties');
    
    // Apply city filter
    await page.selectOption('[data-testid="city-filter"]', 'Riyadh');
    
    // Apply price filter
    await page.fill('[data-testid="min-price"]', '500000');
    await page.fill('[data-testid="max-price"]', '2000000');
    await page.click('button:has-text("Apply Filters")');
    
    // URL should update with filters
    await expect(page).toHaveURL(/city=Riyadh/);
    await expect(page).toHaveURL(/minPrice=500000/);
    
    // Results should be filtered
    await expect(page.locator('[data-testid="results-count"]')).toBeVisible();
  });

  test('should switch to Arabic (RTL)', async ({ page }) => {
    await page.goto('/marketplace/properties');
    
    // Switch language
    await page.click('[data-testid="language-selector"]');
    await page.click('text=العربية');
    
    // Check RTL
    const html = await page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    
    // Check Arabic content
    await expect(page.locator('h1')).toContainText('العقارات');
  });
});

test.describe('Marketplace Authentication Gates', () => {
  test('should require login for contact reveal', async ({ page }) => {
    await page.goto('/marketplace/properties');
    await page.locator('[data-testid="property-card"]').first().click();
    
    // Try to contact
    await page.click('button:has-text("Contact Seller")');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=/Sign in to contact/i')).toBeVisible();
  });

  test('should require login for making offer', async ({ page }) => {
    await page.goto('/marketplace/properties/123'); // Specific property
    
    // Try to make offer
    await page.click('button:has-text("Make Offer")');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow add to cart but require login at checkout', async ({ page }) => {
    await page.goto('/marketplace/materials');
    
    // Add item to cart
    await page.locator('[data-testid="add-to-cart"]').first().click();
    
    // Cart count should update
    await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    
    // Should see cart items
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
    
    // Try to checkout
    await page.click('button:has-text("Proceed to Checkout")');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('KSA Compliance Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property owner
    await page.goto('/login');
    await page.fill('[name="email"]', 'owner@fixzit.co');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
  });

  test('should show FAL license field for brokers', async ({ page }) => {
    await page.goto('/marketplace/properties/new');
    
    // Select broker as seller type
    await page.selectOption('[name="sellerType"]', 'broker');
    
    // FAL license fields should appear
    await expect(page.locator('[name="falLicenseNumber"]')).toBeVisible();
    await expect(page.locator('text=/FAL-\d{10}/')).toBeVisible();
  });

  test('should validate National Address format', async ({ page }) => {
    await page.goto('/marketplace/properties/new');
    
    // Fill invalid National Address
    await page.fill('[name="buildingNumber"]', '123'); // Should be 4 digits
    await page.fill('[name="postalCode"]', '1234'); // Should be 5 digits
    
    await page.click('button:has-text("Save")');
    
    // Should show validation errors
    await expect(page.locator('text=/Building number must be 4 digits/')).toBeVisible();
    await expect(page.locator('text=/Postal code must be 5 digits/')).toBeVisible();
  });

  test('should show Ejar eligibility option', async ({ page }) => {
    await page.goto('/marketplace/properties/new');
    
    // Select rental purpose
    await page.selectOption('[name="purpose"]', 'rent');
    
    // Ejar options should appear
    await expect(page.locator('[name="ejarEligible"]')).toBeVisible();
    await expect(page.locator('text=/Ejar/')).toBeVisible();
  });

  test('should require Nafath for high-value properties', async ({ page }) => {
    await page.goto('/marketplace/properties/luxury-villa-123');
    
    // Try to contact on high-value property (>1M SAR)
    await page.click('button:has-text("Contact Seller")');
    
    // Should show Nafath requirement
    await expect(page.locator('text=/Nafath authentication required/')).toBeVisible();
    await expect(page.locator('button:has-text("Authenticate with Nafath")')).toBeVisible();
  });

  test('should enforce rate limiting on contact reveals', async ({ page }) => {
    await page.goto('/marketplace/properties');
    
    // Reveal multiple contacts quickly
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-testid="property-card"]').nth(i).click();
      await page.click('button:has-text("Show Contact")');
      
      if (i < 5) {
        // First 5 should work
        await expect(page.locator('[data-testid="phone-number"]')).toBeVisible();
        await page.goBack();
      } else {
        // 6th should be rate limited
        await expect(page.locator('text=/Rate limit exceeded/')).toBeVisible();
      }
    }
  });
});

test.describe('Sidebar Role Visibility', () => {
  test('should hide restricted modules for guests', async ({ page }) => {
    await page.goto('/');
    
    // Open sidebar if mobile
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
    }
    
    // Guest should only see limited modules
    await expect(page.locator('[data-testid="sidebar-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-marketplace"]')).toBeVisible();
    
    // Should NOT see restricted modules
    await expect(page.locator('[data-testid="sidebar-finance"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-hr"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-system"]')).not.toBeVisible();
  });

  test('should show appropriate modules for property owner', async ({ page }) => {
    // Login as property owner
    await page.goto('/login');
    await page.fill('[name="email"]', 'owner@fixzit.co');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    // Check sidebar
    await expect(page.locator('[data-testid="sidebar-properties"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-work-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-finance"]')).toBeVisible();
    
    // Should NOT see HR/System
    await expect(page.locator('[data-testid="sidebar-hr"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-system"]')).not.toBeVisible();
  });
});

test.describe('AI Assistant Privacy', () => {
  test('should not reveal cross-tenant data', async ({ page }) => {
    // Login as tenant
    await page.goto('/login');
    await page.fill('[name="email"]', 'tenant@fixzit.co');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    // Open AI assistant
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Ask about other tenants
    await page.fill('[data-testid="ai-input"]', 'Show me all properties in the system');
    await page.keyboard.press('Enter');
    
    // Should refuse
    await expect(page.locator('text=/cannot share information about other organizations/')).toBeVisible();
  });

  test('should provide role-appropriate help', async ({ page }) => {
    // Login as property manager
    await page.goto('/login');
    await page.fill('[name="email"]', 'manager@fixzit.co');
    await page.fill('[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    
    // Open AI assistant
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Ask for help
    await page.fill('[data-testid="ai-input"]', 'How do I create a work order?');
    await page.keyboard.press('Enter');
    
    // Should provide relevant help
    await expect(page.locator('text=/create.*work order/i')).toBeVisible();
  });
});
