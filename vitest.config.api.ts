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
    environment: 'jsdom',
    // Use the legacy test setup that provides mocks (fast API/component tests)
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/e2e/**',
      'e2e/**',
      'qa/**',
      'playwright/**',
      // Exclude model tests that require MongoDB Memory Server (run those via test:models)
      'tests/unit/models/**'
    ],
    environmentMatchGlobs: [
      ['tests/**/api/**/*.test.{ts,tsx}', 'node']
    ],
    deps: { inline: [/next-auth/] },
    reporters: ['default'],
    pool: 'threads',
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
  },
});
