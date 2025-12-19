import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

export interface SuperadminSession {
  username: string;
  role: "super_admin";
  orgId: string;
  issuedAt: number;
  expiresAt: number;
}

const SECRET_FALLBACK =
  process.env.SUPERADMIN_JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "change-me-superadmin-secret";

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
const jwtSecret = encoder.encode(SECRET_FALLBACK);

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

export async function verifySuperadminPassword(password: string): Promise<boolean> {
  const configuredHash = process.env.SUPERADMIN_PASSWORD_HASH;
  const plainPassword = process.env.SUPERADMIN_PASSWORD;

  if (!configuredHash && !plainPassword) {
    logger.error("[SUPERADMIN] SUPERADMIN_PASSWORD_HASH or SUPERADMIN_PASSWORD not configured");
    return false;
  }

  if (configuredHash) {
    return bcrypt.compare(password, configuredHash);
  }

  // Hash the provided plaintext password from env once per process
  const derivedHash = await bcrypt.hash(plainPassword || "", 10);
  return bcrypt.compare(password, derivedHash);
}

export function validateSecondFactor(secretFromRequest?: string): boolean {
  const envSecret = process.env.SUPERADMIN_SECRET_KEY;
  if (!envSecret) return true;
  return envSecret === secretFromRequest;
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
    .sign(jwtSecret);
}

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
  response: Response,
  token: string,
  maxAgeSeconds: number
): void {
  const secure = process.env.NODE_ENV === "production";
  const sameSite: "lax" | "strict" = "lax";

  // Single root-scoped cookie so UI (/superadmin) and API (/api/superadmin, /api/issues) both receive it
  const respWithCookies = response as Response & { cookies?: { set: (name: string, value: string, opts: Record<string, unknown>) => void } };
  if (respWithCookies.cookies && typeof respWithCookies.cookies.set === "function") {
    respWithCookies.cookies.set(SUPERADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite,
      path: SUPERADMIN_COOKIE_PATH,
      maxAge: maxAgeSeconds,
      priority: "high",
    });
  }
}

export function clearSuperadminCookies(response: Response): void {
  const respWithCookies = response as Response & { cookies?: { set: (name: string, value: string, opts: Record<string, unknown>) => void } };
  if (respWithCookies.cookies && typeof respWithCookies.cookies.set === "function") {
    // Clear superadmin session cookies
    const cookieNames = [SUPERADMIN_COOKIE_NAME, `${SUPERADMIN_COOKIE_NAME}.legacy`];
    const cookiePaths = Array.from(new Set([SUPERADMIN_COOKIE_PATH, ...LEGACY_COOKIE_PATHS]));

    for (const name of cookieNames) {
      for (const path of cookiePaths) {
        respWithCookies.cookies.set(name, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path,
          maxAge: 0,
        });
      }
    }

    // BUG-001 FIX: Also clear impersonation context cookie on logout
    // Prevents impersonation cookie from persisting after logout
    respWithCookies.cookies.set("support_org_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
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
