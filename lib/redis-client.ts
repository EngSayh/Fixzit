/**
 * Redis Client Configuration
 * Used for caching, rate limiting, and BullMQ job queues
 * @module lib/redis-client
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
};

// Singleton Redis client instance
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 * @returns Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on('connect', () => {
      logger.info('🔴 Redis connected', { host: REDIS_CONFIG.host, port: REDIS_CONFIG.port });
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready for commands');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Connect to Redis (call during app startup)
 */
export async function connectRedis(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.connect();
    logger.info('Redis client connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

/**
 * Disconnect from Redis (call during app shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  },

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error });
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  },

  /**
   * Increment counter (useful for rate limiting)
   */
  async incr(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await client.incr(key);
    } catch (error) {
      logger.error('Cache increment error', { key, error });
      return 0;
    }
  },

  /**
   * Set expiry on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const client = getRedisClient();
      await client.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('Cache expire error', { key, error });
    }
  },
};

/**
 * Rate limiting helper
 */
export const rateLimit = {
  /**
   * Check if rate limit is exceeded
   * @param key - Unique identifier (e.g., `user:${userId}:api-call`)
   * @param limit - Max requests allowed in window
   * @param windowSeconds - Time window in seconds
   * @returns { allowed: boolean, remaining: number, resetAt: Date }
   */
  async check(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    try {
      const client = getRedisClient();
      const rateLimitKey = `ratelimit:${key}`;
      
      const current = await client.incr(rateLimitKey);
      
      if (current === 1) {
        await client.expire(rateLimitKey, windowSeconds);
      }
      
      const ttl = await client.ttl(rateLimitKey);
      const resetAt = new Date(Date.now() + ttl * 1000);
      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;
      
      return { allowed, remaining, resetAt };
    } catch (error) {
      logger.error('Rate limit check error', { key, error });
      // Fail open (allow request on error)
      return { allowed: true, remaining: limit, resetAt: new Date() };
    }
  },
};

export default {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  cache,
  rateLimit,
};
