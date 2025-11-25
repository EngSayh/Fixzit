/**
 * Halt-Fix-Verify (HFV) E2E Test Suite
 *
 * Smoke tests for all critical user journeys:
 * - 9 roles × 13 critical pages = 117 test scenarios
 * - Zero console error tolerance
 * - RBAC verification (expect 403/404 for unauthorized access)
 * - Screenshot evidence capture
 *
 * Run:
 *   npx playwright test tests/hfv.e2e.spec.ts
 *   pnpm run test:e2e tests/hfv.e2e.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EVIDENCE_DIR = path.join(process.cwd(), "reports", "evidence");

// Ensure evidence directory exists
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// Define roles
const ROLES = [
  "Super Admin",
  "Corporate Admin",
  "Property Manager",
  "Technician",
  "Tenant",
  "Vendor",
  "Service Provider",
  "Finance Team",
  "Guest",
];

// Define critical pages to test
const CRITICAL_PAGES = [
  { path: "/dashboard", name: "Dashboard", publicAccess: false },
  { path: "/work-orders", name: "Work Orders", publicAccess: false },
  { path: "/properties", name: "Properties", publicAccess: false },
  { path: "/finance", name: "Finance", publicAccess: false },
  { path: "/hr", name: "HR", publicAccess: false },
  { path: "/administration", name: "Administration", publicAccess: false },
  { path: "/crm", name: "CRM", publicAccess: false },
  { path: "/marketplace", name: "Marketplace", publicAccess: false },
  { path: "/support", name: "Support", publicAccess: false },
  { path: "/compliance", name: "Compliance", publicAccess: false },
  { path: "/reports", name: "Reports", publicAccess: false },
  { path: "/login", name: "Login", publicAccess: true },
  { path: "/", name: "Landing Page", publicAccess: true },
];

// Role access matrix (which roles should access which pages)
const ROLE_ACCESS_MATRIX: Record<string, string[]> = {
  "Super Admin": CRITICAL_PAGES.map((p) => p.path),
  "Corporate Admin": [
    "/dashboard",
    "/work-orders",
    "/properties",
    "/finance",
    "/hr",
    "/administration",
    "/crm",
    "/compliance",
    "/reports",
  ],
  "Property Manager": [
    "/dashboard",
    "/work-orders",
    "/properties",
    "/crm",
    "/reports",
  ],
  Technician: ["/dashboard", "/work-orders"],
  Tenant: ["/dashboard", "/work-orders", "/support"],
  Vendor: ["/dashboard", "/marketplace"],
  "Service Provider": ["/dashboard", "/marketplace", "/work-orders"],
  "Finance Team": ["/dashboard", "/finance", "/reports"],
  Guest: ["/login", "/"],
};

test.describe("HFV E2E Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on("pageerror", (error) => {
      console.error(`❌ Page Error: ${error.message}`);
    });
  });

  for (const role of ROLES) {
    test.describe(`Role: ${role}`, () => {
      for (const pageDef of CRITICAL_PAGES) {
        const shouldAccess =
          ROLE_ACCESS_MATRIX[role]?.includes(pageDef.path) ||
          pageDef.publicAccess;

        test(`${shouldAccess ? "✅" : "🚫"} Access ${pageDef.name} (${pageDef.path})`, async ({
          page,
        }) => {
          // Mock authentication for specific role
          if (!pageDef.publicAccess) {
            await mockAuthentication(page, role);
          }

          const consoleErrors: string[] = [];
          page.on("console", (msg) => {
            if (msg.type() === "error") {
              consoleErrors.push(msg.text());
            }
          });

          try {
            const response = await page.goto(`${BASE_URL}${pageDef.path}`, {
              waitUntil: "networkidle",
              timeout: 10000,
            });

            if (shouldAccess) {
              // Expect successful access
              expect(response?.status()).toBeLessThan(400);

              // Verify page loaded
              await expect(page.locator("body")).toBeVisible();

              // Zero console error tolerance
              expect(consoleErrors).toHaveLength(0);

              // Capture screenshot as evidence
              const screenshotPath = path.join(
                EVIDENCE_DIR,
                `${role.replace(/\s+/g, "-")}_${pageDef.name.replace(/\s+/g, "-")}_success.png`,
              );
              await page.screenshot({ path: screenshotPath, fullPage: true });
            } else {
              // Expect restricted access (403/404 or redirect to login)
              const status = response?.status();
              const isUnauthorized = status === 403 || status === 404;
              const isRedirectedToLogin =
                page.url().includes("/login") ||
                page.url().includes("/dashboard");

              expect(isUnauthorized || isRedirectedToLogin).toBeTruthy();

              // Capture screenshot as evidence
              const screenshotPath = path.join(
                EVIDENCE_DIR,
                `${role.replace(/\s+/g, "-")}_${pageDef.name.replace(/\s+/g, "-")}_restricted.png`,
              );
              await page.screenshot({ path: screenshotPath, fullPage: true });
            }
          } catch (error) {
            // Capture failure screenshot
            const screenshotPath = path.join(
              EVIDENCE_DIR,
              `${role.replace(/\s+/g, "-")}_${pageDef.name.replace(/\s+/g, "-")}_error.png`,
            );
            await page.screenshot({ path: screenshotPath, fullPage: true });

            throw error;
          }
        });
      }
    });
  }
});

/**
 * Mock authentication for a specific role
 * This should be adapted to your authentication mechanism
 */
async function mockAuthentication(page: Page, role: string) {
  // Option 1: Set authentication cookies
  await page.context().addCookies([
    {
      name: "auth-token",
      value: "mock-token-" + role.replace(/\s+/g, "-").toLowerCase(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Option 2: Mock localStorage
  await page.addInitScript((userRole) => {
    window.localStorage.setItem("user", JSON.stringify({ role: userRole }));
  }, role);

  // Option 3: Intercept API calls and return mock user data
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "mock-user-id",
          name: "Test User",
          email: "test@example.com",
          role: role,
        },
      }),
    });
  });
}
