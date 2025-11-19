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
    environment: 'node',
    // Use the setup that starts MongoDB Memory Server and connects real mongoose
    setupFiles: ['./vitest.setup.ts'],
    // Only run model unit tests under this config to avoid running the full
    // suite (which includes jsdom/API tests and mocked setups) while the
    // MongoDB Memory Server is active.
    include: ['tests/unit/models/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/e2e/**',
      'e2e/**',
      'qa/**',
      'playwright/**'
    ],
    reporters: ['default'],
    pool: 'threads',
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
  },
});
