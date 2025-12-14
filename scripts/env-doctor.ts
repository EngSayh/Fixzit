#!/usr/bin/env tsx
/**
 * Environment Variable Doctor Script
 * 
 * Purpose: Verify canonical environment variables are set in production
 * Fails loudly if required keys are missing or only legacy aliases are present
 * 
 * Usage:
 *   pnpm exec tsx scripts/env-doctor.ts
 *   pnpm exec tsx scripts/env-doctor.ts --strict  # Fail on warnings
 * 
 * Exit Codes:
 *   0 - All checks passed
 *   1 - Critical errors found
 *   2 - Warnings found (only fails in --strict mode)
 * 
 * Note: This script uses direct process.env access intentionally to diagnose
 * environment variable configuration issues. Normal application code should
 * use the Config module from lib/config/constants.ts instead.
 */

import { Config } from "@/lib/config/constants";

// Environment detection using Config module
const isProduction = Config.env.isProduction;
const isStrictMode = process.argv.includes("--strict");

// Platform detection - minimal process.env for diagnostics only
const isVercel = process.env.VERCEL === "1";
const isCI = process.env.CI === "true";

interface CheckResult {
  key: string;
  status: "✅ OK" | "⚠️ WARNING" | "❌ ERROR";
  message: string;
  severity: "info" | "warning" | "error";
}

const results: CheckResult[] = [];

/**
 * Check if a canonical key or its aliases are set
 * This is a diagnostic function that needs to inspect process.env directly
 */
function check(
  key: string,
  aliases: string[],
  required: boolean = false
): void {
  const canonicalValue = process.env[key];
  const aliasValues = aliases
    .map((alias) => ({ alias, value: process.env[alias] }))
    .filter((a) => a.value);

  // Case 1: Canonical key is set (ideal)
  if (canonicalValue) {
    results.push({
      key,
      status: "✅ OK",
      message: `Canonical key "${key}" is set`,
      severity: "info",
    });
    return;
  }

  // Case 2: Only alias is set (warning)
  if (aliasValues.length > 0) {
    const aliasNames = aliasValues.map((a) => a.alias).join(", ");
    results.push({
      key,
      status: "⚠️ WARNING",
      message: `Only alias key(s) set: ${aliasNames}. Recommend setting canonical "${key}"`,
      severity: "warning",
    });
    return;
  }

  // Case 3: Nothing is set
  if (required && (isProduction || isStrictMode)) {
    results.push({
      key,
      status: "❌ ERROR",
      message: `Required key "${key}" is not set (checked aliases: ${aliases.join(", ")})`,
      severity: "error",
    });
  } else {
    results.push({
      key,
      status: "⚠️ WARNING",
      message: `Optional key "${key}" not set (dev/test OK)`,
      severity: "info",
    });
  }
}

// =============================================================================
// CRITICAL KEYS (P0 - Required in production)
// =============================================================================

console.log("🩺 Environment Doctor - Checking Configuration...\n");
console.log(`📍 Environment: ${Config.env.NODE_ENV}`);
console.log(`📍 Platform: ${isVercel ? "Vercel" : isCI ? "CI" : "Local"}`);
console.log(`📍 Mode: ${isStrictMode ? "STRICT" : "NORMAL"}\n`);
console.log("=".repeat(70));
console.log("CRITICAL KEYS (P0)");
console.log("=".repeat(70) + "\n");

// Auth secret (required everywhere)
check("AUTH_SECRET", ["NEXTAUTH_SECRET"], true);

// Database (required in production)
check("MONGODB_URI", ["DATABASE_URL", "MONGODB_URL", "MONGO_URL"], isProduction);

console.log("\n" + "=".repeat(70));
console.log("OPTIONAL KEYS (P1/P2)");
console.log("=".repeat(70) + "\n");

// Email (optional but recommended)
check("SENDGRID_API_KEY", ["SEND_GRID", "SEND_GRID_EMAIL_FIXZIT_TOKEN"], false);

// OAuth (optional)
check("GOOGLE_CLIENT_ID", ["OAUTH_CLIENT_GOOGLE_ID"], false);
check("GOOGLE_CLIENT_SECRET", ["OAUTH_CLIENT_GOOGLE_SECRET", "OAUTH_CLIENT_GOOGLE"], false);

// Maps (optional)
check("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", ["GOOGLE_MAPS_API_KEY"], false);

console.log("\n" + "=".repeat(70));
console.log("RESULTS SUMMARY");
console.log("=".repeat(70) + "\n");

// Print results
results.forEach((result) => {
  console.log(`${result.status} ${result.key}`);
  console.log(`   ${result.message}\n`);
});

// Count by severity
const errorCount = results.filter((r) => r.severity === "error").length;
const warningCount = results.filter((r) => r.severity === "warning").length;
const infoCount = results.filter((r) => r.severity === "info").length;

console.log("=".repeat(70));
console.log(`✅ OK: ${infoCount} | ⚠️ WARNINGS: ${warningCount} | ❌ ERRORS: ${errorCount}`);
console.log("=".repeat(70) + "\n");

// Exit logic
if (errorCount > 0) {
  console.error("❌ CRITICAL: Environment configuration has errors!");
  console.error("   Fix these issues before deploying to production.\n");
  process.exit(1);
}

if (warningCount > 0 && isStrictMode) {
  console.error("⚠️ STRICT MODE: Warnings detected!");
  console.error("   Set canonical keys to avoid platform drift.\n");
  process.exit(2);
}

if (warningCount > 0) {
  console.log("⚠️ RECOMMENDATIONS:");
  console.log("   - Set canonical keys explicitly in both GitHub Actions + Vercel");
  console.log("   - Keep alias keys temporarily for backwards compatibility");
  console.log("   - Run with --strict flag in CI to enforce canonical keys\n");
}

console.log("✅ Environment configuration looks good!");
console.log("   Run 'pnpm exec tsx scripts/env-doctor.ts --strict' in CI for enforcement.\n");

process.exit(0);
