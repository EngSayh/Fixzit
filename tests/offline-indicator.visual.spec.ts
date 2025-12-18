/**
 * OfflineIndicator Visual Regression Tests
 * 
 * Tests RTL mode, brand color (#00A859), and spacing across browsers
 */
import { test, expect } from "@playwright/test";

test.describe("OfflineIndicator Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    // Create a test page that renders OfflineIndicator
    await page.goto("/test-rtl");
  });

  test("should match snapshot in LTR mode (English)", async ({ page }) => {
    // Simulate offline state
    await page.context().setOffline(true);
    
    // Wait for indicator to appear
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible();
    
    // Verify text content
    await expect(indicator).toContainText("offline");
    
    // Verify WifiOff icon is visible
    const icon = indicator.locator('svg').first();
    await expect(icon).toBeVisible();
    
    // Take screenshot for visual regression
    await expect(indicator).toHaveScreenshot("offline-indicator-ltr.png");
    
    // Simulate coming back online
    await page.context().setOffline(false);
    await page.reload();
    
    // Wait a bit for the reconnected message
    await page.waitForTimeout(100);
    
    // Verify online state (should show green message briefly)
    const onlineIndicator = page.locator('[role="status"]');
    if (await onlineIndicator.isVisible()) {
      await expect(onlineIndicator).toContainText("online");
      
      // Verify brand color (#00A859 - Fixzit Green)
      const bgColor = await onlineIndicator.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      // #00A859 converts to rgb(0, 168, 89)
      expect(bgColor).toMatch(/rgba?\(0,\s*168,\s*89/);
      
      // Take screenshot of online state
      await expect(onlineIndicator).toHaveScreenshot("offline-indicator-online-ltr.png");
    }
  });

  test("should match snapshot in RTL mode (Arabic)", async ({ page }) => {
    // Navigate to Arabic version
    await page.goto("/test-rtl?lang=ar");
    
    // Verify RTL direction
    const html = page.locator('html');
    const dir = await html.getAttribute('dir');
    expect(dir).toBe('rtl');
    
    // Simulate offline state
    await page.context().setOffline(true);
    
    // Wait for indicator
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible();
    
    // Verify Arabic text content
    await expect(indicator).toContainText("غير متصل");
    
    // Verify icon has me-1 class (RTL-safe margin)
    const icon = indicator.locator('svg').first();
    const classList = await icon.getAttribute('class');
    expect(classList).toContain('me-1');
    
    // Take screenshot for visual regression in RTL
    await expect(indicator).toHaveScreenshot("offline-indicator-rtl.png");
    
    // Simulate coming back online
    await page.context().setOffline(false);
    await page.reload();
    
    await page.waitForTimeout(100);
    
    // Verify online state in Arabic
    const onlineIndicator = page.locator('[role="status"]');
    if (await onlineIndicator.isVisible()) {
      await expect(onlineIndicator).toContainText("متصل");
      
      // Verify Fixzit Green brand color
      const bgColor = await onlineIndicator.evaluate((el) => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).toMatch(/rgba?\(0,\s*168,\s*89/);
      
      // Take screenshot
      await expect(onlineIndicator).toHaveScreenshot("offline-indicator-online-rtl.png");
    }
  });

  test("should maintain consistent spacing in both LTR and RTL", async ({ page }) => {
    // Test LTR spacing
    await page.context().setOffline(true);
    
    let indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible();
    
    // Get icon margin in LTR
    const ltrIcon = indicator.locator('svg').first();
    const ltrMargin = await ltrIcon.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        marginLeft: styles.marginLeft,
        marginRight: styles.marginRight,
        marginInlineEnd: styles.marginInlineEnd,
      };
    });
    
    // Switch to RTL
    await page.goto("/test-rtl?lang=ar");
    await page.context().setOffline(true);
    
    indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible();
    
    // Get icon margin in RTL
    const rtlIcon = indicator.locator('svg').first();
    const rtlMargin = await rtlIcon.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        marginLeft: styles.marginLeft,
        marginRight: styles.marginRight,
        marginInlineEnd: styles.marginInlineEnd,
      };
    });
    
    // marginInlineEnd should be consistent (me-1 = 0.25rem)
    expect(ltrMargin.marginInlineEnd).toBe(rtlMargin.marginInlineEnd);
  });

  test("should have correct accessibility attributes", async ({ page }) => {
    await page.context().setOffline(true);
    
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible();
    
    // Verify role
    await expect(indicator).toHaveAttribute('role', 'status');
    
    // Verify aria-live
    await expect(indicator).toHaveAttribute('aria-live', 'polite');
    
    // Verify icon has aria-hidden
    const icon = indicator.locator('svg').first();
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
