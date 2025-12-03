import { LRUCache } from "lru-cache";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

// In-memory fallback cache for when Redis is unavailable
const cache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
});

// Track whether we've already warned about Redis unavailability
// to avoid log spam on every request
let warnedNoRedis = false;

/**
 * In-memory rate limiting (fallback when Redis is unavailable)
 * NOTE: This does NOT work across serverless function instances
 */
export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const entry = cache.get(key);
  if (!entry || now > entry.resetAt) {
    cache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Distributed rate limiting using Redis
 * Falls back to in-memory LRU cache if Redis is unavailable
 * 
 * @param key - Unique identifier for the rate limit (e.g., `route:ip` or `orgId:userId:action`)
 * @param limit - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Promise with { allowed, remaining } fields
 */
export async function redisRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      // Only warn once to avoid log spam
      if (!warnedNoRedis) {
        logger.warn("Redis unavailable for rate limiting, falling back to in-memory cache (this message will not repeat)");
        warnedNoRedis = true;
      }
      return rateLimit(key, limit, windowMs);
    }

    const redisKey = `ratelimit:${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    // Use Redis MULTI for atomic increment + expire
    const multi = redis.multi();
    multi.incr(redisKey);
    multi.expire(redisKey, windowSec);
    const results = await multi.exec();

    // node-redis v5 returns values directly: results[0] = count from INCR
    // (not [error, value] tuples like in older versions)
    const count = (results?.[0] as number) ?? 1;

    if (count > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: limit - count };
  } catch (error) {
    // Redis error - fall back to in-memory
    if (!warnedNoRedis) {
      logger.warn("Redis rate limit error, falling back to in-memory", { 
        error: error instanceof Error ? error.message : String(error)
      });
      warnedNoRedis = true;
    }
    return rateLimit(key, limit, windowMs);
  }
}
