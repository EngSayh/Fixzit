/**
 * Superadmin Debug Endpoint
 * For diagnosing session/cookie issues
 * 
 * @module app/api/superadmin/debug/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession, SUPERADMIN_COOKIE_NAME } from "@/lib/superadmin/auth";

export async function GET(request: NextRequest) {
  // Security: Only allow in development/preview, not production
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  
  // Get diagnostic info
  const cookies = request.cookies.getAll();
  const cookieNames = cookies.map(c => c.name);
  const hasSuperadminCookie = cookies.some(c => c.name === SUPERADMIN_COOKIE_NAME);
  const superadminCookieValue = request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
  
  let session = null;
  let sessionError = null;
  
  try {
    session = await getSuperadminSession(request);
  } catch (error) {
    sessionError = error instanceof Error ? error.message : String(error);
  }
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    cookies: {
      allCookieNames: cookieNames,
      hasSuperadminCookie,
      superadminCookieLength: superadminCookieValue?.length || 0,
      // Don't expose actual token value
    },
    session: session ? {
      hasSession: true,
      username: session.username,
      role: session.role,
      orgId: session.orgId ? `${session.orgId.substring(0, 4)}...` : null,
      issuedAt: new Date(session.issuedAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      isExpired: session.expiresAt < Date.now(),
    } : {
      hasSession: false,
      error: sessionError,
    },
    envVarsConfigured: {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasSuperadminJwtSecret: !!process.env.SUPERADMIN_JWT_SECRET,
      hasPublicOrgId: !!process.env.PUBLIC_ORG_ID,
      hasDefaultOrgId: !!process.env.DEFAULT_ORG_ID,
      hasSuperadminOrgId: !!process.env.SUPERADMIN_ORG_ID,
      // Secret lengths for debugging (safe - no actual values)
      nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
      superadminJwtSecretLength: process.env.SUPERADMIN_JWT_SECRET?.length || 0,
      // Secret fingerprint: redacted by default, HMAC-based when ENABLE_SECRET_FINGERPRINT=true
      secretFingerprint: 'redacted',
    },
  };
  
  // In production, still show diagnostic info (endpoint is IP-restricted by middleware)
  // but redact sensitive values
  if (isProduction) {
    return NextResponse.json({
      timestamp: diagnostics.timestamp,
      environment: diagnostics.environment,
      session: diagnostics.session,
      cookiePresent: hasSuperadminCookie,
      cookieCount: cookies.length,
      envVars: {
        hasJwtSecret: diagnostics.envVarsConfigured.hasNextAuthSecret || 
                      diagnostics.envVarsConfigured.hasAuthSecret || 
                      diagnostics.envVarsConfigured.hasSuperadminJwtSecret,
        hasOrgId: diagnostics.envVarsConfigured.hasPublicOrgId || 
                  diagnostics.envVarsConfigured.hasDefaultOrgId ||
                  diagnostics.envVarsConfigured.hasSuperadminOrgId,
      },
    }, {
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  
  return NextResponse.json(diagnostics, {
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
