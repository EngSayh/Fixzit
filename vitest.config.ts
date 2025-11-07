import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    globals: true,
    // default env for component/unit tests
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],  // MongoDB Memory Server for model tests (no mongoose mocks)
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // keep e2e / playwright out of vitest to avoid "queued" / long runs
    // (run those via `pnpm test:e2e` with Playwright/Jest)
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/e2e/**',
      'e2e/**',
      'qa/**',
      'playwright/**'
    ],
    // route node-only tests (server/db) to Node env to avoid Mongoose jsdom warnings
    // Vitest v3 supports per-pattern env overrides via `environmentMatchGlobs`
    environmentMatchGlobs: [
      ['**/server/**/*.test.{ts,tsx}', 'node'],
      ['tests/**/server/**/*.test.{ts,tsx}', 'node'],
      ['tests/**/api/**/*.test.{ts,tsx}', 'node'],
    ],
    // FIX: Inline next-auth to avoid CJS/ESM issues
    deps: {
      inline: [
        /next-auth/,
      ],
    },
    // stable runner settings
    reporters: ['default'], // or 'verbose' or 'dot' or 'junit'
    pool: 'threads',
    // If workers occasionally hang in CI, uncomment:
    // poolOptions: { threads: { singleThread: true } },
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
  },
});
