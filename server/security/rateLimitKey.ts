import { NextRequest } from "next/server";
import { getClientIP } from "@/server/security/headers";
import { logger } from "@/lib/logger";

// Track legacy usage warnings (emit once per endpoint)
const legacyUsageWarned = new Set<string>();

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
 * Redacts sensitive data from rate limit keys for logging.
 * 
 * Masks:
 * - IP addresses (last segment after final colon)
 * - Org IDs (replaced with hash prefix)
 * - Dynamic path segments (UUIDs, ObjectIds, numeric IDs)
 * 
 * @param key - Raw rate limit key
 * @returns Redacted key safe for logging
 * 
 * @example
 * redactRateLimitKey("org123:api/users/507f1f77bcf86cd799439011:192.168.1.1")
 * // Returns: "org***:api/users/***:***"
 */
export function redactRateLimitKey(key: string): string {
  // Split into segments: org:path:identifier
  const parts = key.split(':');
  if (parts.length < 3) {
    // Malformed key - redact everything after first segment
    return parts[0] + ':***';
  }
  
  // Redact org ID (show first 3 chars if long enough, else show "org")
  const org = parts[0];
  const redactedOrg = org === 'anonymous' ? 'anonymous' : 
    (org.length > 6 ? org.substring(0, 3) + '***' : 'org***');
  
  // Redact path - mask dynamic segments (UUIDs, ObjectIds, numeric IDs)
  const pathParts = parts.slice(1, -1).join(':');
  const redactedPath = pathParts
    // Mask MongoDB ObjectIds (24 hex chars)
    .replace(/[a-f0-9]{24}/gi, '***')
    // Mask UUIDs
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '***')
    // Mask numeric IDs (sequences of 3+ digits)
    .replace(/\b\d{3,}\b/g, '***');
  
  // Always mask the identifier (IP or user ID)
  return `${redactedOrg}:${redactedPath}:***`;
}

/**
 * @deprecated Use buildOrgAwareRateLimitKey instead for explicit tenant isolation.
 * 
 * Builds a consistent, org-aware rate limit key for tenant isolation.
 * 
 * KEY FORMAT: `{orgId}:{path}:{userId|ip}`
 * 
 * CALL PATTERNS:
 * 
 * - LEGACY (2 args): buildRateLimitKey(req, userId) 
 *   → Uses userId as identifier, org="anonymous"
 *   → DEPRECATED: Emits warning in dev, use buildOrgAwareRateLimitKey instead
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
  // Use arguments.length for reliable legacy detection.
  // This avoids issues where optional chaining (user?.id) passes undefined.
  // 
  // Legacy pattern: buildRateLimitKey(req, user.id) - 2 args
  // New pattern: buildRateLimitKey(req, orgId, userId) - 3+ args
  //
  // Detection logic:
  // - arguments.length <= 2 → legacy call, treat 2nd arg as userId
  // - arguments.length >= 3 → new call with explicit org/user
  const isLegacyCall = arguments.length <= 2;
  
  if (isLegacyCall) {
    // Emit deprecation warning in development (once per endpoint)
    if (process.env.NODE_ENV !== 'production' && !legacyUsageWarned.has(path)) {
      legacyUsageWarned.add(path);
      logger.warn('[RateLimit] DEPRECATED: Legacy buildRateLimitKey(req, userId) call detected. ' +
        'Migrate to buildOrgAwareRateLimitKey(req, orgId, userId) for tenant isolation.', {
        path: path.replace(/[a-f0-9]{24}/gi, '***').replace(/\d{3,}/g, '***'),
      });
    }
    
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
 * Explicit org-aware rate limit key builder (RECOMMENDED for all new code).
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
 * 
 * // Org context only (anonymous user in known org)
 * const key = buildOrgAwareRateLimitKey(req, orgId, null);
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
