import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Default for React component tests
    setupFiles: ['./vitest.setup.ts', './tests/setup.ts'],
    
    // Match test environment to file type
    environmentMatchGlobs: [
      // Backend tests need Node environment (models, server logic, API routes)
      ['**/*.test.ts', 'node'],
      ['**/server/**/*.test.ts', 'node'],
      ['**/models/**/*.test.ts', 'node'],
      ['**/lib/**/*.test.ts', 'node'],
      ['**/db/**/*.test.ts', 'node'],
      ['**/api/**/*.test.ts', 'node'],
      
      // Component tests need jsdom (browser simulation)
      ['**/*.test.tsx', 'jsdom'],
      ['**/app/**/*.test.tsx', 'jsdom'],
      ['**/components/**/*.test.tsx', 'jsdom'],
    ],
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
