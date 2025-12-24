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
      inline: ["next-auth", "next", "ai"],
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
          include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
          exclude: [
            ...baseExcludes,
            // Playwright spec files (run via pnpm playwright test)
            "tests/e2e/**/*.spec.{ts,tsx}",
            "tests/smoke/**/*.spec.{ts,tsx}",
            "tests/specs/**/*.spec.{ts,tsx}",
            "tests/copilot/**/*.spec.{ts,tsx}",
            "tests/config/**/*.spec.{ts,tsx}",
            "tests/*.spec.{ts,tsx}",
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
          // Use forks instead of threads for complete process isolation (fixes mock contamination)
          pool: "forks",
          // Enable module isolation to prevent mock contamination between test files
          isolate: true,
          // Use single fork to prevent flaky tests from module cache contamination
          // TODO: Convert all test files to static imports (TESTING_STRATEGY.md pattern)
          // then enable parallel forks for faster CI runs
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          include: [
            "**/server/**/*.test.{ts,tsx}",
            "**/server/**/*.spec.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.spec.{ts,tsx}",
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
            "tests/unit/lib/**/*.spec.{ts,tsx}",
            "tests/unit/returns/**/*.test.{ts,tsx}",
            "tests/vitest.config.test.ts",
            // Non-Playwright Vitest spec files
            "tests/policy.spec.ts",
            "tests/tools.spec.ts",
            "tests/unit/src_lib_utils.spec.ts",
          ],
          exclude: [
            ...baseExcludes,
            // Playwright spec files (run via pnpm playwright test)
            "tests/e2e/**/*.spec.{ts,tsx}",
            "tests/smoke/**/*.spec.{ts,tsx}",
            "tests/specs/**/*.spec.{ts,tsx}",
            "tests/copilot/**/*.spec.{ts,tsx}",
            "tests/config/**/*.spec.{ts,tsx}",
            "tests/*.smoke.spec.{ts,tsx}",
            "tests/*.e2e.spec.{ts,tsx}",
            "tests/copilot.spec.ts",
            "tests/hfv.e2e.spec.ts",
            "tests/marketplace.smoke.spec.ts",
          ],
        },
      }),
    ],
  },
});
