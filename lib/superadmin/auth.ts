import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

export interface SuperadminSession {
  username: string;
  role: "super_admin";
  orgId: string;
  issuedAt: number;
  expiresAt: number;
}

// P0 FIX: JWT secret MUST be deterministic across all serverless instances.
// In production, require an explicit secret to prevent session verification failures
// when requests hit different Vercel instances with different random secrets.
function getSuperadminJwtSecret(): string {
  const secret = process.env.SUPERADMIN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    // CRITICAL: Fail fast in production if no secret is configured
    // This prevents the "login works but redirect fails" issue caused by
    // different serverless instances using different random secrets
    logger.error("[SUPERADMIN] CRITICAL: Missing JWT secret in production. Set SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET.");
    throw new Error("SUPERADMIN_JWT_SECRET is required in production");
  }

  // Development fallback only (logs warning)
  if (!secret) {
    logger.warn("[SUPERADMIN] Using fallback secret in development. Set SUPERADMIN_JWT_SECRET for production.");
    return "dev-only-superadmin-secret-not-for-production";
  }

  return secret;
}

export const SUPERADMIN_COOKIE_NAME = "superadmin_session";
const SUPERADMIN_COOKIE_PATH = "/";
const LEGACY_COOKIE_PATHS = ["/superadmin", "/api/superadmin", "/api/issues"];

const RATE_LIMIT_WINDOW_MS =
  Number(process.env.SUPERADMIN_LOGIN_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX =
  Number(process.env.SUPERADMIN_LOGIN_MAX_ATTEMPTS) || 5;

type RateEntry = { count: number; expiresAt: number };
const rateLimiter = new Map<string, RateEntry>();

const encoder = new TextEncoder();
// Use deterministic secret getter instead of module-level constant
let _jwtSecretCached: Uint8Array | null = null;
function getJwtSecretBytes(): Uint8Array {
  if (!_jwtSecretCached) {
    _jwtSecretCached = encoder.encode(getSuperadminJwtSecret());
  }
  return _jwtSecretCached;
}

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

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  // NextRequest doesn't have .ip property - use headers only
  const realIp = req.headers.get("x-real-ip");
  return realIp || "unknown";
}

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

export type PasswordVerifyResult = { ok: true } | { ok: false; reason: 'not_configured' | 'invalid' };

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
  // Simple string equality - no hashing needed
  // plainPassword is guaranteed to exist here (checked above)
  const match = timingSafeEquals(password, plainPassword!);
  return match ? { ok: true } : { ok: false, reason: 'invalid' };
}

export function validateSecondFactor(secretFromRequest?: string): boolean {
  const envSecret = process.env.SUPERADMIN_SECRET_KEY;
  if (!envSecret) return true;
  if (!secretFromRequest) return false;
  return timingSafeEquals(secretFromRequest, envSecret);
}

export async function signSuperadminToken(username: string): Promise<string> {
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
    .sign(getJwtSecretBytes());
}

export async function decodeSuperadminToken(token?: string | null): Promise<SuperadminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
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
  } catch (error) {
    logger.warn("[SUPERADMIN] Token verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getSuperadminSession(request: NextRequest): Promise<SuperadminSession | null> {
  const cookieValue =
    request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value ||
    request.cookies.get(`${SUPERADMIN_COOKIE_NAME}.legacy`)?.value;

  return decodeSuperadminToken(cookieValue);
}

export async function getSuperadminSessionFromCookies(): Promise<SuperadminSession | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SUPERADMIN_COOKIE_NAME)?.value ||
    cookieStore.get(`${SUPERADMIN_COOKIE_NAME}.legacy`)?.value;

  return decodeSuperadminToken(token);
}

export function applySuperadminCookies(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number
): void {
  const secure = process.env.NODE_ENV === "production";
  const sameSite: "lax" | "strict" = "lax";

  // Single root-scoped cookie so UI (/superadmin) and API (/api/superadmin, /api/issues) both receive it
  // NextResponse.cookies.set() is the proper way to set cookies in Next.js 13+ App Router
  response.cookies.set(SUPERADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: SUPERADMIN_COOKIE_PATH,
    maxAge: maxAgeSeconds,
    priority: "high",
  });
}

export function clearSuperadminCookies(response: NextResponse): void {
  const cookieNames = [SUPERADMIN_COOKIE_NAME, `${SUPERADMIN_COOKIE_NAME}.legacy`];
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
