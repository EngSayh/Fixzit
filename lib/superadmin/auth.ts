/**
 * Superadmin Auth - Full Authentication Module
 * 
 * This module contains ALL superadmin auth functions including those
 * that require Node.js-only modules (crypto, bcryptjs).
 * 
 * For Edge Runtime (middleware), use ./auth.edge.ts instead.
 * 
 * @module lib/superadmin/auth
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

// Re-export edge-safe functions for backward compatibility
// These are the functions that can run in Edge Runtime
export {
  type SuperadminSession,
  SUPERADMIN_COOKIE_NAME,
  decodeSuperadminToken,
  getSuperadminSession,
  isIpAllowed,
  getClientIp,
} from "./auth.edge";

// Import for internal use
import { SUPERADMIN_COOKIE_NAME as COOKIE_NAME, decodeSuperadminToken } from "./auth.edge";

// ============================================================================
// CONSTANTS (Node.js only - not exported to Edge)
// ============================================================================

const SUPERADMIN_COOKIE_PATH = "/";
const LEGACY_COOKIE_PATHS = ["/superadmin", "/api/superadmin", "/api/issues"];

const RATE_LIMIT_WINDOW_MS =
  Number(process.env.SUPERADMIN_LOGIN_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX =
  Number(process.env.SUPERADMIN_LOGIN_MAX_ATTEMPTS) || 5;

type RateEntry = { count: number; expiresAt: number };
const rateLimiter = new Map<string, RateEntry>();

/**
 * JWT Secret Resolution (module-level constant for stability)
 * 
 * SECURITY: Returns null if no secret is configured. This ensures the system
 * "fails closed" - no token signing is possible without a proper secret.
 */
const SECRET_FALLBACK: string | null = (() => {
  const secret = 
    process.env.SUPERADMIN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    null;
  
  if (!secret) {
    const isProdLike = 
      process.env.NODE_ENV === "production" || 
      process.env.VERCEL_ENV === "production" || 
      process.env.VERCEL_ENV === "preview";
    
    if (isProdLike) {
      // eslint-disable-next-line no-console -- Critical security warning must be visible
      console.error("[SUPERADMIN] CRITICAL SECURITY: No JWT secret configured. Superadmin auth DISABLED. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET.");
    }
  }
  
  return secret;
})();

const encoder = new TextEncoder();
// Only encode if secret exists - jwtSecret will be null if no secret configured
const jwtSecret = SECRET_FALLBACK ? encoder.encode(SECRET_FALLBACK) : null;

// ============================================================================
// INTERNAL HELPERS (Node.js only - uses crypto)
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 * Uses Node.js crypto - NOT Edge Runtime safe
 */
function timingSafeEquals(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function resolveOrgId(): string | null {
  const orgId =
    process.env.SUPERADMIN_ORG_ID?.trim() ||
    process.env.PUBLIC_ORG_ID?.trim() ||
    process.env.DEFAULT_ORG_ID?.trim() ||
    process.env.TEST_ORG_ID?.trim() ||
    null;

  if (!orgId) {
    logger.error("[SUPERADMIN] CRITICAL: Missing org id (SUPERADMIN_ORG_ID / PUBLIC_ORG_ID / DEFAULT_ORG_ID / TEST_ORG_ID). Superadmin login will fail.");
    logger.error("[SUPERADMIN] Please set one of these environment variables in production");
  }

  return orgId;
}

// ============================================================================
// RATE LIMITING (Node.js only - uses in-memory Map)
// ============================================================================

/**
 * Check if an IP has exceeded rate limits
 * Uses in-memory rate limiting - suitable for serverless with short-lived instances
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry) {
    rateLimiter.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.expiresAt < now) {
    rateLimiter.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  rateLimiter.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

// ============================================================================
// PASSWORD VERIFICATION (Node.js only - uses bcrypt + crypto)
// ============================================================================

export type PasswordVerifyResult = { ok: true } | { ok: false; reason: 'not_configured' | 'invalid' };

/**
 * Verify superadmin password against configured hash or plaintext
 * Uses bcrypt for hash comparison, crypto for timing-safe plaintext comparison
 */
export async function verifySuperadminPassword(password: string): Promise<PasswordVerifyResult> {
  const configuredHash = process.env.SUPERADMIN_PASSWORD_HASH;
  const plainPassword = process.env.SUPERADMIN_PASSWORD;

  if (!configuredHash && !plainPassword) {
    logger.error("[SUPERADMIN] CRITICAL: SUPERADMIN_PASSWORD_HASH or SUPERADMIN_PASSWORD not configured");
    logger.error("[SUPERADMIN] Please set one of these environment variables in Vercel/production");
    return { ok: false, reason: 'not_configured' };
  }

  // Option 1: Bcrypt hash configured (production recommended)
  if (configuredHash) {
    const match = await bcrypt.compare(password, configuredHash);
    return match ? { ok: true } : { ok: false, reason: 'invalid' };
  }

  // Option 2: Plaintext password configured (development/testing only)
  const match = timingSafeEquals(password, plainPassword!);
  return match ? { ok: true } : { ok: false, reason: 'invalid' };
}

/**
 * Validate second factor (access key) if configured
 * Uses timing-safe comparison
 */
export function validateSecondFactor(secretFromRequest?: string): boolean {
  const envSecret = process.env.SUPERADMIN_SECRET_KEY;
  if (!envSecret) return true;
  if (!secretFromRequest) return false;
  return timingSafeEquals(secretFromRequest, envSecret);
}

// ============================================================================
// TOKEN SIGNING (Node.js only - uses jose SignJWT)
// ============================================================================

/**
 * Sign a new superadmin JWT token
 * 
 * @throws Error if JWT secret is not configured (fail closed)
 */
export async function signSuperadminToken(username: string): Promise<string> {
  // SECURITY: Fail closed - cannot sign tokens without proper secret
  if (!jwtSecret) {
    throw new Error("[SUPERADMIN] Cannot sign token: No JWT secret configured. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET.");
  }

  const orgId = resolveOrgId();
  if (!orgId) {
    throw new Error("Tenant org id missing");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 60 * 60 * 8; // 8 hours

  return new SignJWT({
    sub: username,
    role: "super_admin",
    orgId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(jwtSecret);
}

// ============================================================================
// SERVER-SIDE SESSION (Node.js only - uses next/headers cookies)
// ============================================================================

/**
 * Get superadmin session from cookies() - for Server Components
 * NOT for middleware - use getSuperadminSession from auth.edge.ts instead
 */
export async function getSuperadminSessionFromCookies(): Promise<import("./auth.edge").SuperadminSession | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(COOKIE_NAME)?.value ||
    cookieStore.get(`${COOKIE_NAME}.legacy`)?.value;

  return decodeSuperadminToken(token);
}

// ============================================================================
// COOKIE MANAGEMENT (Node.js only - uses NextResponse)
// ============================================================================

/**
 * Apply superadmin session cookie to response
 */
export function applySuperadminCookies(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number
): void {
  const secure = process.env.NODE_ENV === "production";
  const sameSite: "lax" | "strict" = "lax";

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: SUPERADMIN_COOKIE_PATH,
    maxAge: maxAgeSeconds,
    priority: "high",
  });
}

/**
 * Clear superadmin session cookies from response
 */
export function clearSuperadminCookies(response: NextResponse): void {
  const cookieNames = [COOKIE_NAME, `${COOKIE_NAME}.legacy`];
  const cookiePaths = Array.from(new Set([SUPERADMIN_COOKIE_PATH, ...LEGACY_COOKIE_PATHS]));

  for (const name of cookieNames) {
    for (const path of cookiePaths) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path,
        maxAge: 0,
      });
    }
  }
}
