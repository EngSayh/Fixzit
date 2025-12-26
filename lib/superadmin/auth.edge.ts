/**
 * Superadmin Auth - Edge Runtime Safe Functions
 * 
 * This module contains ONLY functions that are safe to run in Edge Runtime.
 * It does NOT import Node.js-only modules like 'crypto' or 'bcryptjs'.
 * 
 * Use this module in middleware.ts for Edge Runtime compatibility.
 * 
 * @module lib/superadmin/auth.edge
 * @see {@link ./auth.ts} for Node.js-only functions (password verification, 2FA)
 */

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface SuperadminSession {
  username: string;
  role: "super_admin";
  orgId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * JWT Secret Resolution (module-level constant for stability)
 * 
 * IMPORTANT: This MUST be evaluated once at module load time to ensure
 * consistency across all requests within a serverless instance.
 * 
 * Priority: SUPERADMIN_JWT_SECRET > NEXTAUTH_SECRET > AUTH_SECRET > fallback
 */
const SECRET_FALLBACK = (() => {
  const secret = 
    process.env.SUPERADMIN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;
  
  if (secret) return secret;
  
  // In production/preview, log error but use a consistent fallback to avoid crashes
  const isProdLike = 
    process.env.NODE_ENV === "production" || 
    process.env.VERCEL_ENV === "production" || 
    process.env.VERCEL_ENV === "preview";
  
  if (isProdLike) {
    // eslint-disable-next-line no-console -- Critical security warning must be visible
    console.error("[SUPERADMIN] CRITICAL: No JWT secret configured. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET.");
  }
  
  return "change-me-superadmin-secret";
})();

export const SUPERADMIN_COOKIE_NAME = "superadmin_session";

const encoder = new TextEncoder();
const jwtSecret = encoder.encode(SECRET_FALLBACK);

/**
 * Decode and verify a superadmin JWT token
 * Edge Runtime safe - uses jose library (Web Crypto API)
 */
export async function decodeSuperadminToken(token?: string | null): Promise<SuperadminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (payload.role !== "super_admin" || !payload.sub || !payload.orgId) {
      return null;
    }

    if (typeof payload.exp !== "number") {
      return null;
    }

    return {
      username: String(payload.sub),
      role: "super_admin",
      orgId: String(payload.orgId),
      issuedAt: (payload.iat || 0) * 1000,
      expiresAt: payload.exp * 1000,
    };
  } catch {
    // Token verification failed - likely stale cookie or secret mismatch
    // Don't log in Edge Runtime to avoid noise
    return null;
  }
}

/**
 * Get superadmin session from request cookies
 * Edge Runtime safe
 */
export async function getSuperadminSession(request: NextRequest): Promise<SuperadminSession | null> {
  const cookieValue =
    request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value ||
    request.cookies.get(`${SUPERADMIN_COOKIE_NAME}.legacy`)?.value;

  return decodeSuperadminToken(cookieValue);
}

/**
 * Check if client IP is in the superadmin allowlist
 * Edge Runtime safe - no crypto needed
 */
export function isIpAllowed(ip: string): boolean {
  const allowlist = process.env.SUPERADMIN_IP_ALLOWLIST
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowlist || allowlist.length === 0) {
    return true;
  }

  return allowlist.includes(ip);
}

/**
 * Extract client IP from request headers
 * Edge Runtime safe
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp || "unknown";
}
