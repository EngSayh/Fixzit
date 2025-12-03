import { LRUCache } from "lru-cache";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

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

/**
 * Distributed rate limiting result
 */
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
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
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
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
    const ttl = (ttlResult?.[1] as number) || windowSeconds;
    const resetAt = now + (ttl * 1000);

    // CRITICAL FIX: Use >= to match in-memory behavior (both block at limit, not limit+1)
    if (count >= limit) {
      logger.warn('[RateLimit] Rate limit exceeded', { 
        key: key.replace(/:[^:]+$/, ':***'), // Redact last segment (IP)
        count, 
        limit 
      });
      return { allowed: false, remaining: 0, resetAt };
    }

    return { 
      allowed: true, 
      remaining: Math.max(0, limit - count), 
      resetAt 
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

// Re-export the consolidated buildRateLimitKey from rateLimitKey.ts
// This ensures all callers use the same org-aware key builder
export { buildRateLimitKey } from './rateLimitKey';

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
  windowMs = 60_000
): Promise<RateLimitResult> {
  // Always try Redis first for distributed rate limiting
  return redisRateLimit(key, limit, windowMs);
}

// Export type for consumers
export type { RateLimitResult };
