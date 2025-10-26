import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

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
    // ============ ENGLISH (LTR) ============
    {
      name: 'EN:SuperAdmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/superadmin.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'EN:Admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/admin.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'EN:Manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/manager.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'EN:Technician',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/technician.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'EN:Tenant',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/tenant.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'EN:Vendor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/vendor.json',
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
      }
    },

    // ============ ARABIC (RTL) ============
    {
      name: 'AR:SuperAdmin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/superadmin.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'AR:Admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/admin.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'AR:Manager',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/manager.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'AR:Technician',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/technician.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'AR:Tenant',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/tenant.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    },
    {
      name: 'AR:Vendor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/state/vendor.json',
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh'
      }
    }
  ],
  webServer: undefined // Managed by tasks.json
});
