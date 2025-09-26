import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.tsx"],
    environment: "jsdom",
    environmentMatchGlobs: [
      ["tests/server/**", "node"],
    ],
    setupFiles: ["./tests/vitest.setup.ts"],
    typecheck: {
      tsconfig: "tsconfig.vitest.json",
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: '_artifacts/coverage',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'playwright.config.ts',
        'scripts/**',
        '_artifacts/**',
      ],
      thresholds: {
        global: {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/server": path.resolve(__dirname, "src/server"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@components": path.resolve(__dirname, "components"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@schemas": path.resolve(__dirname, "src/schemas"),
      "@types": path.resolve(__dirname, "src/types"),
      "@utils": path.resolve(__dirname, "src/utils"),
    },
  },
});
