/**
 * Shared OTP store for SMS verification
 *
 * This module provides a unified interface for OTP storage that:
 * - Uses Redis when REDIS_URL is configured (production/distributed)
 * - Falls back to in-memory Maps when Redis unavailable (dev/local)
 *
 * For multi-instance deployments (Vercel, K8s, etc.), configure REDIS_URL
 * to ensure OTP state is shared across all instances.
 *
 * @module lib/otp-store
 */

import {
  syncOtpStore,
  syncRateLimitStore,
  syncOtpSessionStore,
  // Re-export types
  type OTPData,
  type RateLimitData,
  type OTPLoginSession,
  // Re-export constants
  OTP_LENGTH,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
  OTP_SESSION_EXPIRY_MS,
  // Re-export async stores for new code
  redisOtpStore,
  redisRateLimitStore,
  redisOtpSessionStore,
} from "@/lib/otp-store-redis";

// Re-export types
export type { OTPData, RateLimitData, OTPLoginSession };

// Re-export constants
export {
  OTP_LENGTH,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
  OTP_SESSION_EXPIRY_MS,
};

// Re-export async stores for new code that can use promises
export {
  redisOtpStore,
  redisRateLimitStore,
  redisOtpSessionStore,
};

/**
 * Synchronous OTP store with Map-like interface
 *
 * Uses Redis when available, falls back to in-memory.
 * Maintains backward compatibility with existing sync code.
 *
 * For new code, prefer using redisOtpStore (async) directly.
 */
export const otpStore = syncOtpStore;

/**
 * Synchronous rate limit store with Map-like interface
 *
 * Uses Redis when available, falls back to in-memory.
 * Maintains backward compatibility with existing sync code.
 *
 * For new code, prefer using redisRateLimitStore (async) directly.
 */
export const rateLimitStore = syncRateLimitStore;

/**
 * Synchronous OTP session store with Map-like interface
 *
 * Uses Redis when available, falls back to in-memory.
 * Maintains backward compatibility with existing sync code.
 *
 * For new code, prefer using redisOtpSessionStore (async) directly.
 */
export const otpSessionStore = syncOtpSessionStore;

// NOTE: Cleanup is handled in otp-store-redis.ts
// The Redis stores use TTL for automatic expiry, memory stores have cleanup interval
