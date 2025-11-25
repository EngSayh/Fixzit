import { defineConfig, defineProject } from "vitest/config";
import path from "node:path";

const baseExcludes = [
  "node_modules/**",
  "dist/**",
  "coverage/**",
  "**/e2e/**",
  "e2e/**",
  "qa/**",
  "playwright/**",
  "tests/unit/api/qa/log.route.playwright.test.ts",
  "tests/unit/contexts/TranslationContext (1).test.tsx",
];

const sharedProjectConfig = {
  globals: true,
  setupFiles: ["./vitest.setup.ts"], // MongoDB Memory Server for model tests (no mongoose mocks)
  reporters: ["default"],
  pool: "threads",
  testTimeout: 600000, // 10 minutes - MongoMemoryServer initialization takes time
  hookTimeout: 120000, // 2 minutes - beforeAll/afterAll with MongoDB setup
  teardownTimeout: 30000, // 30 seconds - cleanup
  env: {
    NEXTAUTH_SECRET: "test-secret",
    AUTH_SECRET: "test-secret",
    NEXTAUTH_URL: "http://localhost:3000",
    SKIP_ENV_VALIDATION: "true",
  },
  server: {
    deps: {
      inline: ["next-auth", "next"],
    },
  },
};

const sharedViteConfig = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Vitest (ESM) sometimes struggles to resolve the extensionless "next/server" entry.
      "next/server": "next/server.js",
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
          name: "client",
          environment: "jsdom",
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: [
            ...baseExcludes,
            "**/server/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/api/**/*.test.{ts,tsx}",
          ],
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: "server",
          environment: "node",
          include: [
            "**/server/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/api/**/*.test.{ts,tsx}",
          ],
          exclude: baseExcludes,
        },
      }),
    ],
  },
});
