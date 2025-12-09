/**
 * Health Check Cache
 * 
 * Prevents health check storms by caching results for a short TTL.
 * This protects against excessive DB/Redis pings when multiple load balancers
 * or Kubernetes pods are checking health simultaneously.
 * 
 * @module lib/health-cache
 */

// Cache TTL in milliseconds - configurable via env
const HEALTH_CACHE_TTL_MS = parseInt(process.env.HEALTH_CACHE_TTL_MS || "5000", 10);

// Separate TTL for ready endpoint (can be longer since it's for K8s)
const READY_CACHE_TTL_MS = parseInt(process.env.READY_CACHE_TTL_MS || "10000", 10);

interface CachedHealthResult<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for health results
let healthCache: CachedHealthResult<unknown> | null = null;
let readyCache: CachedHealthResult<unknown> | null = null;

/**
 * Get cached health check result if valid
 */
export function getCachedHealth<T>(): T | null {
  if (!healthCache) return null;
  if (Date.now() > healthCache.expiresAt) {
    healthCache = null;
    return null;
  }
  return healthCache.data as T;
}

/**
 * Cache health check result
 */
export function setCachedHealth<T>(data: T): void {
  const now = Date.now();
  healthCache = {
    data,
    timestamp: now,
    expiresAt: now + HEALTH_CACHE_TTL_MS,
  };
}

/**
 * Get cached ready check result if valid
 */
export function getCachedReady<T>(): T | null {
  if (!readyCache) return null;
  if (Date.now() > readyCache.expiresAt) {
    readyCache = null;
    return null;
  }
  return readyCache.data as T;
}

/**
 * Cache ready check result
 */
export function setCachedReady<T>(data: T): void {
  const now = Date.now();
  readyCache = {
    data,
    timestamp: now,
    expiresAt: now + READY_CACHE_TTL_MS,
  };
}

/**
 * Get cache statistics for monitoring
 */
export function getHealthCacheStats(): {
  healthCached: boolean;
  healthAge: number | null;
  readyCached: boolean;
  readyAge: number | null;
  healthTtlMs: number;
  readyTtlMs: number;
} {
  const now = Date.now();
  return {
    healthCached: healthCache !== null && now < healthCache.expiresAt,
    healthAge: healthCache ? now - healthCache.timestamp : null,
    readyCached: readyCache !== null && now < readyCache.expiresAt,
    readyAge: readyCache ? now - readyCache.timestamp : null,
    healthTtlMs: HEALTH_CACHE_TTL_MS,
    readyTtlMs: READY_CACHE_TTL_MS,
  };
}

/**
 * Clear all health caches (for testing)
 */
export function clearHealthCache(): void {
  healthCache = null;
  readyCache = null;
}
