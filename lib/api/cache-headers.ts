/**
 * Cache Header Utilities for Marketplace/Souq Public Routes
 *
 * Provides X-Cache-Status headers for observability and cache hit ratio tracking.
 * Used by public routes that implement response caching.
 *
 * @module lib/api/cache-headers
 */

import { type NextResponse } from 'next/server';

export type CacheStatus = 'HIT' | 'MISS' | 'STALE' | 'BYPASS' | 'EXPIRED';

export interface CacheHeaders {
  /** Cache-Control directive */
  cacheControl: string;
  /** X-Cache-Status for observability */
  cacheStatus: CacheStatus;
  /** Optional: Time the response was cached */
  cacheDate?: string;
  /** Optional: Cache age in seconds */
  age?: number;
}

/**
 * Standard cache durations for different content types
 */
export const CACHE_DURATIONS = {
  /** Static product catalog: 5 minutes */
  CATALOG: 300,
  /** Search results: 1 minute */
  SEARCH: 60,
  /** Categories: 10 minutes */
  CATEGORIES: 600,
  /** Public assets: 1 hour */
  ASSETS: 3600,
  /** Dynamic pricing: 30 seconds */
  PRICING: 30,
  /** User-specific: no-store */
  PRIVATE: 0,
} as const;

/**
 * Apply cache headers to a NextResponse
 *
 * @param response - The NextResponse to add headers to
 * @param options - Cache header options
 * @returns The response with cache headers applied
 *
 * @example
 * ```ts
 * const response = NextResponse.json(products);
 * return applyCacheHeaders(response, {
 *   cacheStatus: 'HIT',
 *   maxAge: CACHE_DURATIONS.CATALOG,
 *   staleWhileRevalidate: 60
 * });
 * ```
 */
export function applyCacheHeaders(
  response: NextResponse,
  options: {
    cacheStatus: CacheStatus;
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  }
): NextResponse {
  const {
    cacheStatus,
    maxAge = 0,
    staleWhileRevalidate = 0,
    isPrivate = false,
  } = options;

  // Set X-Cache-Status for observability
  response.headers.set('X-Cache-Status', cacheStatus);

  // Build Cache-Control directive
  const directives: string[] = [];

  if (isPrivate) {
    directives.push('private', 'no-store');
  } else {
    directives.push('public');
    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);
    }
    if (staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }
  }

  response.headers.set('Cache-Control', directives.join(', '));

  // Add cache timestamp for debugging
  response.headers.set('X-Cache-Date', new Date().toISOString());

  return response;
}

/**
 * Create a simple in-memory cache key based on request params
 */
export function createCacheKey(
  route: string,
  params: Record<string, string | undefined>
): string {
  // Perf: avoid localeCompare + map chain in hot path (perf tests enforce <50ms for 1k calls)
  const keys = Object.keys(params);
  if (keys.length > 1) {
    keys.sort();
  }

  let suffix = "";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = params[key];
    if (value === undefined) continue;
    suffix += suffix ? `&${key}=${value}` : `${key}=${value}`;
  }

  return suffix ? `${route}?${suffix}` : `${route}?`;
}

/**
 * In-memory cache store for single-instance deployments.
 * For multi-instance scaling, consider MongoDB-backed cache or Vercel KV.
 */
const memoryCache = new Map<
  string,
  { data: unknown; expires: number; created: number }
>();

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): { data: T; age: number } | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.expires) {
    memoryCache.delete(key);
    return null;
  }

  return {
    data: cached.data as T,
    age: Math.floor((now - cached.created) / 1000),
  };
}

/**
 * Set cache data with TTL
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  const now = Date.now();
  memoryCache.set(key, {
    data,
    expires: now + ttlSeconds * 1000,
    created: now,
  });

  // Cleanup: limit cache size to 1000 entries
  if (memoryCache.size > 1000) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
}

/**
 * Clear entire cache or by prefix
 */
export function clearCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics for observability
 */
export function getCacheStats(): {
  size: number;
  hitRate: number;
  entries: Array<{ key: string; age: number; ttl: number }>;
} {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries()).map(([key, value]) => ({
    key,
    age: Math.floor((now - value.created) / 1000),
    ttl: Math.max(0, Math.floor((value.expires - now) / 1000)),
  }));

  return {
    size: memoryCache.size,
    hitRate: 0, // Would need request tracking to calculate
    entries,
  };
}
