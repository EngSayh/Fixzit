/**
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

/**
 * Get or create Redis client connection
 */
export async function getRedisClient(): Promise<RedisClientType> {
  // Return existing client if connected
  if (client && client.isOpen) {
    return client;
  }

  // Wait if connection is in progress
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return getRedisClient();
  }

  try {
    isConnecting = true;
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 3000ms
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(50 * Math.pow(2, retries), 3000);
        }
      }
    });

    // Error handling
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    await client.connect();
    isConnecting = false;
    
    return client;
  } catch (error) {
    isConnecting = false;
    console.error('Redis connection error:', error);
    // Return null client for graceful degradation
    throw error;
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
  try {
    const redis = await getRedisClient();
    
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }

    console.log(`🔍 Cache MISS: ${key}`);
    
    // Execute function and cache result
    const data = await fn();
    
    // Only cache if data is not null/undefined
    if (data !== null && data !== undefined) {
      await redis.setEx(key, ttl, JSON.stringify(data));
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
    }
    
    return data;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Graceful degradation: just execute function without caching
    return await fn();
  }
}

/**
 * Invalidate cache by pattern
 * 
 * @param pattern - Redis key pattern (e.g., 'analytics:*', 'jobs:orgId:*')
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    
    // Get all keys matching pattern
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`🗑️  Invalidated ${keys.length} keys matching: ${pattern}`);
    } else {
      console.log(`ℹ️  No keys found matching: ${pattern}`);
    }
  } catch (error) {
    console.error(`Error invalidating cache pattern ${pattern}:`, error);
    // Non-critical error, just log
  }
}

/**
 * Invalidate specific cache key
 * 
 * @param key - Exact cache key to invalidate
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    const deleted = await redis.del(key);
    
    if (deleted > 0) {
      console.log(`🗑️  Invalidated cache key: ${key}`);
    }
  } catch (error) {
    console.error(`Error invalidating cache key ${key}:`, error);
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
  try {
    const redis = await getRedisClient();
    await redis.setEx(key, ttl, JSON.stringify(value));
    console.log(`💾 Set cache: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Error setting cache key ${key}:`, error);
  }
}

/**
 * Get cache value manually
 * 
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }
    
    console.log(`🔍 Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`Error getting cache key ${key}:`, error);
    return null;
  }
}

/**
 * Check Redis connection health
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
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
      console.log('👋 Redis connection closed');
    }
  } catch (error) {
    console.error('Error closing Redis connection:', error);
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
