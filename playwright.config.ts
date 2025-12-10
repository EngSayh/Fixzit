import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import crypto from 'node:crypto';

const isCI = !!process.env.CI;
const requestedProjects = process.env.PLAYWRIGHT_PROJECTS
  ?.split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const ARTIFACTS_DIR = path.join(__dirname, '_artifacts/playwright');
const RESULTS_DIR = path.join(ARTIFACTS_DIR, 'results');

// 🔐 Resolve a non-guessable auth secret for Playwright runs
const resolvedAuthSecret = (() => {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  if (process.env.AUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
    return process.env.AUTH_SECRET;
  }

  if (isCI) {
    throw new Error('NEXTAUTH_SECRET or AUTH_SECRET is required for Playwright in CI.');
  }

  // Local/dev convenience: generate a strong secret per run (no static fallback)
  const generated = crypto.randomBytes(32).toString('hex');
  process.env.NEXTAUTH_SECRET = generated;
  process.env.AUTH_SECRET = generated;
  return generated;
})();

const useBuild = process.env.PW_USE_BUILD === 'true';
const ROOT_DIR = path.resolve(__dirname);
const DEFAULT_HOST = process.env.PW_HOSTNAME || '127.0.0.1';
const DEFAULT_PORT = process.env.PW_PORT || '3100';
const WEB_COMMAND = process.env.PW_WEB_SERVER
  ? process.env.PW_WEB_SERVER
  : useBuild
    ? `sh -c "cd ${ROOT_DIR} && mkdir -p .next/standalone/.next && cp -R .next/static .next/standalone/.next/static 2>/dev/null || true; cp -R public .next/standalone/public 2>/dev/null || true; NEXT_OUTPUT=standalone HOSTNAME=${DEFAULT_HOST} PORT=${DEFAULT_PORT} node .next/standalone/server.js"`
    : `cd ${ROOT_DIR} && npm run dev:webpack -- --hostname ${DEFAULT_HOST} --port ${DEFAULT_PORT}`;
const WEB_URL = process.env.PW_WEB_URL || `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;

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
  globalSetup: path.join(__dirname, 'tests/setup-auth.ts'),
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
    ['html', { outputFolder: path.join(ARTIFACTS_DIR, 'html-report'), open: 'never' }],
    ['json', { outputFile: path.join(RESULTS_DIR, 'results.json') }],
    ['list']
  ],
  // Centralize Playwright artifacts away from tracked source folders (absolute to avoid config-dir drift)
  outputDir: RESULTS_DIR,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: WEB_URL,
    storageState: 'tests/state/superadmin.json',
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

  /* Run your local dev server before starting the tests */
  webServer: {
    // Command is configurable so CI can prefer `pnpm start` after a build
    command: WEB_COMMAND,
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased to 3 minutes for slower builds
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PLAYWRIGHT: 'true',
      NODE_ENV: useBuild ? 'production' : 'test',
      PORT: process.env.PW_PORT || DEFAULT_PORT,
      HOSTNAME: process.env.PW_HOSTNAME || DEFAULT_HOST,
      NEXTAUTH_SECRET: resolvedAuthSecret,
      AUTH_SECRET: resolvedAuthSecret,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || WEB_URL,
      CORS_ORIGINS: process.env.CORS_ORIGINS || WEB_URL,
      // Pass Google OAuth credentials to prevent warning logs
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
      // Skip validation in test environment (credentials loaded from .env.test)
      SKIP_ENV_VALIDATION: process.env.CI ? 'false' : 'true',
      // Allow MongoDB offline mode for tests
      ALLOW_OFFLINE_MONGODB: 'true',
      AUTH_TRUST_HOST: 'true',
      NEXTAUTH_TRUST_HOST: 'true',
      LOGIN_RATE_LIMIT_MAX_ATTEMPTS: '100',
      LOGIN_RATE_LIMIT_WINDOW_MS: '120000',
      // Reduce noise from telemetry/instrumentation in E2E
      NEXT_TELEMETRY_DISABLED: '1',
      SENTRY_SKIP_INIT: '1',
      OTEL_SDK_DISABLED: '1',
    },
  },
});
