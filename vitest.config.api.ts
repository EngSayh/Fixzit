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
  // Exclude model tests that require MongoDB Memory Server (run those via test:models)
  "tests/unit/models/**",
  // Exclude finance encryption tests (require real MongoDB via MongoMemoryServer)
  "tests/unit/finance/finance-encryption.test.ts",
];

// Tests that require MongoDB and should not run in jsdom environment
const mongoRequiredTests = [
  "tests/services/inventory-service.test.ts",
  "tests/services/seller-kyc-service.test.ts",
  "tests/services/buybox-service.test.ts",
  "tests/services/fulfillment-service.test.ts",
  "tests/services/returns-service.test.ts",
  "tests/services/account-health-service.test.ts",
  "tests/unit/finance/**",
];

// Tests that require Node.js environment (not jsdom)
const nodeOnlyTests = [
  "tests/unit/middleware.test.ts",
  "tests/unit/marketplace/context.test.ts",
  "tests/unit/server/**/*.test.{ts,tsx}",
  "tests/server/**/*.test.{ts,tsx}",
  "tests/unit/lib/mongo.test.ts",
  "tests/unit/lib/**/*.test.{ts,tsx}",
  "tests/unit/server/services/**/*.test.{ts,tsx}",
  "tests/unit/server/config/**/*.test.{ts,tsx}",
  "tests/debug/**/*.test.{ts,tsx}",
  "tests/finance/unit/**/*.test.{ts,tsx}",
  "tests/services/**/*.test.{ts,tsx}",
  "tests/unit/services/**/*.test.{ts,tsx}",
  "tests/unit/lib/db/**/*.test.{ts,tsx}",
  // Queue tests rely on Node-only stubs and Mongo; keep them out of jsdom runs
  "tests/unit/lib/queues/*.test.{ts,tsx}",
  "tests/unit/lib/queues/**/*.test.{ts,tsx}",
  "tests/unit/lib/sms-queue.test.ts",
  "tests/services/souq/settlements/payout-processor.test.ts",
  "tests/unit/returns/**/*.test.{ts,tsx}",
  "tests/vitest.config.test.ts",
];

const sharedProjectConfig = {
  globals: true,
  reporters: ["default"],
  pool: "threads",
  testTimeout: 600000, // 10 minutes - MongoMemoryServer tests need extended timeout
  hookTimeout: 120000, // 2 minutes - MongoDB Memory Server setup/teardown
  teardownTimeout: 30000, // 30 seconds - cleanup connections
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
      "next/server": "next/server.js",
      // Stub bullmq in non-node pools
      bullmq: path.resolve(__dirname, "lib/stubs/bullmq.ts"),
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
          name: "ui",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: [
            ...baseExcludes,
            ...mongoRequiredTests,
            ...nodeOnlyTests,
            "tests/**/api/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/server/**/*.test.{ts,tsx}",
          ],
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: "server",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            ...nodeOnlyTests,
            "tests/**/api/**/*.test.{ts,tsx}",
            "tests/**/server/**/*.test.{ts,tsx}",
            "tests/**/models/**/*.test.{ts,tsx}",
            "tests/models/**/*.test.{ts,tsx}",
            "tests/unit/middleware.test.ts",
            "tests/unit/middleware-edge-cases.test.ts",
          ],
          exclude: baseExcludes,
        },
      }),
      defineProject({
        ...sharedViteConfig,
        test: {
          ...sharedProjectConfig,
          name: "api",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "tests/**/api/**/*.test.{ts,tsx}",
            "tests/**/app/api/**/*.test.{ts,tsx}", // app router API tests
          ],
          exclude: baseExcludes,
        },
      }),
    ],
  },
});
