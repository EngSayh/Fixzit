import { LRUCache } from "lru-cache";
import { redactRateLimitKey as _redactRateLimitKey } from "./rateLimitKey";
import {
  applyReputationToLimit,
  recordReputationSignal,
} from "@/lib/security/ip-reputation";
import type { IpReputationResult } from "@/lib/security/ip-reputation";

/**
 * In-memory LRU cache for rate limiting (single-instance).
 *
 * LIMITATION: In-memory rate limiting is NOT distributed - each serverless
 * instance has its own cache.
 */
const memoryCache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
});

const ipv4Pattern = /(\d{1,3}(?:\.\d{1,3}){3})/;

const extractIpFromKey = (key: string): string | undefined => {
  const match = key.match(ipv4Pattern);
  return match?.[1];
};

export type RateLimitReputationOptions = {
  ip?: string | null;
  path?: string | null;
  userAgent?: string | null;
};

/**
 * Distributed rate limiting result
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
  reputation?: IpReputationResult;
  effectiveLimit?: number;
}

/**
 * Rate limit using in-memory LRU cache.
 * 
 * @param key - Unique identifier for rate limiting (should include orgId for tenant awareness)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and remaining count
 * 
 * @example
 * // Tenant-aware rate limiting (recommended)
 * const rl = await rateLimit(`ats:${orgId}:${clientIp}:${path}`, 60, 60_000);
 * 
 * // Legacy non-distributed (for backward compatibility)
 * const rl = rateLimit(`${path}:${clientIp}`, 60, 60_000);
 */
export function rateLimit(key: string, limit = 60, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const entry = memoryCache.get(key);
  if (!entry || now > entry.resetAt) {
    memoryCache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, effectiveLimit: limit };
  }
  if (entry.count >= limit)
    return { allowed: false, remaining: 0, effectiveLimit: limit };
  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    effectiveLimit: limit,
  };
}

export function getRateLimitMetrics(): { entries: number; maxEntries: number } {
  return {
    entries: memoryCache.size,
    maxEntries: memoryCache.max,
  };
}

// Re-export key builders from rateLimitKey.ts
// buildRateLimitKey: backward-compatible, auto-detects legacy vs new call pattern
// buildOrgAwareRateLimitKey: explicit org-aware key builder (recommended for new code)
// safeGetClientIp: helper for getting client IP with fallback
// redactRateLimitKey: helper for safe logging of rate limit keys
export { buildRateLimitKey, buildOrgAwareRateLimitKey, safeGetClientIp, redactRateLimitKey } from './rateLimitKey';

/**
 * Smart rate limiting that applies reputation hints and uses in-memory storage.
 * 
 * @param key - Rate limit key (use buildRateLimitKey for org-aware keys)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @param reputation - Optional IP reputation hints (ip/path/userAgent) to tighten limits
 * @returns Rate limit result
 * 
 * @example
 * // Recommended usage with org-aware key
 * const key = buildRateLimitKey(req, user.orgId, user.id);
 * const { allowed, remaining } = await smartRateLimit(key, 60, 60_000);
 * if (!allowed) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 */
export async function smartRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  reputation?: RateLimitReputationOptions,
): Promise<RateLimitResult> {
  const ip = reputation?.ip ?? extractIpFromKey(key);
  const applied = applyReputationToLimit(limit, {
    ip,
    path: reputation?.path ?? key,
    userAgent: reputation?.userAgent,
  });

  if (applied.reputation?.shouldBlock || applied.limit <= 0) {
    if (ip) {
      recordReputationSignal({
        ip,
        type: "manual_block",
        path: reputation?.path ?? key,
      });
    }
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + windowMs,
      reputation: applied.reputation,
      effectiveLimit: applied.limit,
    };
  }

  const result = rateLimit(key, applied.limit, windowMs);

  if (!result.allowed && ip) {
    recordReputationSignal({
      ip,
      type: "rate_limit_exceeded",
      path: reputation?.path ?? key,
    });
  }

  return {
    ...result,
    reputation: applied.reputation ?? result.reputation,
    effectiveLimit: applied.limit,
  };
}

// Export type for consumers
export type { RateLimitResult };
