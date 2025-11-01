import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Default for React component tests
    
    // ✅ CRITICAL FIX: Only load vitest.setup.ts (contains comprehensive mocks)
    // Removed tests/setup.ts to avoid duplicate next/navigation mocks
    setupFiles: ['./vitest.setup.ts'],
    
    // ❌ REMOVED: environmentMatchGlobs (deprecated)
    // Tests that need Node environment should use:
    // import { describe, it } from 'vitest';
    // describe.skip('needs node env', () => { ... }); 
    // or configure environment: 'node' in the test file
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/types': path.resolve(__dirname, './types'),
      '@/server': path.resolve(__dirname, './server'),
      '@/components': path.resolve(__dirname, './components'),
      '@/i18n': path.resolve(__dirname, './i18n'),
    },
  },
});
