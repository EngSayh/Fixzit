#!/usr/bin/env node
/**
 * Preflight check for required test env vars.
 * Fails fast if any are missing.
 */

const REQUIRED = [
  "FIXZIT_TEST_ADMIN_PASSWORD",
  "NEXTAUTH_SECRET",
  // Allow AUTH_SECRET as alternate; handled below
  "E2E_TEST_PASSWORD",
  "DEMO_SUPERADMIN_PASSWORD",
  "DEMO_DEFAULT_PASSWORD",
];

function ensure(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required env: ${name}`);
  }
}

try {
  REQUIRED.forEach(ensure);
  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    throw new Error("Missing NEXTAUTH_SECRET or AUTH_SECRET");
  }
  console.log("✅ All required test env vars are set.");
} catch (err) {
  console.error(`❌ Env check failed: ${err.message}`);
  process.exit(1);
}
