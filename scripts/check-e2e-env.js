#!/usr/bin/env node
/**
 * CI/local preflight: ensure required secrets/env are present before running Playwright/QA
 */

const required = ["NEXTAUTH_SECRET", "AUTH_SECRET", "FIXZIT_TEST_ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("❌ Missing required env vars for E2E/QA:");
  missing.forEach((key) => console.error(` - ${key}`));
  process.exit(1);
}

console.log("✅ Required E2E/QA env vars present.");
