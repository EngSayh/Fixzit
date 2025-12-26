/**
 * Superadmin Health Check API
 * Returns configuration status WITHOUT exposing secrets
 * 
 * Used to diagnose login failures in production.
 * This endpoint is accessible pre-auth but protected by:
 * - IP allowlist (if configured, enforced by middleware)
 * - Optional access key header (x-superadmin-access-key)
 * 
 * @module app/api/superadmin/health/route
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const NO_CACHE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export async function GET(request: NextRequest) {
  // In production, require access key to prevent config state disclosure
  const isProduction = process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);
  const secretKey = process.env.SUPERADMIN_SECRET_KEY;
  
  // Always require access key in production; optional in dev/preview if key is set
  if (isProduction || secretKey) {
    const providedKey = request.headers.get('x-superadmin-access-key');
    if (!providedKey) {
      return NextResponse.json(
        { error: "Access key required", code: "ACCESS_KEY_REQUIRED" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }
    // If secret key is configured, validate it
    if (secretKey && !timingSafeEquals(providedKey, secretKey)) {
      return NextResponse.json(
        { error: "Invalid access key", code: "INVALID_ACCESS_KEY" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }
  }
  // Check each required configuration
  const hasUsername = !!process.env.SUPERADMIN_USERNAME;
  const hasPasswordHash = !!process.env.SUPERADMIN_PASSWORD_HASH;
  const hasPlainPassword = !!process.env.SUPERADMIN_PASSWORD;
  
  // Check org ID chain
  const hasSuperadminOrgId = !!process.env.SUPERADMIN_ORG_ID?.trim();
  const hasPublicOrgId = !!process.env.PUBLIC_ORG_ID?.trim();
  const hasDefaultOrgId = !!process.env.DEFAULT_ORG_ID?.trim();
  const hasTestOrgId = !!process.env.TEST_ORG_ID?.trim();
  const hasAnyOrgId = hasSuperadminOrgId || hasPublicOrgId || hasDefaultOrgId || hasTestOrgId;
  
  // Check JWT secret chain
  const hasSuperadminJwtSecret = !!process.env.SUPERADMIN_JWT_SECRET;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const hasAuthSecret = !!process.env.AUTH_SECRET;
  const hasAnyJwtSecret = hasSuperadminJwtSecret || hasNextAuthSecret || hasAuthSecret;
  
  // IP allowlist check
  const ipAllowlist = process.env.SUPERADMIN_IP_ALLOWLIST;
  const hasIpRestriction = !!ipAllowlist && ipAllowlist.trim().length > 0;
  
  // Determine status
  const passwordConfigured = hasPasswordHash || hasPlainPassword;
  const canAuthenticate = passwordConfigured && hasAnyOrgId;
  
  const issues: string[] = [];
  
  if (!passwordConfigured) {
    issues.push("SUPERADMIN_PASSWORD or SUPERADMIN_PASSWORD_HASH not set");
  }
  if (!hasAnyOrgId) {
    issues.push("No org ID configured (need SUPERADMIN_ORG_ID, PUBLIC_ORG_ID, DEFAULT_ORG_ID, or TEST_ORG_ID)");
  }
  if (!hasAnyJwtSecret) {
    issues.push("No JWT secret found (will use insecure fallback)");
  }
  
  return NextResponse.json(
    {
      status: canAuthenticate ? "ready" : "misconfigured",
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      config: {
        username: hasUsername ? "custom" : "default (superadmin)",
        password: hasPasswordHash 
          ? "hash_configured" 
          : hasPlainPassword 
            ? "plain_configured" 
            : "NOT_SET",
        orgId: hasSuperadminOrgId 
          ? "superadmin_org_id" 
          : hasPublicOrgId 
            ? "public_org_id" 
            : hasDefaultOrgId 
              ? "default_org_id" 
              : hasTestOrgId
                ? "test_org_id"
                : "NOT_SET",
        jwtSecret: hasSuperadminJwtSecret 
          ? "superadmin_jwt_secret" 
          : hasNextAuthSecret 
            ? "nextauth_secret" 
            : hasAuthSecret
              ? "auth_secret"
              : "INSECURE_FALLBACK",
        secondFactor: secretKey ? "required" : "disabled",
        ipRestriction: hasIpRestriction ? "enabled" : "disabled",
      },
      issues: issues.length > 0 ? issues : undefined,
    },
    { headers: NO_CACHE_HEADERS }
  );
}
