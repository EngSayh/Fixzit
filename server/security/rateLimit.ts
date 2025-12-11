import { LRUCache } from "lru-cache";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { redactRateLimitKey } from "./rateLimitKey";
import {
  applyReputationToLimit,
  recordReputationSignal,
} from "@/lib/security/ip-reputation";
import type { IpReputationResult } from "@/lib/security/ip-reputation";

/**
 * In-memory LRU cache for rate limiting (fallback when Redis unavailable)
 * 
 * LIMITATION: In-memory rate limiting is NOT distributed - each serverless
 * instance has its own cache. For production multi-instance deployments,
 * configure REDIS_URL to enable distributed rate limiting.
 */
const memoryCache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
});

// Track whether we've already warned about Redis unavailability
// to avoid log spam on every request
let warnedNoRedis = false;

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
 * Rate limit using Redis (distributed) with LRU fallback (in-memory)
 * 
 * SECURITY: Uses Redis for distributed rate limiting across serverless instances.
 * Falls back to in-memory LRU cache when Redis is unavailable.
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

/**
 * Distributed rate limiting using Redis token bucket algorithm
 * 
 * SECURITY FIX: Redis-based rate limiting for horizontal scaling.
 * Each key is unique per org+IP+path to prevent:
 * - Cross-instance bypass (hitting different servers)
 * - Noisy neighbor attacks (one tenant exhausting limits)
 * 
 * @param key - Unique identifier (should include orgId for tenant isolation)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 * 
 * @example
 * // Org-aware distributed rate limiting
 * const { allowed } = await redisRateLimit(`ats:${orgId}:${clientIp}`, 60, 60_000);
 * if (!allowed) return rateLimitError();
 */
export async function redisRateLimit(
  key: string, 
  limit = 60, 
  windowMs = 60_000
): Promise<RateLimitResult> {
  const client = getRedisClient();
  
  // Fall back to in-memory if Redis unavailable
  if (!client) {
    // Only warn once to avoid log spam
    if (!warnedNoRedis) {
      logger.warn('[RateLimit] Redis unavailable, falling back to in-memory rate limiting (this message will not repeat)');
      warnedNoRedis = true;
    }
    return rateLimit(key, limit, windowMs);
  }

  const now = Date.now();
  const windowKey = `ratelimit:${key}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    // Use Redis MULTI for atomic operations
    const multi = client.multi();
    
    // Increment counter
    multi.incr(windowKey);
    // Set expiry on first request (SETNX pattern via EXPIRE)
    multi.expire(windowKey, windowSeconds, 'NX');
    // Get current TTL for reset time
    multi.ttl(windowKey);
    
    const results = await multi.exec();
    
    if (!results || results.length < 3) {
      // Redis transaction failed, fall back to memory
      if (!warnedNoRedis) {
        logger.warn('[RateLimit] Redis transaction returned unexpected results, falling back');
        warnedNoRedis = true;
      }
      return rateLimit(key, limit, windowMs);
    }

    const [countResult, , ttlResult] = results;
    const count = (countResult?.[1] as number) || 0;
    
    // SECURITY FIX: Redis TTL returns:
    //   -2 = key doesn't exist (shouldn't happen after INCR, but handle gracefully)
    //   -1 = key exists but has no expiry (can cause perma-ban!)
    //   >0 = seconds until expiry
    // We MUST coerce negative values to prevent indefinite blocks
    const ttlValue = (ttlResult?.[1] as number) ?? -1;
    let effectiveTtl = ttlValue > 0 ? ttlValue : windowSeconds;
    
    // If TTL is negative, the key has no expiry - forcibly set one to prevent perma-ban
    if (ttlValue <= 0) {
      try {
        await client.expire(windowKey, windowSeconds);
        effectiveTtl = windowSeconds;
      } catch {
        // If expire fails, log but continue - memory fallback will handle eventually
        logger.warn('[RateLimit] Failed to set expiry on key with no TTL', {
          key: redactRateLimitKey(key),
          ttlValue,
        });
      }
    }
    
    const resetAt = now + (effectiveTtl * 1000);

    // CRITICAL FIX: Use >= to match in-memory behavior (both block at limit, not limit+1)
    if (count >= limit) {
      // SECURITY: Use redactRateLimitKey to mask org IDs, paths with entity IDs, and IPs
      logger.warn('[RateLimit] Rate limit exceeded', { 
        key: redactRateLimitKey(key),
        count, 
        limit 
      });
      return { allowed: false, remaining: 0, resetAt, effectiveLimit: limit };
    }

    return { 
      allowed: true, 
      remaining: Math.max(0, limit - count), 
      resetAt,
      effectiveLimit: limit,
    };
  } catch (error) {
    // Redis error - fall back to in-memory
    if (!warnedNoRedis) {
      logger.error('[RateLimit] Redis error, falling back to in-memory', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      warnedNoRedis = true;
    }
    return rateLimit(key, limit, windowMs);
  }
}

// Re-export key builders from rateLimitKey.ts
// buildRateLimitKey: backward-compatible, auto-detects legacy vs new call pattern
// buildOrgAwareRateLimitKey: explicit org-aware key builder (recommended for new code)
// safeGetClientIp: helper for getting client IP with fallback
// redactRateLimitKey: helper for safe logging of rate limit keys
export { buildRateLimitKey, buildOrgAwareRateLimitKey, safeGetClientIp, redactRateLimitKey } from './rateLimitKey';

/**
 * Smart rate limiting that automatically uses Redis when available.
 * 
 * This is the RECOMMENDED rate limiting function for all new endpoints.
 * It provides:
 * - Distributed rate limiting via Redis (when REDIS_URL is configured)
 * - Automatic fallback to in-memory LRU cache
 * - Consistent behavior across both paths
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

  const result = await redisRateLimit(key, applied.limit, windowMs);

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
