import { defineConfig, defineProject } from 'vitest/config';
import path from 'node:path';

const baseExcludes = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  '**/e2e/**',
  'e2e/**',
  'qa/**',
  'playwright/**',
  'tests/unit/api/qa/log.route.playwright.test.ts',
  // Exclude model tests that require MongoDB Memory Server (run those via test:models)
  'tests/unit/models/**',
];

const sharedProjectConfig = {
  globals: true,
  reporters: ['default'],
  pool: 'threads',
  testTimeout: 600000, // 10 minutes - MongoMemoryServer tests need extended timeout
  hookTimeout: 120000, // 2 minutes - MongoDB Memory Server setup/teardown
  teardownTimeout: 30000, // 30 seconds - cleanup connections
};

const sharedViteConfig = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
};

export default defineConfig({
  ...sharedViteConfig,
  test: {
    projects: [
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./tests/setup.ts'],
          include: ['**/*.test.ts', '**/*.test.tsx'],
          exclude: [
            ...baseExcludes,
            'tests/**/api/**/*.test.{ts,tsx}',
          ],
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: 'api',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          include: ['tests/**/api/**/*.test.{ts,tsx}'],
          exclude: baseExcludes,
        },
      }),
    ],
  },
});
