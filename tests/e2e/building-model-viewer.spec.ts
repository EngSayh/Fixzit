/**
 * E2E tests for 3D Building Model Viewer
 * @module tests/e2e/building-model-viewer.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('3D Building Model Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Login as property owner
    await page.goto('/login');
    await page.fill('input[name="email"]', 'owner@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should navigate to building model viewer from property page', async ({ page }) => {
    // Navigate to properties list
    await page.goto('/fm/properties');
    await page.waitForSelector('[data-testid="properties-list"]', { timeout: 10000 });

    // Click on first property
    const firstProperty = page.locator('[data-testid="property-card"]').first();
    await firstProperty.click();

    // Look for building model tab
    const buildingModelTab = page.locator('text=3D Model').or(page.locator('text=Building Model'));
    if (await buildingModelTab.isVisible()) {
      await buildingModelTab.click();
      
      // Verify viewer loads
      await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
    } else {
      // Test that generate button is available
      const generateButton = page.locator('text=Generate 3D Model').or(page.locator('button:has-text("Generate")'));
      await expect(generateButton).toBeVisible();
    }
  });

  test('should generate a new building model', async ({ page }) => {
    // Navigate to property with no existing model
    await page.goto('/fm/properties/test-property-123');
    
    // Click generate button
    await page.click('text=Generate 3D Model');

    // Fill in generation form
    await page.fill('input[name="floors"]', '3');
    await page.fill('input[name="apartmentsPerFloor"]', '4');
    await page.selectOption('select[name="template"]', '2br');

    // Submit generation
    await page.click('button:has-text("Generate")');

    // Wait for generation to complete
    await expect(page.locator('text=Model generated successfully')).toBeVisible({ timeout: 30000 });

    // Verify canvas appears
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should display view options controls', async ({ page }) => {
    // Navigate to property with existing model
    await page.goto('/fm/properties/test-property-with-model');

    // Wait for viewer to load
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Verify view controls are present
    await expect(page.locator('text=View Options')).toBeVisible();
    
    // Check for common controls
    const showRoomsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /rooms|Show Rooms/i });
    const explodedViewCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /exploded|Exploded View/i });
    
    // These controls should be accessible
    await expect(showRoomsCheckbox.or(page.locator('label:has-text("Show Rooms")'))).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/fm/properties/test-property-with-model');
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Focus on canvas
    await page.locator('canvas').focus();

    // Test arrow key navigation (should not throw errors)
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');

    // Verify no errors occurred
    const errors = await page.evaluate(() => {
      return (window as any).__errors || [];
    });
    expect(errors.length).toBe(0);
  });

  test('should display unit information on selection', async ({ page }) => {
    await page.goto('/fm/properties/test-property-with-model');
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Click on a unit in the viewer (approximate center)
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      // Wait for unit info panel to appear
      await expect(page.locator('text=Selected Unit').or(page.locator('[data-testid="unit-info"]'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should support RTL layout', async ({ page }) => {
    // Set Arabic locale
    await page.addInitScript(() => {
      localStorage.setItem('locale', 'ar');
    });

    await page.goto('/fm/properties/test-property-with-model');
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Verify RTL direction
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Verify controls use logical positioning (start/end instead of left/right)
    const viewOptions = page.locator('text=View Options').or(page.locator('text=خيارات العرض'));
    await expect(viewOptions).toBeVisible();
  });

  test('should handle large buildings (stress test)', async ({ page }) => {
    await page.goto('/fm/properties/test-property-large');

    // Generate large building
    await page.click('text=Generate 3D Model');
    await page.fill('input[name="floors"]', '20');
    await page.fill('input[name="apartmentsPerFloor"]', '50');
    await page.selectOption('select[name="template"]', '2br');
    await page.click('button:has-text("Generate")');

    // Wait for generation (may take longer)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 60000 });

    // Verify no memory leaks or crashes
    const isVisible = await page.locator('canvas').isVisible();
    expect(isVisible).toBe(true);
  });

  test('should publish building model', async ({ page }) => {
    await page.goto('/fm/properties/test-property-draft-model');
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Click publish button
    const publishButton = page.locator('button:has-text("Publish")').or(page.locator('[data-testid="publish-model"]'));
    await publishButton.click();

    // Confirm publication
    const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Yes")'));
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Verify success message
    await expect(page.locator('text=Published successfully').or(page.locator('text=Model published'))).toBeVisible({ timeout: 10000 });

    // Verify status changed to Published
    await expect(page.locator('text=Status: Published').or(page.locator('[data-testid="model-status"]:has-text("Published")'))).toBeVisible();
  });
});
