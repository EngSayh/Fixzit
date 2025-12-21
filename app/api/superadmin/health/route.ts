/**
 * Superadmin Health Check API
 * Returns configuration status WITHOUT exposing secrets
 * 
 * Used to diagnose login failures in production.
 * 
 * @module app/api/superadmin/health/route
 */

import { NextResponse } from "next/server";

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

export async function GET() {
  // Check each required configuration
  const hasUsername = !!process.env.SUPERADMIN_USERNAME;
  const hasPasswordHash = !!process.env.SUPERADMIN_PASSWORD_HASH;
  const hasPlainPassword = !!process.env.SUPERADMIN_PASSWORD;
  const hasSecretKey = !!process.env.SUPERADMIN_SECRET_KEY;
  
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
        secondFactor: hasSecretKey ? "required" : "disabled",
        ipRestriction: hasIpRestriction ? "enabled" : "disabled",
      },
      issues: issues.length > 0 ? issues : undefined,
    },
    { headers: ROBOTS_HEADER }
  );
}
