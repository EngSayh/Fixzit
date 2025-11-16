/**
import logger from '@/lib/logger';

 * Redis Caching Layer
 * 
 * Provides a centralized caching mechanism using Redis for:
 * - Analytics data (5min TTL)
 * - Public jobs listings (15min TTL)
 * - ATS settings (60min TTL)
 * - Other frequently accessed data
 */

import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let isConnecting = false;
let warnedMissingRedis = false;

/**
 * Get or create Redis client connection
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (client && client.isOpen) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (!warnedMissingRedis && process.env.NODE_ENV !== 'test') {
      logger.warn('[Cache] REDIS_URL not configured. Falling back to in-memory execution.');
      warnedMissingRedis = true;
    }
    return null;
  }

  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return client && client.isOpen ? client : null;
  }

  try {
    isConnecting = true;

    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(50 * Math.pow(2, retries), 3000);
        }
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    client.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    client.on('end', () => {
      client = null;
    });

    await client.connect();
    return client;
  } catch (error) {
    logger.error('Redis connection error:', error);
    client = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Get cached data or execute function and cache result
 * 
 * @param key - Cache key (use namespaces like 'analytics:orgId:period')
 * @param ttl - Time to live in seconds
 * @param fn - Function to execute if cache miss
 * @returns Cached or fresh data
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const redis = await getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        logger.info(`📦 Cache HIT: ${key}`);
        return JSON.parse(cached) as T;
      }
      logger.info(`🔍 Cache MISS: ${key}`);
    } catch (error) {
      logger.error(`Cache read error for key ${key}:`, error);
    }
  }

  const data = await fn();

  if (redis && data !== null && data !== undefined) {
    try {
      await redis.setEx(key, ttl, JSON.stringify(data));
      logger.info(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache write error for key ${key}:`, error);
    }
  }

  return data;
}

/**
 * Invalidate cache by pattern
 * 
 * @param pattern - Redis key pattern (e.g., 'analytics:*', 'jobs:orgId:*')
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  let deleted = 0;
  try {
    const keys: string[] = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 200 })) {
      keys.push(String(key));
    }

    if (keys.length > 0) {
      // Redis del command accepts variable number of string arguments
      deleted = await redis.del(keys as [string, ...string[]]);
    }

    logger.info(deleted > 0
      ? `🗑️  Invalidated ${deleted} keys matching: ${pattern}`
      : `ℹ️  No keys found matching: ${pattern}`);
  } catch (error) {
    logger.error(`Error invalidating cache pattern ${pattern}:`, error);
  }
}

/**
 * Invalidate specific cache key
 * 
 * @param key - Exact cache key to invalidate
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const deleted = await redis.del(key);
    if (deleted > 0) {
      logger.info(`🗑️  Invalidated cache key: ${key}`);
    }
  } catch (error) {
    logger.error(`Error invalidating cache key ${key}:`, error);
  }
}

/**
 * Set cache value manually
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.setEx(key, ttl, JSON.stringify(value));
    logger.info(`💾 Set cache: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error(`Error setting cache key ${key}:`, error);
  }
}

/**
 * Get cache value manually
 * 
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
    logger.info(`🔍 Cache MISS: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Error getting cache key ${key}:`, error);
    return null;
  }
}

/**
 * Check Redis connection health
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return false;
    }
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Close Redis connection (useful for cleanup)
 */
export async function closeRedis(): Promise<void> {
  try {
    if (client && client.isOpen) {
      await client.quit();
      client = null;
      logger.info('👋 Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

/**
 * Common TTL values (in seconds)
 */
export const CacheTTL = {
  FIVE_MINUTES: 300,      // Analytics, real-time data
  FIFTEEN_MINUTES: 900,   // Public job listings
  ONE_HOUR: 3600,         // Settings, configurations
  ONE_DAY: 86400,         // Static content
  ONE_WEEK: 604800        // Reference data
} as const;
