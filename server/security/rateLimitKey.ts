import { NextRequest } from "next/server";
import { getClientIP } from "@/server/security/headers";

/**
 * Safely get client IP with fallback
 */
export function safeGetClientIp(req: NextRequest): string {
  try {
    return getClientIP(req);
  } catch {
    return "unknown";
  }
}

/**
 * Builds a consistent, org-aware rate limit key for tenant isolation.
 * 
 * KEY FORMAT: `{orgId}:{path}:{userId|ip}`
 * 
 * BACKWARD COMPATIBILITY:
 * This function supports both legacy and new call patterns:
 * 
 * - LEGACY (2 args): buildRateLimitKey(req, userId) 
 *   → Uses userId as identifier, org="anonymous"
 *   → Maintains per-user rate limiting for existing callers
 * 
 * - NEW (3+ args): buildRateLimitKey(req, orgId, userId)
 *   → Uses orgId for tenant isolation
 *   → userId for per-user limiting within org
 * 
 * SECURITY: Including orgId prevents noisy-neighbor attacks where one tenant
 * could exhaust rate limits shared with other tenants. Each tenant has
 * independent rate limit buckets.
 * 
 * @param req - NextRequest object for extracting path and IP
 * @param orgIdOrUserId - For legacy calls: userId. For new calls: orgId
 * @param userId - Optional user ID (only for new 3+ arg calls)
 * @param overridePath - Optional path override (defaults to request pathname)
 * @returns Formatted rate limit key: `{org}:{path}:{identifier}`
 * 
 * @example
 * // LEGACY (still works): Per-user limiting without org isolation
 * const key = buildRateLimitKey(req, user.id);
 * // Results in: "anonymous:{path}:{user.id}"
 * 
 * // NEW: Authenticated user with org context (recommended)
 * const key = buildRateLimitKey(req, user.orgId, user.id);
 * // Results in: "{orgId}:{path}:{user.id}"
 * 
 * // NEW: Anonymous user with org context (from session/cookie)
 * const key = buildRateLimitKey(req, orgId, null);
 * // Results in: "{orgId}:{path}:{ip}"
 * 
 * // NEW: Fully anonymous (use sparingly - no tenant isolation)
 * const key = buildRateLimitKey(req, null, null);
 * // Results in: "anonymous:{path}:{ip}"
 */
export function buildRateLimitKey(
  req: NextRequest,
  orgIdOrUserId?: string | null,
  userId?: string | null,
  overridePath?: string,
): string {
  const path = overridePath ?? new URL(req.url).pathname;
  const ip = safeGetClientIp(req);
  
  // BACKWARD COMPATIBILITY DETECTION:
  // If userId is explicitly undefined (not null), this is likely a legacy call
  // where the 2nd arg is userId, not orgId.
  // 
  // Legacy pattern: buildRateLimitKey(req, user.id)
  // New pattern: buildRateLimitKey(req, orgId, userId)
  //
  // Detection logic:
  // - If userId === undefined → legacy call, treat 2nd arg as userId
  // - If userId !== undefined (including null) → new call with explicit org/user
  const isLegacyCall = userId === undefined;
  
  if (isLegacyCall) {
    // Legacy: buildRateLimitKey(req, userId)
    // Preserve per-user limiting, no org isolation
    const identifier = orgIdOrUserId || ip;
    return `anonymous:${path}:${identifier}`;
  }
  
  // New: buildRateLimitKey(req, orgId, userId, overridePath?)
  // Full tenant isolation with per-user or per-IP limiting
  const org = orgIdOrUserId || "anonymous";
  const identifier = userId || ip;
  return `${org}:${path}:${identifier}`;
}

/**
 * NEW: Explicit org-aware rate limit key builder (recommended for new code).
 * 
 * This function has explicit parameters and doesn't rely on detection logic.
 * Use this for all new code to ensure correct tenant isolation.
 * 
 * @param req - NextRequest object
 * @param orgId - Organization ID (use null for anonymous/public endpoints)
 * @param userId - User ID (use null to fall back to IP)
 * @param overridePath - Optional path override
 * @returns Formatted rate limit key: `{org}:{path}:{identifier}`
 * 
 * @example
 * // Authenticated user with org context
 * const key = buildOrgAwareRateLimitKey(req, user.orgId, user.id);
 * 
 * // Public endpoint (still includes IP for rate limiting)
 * const key = buildOrgAwareRateLimitKey(req, null, null);
 */
export function buildOrgAwareRateLimitKey(
  req: NextRequest,
  orgId: string | null,
  userId: string | null,
  overridePath?: string,
): string {
  const path = overridePath ?? new URL(req.url).pathname;
  const org = orgId || "anonymous";
  const identifier = userId || safeGetClientIp(req);
  return `${org}:${path}:${identifier}`;
}
