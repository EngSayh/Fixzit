/**
 * Superadmin Diagnostic Endpoint
 * 
 * Returns a sanitized view of superadmin configuration status.
 * SECURITY: Only returns boolean flags, never actual values.
 * 
 * @module app/api/superadmin/diag/route
 */

import { NextRequest, NextResponse } from "next/server";
import { hasJwtSecretConfigured } from "@/lib/superadmin/auth.edge";

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

export async function GET(request: NextRequest) {
  // Only allow in non-production or with specific header
  const isProd = process.env.VERCEL_ENV === "production" || 
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);
  
  const diagKey = request.headers.get("x-diag-key");
  const expectedKey = process.env.INTERNAL_API_SECRET;
  
  if (isProd && (!expectedKey || diagKey !== expectedKey)) {
    return NextResponse.json(
      { error: "Forbidden - diagnostic endpoint requires x-diag-key header in production" },
      { status: 403, headers: ROBOTS_HEADER }
    );
  }

  const diag = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      VERCEL_URL: process.env.VERCEL_URL ? "set" : "missing",
    },
    superadmin: {
      // Authentication secrets (boolean only - never expose values)
      hasJwtSecret: hasJwtSecretConfigured(),
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasSuperadminJwtSecret: !!process.env.SUPERADMIN_JWT_SECRET,
      
      // Password configuration
      hasPasswordHash: !!process.env.SUPERADMIN_PASSWORD_HASH,
      hasPasswordPlaintext: !!process.env.SUPERADMIN_PASSWORD,
      passwordConfigured: !!(process.env.SUPERADMIN_PASSWORD_HASH || process.env.SUPERADMIN_PASSWORD),
      
      // Org ID configuration
      hasSuperadminOrgId: !!process.env.SUPERADMIN_ORG_ID,
      hasPublicOrgId: !!process.env.PUBLIC_ORG_ID,
      hasDefaultOrgId: !!process.env.DEFAULT_ORG_ID,
      hasTestOrgId: !!process.env.TEST_ORG_ID,
      orgIdConfigured: !!(
        process.env.SUPERADMIN_ORG_ID ||
        process.env.PUBLIC_ORG_ID ||
        process.env.DEFAULT_ORG_ID ||
        process.env.TEST_ORG_ID
      ),
      
      // Optional security features
      hasSecretKey: !!process.env.SUPERADMIN_SECRET_KEY,
      hasAllowedIps: !!process.env.SUPERADMIN_ALLOWED_IPS,
      hasUsername: !!process.env.SUPERADMIN_USERNAME,
    },
    recommendations: [] as string[],
  };

  // Add recommendations based on missing config
  if (!diag.superadmin.hasJwtSecret) {
    diag.recommendations.push(
      "CRITICAL: No JWT secret found. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET."
    );
  }
  
  if (!diag.superadmin.passwordConfigured) {
    diag.recommendations.push(
      "CRITICAL: No password configured. Set SUPERADMIN_PASSWORD_HASH (recommended) or SUPERADMIN_PASSWORD."
    );
  }
  
  if (!diag.superadmin.orgIdConfigured) {
    diag.recommendations.push(
      "CRITICAL: No org ID configured. Set SUPERADMIN_ORG_ID, PUBLIC_ORG_ID, or DEFAULT_ORG_ID."
    );
  }

  if (diag.superadmin.hasPasswordPlaintext && !diag.superadmin.hasPasswordHash) {
    diag.recommendations.push(
      "SECURITY: Using plaintext password. Consider using SUPERADMIN_PASSWORD_HASH for production."
    );
  }

  return NextResponse.json(diag, { headers: ROBOTS_HEADER });
}
