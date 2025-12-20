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
  reporters: process.env.CI ? ["default", "junit"] : ["default"],
  outputFile: {
    junit: "reports/junit-vitest.xml",
  },
  pool: "threads",
  maxWorkers: 4,
  minWorkers: 1,
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
      // Stub server-only queues dependency for tests (real queue worker runs in Node only)
      bullmq: path.resolve(__dirname, "lib/stubs/bullmq.ts"),
    },
  },
};

export default defineConfig({
  ...sharedViteConfig,
  test: {
    // TODO: migrate to a multi-project structure when environmentMatchGlobs is removed from Vitest.
    projects: [
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: "client",
          environment: "jsdom",
          env: {
            ...sharedProjectConfig.env,
            // Disable global MongoMemoryServer for client/jsdom runs; tests that need Mongo start their own instance
            SKIP_GLOBAL_MONGO: "true",
          },
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: [
            ...baseExcludes,
            "**/server/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/api/**/*.test.{ts,tsx}",
            "tests/**/models/**/*.test.{ts,tsx}",
            "tests/models/**/*.test.{ts,tsx}",
            "tests/unit/middleware.test.ts",
            "tests/services/**/*.test.{ts,tsx}",
            "tests/**/services/**/*.test.{ts,tsx}",
            "tests/jobs/**/*.test.{ts,tsx}",
            "tests/debug/**/*.test.{ts,tsx}",
            "tests/finance/**/*.test.{ts,tsx}",
            "tests/unit/lib/**/*.test.{ts,tsx}",
            "tests/unit/returns/**/*.test.{ts,tsx}",
            "tests/vitest.config.test.ts",
          ],
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: "server",
          environment: "node",
          pool: "threads",
          include: [
            "**/server/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/api/**/*.test.{ts,tsx}",
            "tests/**/models/**/*.test.{ts,tsx}",
            "tests/models/**/*.test.{ts,tsx}",
            "tests/unit/middleware.test.ts",
            "tests/services/**/*.test.{ts,tsx}",
            "tests/**/services/**/*.test.{ts,tsx}",
            "tests/jobs/**/*.test.{ts,tsx}",
            "tests/debug/**/*.test.{ts,tsx}",
            "tests/finance/**/*.test.{ts,tsx}",
            "tests/unit/lib/**/*.test.{ts,tsx}",
            "tests/unit/returns/**/*.test.{ts,tsx}",
            "tests/vitest.config.test.ts",
          ],
          exclude: baseExcludes,
        },
      }),
    ],
  },
});
