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
 * @version 2.0.1 - Lazy JWT secret getter for Edge Runtime env var timing (2024-12-28)
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
 * Priority: SUPERADMIN_JWT_SECRET > NEXTAUTH_SECRET > AUTH_SECRET > null (fail closed)
 * 
 * SECURITY: Returns null if no secret is configured. This ensures the system
 * "fails closed" - no token verification is possible without a proper secret.
 * 
 * NOTE: This is now a function instead of a constant to handle Edge Runtime
 * where env vars might not be available during module initialization.
 */
function getJwtSecret(): Uint8Array | null {
  const secret = 
    process.env.SUPERADMIN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    null;
  
  if (!secret) {
    return null;
  }
  
  return new TextEncoder().encode(secret);
}

export const SUPERADMIN_COOKIE_NAME = "superadmin_session";

/**
 * Debug helper to check if JWT secret is configured
 * Used by middleware for troubleshooting auth issues
 */
export function hasJwtSecretConfigured(): boolean {
  return !!(
    process.env.SUPERADMIN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET
  );
}

/**
 * Decode and verify a superadmin JWT token
 * Edge Runtime safe - uses jose library (Web Crypto API)
 * 
 * SECURITY: Returns null immediately if no JWT secret is configured.
 * This ensures the system "fails closed" - attackers cannot forge tokens.
 */
export async function decodeSuperadminToken(token?: string | null): Promise<SuperadminSession | null> {
  if (!token) return null;
  
  // Get secret at runtime (not module load time) for Edge Runtime compatibility
  const jwtSecret = getJwtSecret();
  
  // SECURITY: Fail closed if no secret configured
  if (!jwtSecret) {
    // eslint-disable-next-line no-console -- Critical security error must be visible
    console.error("[SUPERADMIN] SECURITY: Token verification rejected - no JWT secret configured. Configure SUPERADMIN_JWT_SECRET, NEXTAUTH_SECRET, or AUTH_SECRET.");
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (payload.role !== "super_admin" || !payload.sub || !payload.orgId) {
      // eslint-disable-next-line no-console -- Debug logging for auth issues
      console.warn("[SUPERADMIN] Token payload validation failed", {
        hasRole: !!payload.role,
        roleValue: payload.role,
        hasSub: !!payload.sub,
        hasOrgId: !!payload.orgId,
      });
      return null;
    }

    if (typeof payload.exp !== "number") {
      // eslint-disable-next-line no-console -- Debug logging for auth issues
      console.warn("[SUPERADMIN] Token missing expiration");
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
    // Token verification failed - log in development/preview for debugging
    const isProdLike = 
      process.env.NODE_ENV === "production" && 
      process.env.VERCEL_ENV === "production";
    
    if (!isProdLike) {
      // eslint-disable-next-line no-console -- Debug logging for auth issues
      console.warn("[SUPERADMIN] Token verification failed", {
        error: error instanceof Error ? error.message : String(error),
        tokenLength: token?.length || 0,
        hasJwtSecret: !!jwtSecret,
      });
    }
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
 * Debug version of getSuperadminSession that returns diagnostic info
 * Used for troubleshooting auth issues in middleware
 */
export async function getSuperadminSessionWithDebug(request: NextRequest): Promise<{
  session: SuperadminSession | null;
  debug: {
    hasCookieValue: boolean;
    cookieLength: number;
    hasJwtSecret: boolean;
    decodeError?: string;
  };
}> {
  const cookieValue =
    request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value ||
    request.cookies.get(`${SUPERADMIN_COOKIE_NAME}.legacy`)?.value;

  // Get secret at runtime (not module load time) for Edge Runtime compatibility
  const jwtSecret = getJwtSecret();
  
  const debug = {
    hasCookieValue: !!cookieValue,
    cookieLength: cookieValue?.length || 0,
    hasJwtSecret: !!jwtSecret,
    decodeError: undefined as string | undefined,
  };

  if (!cookieValue) {
    return { session: null, debug };
  }

  if (!jwtSecret) {
    debug.decodeError = 'no_jwt_secret';
    return { session: null, debug };
  }

  try {
    const { payload } = await jwtVerify(cookieValue, jwtSecret);
    if (payload.role !== "super_admin" || !payload.sub || !payload.orgId) {
      debug.decodeError = 'payload_validation_failed';
      return { session: null, debug };
    }

    if (typeof payload.exp !== "number") {
      debug.decodeError = 'missing_expiration';
      return { session: null, debug };
    }

    return {
      session: {
        username: String(payload.sub),
        role: "super_admin",
        orgId: String(payload.orgId),
        issuedAt: (payload.iat || 0) * 1000,
        expiresAt: payload.exp * 1000,
      },
      debug,
    };
  } catch (error) {
    debug.decodeError = error instanceof Error ? error.message : String(error);
    return { session: null, debug };
  }
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
 * Check if an IP address is in a private/reserved range
 * Edge Runtime safe - no external dependencies
 */
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === "unknown") return true;

  // IPv6 handling
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true; // Loopback
    const stripped = normalized.replace(/^:+/, "");
    const firstFourHex = stripped.slice(0, 4);
    if (/^fe[89ab][0-9a-f]$/i.test(firstFourHex)) return true; // Link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("ff")) return true; // Multicast
    if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) return true; // Documentation
    if (normalized.startsWith("::ffff:")) {
      const ipv4Match = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
      if (ipv4Match) return isPrivateIP(ipv4Match[1]);
      return true;
    }
    if (/^[0-9a-f:]+$/i.test(normalized)) return false; // Valid public IPv6
    return true; // Malformed = private (fail-safe)
  }

  // IPv4 handling
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0 || a === 127) return true; // This network / Loopback
  if (a === 169 && b === 254) return true; // Link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
  if (a >= 224) return true; // Multicast / Reserved
  return false;
}

/**
 * Extract client IP from request headers - Hardened version
 * Edge Runtime safe - aligned with lib/ip.ts extractClientIP
 * 
 * SECURITY: Uses CF-Connecting-IP, trusted proxy counting, and private IP filtering
 * to prevent header spoofing attacks for accurate audit logging.
 */
export function getClientIp(req: NextRequest): string {
  if (!req?.headers || typeof req.headers.get !== "function") {
    return "unknown";
  }

  // 1) Cloudflare's CF-Connecting-IP is most trustworthy
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // 2) X-Forwarded-For with trusted proxy counting
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter((ip) => ip);
    if (ips.length) {
      // Parse TRUSTED_PROXY_COUNT - aligned with server/security/ip-utils.ts
      const envValue = process.env.TRUSTED_PROXY_COUNT;
      let trustedProxyCount = 0;
      if (envValue) {
        const count = parseInt(envValue, 10);
        if (isNaN(count) || count < 0) {
          // SECURITY: Fail loudly on invalid config to match Node behavior
          // eslint-disable-next-line no-console -- Critical config error
          console.error(`[EDGE] Invalid TRUSTED_PROXY_COUNT: "${envValue}". Must be a non-negative integer.`);
          throw new Error(`Invalid TRUSTED_PROXY_COUNT: "${envValue}". Must be a non-negative integer.`);
        }
        trustedProxyCount = count;
      }

      // Skip trusted proxy hops from the right
      const clientIPIndex = Math.max(0, ips.length - 1 - trustedProxyCount);
      const hopSkippedIP = ips[clientIPIndex];

      if (hopSkippedIP && !isPrivateIP(hopSkippedIP)) {
        return hopSkippedIP;
      }

      // Fallback: find leftmost public IP
      for (const ip of ips) {
        if (!isPrivateIP(ip)) return ip;
      }
    }
  }

  // 3) X-Real-IP only if explicitly trusted
  if (process.env.TRUST_X_REAL_IP === "true") {
    const realIP = req.headers.get("x-real-ip");
    if (realIP && realIP.trim()) return realIP.trim();
  }

  return "unknown";
}
