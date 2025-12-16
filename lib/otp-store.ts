/**
 * @module lib/otp-store
 * @description Shared OTP store for SMS verification with Redis/in-memory fallback.
 *
 * Provides a unified interface for OTP storage that uses Redis when REDIS_URL
 * is configured (production/distributed) or falls back to in-memory Maps when
 * Redis is unavailable (dev/local).
 *
 * @features
 * - Redis-backed storage for distributed deployments (Vercel, K8s)
 * - In-memory fallback for local development
 * - OTP data storage (code, attempts, expiry)
 * - Rate limiting storage (send count, window tracking)
 * - OTP login session storage (temporary auth state)
 * - Type-safe interfaces (OTPData, RateLimitData, OTPLoginSession)
 *
 * @usage
 * ```typescript
 * import { redisOtpStore, OTP_EXPIRY_MS } from '@/lib/otp-store';
 * await redisOtpStore.set(key, { code, attempts: 0, expiresAt });
 * ```
 *
 * @deployment
 * For multi-instance deployments (Vercel, K8s, etc.), configure REDIS_URL
 * to ensure OTP state is shared across all instances.
 */

import {
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
  // Re-export async stores
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

// Re-export async stores for distributed OTP operations
export {
  redisOtpStore,
  redisRateLimitStore,
  redisOtpSessionStore,
};

// NOTE: Cleanup is handled in otp-store-redis.ts
// The Redis stores use TTL for automatic expiry, memory stores have cleanup interval
