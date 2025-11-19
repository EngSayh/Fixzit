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
];

const sharedProjectConfig = {
  globals: true,
  setupFiles: ['./vitest.setup.ts'], // MongoDB Memory Server for model tests (no mongoose mocks)
  reporters: ['default'],
  pool: 'threads',
  testTimeout: 30000,
  hookTimeout: 15000,
  teardownTimeout: 5000,
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
