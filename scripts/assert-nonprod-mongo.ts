#!/usr/bin/env tsx
/**
 * @fileoverview MongoDB Non-Production Safety Guard
 * @description Prevents CI/Preview environments from accidentally connecting to production databases.
 * This script MUST be run before any database operations in CI pipelines.
 *
 * @usage
 * - CI: `pnpm tsx scripts/assert-nonprod-mongo.ts`
 * - Pre-index: Called before createIndexes in build-sourcemaps.yml
 *
 * @exit-codes
 * - 0: Safe (non-production database confirmed)
 * - 1: UNSAFE (production database detected or validation failed)
 *
 * @module scripts/assert-nonprod-mongo
 */

const PRODUCTION_PATTERNS = [
  // Cluster name patterns
  /fixzit-prod/i,
  /production/i,
  /prod-cluster/i,
  /fixzit\.mongodb\.net(?!.*staging)/i,
  // Database name patterns
  /\/fixzit-prod/i,
  /\/production/i,
  /\/fixzit$/i, // bare "fixzit" db is likely prod
];

const SAFE_PATTERNS = [
  /staging/i,
  /dev/i,
  /test/i,
  /ci-/i,
  /preview/i,
  /local/i,
  /127\.0\.0\.1/,
  /localhost/,
  /memory/i, // MongoMemoryServer
];

interface ValidationResult {
  safe: boolean;
  reason: string;
  uri: string;
  environment: string;
}

function maskUri(uri: string): string {
  // Mask credentials in URI for logging
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://***:***@");
}

function validateMongoUri(): ValidationResult {
  const uri = process.env.MONGODB_URI || "";
  const nodeEnv = process.env.NODE_ENV || "development";
  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const isVercelPreview = process.env.VERCEL_ENV === "preview";

  // No URI = nothing to validate
  if (!uri) {
    return {
      safe: true,
      reason: "No MONGODB_URI set - skipping validation",
      uri: "(not set)",
      environment: nodeEnv,
    };
  }

  const maskedUri = maskUri(uri);

  // Check for production patterns
  for (const pattern of PRODUCTION_PATTERNS) {
    if (pattern.test(uri)) {
      // Allow production URI only in actual production environment
      if (nodeEnv === "production" && !isCI && !isVercelPreview) {
        return {
          safe: true,
          reason: `Production pattern detected, but NODE_ENV=production and not CI/preview`,
          uri: maskedUri,
          environment: nodeEnv,
        };
      }

      return {
        safe: false,
        reason: `PRODUCTION DATABASE DETECTED in CI/Preview! Pattern matched: ${pattern}`,
        uri: maskedUri,
        environment: nodeEnv,
      };
    }
  }

  // Check for explicitly safe patterns
  for (const pattern of SAFE_PATTERNS) {
    if (pattern.test(uri)) {
      return {
        safe: true,
        reason: `Safe pattern detected: ${pattern}`,
        uri: maskedUri,
        environment: nodeEnv,
      };
    }
  }

  // CI/Preview with unknown URI = FAIL SAFE
  if (isCI || isVercelPreview) {
    return {
      safe: false,
      reason: `CI/Preview detected but URI does not match known safe patterns. Add staging/dev/test to DB name.`,
      uri: maskedUri,
      environment: nodeEnv,
    };
  }

  // Local dev with unknown URI = warn but allow
  return {
    safe: true,
    reason: `Local development - unknown pattern but allowing (add staging/dev/test for clarity)`,
    uri: maskedUri,
    environment: nodeEnv,
  };
}

function main(): void {
  console.log("🔒 MongoDB Non-Production Safety Check");
  console.log("=".repeat(50));

  const result = validateMongoUri();

  console.log(`Environment: ${result.environment}`);
  console.log(`CI: ${process.env.CI || "false"}`);
  console.log(`GitHub Actions: ${process.env.GITHUB_ACTIONS || "false"}`);
  console.log(`Vercel Env: ${process.env.VERCEL_ENV || "(not set)"}`);
  console.log(`URI (masked): ${result.uri}`);
  console.log("");

  if (result.safe) {
    console.log(`✅ SAFE: ${result.reason}`);
    process.exit(0);
  } else {
    console.error(`❌ UNSAFE: ${result.reason}`);
    console.error("");
    console.error("🚨 BLOCKING OPERATION - This check prevents accidental production writes.");
    console.error("   If this is a false positive, update PRODUCTION_PATTERNS or SAFE_PATTERNS");
    console.error("   in scripts/assert-nonprod-mongo.ts");
    process.exit(1);
  }
}

main();
