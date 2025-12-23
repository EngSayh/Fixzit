/**
 * @fileoverview SWR (Stale-While-Revalidate) Cache Service
 * @module lib/cache/swr-cache
 *
 * Provides stale-while-revalidate caching semantics on top of Redis/in-memory store.
 * Serves stale data immediately while revalidating in the background.
 *
 * @features
 * - SWR semantics: serve stale, revalidate async
 * - Configurable stale/max-age times
 * - Background revalidation
 * - Deduplication of in-flight requests
 * - Cache key prefixing and namespacing
 * - Metrics and monitoring
 * - Graceful fallback on cache errors
 *
 * @usage
 * ```typescript
 * const cache = new SwrCache('products', { staleTime: 60, maxAge: 300 });
 * const data = await cache.get('product:123', () => fetchProduct(123));
 * ```
 */

import { getRedisClient, CacheTTL } from "@/lib/redis";
import { logger } from "@/lib/logger";

/**
 * SWR cache configuration
 */
export interface SwrCacheConfig {
  /** Time in seconds data is considered fresh (default: 60) */
  staleTime: number;
  /** Maximum time in seconds to cache data (default: 300) */
  maxAge: number;
  /** Prefix for all cache keys */
  prefix: string;
  /** Whether to log cache operations (default: false in production) */
  debug?: boolean;
  /** Whether to deduplicate concurrent requests for same key (default: true) */
  dedupe?: boolean;
}

/**
 * Cached entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  staleTime: number;
  maxAge: number;
}

/**
 * Cache operation result
 */
export interface SwrCacheResult<T> {
  data: T;
  stale: boolean;
  fromCache: boolean;
  revalidating: boolean;
}

/**
 * SWR cache metrics
 */
export interface SwrCacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  revalidations: number;
  errors: number;
  dedupeHits: number;
}

const DEFAULT_CONFIG: SwrCacheConfig = {
  staleTime: 60,
  maxAge: 300,
  prefix: "swr",
  debug: process.env.NODE_ENV === "development",
  dedupe: true,
};

/**
 * In-flight requests map for deduplication
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Global metrics
 */
const globalMetrics: SwrCacheMetrics = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  revalidations: 0,
  errors: 0,
  dedupeHits: 0,
};

/**
 * SWR Cache instance
 */
export class SwrCache {
  private config: SwrCacheConfig;
  private metrics: SwrCacheMetrics;

  constructor(namespace: string, config: Partial<SwrCacheConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      prefix: `${DEFAULT_CONFIG.prefix}:${namespace}`,
    };
    this.metrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      revalidations: 0,
      errors: 0,
      dedupeHits: 0,
    };
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  /**
   * Log debug message if debug mode enabled
   */
  private log(message: string, meta?: Record<string, unknown>): void {
    if (this.config.debug) {
      logger.debug(`[SwrCache] ${message}`, { prefix: this.config.prefix, ...meta });
    }
  }

  /**
   * Check if entry is stale
   */
  private isStale(entry: CacheEntry<unknown>): boolean {
    const now = Date.now();
    const age = (now - entry.cachedAt) / 1000;
    return age > entry.staleTime;
  }

  /**
   * Check if entry is expired (beyond max age)
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    const now = Date.now();
    const age = (now - entry.cachedAt) / 1000;
    return age > entry.maxAge;
  }

  /**
   * Get data with SWR semantics
   *
   * @param key - Cache key
   * @param fetcher - Function to fetch fresh data
   * @param options - Override config for this request
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<Pick<SwrCacheConfig, "staleTime" | "maxAge">>
  ): Promise<SwrCacheResult<T>> {
    const fullKey = this.buildKey(key);
    const staleTime = options?.staleTime ?? this.config.staleTime;
    const maxAge = options?.maxAge ?? this.config.maxAge;

    try {
      const client = getRedisClient();
      const cachedStr = await client.get(fullKey);

      if (cachedStr) {
        const entry = JSON.parse(cachedStr) as CacheEntry<T>;

        // Check if expired (beyond max age)
        if (this.isExpired(entry)) {
          this.log("EXPIRED", { key });
          return this.fetchAndCache(fullKey, key, fetcher, staleTime, maxAge);
        }

        // Check if stale (needs revalidation)
        if (this.isStale(entry)) {
          this.metrics.staleHits++;
          globalMetrics.staleHits++;
          this.log("STALE HIT - revalidating", { key });

          // Trigger background revalidation
          this.revalidate(fullKey, key, fetcher, staleTime, maxAge);

          return {
            data: entry.data,
            stale: true,
            fromCache: true,
            revalidating: true,
          };
        }

        // Fresh cache hit
        this.metrics.hits++;
        globalMetrics.hits++;
        this.log("HIT", { key });

        return {
          data: entry.data,
          stale: false,
          fromCache: true,
          revalidating: false,
        };
      }

      // Cache miss
      this.metrics.misses++;
      globalMetrics.misses++;
      this.log("MISS", { key });

      return this.fetchAndCache(fullKey, key, fetcher, staleTime, maxAge);
    } catch (error) {
      this.metrics.errors++;
      globalMetrics.errors++;
      logger.error("[SwrCache] Error reading cache", { key, error });

      // Fallback to direct fetch
      const data = await fetcher();
      return {
        data,
        stale: false,
        fromCache: false,
        revalidating: false,
      };
    }
  }

  /**
   * Fetch fresh data and cache it
   */
  private async fetchAndCache<T>(
    fullKey: string,
    key: string,
    fetcher: () => Promise<T>,
    staleTime: number,
    maxAge: number
  ): Promise<SwrCacheResult<T>> {
    // Check for in-flight request (deduplication)
    if (this.config.dedupe && inFlightRequests.has(fullKey)) {
      this.metrics.dedupeHits++;
      globalMetrics.dedupeHits++;
      this.log("DEDUPE HIT", { key });
      const data = (await inFlightRequests.get(fullKey)) as T;
      return {
        data,
        stale: false,
        fromCache: false,
        revalidating: false,
      };
    }

    // Create promise for deduplication
    const fetchPromise = fetcher();

    if (this.config.dedupe) {
      inFlightRequests.set(fullKey, fetchPromise);
    }

    try {
      const data = await fetchPromise;

      // Cache the result
      const entry: CacheEntry<T> = {
        data,
        cachedAt: Date.now(),
        staleTime,
        maxAge,
      };

      const client = getRedisClient();
      await client.setex(fullKey, maxAge, JSON.stringify(entry));
      this.log("SET", { key, staleTime, maxAge });

      return {
        data,
        stale: false,
        fromCache: false,
        revalidating: false,
      };
    } finally {
      if (this.config.dedupe) {
        inFlightRequests.delete(fullKey);
      }
    }
  }

  /**
   * Background revalidation
   */
  private revalidate<T>(
    fullKey: string,
    key: string,
    fetcher: () => Promise<T>,
    staleTime: number,
    maxAge: number
  ): void {
    this.metrics.revalidations++;
    globalMetrics.revalidations++;

    // Don't await - run in background
    this.fetchAndCache(fullKey, key, fetcher, staleTime, maxAge).catch((error) => {
      logger.error("[SwrCache] Background revalidation failed", { key, error });
    });
  }

  /**
   * Invalidate cache for a key
   */
  async invalidate(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    try {
      const client = getRedisClient();
      await client.del(fullKey);
      this.log("INVALIDATE", { key });
    } catch (error) {
      logger.error("[SwrCache] Error invalidating", { key, error });
    }
  }

  /**
   * Invalidate all cache for this namespace
   */
  async invalidateAll(): Promise<void> {
    try {
      const client = getRedisClient();
      const pattern = `${this.config.prefix}:*`;
      const keys: string[] = [];

      const stream = client.scanStream({ match: pattern, count: 200 });
      for await (const chunk of stream as AsyncIterable<string[]>) {
        keys.push(...chunk);
      }

      if (keys.length > 0) {
        await client.del(...keys);
        this.log("INVALIDATE ALL", { count: keys.length });
      }
    } catch (error) {
      logger.error("[SwrCache] Error invalidating all", { error });
    }
  }

  /**
   * Get cache metrics for this instance
   */
  getMetrics(): SwrCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      revalidations: 0,
      errors: 0,
      dedupeHits: 0,
    };
  }
}

/**
 * Get global SWR cache metrics
 */
export function getSwrCacheMetrics(): SwrCacheMetrics {
  return { ...globalMetrics };
}

/**
 * Reset global metrics
 */
export function resetSwrCacheMetrics(): void {
  globalMetrics.hits = 0;
  globalMetrics.misses = 0;
  globalMetrics.staleHits = 0;
  globalMetrics.revalidations = 0;
  globalMetrics.errors = 0;
  globalMetrics.dedupeHits = 0;
}

// Pre-configured cache instances for common use cases
export const caches = {
  /** Dashboard data - 1 min stale, 5 min max */
  dashboard: new SwrCache("dashboard", {
    staleTime: 60,
    maxAge: 300,
  }),

  /** Work orders list - 30 sec stale, 2 min max */
  workOrders: new SwrCache("work-orders", {
    staleTime: 30,
    maxAge: 120,
  }),

  /** Properties - 2 min stale, 10 min max */
  properties: new SwrCache("properties", {
    staleTime: 120,
    maxAge: 600,
  }),

  /** Reports/analytics - 5 min stale, 30 min max */
  reports: new SwrCache("reports", {
    staleTime: 300,
    maxAge: 1800,
  }),

  /** User preferences - 10 min stale, 1 hour max */
  preferences: new SwrCache("preferences", {
    staleTime: 600,
    maxAge: 3600,
  }),

  /** Marketplace products - 1 min stale, 5 min max */
  products: new SwrCache("products", {
    staleTime: 60,
    maxAge: 300,
  }),
};

export { CacheTTL };
