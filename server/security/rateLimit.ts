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

// Avoid log spam when Redis is unavailable
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
    const resetAt = now + windowMs;
    memoryCache.set(
      key,
      { count: 1, resetAt },
      { ttl: windowMs },
    );
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
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
    if (!warnedNoRedis) {
      logger.warn('[RateLimit] Redis unavailable, falling back to in-memory rate limiting');
      warnedNoRedis = true;
    }
    return rateLimit(key, limit, windowMs);
  }

  // Redis is back - reset warning flag
  warnedNoRedis = false;

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
      logger.warn('[RateLimit] Redis transaction returned unexpected results, falling back');
      return rateLimit(key, limit, windowMs);
    }

    const [countResult, , ttlResult] = results;
    const count = (countResult?.[1] as number) || 0;
    const ttl = (ttlResult?.[1] as number) || windowSeconds;
    const resetAt = now + (ttl * 1000);

    if (count > limit) {
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
    if (!warnedNoRedis) {
      logger.error('[RateLimit] Redis error, falling back to in-memory', { error });
      warnedNoRedis = true;
    }
    return rateLimit(key, limit, windowMs);
  }
}

/**
 * Create an org-aware rate limit key for tenant isolation
 * 
 * @param orgId - Organization ID for tenant scoping
 * @param clientIp - Client IP address
 * @param path - API path/endpoint
 * @returns Formatted rate limit key
 * 
 * @example
 * const key = buildRateLimitKey(orgId, clientIp, '/api/ats/analytics');
 * const { allowed } = await redisRateLimit(key, 60, 60_000);
 */
export function buildRateLimitKey(
  orgId: string | null | undefined, 
  clientIp: string, 
  path: string
): string {
  // Include orgId for tenant-aware rate limiting
  // This prevents one org from exhausting rate limits for another
  const org = orgId || 'anonymous';
  return `${org}:${path}:${clientIp}`;
}

// Test hook to reset internal state between unit tests
export function __resetRateLimitStateForTests() {
  warnedNoRedis = false;
  memoryCache.clear();
}
