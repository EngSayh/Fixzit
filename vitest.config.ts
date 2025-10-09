import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Changed from 'node' to support React component tests
    setupFiles: ['./vitest.setup.ts'],
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
