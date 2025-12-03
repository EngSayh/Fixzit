import { NextRequest } from "next/server";
import { getClientIP } from "@/server/security/headers";

/**
 * Safely get client IP with fallback
 */
function safeGetClientIp(req: NextRequest): string {
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
 * SECURITY: Including orgId prevents noisy-neighbor attacks where one tenant
 * could exhaust rate limits shared with other tenants. Each tenant has
 * independent rate limit buckets.
 * 
 * @param req - NextRequest object for extracting path and IP
 * @param orgId - Organization ID for tenant scoping (required for multi-tenant isolation)
 * @param userId - Optional user ID (preferred over IP for authenticated requests)
 * @param overridePath - Optional path override (defaults to request pathname)
 * @returns Formatted rate limit key: `{orgId}:{path}:{userId|ip}`
 * 
 * @example
 * // Authenticated user with org context (recommended)
 * const key = buildRateLimitKey(req, user.orgId, user.id);
 * 
 * // Anonymous user with org context (from session/cookie)
 * const key = buildRateLimitKey(req, orgId, null);
 * 
 * // Fully anonymous (use sparingly - no tenant isolation)
 * const key = buildRateLimitKey(req, null, null);
 */
export function buildRateLimitKey(
  req: NextRequest,
  orgId?: string | null,
  userId?: string | null,
  overridePath?: string,
): string {
  const path = overridePath ?? new URL(req.url).pathname;
  const org = orgId || "anonymous";
  const identifier = userId || safeGetClientIp(req);
  
  // Format: org:path:identifier
  // This ensures tenant isolation while still identifying unique clients
  return `${org}:${path}:${identifier}`;
}
