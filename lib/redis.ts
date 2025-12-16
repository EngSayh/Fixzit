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
let warnedStub = false;

function ensureClient(): Redis {
  if (!redis) {
    metrics.connectionAttempts++;
    metrics.successfulConnections++;
    metrics.currentStatus = "ready";
    metrics.lastConnectedAt = new Date();
    redis = new Redis();
    if (!warnedStub) {
      logger.info("[Redis] External Redis removed — using in-memory stub");
      warnedStub = true;
    }
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
