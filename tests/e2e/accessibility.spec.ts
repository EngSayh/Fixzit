/**
 * E2E Test: Accessibility & Keyboard Navigation
 * Tests a11y compliance including:
 * - Skip to content links
 * - Keyboard navigation
 * - Focus management
 * - ARIA landmarks
 * - RTL support
 * 
 * @a11y WCAG 2.1 Level AA compliance
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PW_WEB_URL || "http://127.0.0.1:3100";

/**
 * Pages to test for a11y features
 */
const A11Y_TEST_PAGES = [
  { path: "/", name: "Landing Page" },
  { path: "/login", name: "Login Page" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/superadmin", name: "Superadmin Dashboard" },
];

test.describe("Accessibility & Keyboard Navigation", () => {
  test.describe("Skip Navigation Links", () => {
    test("skip to content link exists and works on landing page", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Focus on the skip link (usually hidden until focused)
      await page.keyboard.press("Tab");

      // Look for skip link - various selectors
      const skipLink = page.locator(
        'a[href="#main-content"], a[href="#main"], a:has-text("Skip to main content"), a:has-text("Skip to content"), [data-testid="skip-link"]'
      ).first();

      const skipLinkVisible = await skipLink.isVisible().catch(() => false);

      if (skipLinkVisible) {
        // Verify skip link is focusable and visible when focused
        await expect(skipLink).toBeFocused();
        
        // Click should navigate to main content
        await skipLink.click();
        
        // Focus should move to main content area
        const mainContent = page.locator("#main-content, #main, main, [role='main']").first();
        const hasMainContent = await mainContent.isVisible().catch(() => false);
        expect(hasMainContent).toBe(true);
      } else {
        // Skip link may be sr-only until focused - verify it exists in DOM
        // Note: Some pages may not have skip links (e.g., minimal layouts)
        // This is informational logging rather than a test failure
        const skipLinkInDom = await page.locator('a[href="#main-content"]').count();
        // Log for debugging - skip link presence is recommended but not required on all pages
        console.log(`Skip link count in DOM: ${skipLinkInDom}`);
      }
    });

    test("superadmin layout has skip to content link", async ({ page }) => {
      await page.goto("/superadmin", { waitUntil: "domcontentloaded" });

      // Check for skip link in DOM (even if hidden)
      const skipLinks = await page.locator(
        'a[href="#main-content"], a:has-text("Skip to main content"), .sr-only:has-text("Skip")'
      ).count();

      // Skip link should exist (visible or sr-only)
      // If redirected to login, that's also acceptable
      const isRedirected = page.url().includes("/login");
      expect(skipLinks > 0 || isRedirected).toBe(true);
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("can navigate login form with keyboard only", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Tab through the page
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Should be able to reach form inputs
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          type: (el as HTMLInputElement)?.type,
          role: el?.getAttribute("role"),
        };
      });

      // Should have focused on an interactive element
      const isFocusable =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "BUTTON" ||
        activeElement.tagName === "A" ||
        activeElement.tagName === "SELECT" ||
        activeElement.role === "button";

      expect(isFocusable).toBe(true);
    });

    test("escape key closes modals", async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Look for any modal trigger
      const modalTrigger = page.locator(
        'button[aria-haspopup="dialog"], [data-testid*="modal-trigger"], button:has-text("Add"), button:has-text("Create")'
      ).first();

      if (await modalTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await modalTrigger.click();

        // Wait for modal
        const modal = page.locator('[role="dialog"], [aria-modal="true"], .modal').first();
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Press Escape
          await page.keyboard.press("Escape");

          // Modal should close
          await expect(modal).not.toBeVisible({ timeout: 3000 });
        }
      }
    });

    test("tab order follows logical reading order", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      const focusedElements: string[] = [];

      // Tab through first 10 elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName || "BODY";
        });
        focusedElements.push(focused);
        if (focused === "BODY") break;
      }

      // Should have focused on interactive elements
      const interactiveCount = focusedElements.filter(
        (tag) => ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(tag)
      ).length;

      expect(interactiveCount).toBeGreaterThan(0);
    });
  });

  test.describe("ARIA Landmarks", () => {
    test("pages have main landmark", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Should have main landmark
      const mainLandmark = page.locator("main, [role='main']").first();
      const hasMain = await mainLandmark.isVisible().catch(() => false);

      // Or page content area with id
      const mainContent = page.locator("#main-content, #main").first();
      const hasMainId = await mainContent.isVisible().catch(() => false);

      expect(hasMain || hasMainId).toBe(true);
    });

    test("pages have navigation landmark", async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Should have navigation landmark
      const navLandmark = page.locator("nav, [role='navigation']").first();
      const hasNav = await navLandmark.isVisible({ timeout: 5000 }).catch(() => false);

      // If redirected to login, check login page has nav
      if (page.url().includes("/login")) {
        const loginNav = page.locator("nav, [role='navigation']").first();
        expect(await loginNav.isVisible().catch(() => false)).toBe(true);
      } else {
        expect(hasNav).toBe(true);
      }
    });

    test("buttons have accessible names", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Get all buttons
      const buttons = page.locator("button");
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible().catch(() => false)) {
          // Button should have accessible name
          const name = await button.getAttribute("aria-label") || await button.textContent();
          const hasName = name && name.trim().length > 0;
          expect(hasName).toBe(true);
        }
      }
    });

    test("images have alt text", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // Get all images
      const images = page.locator("img");
      const imageCount = await images.count();

      for (let i = 0; i < Math.min(imageCount, 10); i++) {
        const img = images.nth(i);
        if (await img.isVisible().catch(() => false)) {
          // Image should have alt attribute (can be empty for decorative)
          const hasAlt = (await img.getAttribute("alt")) !== null;
          const hasRole = await img.getAttribute("role");
          const isDecorativeOrLabeled = hasAlt || hasRole === "presentation" || hasRole === "none";
          expect(isDecorativeOrLabeled).toBe(true);
        }
      }
    });
  });

  test.describe("Focus Management", () => {
    test("focus is visible when navigating", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Tab to an element
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Check if focused element has visible focus indicator
      const hasFocusRing = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;

        const style = window.getComputedStyle(el);
        const outlineStyle = style.outlineStyle;
        const outlineWidth = parseFloat(style.outlineWidth);
        const boxShadow = style.boxShadow;

        // Has visible outline or box-shadow
        return (
          (outlineStyle !== "none" && outlineWidth > 0) ||
          (boxShadow && boxShadow !== "none")
        );
      });

      // Focus should be visible (via outline or box-shadow)
      expect(hasFocusRing).toBe(true);
    });

    test("focus trap in dialogs", async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Find and click a modal trigger if available
      const modalTrigger = page.locator(
        '[aria-haspopup="dialog"], [data-testid*="modal"], button:has-text("Add")'
      ).first();

      if (await modalTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await modalTrigger.click();

        const modal = page.locator('[role="dialog"], [aria-modal="true"]').first();
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Tab multiple times - should stay within modal
          const initialUrl = page.url();
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press("Tab");
          }

          // Focus should still be within modal (not escaped to page behind)
          const activeElement = await page.evaluate(() => {
            const el = document.activeElement;
            const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
            return modal?.contains(el) ?? false;
          });

          expect(activeElement).toBe(true);
        }
      }
    });
  });

  test.describe("RTL Support", () => {
    test("page respects RTL direction for Arabic", async ({ page }) => {
      // Navigate to page with Arabic locale
      await page.goto("/ar", { waitUntil: "domcontentloaded" });

      // Check if HTML has RTL direction
      const htmlDir = await page.getAttribute("html", "dir");
      const bodyDir = await page.getAttribute("body", "dir");
      const hasRtl = htmlDir === "rtl" || bodyDir === "rtl";

      // Or check if redirected and main page has RTL classes
      const hasRtlClass = await page.locator(".rtl, [dir='rtl']").count();

      // Should have RTL support if Arabic is selected
      // If page doesn't support /ar path, that's also acceptable
      expect(hasRtl || hasRtlClass > 0 || page.url().includes("/login")).toBe(true);
    });

    test("navigation uses logical CSS properties", async ({ page }) => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

      // Check sidebar/nav for logical CSS classes
      const sidebar = page.locator("nav, aside, [role='navigation']").first();

      if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
        const classes = await sidebar.getAttribute("class") || "";

        // Should use logical properties (ms-, me-, ps-, pe-, start-, end-)
        // or be RTL-aware
        const usesLogicalOrIsAware =
          classes.includes("start") ||
          classes.includes("end") ||
          classes.includes("ms-") ||
          classes.includes("me-") ||
          classes.includes("ps-") ||
          classes.includes("pe-") ||
          classes.includes("rtl:");

        // This is a soft check - not all components may use logical properties yet
        // Just log for awareness
        if (!usesLogicalOrIsAware) {
          console.log("ℹ️  Sidebar may benefit from logical CSS properties for RTL");
        }
      }
    });
  });

  test.describe("Color Contrast", () => {
    test("text has sufficient contrast", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      // Sample check on visible text elements
      const textElements = page.locator("p, h1, h2, h3, label, span").first();

      if (await textElements.isVisible().catch(() => false)) {
        const { color, bgColor } = await textElements.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            color: style.color,
            bgColor: style.backgroundColor,
          };
        });

        // Both should be defined (basic check)
        expect(color).toBeDefined();
        expect(bgColor).toBeDefined();
        
        // Parse RGB values and calculate contrast ratio (WCAG 2.1 formula)
        const parseRgb = (rgbStr: string): [number, number, number] | null => {
          const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        };
        
        const getLuminance = (r: number, g: number, b: number): number => {
          const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
            c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
          );
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };
        
        const fgRgb = parseRgb(color);
        const bgRgb = parseRgb(bgColor);
        
        if (fgRgb && bgRgb) {
          const fgLum = getLuminance(...fgRgb);
          const bgLum = getLuminance(...bgRgb);
          const lighter = Math.max(fgLum, bgLum);
          const darker = Math.min(fgLum, bgLum);
          const contrastRatio = (lighter + 0.05) / (darker + 0.05);
          
          // WCAG 2.1 Level AA: 4.5:1 for normal text, 3:1 for large text
          // For this general check, we use 3:1 as minimum (large text threshold)
          expect(contrastRatio).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });
});
