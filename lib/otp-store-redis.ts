/**
 * Redis-backed OTP Store for Multi-Instance Deployments
 *
 * Provides distributed state management for:
 * - OTP codes (with automatic TTL expiry)
 * - Rate limiting (atomic increments with window reset)
 * - OTP login sessions (server-side session tokens)
 *
 * Key Features:
 * - Automatic fallback to in-memory when Redis unavailable
 * - Atomic operations for rate limiting
 * - TTL-based auto-expiry (no cleanup cron needed)
 * - JSON serialization for complex data structures
 *
 * Key Namespacing:
 * - otp:{identifier} - OTP data
 * - ratelimit:otp:{identifier} - Rate limit counters
 * - otpsession:{token} - OTP login sessions
 *
 * @module lib/otp-store-redis
 */

import { logger } from "@/lib/logger";
import { getRedisClient, safeRedisOp } from "@/lib/redis";
import type Redis from "ioredis";

// Re-export types from otp-store for compatibility
export interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
  userId: string;
  phone: string;
  companyCode?: string | null;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
}

export interface OTPLoginSession {
  userId: string;
  identifier: string;
  expiresAt: number;
}

// Constants (imported from otp-store for consistency)
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_SENDS_PER_WINDOW = 5;
export const OTP_SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Key prefixes for Redis namespacing
const KEY_PREFIX = {
  OTP: "otp:",
  RATE_LIMIT: "ratelimit:otp:",
  SESSION: "otpsession:",
} as const;

// In-memory fallbacks (used when Redis unavailable)
const memoryOtpStore = new Map<string, OTPData>();
const memoryRateLimitStore = new Map<string, RateLimitData>();
const memorySessionStore = new Map<string, OTPLoginSession>();

let warnedMemoryFallback = false;

/**
 * Check if Redis is available for OTP storage
 */
function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client !== null && (client.status === "ready" || client.status === "connecting");
}

/**
 * Log warning when falling back to in-memory storage
 */
function warnMemoryFallback(): void {
  if (!warnedMemoryFallback && process.env.NODE_ENV === "production") {
    logger.warn(
      "[OTP Redis] Redis unavailable, falling back to in-memory storage. " +
      "OTP state will NOT be shared across instances. " +
      "Set REDIS_URL or OTP_STORE_REDIS_URL for distributed deployments."
    );
    warnedMemoryFallback = true;
  }
}

// ============================================================================
// OTP STORE
// ============================================================================

/**
 * Redis-backed OTP store with in-memory fallback
 */
export const redisOtpStore = {
  /**
   * Get OTP data by identifier
   */
  async get(identifier: string): Promise<OTPData | undefined> {
    const client = getRedisClient();
    if (client) {
      const data = await safeRedisOp(
        async (c: Redis) => c.get(`${KEY_PREFIX.OTP}${identifier}`),
        null
      );
      if (data) {
        try {
          return JSON.parse(data) as OTPData;
        } catch {
          logger.error("[OTP Redis] Failed to parse OTP data", { identifier });
        }
      }
      return undefined;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    const memData = memoryOtpStore.get(identifier);
    if (memData && Date.now() > memData.expiresAt) {
      memoryOtpStore.delete(identifier);
      return undefined;
    }
    return memData;
  },

  /**
   * Store OTP data with TTL
   */
  async set(identifier: string, data: OTPData): Promise<void> {
    const ttlMs = data.expiresAt - Date.now();
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    const client = getRedisClient();
    if (client) {
      await safeRedisOp(
        async (c: Redis) => c.setex(
          `${KEY_PREFIX.OTP}${identifier}`,
          ttlSec,
          JSON.stringify(data)
        ),
        undefined
      );
      return;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    memoryOtpStore.set(identifier, data);
  },

  /**
   * Delete OTP data
   */
  async delete(identifier: string): Promise<void> {
    const client = getRedisClient();
    if (client) {
      await safeRedisOp(
        async (c: Redis) => c.del(`${KEY_PREFIX.OTP}${identifier}`),
        0
      );
      return;
    }

    // Fallback to in-memory
    memoryOtpStore.delete(identifier);
  },

  /**
   * Update OTP data (e.g., increment attempts)
   * Re-sets with remaining TTL
   */
  async update(identifier: string, data: OTPData): Promise<void> {
    const client = getRedisClient();
    if (client) {
      // Get remaining TTL
      const ttl = await safeRedisOp(
        async (c: Redis) => c.ttl(`${KEY_PREFIX.OTP}${identifier}`),
        -1
      );
      const ttlSec = ttl > 0 ? ttl : Math.ceil(OTP_EXPIRY_MS / 1000);

      await safeRedisOp(
        async (c: Redis) => c.setex(
          `${KEY_PREFIX.OTP}${identifier}`,
          ttlSec,
          JSON.stringify(data)
        ),
        undefined
      );
      return;
    }

    // Fallback to in-memory
    memoryOtpStore.set(identifier, data);
  },
};

// ============================================================================
// RATE LIMIT STORE
// ============================================================================

/**
 * Redis-backed rate limit store with in-memory fallback
 */
export const redisRateLimitStore = {
  /**
   * Get rate limit data by identifier
   */
  async get(identifier: string): Promise<RateLimitData | undefined> {
    const client = getRedisClient();
    if (client) {
      const data = await safeRedisOp(
        async (c: Redis) => c.get(`${KEY_PREFIX.RATE_LIMIT}${identifier}`),
        null
      );
      if (data) {
        try {
          return JSON.parse(data) as RateLimitData;
        } catch {
          logger.error("[OTP Redis] Failed to parse rate limit data", { identifier });
        }
      }
      return undefined;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    const memData = memoryRateLimitStore.get(identifier);
    if (memData && Date.now() > memData.resetAt) {
      memoryRateLimitStore.delete(identifier);
      return undefined;
    }
    return memData;
  },

  /**
   * Store rate limit data with TTL
   */
  async set(identifier: string, data: RateLimitData): Promise<void> {
    const ttlMs = data.resetAt - Date.now();
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    const client = getRedisClient();
    if (client) {
      await safeRedisOp(
        async (c: Redis) => c.setex(
          `${KEY_PREFIX.RATE_LIMIT}${identifier}`,
          ttlSec,
          JSON.stringify(data)
        ),
        undefined
      );
      return;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    memoryRateLimitStore.set(identifier, data);
  },

  /**
   * Atomic increment for rate limiting
   * Returns new count and whether limit was exceeded
   */
  async increment(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ count: number; allowed: boolean; remaining: number }> {
    const key = `${KEY_PREFIX.RATE_LIMIT}${identifier}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const client = getRedisClient();
    if (client) {
      // Use MULTI for atomic increment + TTL set
      const result = await safeRedisOp(
        async (c: Redis) => {
          const multi = c.multi();
          multi.incr(key);
          multi.ttl(key);
          const results = await multi.exec();
          if (!results) return null;

          const count = (results[0]?.[1] as number) || 0;
          const ttl = (results[1]?.[1] as number) || -1;

          // Set TTL on first increment (when TTL is -1 or -2)
          if (ttl < 0) {
            await c.expire(key, windowSec);
          }

          return count;
        },
        null
      );

      if (result !== null) {
        const allowed = result <= limit;
        return {
          count: result,
          allowed,
          remaining: Math.max(0, limit - result),
        };
      }
    }

    // Fallback to in-memory
    warnMemoryFallback();
    const now = Date.now();
    let data = memoryRateLimitStore.get(identifier);

    if (!data || now > data.resetAt) {
      data = { count: 1, resetAt: now + windowMs };
      memoryRateLimitStore.set(identifier, data);
      return { count: 1, allowed: true, remaining: limit - 1 };
    }

    data.count += 1;
    const allowed = data.count <= limit;
    return {
      count: data.count,
      allowed,
      remaining: Math.max(0, limit - data.count),
    };
  },
};

// ============================================================================
// OTP SESSION STORE
// ============================================================================

/**
 * Redis-backed OTP session store with in-memory fallback
 */
export const redisOtpSessionStore = {
  /**
   * Get session by token
   */
  async get(token: string): Promise<OTPLoginSession | undefined> {
    const client = getRedisClient();
    if (client) {
      const data = await safeRedisOp(
        async (c: Redis) => c.get(`${KEY_PREFIX.SESSION}${token}`),
        null
      );
      if (data) {
        try {
          return JSON.parse(data) as OTPLoginSession;
        } catch {
          logger.error("[OTP Redis] Failed to parse session data", { tokenPrefix: token.slice(0, 8) });
        }
      }
      return undefined;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    const memData = memorySessionStore.get(token);
    if (memData && Date.now() > memData.expiresAt) {
      memorySessionStore.delete(token);
      return undefined;
    }
    return memData;
  },

  /**
   * Store session with TTL
   */
  async set(token: string, data: OTPLoginSession): Promise<void> {
    const ttlMs = data.expiresAt - Date.now();
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    const client = getRedisClient();
    if (client) {
      await safeRedisOp(
        async (c: Redis) => c.setex(
          `${KEY_PREFIX.SESSION}${token}`,
          ttlSec,
          JSON.stringify(data)
        ),
        undefined
      );
      return;
    }

    // Fallback to in-memory
    warnMemoryFallback();
    memorySessionStore.set(token, data);
  },

  /**
   * Delete session (single-use token pattern)
   */
  async delete(token: string): Promise<void> {
    const client = getRedisClient();
    if (client) {
      await safeRedisOp(
        async (c: Redis) => c.del(`${KEY_PREFIX.SESSION}${token}`),
        0
      );
      return;
    }

    // Fallback to in-memory
    memorySessionStore.delete(token);
  },
};

// ============================================================================
// SYNCHRONOUS WRAPPERS (for backward compatibility)
// ============================================================================

/**
 * Synchronous Map-like interface for OTP store
 * Used for backward compatibility with existing code
 *
 * NOTE: These wrap async operations with best-effort sync behavior.
 * New code should use the async redisOtpStore directly.
 */
export class SyncOTPStore {
  private pendingOps = new Map<string, Promise<unknown>>();

  get(identifier: string): OTPData | undefined {
    // For sync access, check in-memory first, then trigger async update
    const memData = memoryOtpStore.get(identifier);
    if (memData && Date.now() > memData.expiresAt) {
      memoryOtpStore.delete(identifier);
      return undefined;
    }

    // Trigger async fetch to populate memory cache
    if (isRedisAvailable() && !this.pendingOps.has(identifier)) {
      const op = redisOtpStore.get(identifier).then((data) => {
        if (data) {
          memoryOtpStore.set(identifier, data);
        }
        this.pendingOps.delete(identifier);
      });
      this.pendingOps.set(identifier, op);
    }

    return memData;
  }

  set(identifier: string, data: OTPData): void {
    memoryOtpStore.set(identifier, data);

    // Async persist to Redis
    if (isRedisAvailable()) {
      void redisOtpStore.set(identifier, data);
    }
  }

  delete(identifier: string): void {
    memoryOtpStore.delete(identifier);

    // Async delete from Redis
    if (isRedisAvailable()) {
      void redisOtpStore.delete(identifier);
    }
  }

  entries(): IterableIterator<[string, OTPData]> {
    return memoryOtpStore.entries();
  }
}

/**
 * Synchronous Map-like interface for rate limit store
 */
export class SyncRateLimitStore {
  get(identifier: string): RateLimitData | undefined {
    const memData = memoryRateLimitStore.get(identifier);
    if (memData && Date.now() > memData.resetAt) {
      memoryRateLimitStore.delete(identifier);
      return undefined;
    }
    return memData;
  }

  set(identifier: string, data: RateLimitData): void {
    memoryRateLimitStore.set(identifier, data);

    if (isRedisAvailable()) {
      void redisRateLimitStore.set(identifier, data);
    }
  }

  entries(): IterableIterator<[string, RateLimitData]> {
    return memoryRateLimitStore.entries();
  }
}

/**
 * Synchronous Map-like interface for OTP session store
 */
export class SyncOTPSessionStore {
  private pendingOps = new Map<string, Promise<unknown>>();

  get(token: string): OTPLoginSession | undefined {
    const memData = memorySessionStore.get(token);
    if (memData && Date.now() > memData.expiresAt) {
      memorySessionStore.delete(token);
      return undefined;
    }

    // Trigger async fetch
    if (isRedisAvailable() && !this.pendingOps.has(token)) {
      const op = redisOtpSessionStore.get(token).then((data) => {
        if (data) {
          memorySessionStore.set(token, data);
        }
        this.pendingOps.delete(token);
      });
      this.pendingOps.set(token, op);
    }

    return memData;
  }

  set(token: string, data: OTPLoginSession): void {
    memorySessionStore.set(token, data);

    if (isRedisAvailable()) {
      void redisOtpSessionStore.set(token, data);
    }
  }

  delete(token: string): void {
    memorySessionStore.delete(token);

    if (isRedisAvailable()) {
      void redisOtpSessionStore.delete(token);
    }
  }

  entries(): IterableIterator<[string, OTPLoginSession]> {
    return memorySessionStore.entries();
  }
}

// Export singleton instances for sync access
export const syncOtpStore = new SyncOTPStore();
export const syncRateLimitStore = new SyncRateLimitStore();
export const syncOtpSessionStore = new SyncOTPSessionStore();

// Cleanup interval for memory stores (fallback mode only)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();

    // Cleanup expired OTPs from memory
    for (const [id, data] of memoryOtpStore.entries()) {
      if (now > data.expiresAt) {
        memoryOtpStore.delete(id);
      }
    }

    // Cleanup expired rate limits from memory
    for (const [id, data] of memoryRateLimitStore.entries()) {
      if (now > data.resetAt) {
        memoryRateLimitStore.delete(id);
      }
    }

    // Cleanup expired sessions from memory
    for (const [token, session] of memorySessionStore.entries()) {
      if (now > session.expiresAt) {
        memorySessionStore.delete(token);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes
}
