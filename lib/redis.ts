/**
 * Redis Singleton Connection Pool
 *
 * SECURITY & PERFORMANCE FIX:
 * Historical context: app/api/support/incidents/route.ts created new Redis()
 * connection per request, then called quit(), exhausting connection pools
 * and causing performance degradation.
 *
 * This singleton pattern:
 * - Reuses single connection across all requests
 * - Prevents connection exhaustion
 * - Automatically reconnects on failure
 * - Gracefully handles Redis unavailability
 *
 * IMPORTANT: This module uses dynamic require() to avoid bundling ioredis
 * into Edge/client bundles. The 'dns' module required by ioredis is not
 * available in Edge runtime.
 *
 * @module lib/redis
 */

import { logger } from "@/lib/logger";

// Use 'any' for Redis types to avoid importing ioredis at module level
// which would cause webpack to bundle it for Edge runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisCtor = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisInstance = any;

let RedisModule: RedisCtor | null = null;
let redis: RedisInstance | null = null;
let isConnecting = false;
let loggedMissingRedisUrl = false;

function isEdgeRuntime(): boolean {
  // Edge runtime sets global EdgeRuntime
  return typeof (globalThis as Record<string, unknown>).EdgeRuntime !== "undefined" ||
    process?.env?.NEXT_RUNTIME === "edge";
}

function getRedisCtor(): RedisCtor | null {
  if (RedisModule) return RedisModule;
  if (typeof require === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("ioredis");
    RedisModule = mod.default || mod;
    return RedisModule;
  } catch (error) {
    logger.warn("[Redis] ioredis not available in this runtime", { error });
    return null;
  }
}

/**
 * Get or create singleton Redis connection
 *
 * @returns Redis client instance or null if Redis is unavailable
 */
export function getRedisClient(): RedisInstance | null {
  // Never attempt Redis on Edge runtime
  if (isEdgeRuntime()) {
    return null;
  }

  // Redis is optional - return null if no URL configured
  // Support REDIS_URL, OTP_STORE_REDIS_URL, and BULLMQ_REDIS_URL for compatibility
  // with different deployment configs (OTP store, BullMQ queues, general caching)
  const redisUrl = process.env.REDIS_URL || process.env.OTP_STORE_REDIS_URL || process.env.BULLMQ_REDIS_URL;
  if (!redisUrl) {
    if (!loggedMissingRedisUrl) {
      logger.warn("[Redis] No REDIS_URL, OTP_STORE_REDIS_URL, or BULLMQ_REDIS_URL configured - Redis-backed features disabled");
      loggedMissingRedisUrl = true;
    }
    return null;
  }

  const RedisCtorLocal = getRedisCtor();
  if (!RedisCtorLocal) {
    return null;
  }

  // Return existing connection if ready, connecting, or reconnecting
  if (
    redis &&
    (redis.status === "ready" ||
      redis.status === "connecting" ||
      redis.status === "reconnecting")
  ) {
    return redis;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return null;
  }

  // Wrap Redis instantiation in try-catch to handle constructor errors
  try {
    isConnecting = true;

    redis = new RedisCtorLocal(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false, // Fail fast if Redis is down
      retryStrategy(times: number) {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 2s
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err: Error) {
        // Reconnect on specific errors
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((target) => err.message.includes(target));
      },
    });

    redis.on("error", (err: Error) => {
      logger.error("[Redis] Connection error:", {
        message: err.message,
        code: (err as { code?: string }).code,
        timestamp: new Date().toISOString(),
      });
      // Reset isConnecting flag on error to allow retry attempts
      isConnecting = false;
    });

    redis.on("connect", () => {
      logger.info("[Redis] Connected successfully");
    });

    redis.on("ready", () => {
      logger.info("[Redis] Ready to accept commands");
      isConnecting = false;
    });

    redis.on("close", () => {
      logger.warn("[Redis] Connection closed");
      // Reset isConnecting flag on close to allow reconnection
      isConnecting = false;
    });

    redis.on("reconnecting", () => {
      logger.info("[Redis] Reconnecting...");
    });

    redis.on("end", () => {
      logger.info("[Redis] Connection ended");
      // Reset isConnecting flag when connection ends
      isConnecting = false;
    });

    return redis;
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    isConnecting = false;
    logger.error("[Redis] Failed to create connection:", { error });
    return null;
  }
}

/**
 * Gracefully close Redis connection
 * Call this during application shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      redis = null;
      logger.info("[Redis] Connection closed gracefully");
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      logger.error("[Redis] Error closing connection:", { error });
      // Force disconnect if graceful close fails
      if (redis) {
        redis.disconnect();
      }
      redis = null;
    }
  }
}

/**
 * Health check for Redis connection
 *
 * @returns true if Redis is connected and responding, false otherwise
 */
export async function isRedisHealthy(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

/**
 * Safe Redis operation wrapper with automatic fallback
 *
 * @param operation - Async function that performs Redis operation
 * @param fallback - Value to return if Redis fails
 * @returns Operation result or fallback value
 *
 * @example
 * const value = await safeRedisOp(
 *   async (client) => client.get('key'),
 *   null // fallback value
 * );
 */
export async function safeRedisOp<T>(
  operation: (client: RedisInstance) => Promise<T>,
  fallback: T,
): Promise<T> {
  const client = getRedisClient();
  if (!client) return fallback;

  try {
    return await operation(client);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[Redis] Operation failed:", { error });
    return fallback;
  }
}

// =============================================================================
// Cache helpers (shared ioredis client)
// =============================================================================

/**
 * Redact sensitive parts of cache keys for logging.
 * Prevents ID enumeration attacks by masking middle segments of keys.
 * 
 * @param key - The cache key to redact
 * @returns Redacted key safe for logging
 * 
 * @example
 * redactCacheKey("seller:12345:balance") // "seller:1234****:balance"
 * redactCacheKey("analytics:org123:30") // "analytics:org1****:30"
 */
function redactCacheKey(key: string): string {
  const parts = key.split(":");
  if (parts.length > 1) {
    return parts
      .map((part, i) =>
        i === 0 || i === parts.length - 1
          ? part
          : part.slice(0, 4) + "****"
      )
      .join(":");
  }
  // Fallback: show first 8 chars + mask
  return key.slice(0, 8) + "****";
}

export const CacheTTL = {
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

/**
 * Get cached value or compute/store using provided function.
 */
/**
 * Get cached value or compute/store using provided function.
 * 
 * @param key - Cache key (will be redacted in logs)
 * @param ttl - Time to live in seconds
 * @param fn - Function to compute value on cache miss
 * @returns Cached or computed value
 * 
 * @example
 * const balance = await getCached(
 *   `seller:${sellerId}:balance`,
 *   CacheTTL.FIVE_MINUTES,
 *   () => calculateBalance(sellerId)
 * );
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(key);
      if (cached) {
        logger.info(`[Cache] HIT: ${redactCacheKey(key)}`);
        return JSON.parse(cached) as T;
      }
      logger.info(`[Cache] MISS: ${redactCacheKey(key)}`);
    } catch (error) {
      logger.error(`[Cache] Read error for key ${redactCacheKey(key)}`, { error });
    }
  }

  const data = await fn();

  // Use != null to prevent caching null values (which would mask "not found" states)
  if (client && data != null) {
    try {
      await client.setex(key, ttl, JSON.stringify(data));
      logger.info(`[Cache] SET: ${redactCacheKey(key)} (TTL ${ttl}s)`);
    } catch (error) {
      logger.error(`[Cache] Write error for key ${redactCacheKey(key)}`, { error });
    }
  }

  return data;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttl: number,
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.setex(key, ttl, JSON.stringify(value));
    logger.info(`[Cache] SET: ${redactCacheKey(key)} (TTL ${ttl}s)`);
  } catch (error) {
    logger.error(`[Cache] Error setting key ${redactCacheKey(key)}`, { error });
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const cached = await client.get(key);
    if (cached) {
      logger.info(`[Cache] HIT: ${redactCacheKey(key)}`);
      return JSON.parse(cached) as T;
    }
    logger.info(`[Cache] MISS: ${redactCacheKey(key)}`);
    return null;
  } catch (error) {
    logger.error(`[Cache] Error reading key ${redactCacheKey(key)}`, { error });
    return null;
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const keys: string[] = [];
  try {
    const stream = client.scanStream({ match: pattern, count: 200 });
    for await (const chunk of stream as AsyncIterable<string[]>) {
      keys.push(...chunk);
    }

    if (keys.length > 0) {
      await client.del(...keys);
      logger.info(`[Cache] Invalidated ${keys.length} keys for pattern ${redactCacheKey(pattern)}`);
    } else {
      logger.info(`[Cache] No keys found for pattern ${redactCacheKey(pattern)}`);
    }
  } catch (error) {
    logger.error(`[Cache] Error invalidating pattern ${redactCacheKey(pattern)}`, { error });
  }
}

export async function invalidateCacheKey(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
    logger.info(`[Cache] Invalidated key ${redactCacheKey(key)}`);
  } catch (error) {
    logger.error(`[Cache] Error invalidating key ${redactCacheKey(key)}`, { error });
  }
}
