import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "next/server": path.resolve(
        __dirname,
        "tests/vitest-stubs/next-server.ts",
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    deps: {
      inline: ["next-auth"],
    },
    env: {
      NEXTAUTH_SECRET: "test-secret",
      AUTH_SECRET: "test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    },
    // Use the setup that starts MongoDB Memory Server and connects real mongoose
    setupFiles: ["./vitest.setup.ts"],
    // Only run model unit tests under this config to avoid running the full
    // suite (which includes jsdom/API tests and mocked setups) while the
    // MongoDB Memory Server is active.
    include: ["tests/unit/models/**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "**/e2e/**",
      "e2e/**",
      "qa/**",
      "playwright/**",
    ],
    reporters: ["default"],
    pool: "threads",
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
  },
});
