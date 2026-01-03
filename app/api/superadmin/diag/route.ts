/**
 * Superadmin Diagnostic Endpoint
 * 
 * Returns a sanitized view of superadmin configuration status.
 * SECURITY: Only returns boolean flags, never actual values.
 * 
 * @module app/api/superadmin/diag/route
 * @route GET /api/superadmin/diag
 * @access
 *   - Non-production: accessible without authentication (intended for local/dev diagnostics).
 *   - Production/Preview: requires `x-diag-key` header matching `process.env.INTERNAL_API_SECRET`.
 * @returns {Promise<import("next/server").NextResponse>} JSON response with shape:
 *   {
 *     timestamp: string; // ISO-8601 timestamp when diagnostics were generated
 *     environment: {
 *       NODE_ENV: string | undefined;
 *       VERCEL_ENV: string | null;
 *       VERCEL_URL: "set" | "missing";
 *     };
 *     superadmin: {
 *       hasJwtSecret: boolean;
 *       hasNextAuthSecret: boolean;
 *       hasAuthSecret: boolean;
 *       hasSuperadminJwtSecret: boolean;
 *       hasPasswordHash: boolean;
 *       hasPasswordPlaintext: boolean;
 *       passwordConfigured: boolean;
 *       hasSuperadminOrgId: boolean;
 *       hasPublicOrgId: boolean;
 *       hasDefaultOrgId: boolean;
 *       hasTestOrgId: boolean;
 *       orgIdConfigured: boolean;
 *       hasSecretKey: boolean;
 *       hasAllowedIps: boolean;
 *       hasUsername: boolean;
 *     };
 *     recommendations: string[];
 *   }
 *   All fields are derived from process.env and never include raw secret values.
 * @throws
 *   - 403 Forbidden: when running in production/preview and `x-diag-key` is missing or does not
 *     match `process.env.INTERNAL_API_SECRET`. Response body includes an `error` message.
 *   - 429 Too Many Requests: when rate limit is exceeded.
 *   - 500 Internal Server Error: any unexpected runtime failure surfaced by the framework.
 * @security
 *   - Only exposes boolean flags or "set"/"missing" indicators for configuration values.
 *   - Never returns secret or credential values directly.
 *   - Production/preview access is gated by a shared secret in the `x-diag-key` header.
 *   - Responses include `X-Robots-Tag: noindex, nofollow` to prevent search engine indexing.
 *   - Rate limited to 10 requests per 60 seconds per IP.
 *   - All access attempts are audit-logged.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { hasJwtSecretConfigured } from "@/lib/superadmin/auth.edge";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/**
 * GET /api/superadmin/diag
 * 
 * Returns diagnostic information about superadmin configuration.
 * Protected by x-diag-key header in production/preview environments.
 * 
 * @param request - The incoming HTTP request
 * @returns JSON response with diagnostic information or error
 * 
 * @security
 * - Requires x-diag-key header matching INTERNAL_API_SECRET in production/preview
 * - Uses constant-time comparison to prevent timing attacks
 * - Never exposes actual secret values, only boolean flags
 * - All accesses are audit-logged
 * - Rate limited to 10 requests per 60 seconds per IP
 */
export async function GET(request: NextRequest) {
  // Determine environment - include preview deployments in protected environments
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    request.headers.get("x-real-ip") || 
    "unknown";

  try {
    // Apply rate limiting per client (by IP) before any diagnostic logic
    const rateLimitResponse = enforceRateLimit(request, {
      keyPrefix: "diag:superadmin",
      requests: 10,
      windowMs: 60_000,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    const isProd =
      nodeEnv === "production" ||
      vercelEnv === "production" ||
      vercelEnv === "preview";
    
    const diagKey = request.headers.get("x-diag-key") || "";
    const expectedKey = process.env.INTERNAL_API_SECRET || "";
    
    // Fail closed: if no expected key is configured in production/preview, deny access
    // Use constant-time comparison to prevent timing attacks
    const keyValid = expectedKey.length > 0 && safeCompare(diagKey, expectedKey);
    
    if (isProd && !keyValid) {
      logger.warn("[DIAG] Unauthorized access attempt to diagnostic endpoint", {
        ip: clientIp,
        userAgent: request.headers.get("user-agent")?.substring(0, 100),
        hasKey: !!diagKey,
        hasExpectedKey: !!expectedKey,
      });
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: ROBOTS_HEADER }
      );
    }

    // Audit log successful access
    logger.info("[DIAG] Diagnostic endpoint accessed", {
      ip: clientIp,
      env: vercelEnv || nodeEnv,
    });

    const diag = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: nodeEnv,
        VERCEL_ENV: vercelEnv || null,
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
  } catch (error) {
    logger.error("[DIAG] Error in diagnostic endpoint", {
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
    });
    const isDev = nodeEnv === "development";
    return NextResponse.json(
      {
        error: "Internal Server Error",
        ...(isDev ? { details: error instanceof Error ? error.message : String(error) } : {}),
      },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
