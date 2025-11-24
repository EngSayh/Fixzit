import { NextRequest, NextResponse } from "next/server";
import { extractClientIP } from "@/lib/ip";
import { resolveAllowedOrigin } from "@/lib/security/cors-allowlist";

/** Utils */
const isProd = process.env.NODE_ENV === "production";
/**
 * Security headers middleware for API responses
 * - Only for JSON/API — do not use this CSP on HTML pages
 * - REMOVED: X-XSS-Protection (deprecated, ignored by modern browsers)
 * - ADDED: Permissions-Policy, HSTS (prod only), Access-Control-Expose-Headers
 */
export function withSecurityHeaders(
  response: NextResponse,
  request?: NextRequest,
): NextResponse {
  // MIME sniffing defense
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Clickjacking defense (also covered by CSP frame-ancestors)
  response.headers.set("X-Frame-Options", "DENY");

  // Modern referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // API-safe CSP (no inline eval, no frames, no navigation)
  // NOTE: keep this strict for JSON endpoints; do NOT reuse on HTML pages.
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';",
  );

  // Permissions-Policy: deny sensitive sensors by default
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // HSTS (only in prod AND on https)
  const headerProto = request?.headers?.get("x-forwarded-proto");
  const nextUrlProto = request?.nextUrl?.protocol
    ? request.nextUrl.protocol.replace(":", "")
    : undefined;
  const proto = headerProto || nextUrlProto;
  if (isProd && proto === "https") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Hide platform fingerprint
  response.headers.set("Server", "Fixzit-API");

  // Prevent caching of sensitive data
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Useful for clients to read server-provided headers
  const expose = [
    "x-request-id",
    "x-rate-limit-remaining",
    "x-rate-limit-reset",
  ].join(", ");
  response.headers.set("Access-Control-Expose-Headers", expose);

  return response;
}

/**
 * CORS for API endpoints (credentials-friendly; dynamic allowlist)
 * - Adds Vary: Origin
 * - Echoes preflight headers/method if provided
 */
type RequestWithHeaders = Pick<NextRequest, "headers"> | null | undefined;

export function withCORS(
  request: RequestWithHeaders,
  response: NextResponse,
): NextResponse {
  const origin = request?.headers?.get("origin") ?? null;
  const allowedOrigin = resolveAllowedOrigin(origin);

  // For dynamic Origin we must set Vary
  response.headers.append("Vary", "Origin");

  // Credentials-safe CORS
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    response.headers.delete("Access-Control-Allow-Origin");
    response.headers.set("Access-Control-Allow-Credentials", "false");
  }

  // Echo requested method/headers if present (preflight)
  const reqMethod =
    request?.headers?.get("access-control-request-method") ?? null;
  const reqHeaders =
    request?.headers?.get("access-control-request-headers") ?? null;
  response.headers.set(
    "Access-Control-Allow-Methods",
    reqMethod || "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    reqHeaders || "Content-Type, Authorization, X-Requested-With",
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24h

  return response;
}

/**
 * OPTIONS preflight helper: returns 204 with CORS/security headers
 */
export function handlePreflight(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") return null;
  const res = new NextResponse(null, { status: 204 });
  withCORS(request, res);
  // Optionally add security headers to preflight as well
  withSecurityHeaders(res, request);
  return res;
}

/**
 * Request size limiting (best-effort)
 * - If Content-Length header is present and exceeds max, return false
 * - If missing (chunked), we cannot know here; rely on body parser limits
 */
export function checkRequestSize(
  request: NextRequest,
  maxSizeBytes = 10 * 1024 * 1024,
): boolean {
  const cl = request.headers.get("content-length");
  if (!cl) return true;
  const n = Number(cl);
  if (!Number.isFinite(n)) return true; // non-numeric or invalid, allow; let parser handle it
  return n <= maxSizeBytes;
}

/** Hardened client IP (delegates to shared logic) */
export function getClientIP(request: NextRequest): string {
  return extractClientIP(request);
}

/**
 * Create a secure JSON response with proper headers
 * - Applies CORS and security headers
 * - Allows custom headers to be passed through
 */
export function createSecureResponse(
  data: unknown,
  status = 200,
  request?: NextRequest,
  customHeaders?: Record<string, string>,
): NextResponse {
  const res = NextResponse.json(data, { status });
  const canMutateHeaders = Boolean((res as NextResponse).headers?.set);

  // Apply custom headers if provided
  if (customHeaders && canMutateHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
  }

  if (request && canMutateHeaders) {
    withCORS(request, res);
  }

  return canMutateHeaders ? withSecurityHeaders(res, request) : res;
}
