/**
 * @module lib/cache
 * @description In-memory cache helpers with TTL support.
 *
 * Provides a unified cache interface used across API routes and services.
 * All cache data is stored in-process (single-instance).
 */
import { MemoryKV } from "@/lib/memory-kv";
import { logger } from "@/lib/logger";

type CacheMetrics = {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  errors: number;
  lastErrorAt: Date | null;
  lastError: string | null;
};

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  writes: 0,
  deletes: 0,
  errors: 0,
  lastErrorAt: null,
  lastError: null,
};

const cache = new MemoryKV();

export function getCacheClient(): MemoryKV {
  return cache;
}

export function getCacheMetrics(): Readonly<CacheMetrics> {
  return { ...metrics };
}

function recordError(error: unknown): void {
  metrics.errors += 1;
  metrics.lastErrorAt = new Date();
  metrics.lastError = error instanceof Error ? error.message : String(error);
}

function redactCacheKey(key: string): string {
  const parts = key.split(":");
  if (parts.length > 1) {
    return parts
      .map((part, i) => (i === 0 || i === parts.length - 1 ? part : `${part.slice(0, 4)}****`))
      .join(":");
  }
  return `${key.slice(0, 8)}****`;
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
  try {
    const cached = await cache.get(key);
    if (cached) {
      metrics.hits += 1;
      logger.info(`[Cache] HIT: ${redactCacheKey(key)}`);
      return JSON.parse(cached) as T;
    }
    metrics.misses += 1;
    logger.info(`[Cache] MISS: ${redactCacheKey(key)}`);
  } catch (error) {
    recordError(error);
    logger.error(`[Cache] Read error for key ${redactCacheKey(key)}`, { error });
  }

  const data = await fn();

  if (data != null) {
    try {
      await cache.setex(key, ttl, JSON.stringify(data));
      metrics.writes += 1;
      logger.info(`[Cache] SET: ${redactCacheKey(key)} (TTL ${ttl}s)`);
    } catch (error) {
      recordError(error);
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
  try {
    await cache.setex(key, ttl, JSON.stringify(value));
    metrics.writes += 1;
    logger.info(`[Cache] SET: ${redactCacheKey(key)} (TTL ${ttl}s)`);
  } catch (error) {
    recordError(error);
    logger.error(`[Cache] Error setting key ${redactCacheKey(key)}`, { error });
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await cache.get(key);
    if (cached) {
      metrics.hits += 1;
      logger.info(`[Cache] HIT: ${redactCacheKey(key)}`);
      return JSON.parse(cached) as T;
    }
    metrics.misses += 1;
    logger.info(`[Cache] MISS: ${redactCacheKey(key)}`);
    return null;
  } catch (error) {
    recordError(error);
    logger.error(`[Cache] Error reading key ${redactCacheKey(key)}`, { error });
    return null;
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys: string[] = [];
  try {
    const stream = cache.scanStream({ match: pattern, count: 200 });
    for await (const chunk of stream as AsyncIterable<string[]>) {
      keys.push(...chunk);
    }

    if (keys.length > 0) {
      await cache.del(...keys);
      metrics.deletes += keys.length;
      logger.info(
        `[Cache] Invalidated ${keys.length} keys for pattern ${redactCacheKey(pattern)}`
      );
    } else {
      logger.info(`[Cache] No keys found for pattern ${redactCacheKey(pattern)}`);
    }
  } catch (error) {
    recordError(error);
    logger.error(`[Cache] Error invalidating pattern ${redactCacheKey(pattern)}`, { error });
  }
}

export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    await cache.del(key);
    metrics.deletes += 1;
    logger.info(`[Cache] Invalidated key ${redactCacheKey(key)}`);
  } catch (error) {
    recordError(error);
    logger.error(`[Cache] Error invalidating key ${redactCacheKey(key)}`, { error });
  }
}
