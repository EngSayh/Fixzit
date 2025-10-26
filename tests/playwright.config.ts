import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

/**
 * Playwright Configuration for Fixzit E2E Testing
 * 
 * Test Matrix:
 * - Desktop (Chrome): 6 roles × 2 locales = 12 projects
 * - Mobile (Pixel 5, iPhone 13): 2 roles × 2 locales = 4 projects
 * - Total: 16 projects testing responsive design and multi-role access
 * 
 * Roles: SuperAdmin, Admin, Manager, Technician, Tenant, Vendor
 * Locales: English (en-US, LTR), Arabic (ar-SA, RTL)
 * Mobile Focus: Technician (field ops) and Tenant (property owners)
 */

export default defineConfig({
  testDir: './specs',
  timeout: 120000,
  retries: 1,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : 4,
  globalSetup: './setup-auth.ts',
  reporter: [
    ['line'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1366, height: 900 },
    actionTimeout: 15000,
    navigationTimeout: 30000
  },
  projects: [
    // ============ DESKTOP: ENGLISH (LTR) ============
    {
      name: 'Desktop:EN:SuperAdmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/superadmin.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:EN:Admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/admin.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:EN:Manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/manager.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:EN:Technician',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/technician.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:EN:Tenant',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/tenant.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:EN:Vendor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/vendor.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },

    // ============ DESKTOP: ARABIC (RTL) ============
    {
      name: 'Desktop:AR:SuperAdmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/superadmin.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:AR:Admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/admin.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:AR:Manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/manager.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:AR:Technician',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/technician.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:AR:Tenant',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/tenant.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Desktop:AR:Vendor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/vendor.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },

    // ============ MOBILE: ENGLISH (Critical Roles Only) ============
    {
      name: 'Mobile:EN:Technician',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/state/technician.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Mobile:EN:Tenant',
      use: {
        ...devices['iPhone 13'],
        storageState: 'tests/state/tenant.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },

    // ============ MOBILE: ARABIC (Critical Roles Only) ============
    {
      name: 'Mobile:AR:Technician',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/state/technician.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'Mobile:AR:Tenant',
      use: {
        ...devices['iPhone 13'],
        storageState: 'tests/state/tenant.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    }
  ],
  webServer: undefined // Managed by tasks.json
});
