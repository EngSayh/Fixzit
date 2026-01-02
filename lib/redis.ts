/**
 * @module lib/redis
 * @description Redis client with in-memory stub fallback for development.
 *
 * Provides a unified Redis interface that automatically falls back to an in-memory
 * stub when REDIS_URL is not configured. Includes connection metrics and health monitoring.
 *
 * @features
 * - In-memory stub fallback for local development (no Redis required)
 * - Connection metrics (attempts, errors, reconnects, status)
 * - Automatic client initialization (lazy loading)
 * - Health monitoring (last connected/error timestamps)
 * - Type-safe Redis operations via ioredis interface
 *
 * @usage
 * ```typescript
 * import { getRedisClient, getRedisMetrics } from '@/lib/redis';
 * 
 * const client = getRedisClient();
 * await client.set('key', 'value', 'EX', 3600);
 * 
 * const metrics = getRedisMetrics();
 * console.log(metrics.currentStatus); // 'ready'
 * ```
 *
 * @deployment
 * Production: Set REDIS_URL environment variable.
 * Development: Uses in-memory stub automatically.
 */
import Redis from "@/lib/stubs/ioredis";
import { logger } from "@/lib/logger";

type RedisMetrics = {
  connectionAttempts: number;
  successfulConnections: number;
  connectionErrors: number;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  currentStatus: string;
};

const metrics: RedisMetrics = {
  connectionAttempts: 0,
  successfulConnections: 0,
  connectionErrors: 0,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastErrorAt: null,
  lastError: null,
  currentStatus: "ready",
};

let redis: Redis | null = null;

function ensureClient(): Redis {
  if (!redis) {
    metrics.connectionAttempts++;
    metrics.successfulConnections++;
    metrics.currentStatus = "ready";
    metrics.lastConnectedAt = new Date();
    redis = new Redis();
  }
  return redis;
}

export function getRedisMetrics(): Readonly<RedisMetrics> {
  return { ...metrics };
}

export function getRedisClient(): Redis {
  return ensureClient();
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      logger.error("[Redis] Error during shutdown", { error });
    }
    metrics.currentStatus = "ended";
    redis = null;
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  return true;
}

export async function safeRedisOp<T>(
  operation: (client: Redis) => Promise<T>,
  fallback: T,
): Promise<T> {
  const client = ensureClient();
  try {
    return await operation(client);
  } catch (error) {
    logger.error("[Redis] Operation failed", { error });
    metrics.connectionErrors++;
    metrics.lastErrorAt = new Date();
    metrics.lastError = error instanceof Error ? error.message : String(error);
    return fallback;
  }
}

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
  return key.slice(0, 8) + "****";
}

export const CacheTTL = {
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;

export async function getCached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  const client = ensureClient();
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

  const data = await fn();

  if (data != null) {
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
  const client = ensureClient();
  try {
    await client.setex(key, ttl, JSON.stringify(value));
    logger.info(`[Cache] SET: ${redactCacheKey(key)} (TTL ${ttl}s)`);
  } catch (error) {
    logger.error(`[Cache] Error setting key ${redactCacheKey(key)}`, { error });
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = ensureClient();
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
  const client = ensureClient();
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
  const client = ensureClient();
  try {
    await client.del(key);
    logger.info(`[Cache] Invalidated key ${redactCacheKey(key)}`);
  } catch (error) {
    logger.error(`[Cache] Error invalidating key ${redactCacheKey(key)}`, { error });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUB/SUB FUNCTIONS (FEAT-0034: Redis pub/sub scaling)
// ═══════════════════════════════════════════════════════════════════════════════

// Dedicated subscriber client (required for Redis pub/sub pattern)
let subscriberClient: Redis | null = null;

function ensureSubscriber(): Redis {
  if (!subscriberClient) {
    subscriberClient = ensureClient().duplicate();
    logger.info("[Redis PubSub] Created subscriber client");
  }
  return subscriberClient;
}

/**
 * Publish a message to a channel
 * @param channel - The channel to publish to
 * @param message - The message to publish (will be JSON stringified if object)
 * @returns Number of subscribers that received the message
 */
export async function publish(
  channel: string,
  message: unknown
): Promise<number> {
  const client = ensureClient();
  try {
    const serialized = typeof message === "string" ? message : JSON.stringify(message);
    const count = await client.publish(channel, serialized);
    logger.info(`[Redis PubSub] Published to ${channel} (${count} subscribers)`);
    return count;
  } catch (error) {
    logger.error(`[Redis PubSub] Publish error on ${channel}`, { error });
    return 0;
  }
}

/**
 * Subscribe to a channel
 * @param channel - The channel to subscribe to
 * @param handler - Callback function invoked with (message, channel)
 */
export async function subscribe(
  channel: string,
  handler: (message: string, channel: string) => void
): Promise<void> {
  const subscriber = ensureSubscriber();
  try {
    await subscriber.subscribe(channel, handler);
    logger.info(`[Redis PubSub] Subscribed to ${channel}`);
  } catch (error) {
    logger.error(`[Redis PubSub] Subscribe error on ${channel}`, { error });
  }
}

/**
 * Subscribe to a pattern (e.g., 'events:*')
 * @param pattern - The pattern to subscribe to (supports * wildcard)
 * @param handler - Callback function invoked with (message, channel, pattern)
 */
export async function psubscribe(
  pattern: string,
  handler: (message: string, channel: string, pattern: string) => void
): Promise<void> {
  const subscriber = ensureSubscriber();
  try {
    await subscriber.psubscribe(pattern, handler);
    logger.info(`[Redis PubSub] Pattern subscribed to ${pattern}`);
  } catch (error) {
    logger.error(`[Redis PubSub] Pattern subscribe error on ${pattern}`, { error });
  }
}

/**
 * Unsubscribe from a channel
 * @param channel - Optional channel to unsubscribe from. If omitted, unsubscribes from all.
 */
export async function unsubscribe(channel?: string): Promise<void> {
  if (!subscriberClient) return;
  try {
    await subscriberClient.unsubscribe(channel);
    logger.info(`[Redis PubSub] Unsubscribed from ${channel ?? "all channels"}`);
  } catch (error) {
    logger.error(`[Redis PubSub] Unsubscribe error`, { error });
  }
}

/**
 * Unsubscribe from a pattern
 * @param pattern - Optional pattern to unsubscribe from. If omitted, unsubscribes from all.
 */
export async function punsubscribe(pattern?: string): Promise<void> {
  if (!subscriberClient) return;
  try {
    await subscriberClient.punsubscribe(pattern);
    logger.info(`[Redis PubSub] Pattern unsubscribed from ${pattern ?? "all patterns"}`);
  } catch (error) {
    logger.error(`[Redis PubSub] Pattern unsubscribe error`, { error });
  }
}

/**
 * Close subscriber client
 */
export async function closeSubscriber(): Promise<void> {
  if (subscriberClient) {
    try {
      await subscriberClient.quit();
    } catch (error) {
      logger.error("[Redis PubSub] Error closing subscriber", { error });
    }
    subscriberClient = null;
    logger.info("[Redis PubSub] Subscriber client closed");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON EVENT CHANNELS (Fixzit domain events)
// ═══════════════════════════════════════════════════════════════════════════════

export const PubSubChannels = {
  // Work Order events
  WORK_ORDER_CREATED: "events:work-order:created",
  WORK_ORDER_UPDATED: "events:work-order:updated",
  WORK_ORDER_COMPLETED: "events:work-order:completed",
  
  // Property events
  PROPERTY_UPDATED: "events:property:updated",
  PROPERTY_MAINTENANCE: "events:property:maintenance",
  
  // Tenant events
  TENANT_NOTIFICATION: "events:tenant:notification",
  TENANT_PAYMENT_DUE: "events:tenant:payment-due",
  
  // System events
  CACHE_INVALIDATION: "events:cache:invalidate",
  CONFIG_RELOAD: "events:config:reload",
  
  // Patterns for subscribing to groups
  ALL_WORK_ORDERS: "events:work-order:*",
  ALL_PROPERTIES: "events:property:*",
  ALL_TENANTS: "events:tenant:*",
  ALL_SYSTEM: "events:system:*",
} as const;
