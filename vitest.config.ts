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
  'tests/unit/contexts/TranslationContext (1).test.tsx',
];

const sharedProjectConfig = {
  globals: true,
  setupFiles: ['./vitest.setup.ts'], // MongoDB Memory Server for model tests (no mongoose mocks)
  reporters: ['default'],
  pool: 'threads',
  testTimeout: 600000, // 10 minutes - MongoMemoryServer initialization takes time
  hookTimeout: 120000, // 2 minutes - beforeAll/afterAll with MongoDB setup
  teardownTimeout: 30000, // 30 seconds - cleanup
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
          name: 'client',
          environment: 'jsdom',
          include: ['**/*.test.ts', '**/*.test.tsx'],
          exclude: [
            ...baseExcludes,
            '**/server/**/*.test.{ts,tsx}',
            'tests/**/server/**/*.test.{ts,tsx}',
            'tests/**/api/**/*.test.{ts,tsx}',
          ],
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: 'server',
          environment: 'node',
          include: [
            '**/server/**/*.test.{ts,tsx}',
            'tests/**/server/**/*.test.{ts,tsx}',
            'tests/**/api/**/*.test.{ts,tsx}',
          ],
          exclude: baseExcludes,
        },
      }),
    ],
  },
});
