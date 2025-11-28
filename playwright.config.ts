import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const isCI = !!process.env.CI;
const requestedProjects = process.env.PLAYWRIGHT_PROJECTS
  ?.split(',')
  .map((p) => p.trim())
  .filter(Boolean);

// Load environment variables from .env.test if it exists
// This ensures GOOGLE_CLIENT_ID/SECRET and other test credentials are available
const envPath = path.resolve(process.cwd(), '.env.test');
try {
  const result = dotenv.config({ path: envPath });
  if (result.parsed && Object.keys(result.parsed).length > 0) {
    process.stdout.write('✅ Loaded test environment variables from .env.test\n');
  }
} catch (error) {
  process.stderr.write('⚠️  .env.test not found. Copy .env.test.example to .env.test and add your credentials.\n');
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
// MongoDB-only configuration
export default defineConfig({
  testDir: './',
  // Restrict to Playwright suites only; avoid pulling in Vitest unit specs that also use *.spec.ts
  testMatch: [
    'tests/e2e/**/*.spec.ts',
    'tests/specs/**/*.spec.ts',
    'tests/smoke/**/*.spec.ts',
    'tests/copilot/**/*.spec.ts',
    'tests/copilot.spec.ts',
    'tests/marketplace.smoke.spec.ts',
    'tests/hfv.e2e.spec.ts',
    'qa/tests/**/*.spec.ts',
    '**/*.e2e.ts',
  ],
  testIgnore: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/node_modules/**',
    '**/i18n-en.unit.spec.ts',
    'tests/unit/**',
    'tests/config/**',
    'tests/policy.spec.ts',
    'tests/tools.spec.ts',
  ],
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    // Keep HTML artifacts but never launch the preview server (it was keeping CLI runs alive)
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['json', { outputFile: './test-results/results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: (() => {
    const allProjects = [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      // Mobile viewports
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ];

    // Local default: run only chromium to avoid multi-browser slowdown.
    // CI or explicit PLAYWRIGHT_PROJECTS runs full matrix.
    if (!requestedProjects || requestedProjects.length === 0) {
      return isCI
        ? allProjects
        : allProjects.filter((p) => p.name === 'chromium');
    }

    const selected = allProjects.filter((p) =>
      requestedProjects.includes(p.name),
    );

    // Fallback to chromium if filtering removed everything
    return selected.length > 0
      ? selected
      : allProjects.filter((p) => p.name === 'chromium');
  })(),

  /*
  Previous static matrix for reference:
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Branded channels disabled for local runs (avoid missing msedge/chrome channel)
  ],
  */

  /* Run your local dev server before starting the tests */
  webServer: {
    // Use webpack dev server to avoid Turbopack/OTel instability during Playwright
    command: 'npm run dev:webpack -- --hostname 0.0.0.0 --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased to 3 minutes for slower builds
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'playwright-secret',
      AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'playwright-secret',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      // Pass Google OAuth credentials to prevent warning logs
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
      // Skip validation in test environment (credentials loaded from .env.test)
      SKIP_ENV_VALIDATION: process.env.CI ? 'false' : 'true',
      // Allow MongoDB offline mode for tests
      ALLOW_OFFLINE_MONGODB: 'true',
      AUTH_TRUST_HOST: 'true',
      NEXTAUTH_TRUST_HOST: 'true',
      NODE_ENV: 'test',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '100',
      LOGIN_RATE_LIMIT_WINDOW_MS: '120000',
      // Reduce noise from telemetry/instrumentation in E2E
      NEXT_TELEMETRY_DISABLED: '1',
      SENTRY_SKIP_INIT: '1',
      OTEL_SDK_DISABLED: '1',
    },
  },
});
