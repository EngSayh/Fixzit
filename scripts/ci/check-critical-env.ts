#!/usr/bin/env tsx
/**
 * CI guard: fail fast when critical shared infrastructure is missing.
 * - Tap Payments keys (live/test) + webhook secret
 *
 * This runs in QA/CI, not in local dev (unless CI=true is set manually).
 * NOTE: Redis was removed from this project - no Redis checks needed.
 */

const { env } = process;
const isCI = env.CI === "true" || env.GITHUB_ACTIONS === "true";

if (!isCI) {
  console.log("[check-critical-env] Skipping (CI flag not set)");
  process.exit(0);
}

const violations: string[] = [];
const warnings: string[] = [];

// Tap Payments - STRICT check (payment infrastructure is critical)
const tapEnvIsLive = env.TAP_ENVIRONMENT === "live" || env.VERCEL_ENV === "production";
const tapSecretKey = tapEnvIsLive ? env.TAP_LIVE_SECRET_KEY : env.TAP_TEST_SECRET_KEY;
const tapPublicKey = tapEnvIsLive ? env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY : env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY;
const tapWebhook = env.TAP_WEBHOOK_SECRET;

if (!tapSecretKey || !tapPublicKey || !tapWebhook) {
  violations.push(
    `Tap Payments not fully configured for ${tapEnvIsLive ? "live" : "test"}: ` +
      `${tapPublicKey ? "" : "NEXT_PUBLIC_TAP_* missing; "}` +
      `${tapSecretKey ? "" : "TAP_*_SECRET_KEY missing; "}` +
      `${tapWebhook ? "" : "TAP_WEBHOOK_SECRET missing"}`
  );
}

if (violations.length > 0) {
  console.error("❌ Critical env validation failed:");
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠️ Env warnings:");
  for (const w of warnings) console.warn(` - ${w}`);
}

console.log("✅ Critical env checks passed.");
