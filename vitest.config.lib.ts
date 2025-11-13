import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for pure library/utility tests
 * 
 * These tests don't require:
 * - MongoDB Memory Server
 * - React Testing Library
 * - Next.js mocks
 * - Database connections
 * 
 * Use this config for testing pure functions in lib/utils/
 * 
 * Example:
 *   npx vitest run tests/unit/lib/parse.test.ts --config vitest.config.lib.ts
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // NO setupFiles - pure utility tests don't need MongoDB or React mocks
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
