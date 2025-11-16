import { logger } from '@/lib/logger';
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
 * @module lib/redis
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let isConnecting = false;

/**
 * Get or create singleton Redis connection
 * 
 * @returns Redis client instance or null if Redis is unavailable
 */
export function getRedisClient(): Redis | null {
  // Redis is optional - return null if no URL configured
  if (!process.env.REDIS_URL) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Redis] No REDIS_URL configured - Redis features disabled');
    }
    return null;
  }

  // Return existing connection if ready, connecting, or reconnecting
  if (redis && (redis.status === 'ready' || redis.status === 'connecting' || redis.status === 'reconnecting')) {
    return redis;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return null;
  }

  // Wrap Redis instantiation in try-catch to handle constructor errors
  try {
    isConnecting = true;
    
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false, // Fail fast if Redis is down
      retryStrategy(times) {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, max 2s
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        // Reconnect on specific errors
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(target => err.message.includes(target));
      }
    });

    redis.on('error', (err) => {
      logger.error('[Redis] Connection error:', {
        message: err.message,
        code: (err as { code?: string }).code,
        timestamp: new Date().toISOString()
      });
      // Reset isConnecting flag on error to allow retry attempts
      isConnecting = false;
    });

    redis.on('connect', () => {
      logger.info('[Redis] Connected successfully');
    });

    redis.on('ready', () => {
      logger.info('[Redis] Ready to accept commands');
      isConnecting = false;
    });

    redis.on('close', () => {
      logger.warn('[Redis] Connection closed');
      // Reset isConnecting flag on close to allow reconnection
      isConnecting = false;
    });

    redis.on('reconnecting', () => {
      logger.info('[Redis] Reconnecting...');
    });

    redis.on('end', () => {
      logger.info('[Redis] Connection ended');
      // Reset isConnecting flag when connection ends
      isConnecting = false;
    });

    return redis;
  } catch (error: unknown) {
    isConnecting = false;
    logger.error('[Redis] Failed to create connection:', { error });
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
      logger.info('[Redis] Connection closed gracefully');
    } catch (error) {
      logger.error('[Redis] Error closing connection:', { error });
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
    return result === 'PONG';
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
  // eslint-disable-next-line no-unused-vars
  operation: (client: Redis) => Promise<T>,
  fallback: T
): Promise<T> {
  const client = getRedisClient();
  if (!client) return fallback;

  try {
    return await operation(client);
  } catch (error) {
    logger.error('[Redis] Operation failed:', { error });
    return fallback;
  }
}
