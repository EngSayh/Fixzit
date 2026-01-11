/**
 * @module lib/otp-store
 * @description In-memory OTP and rate limit stores (single-instance).
 *
 * Provides OTP storage, rate limiting counters, and OTP session storage
 * without external dependencies. Suitable for single-instance deployments.
 */

import { logger } from "@/lib/logger";

export interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
  userId: string;
  phone?: string;
  email?: string;
  orgId?: string | null;
  companyCode?: string | null;
  deliveryMethod?: "sms" | "email";
  __bypassed?: boolean;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
}

export interface OTPLoginSession {
  userId: string;
  identifier: string;
  orgId?: string | null;
  companyCode?: string | null;
  expiresAt: number;
  __bypassed?: boolean;
}

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const MAX_SENDS_PER_WINDOW = 5;
export const OTP_SESSION_EXPIRY_MS = 5 * 60 * 1000;

const otpDataStore = new Map<string, OTPData>();
const rateLimitStore = new Map<string, RateLimitData>();
const otpSessionStoreMap = new Map<string, OTPLoginSession>();

let warnedMemoryStore = false;

function warnSingleInstance(): void {
  if (warnedMemoryStore || process.env.NODE_ENV !== "production") return;
  logger.warn(
    "[OTP Store] In-memory storage enabled. OTP state and rate limits are not shared across instances."
  );
  warnedMemoryStore = true;
}

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export const otpStore = {
  async get(identifier: string): Promise<OTPData | undefined> {
    warnSingleInstance();
    const data = otpDataStore.get(identifier);
    if (!data) return undefined;
    if (isExpired(data.expiresAt)) {
      otpDataStore.delete(identifier);
      return undefined;
    }
    return data;
  },

  async set(identifier: string, data: OTPData): Promise<void> {
    warnSingleInstance();
    otpDataStore.set(identifier, data);
  },

  async delete(identifier: string): Promise<void> {
    warnSingleInstance();
    otpDataStore.delete(identifier);
  },

  async update(identifier: string, data: OTPData): Promise<void> {
    warnSingleInstance();
    otpDataStore.set(identifier, data);
  },
};

export const otpRateLimitStore = {
  async get(identifier: string): Promise<RateLimitData | undefined> {
    warnSingleInstance();
    const data = rateLimitStore.get(identifier);
    if (!data) return undefined;
    if (Date.now() > data.resetAt) {
      rateLimitStore.delete(identifier);
      return undefined;
    }
    return data;
  },

  async set(identifier: string, data: RateLimitData): Promise<void> {
    warnSingleInstance();
    rateLimitStore.set(identifier, data);
  },

  async increment(identifier: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; count: number }> {
    warnSingleInstance();
    const now = Date.now();
    const existing = rateLimitStore.get(identifier);

    if (!existing || now > existing.resetAt) {
      rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: Math.max(0, limit - 1), count: 1 };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, count: existing.count + 1 };
    }

    const nextCount = existing.count + 1;
    rateLimitStore.set(identifier, { count: nextCount, resetAt: existing.resetAt });
    return { allowed: true, remaining: Math.max(0, limit - nextCount), count: nextCount };
  },
};

export const otpSessionStore = {
  async get(token: string): Promise<OTPLoginSession | undefined> {
    warnSingleInstance();
    const data = otpSessionStoreMap.get(token);
    if (!data) return undefined;
    if (isExpired(data.expiresAt)) {
      otpSessionStoreMap.delete(token);
      return undefined;
    }
    return data;
  },

  async set(token: string, data: OTPLoginSession): Promise<void> {
    warnSingleInstance();
    otpSessionStoreMap.set(token, data);
  },

  async delete(token: string): Promise<void> {
    warnSingleInstance();
    otpSessionStoreMap.delete(token);
  },
};

let cleanupTimer: ReturnType<typeof globalThis.setInterval> | null = null;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, data] of otpDataStore.entries()) {
    if (data.expiresAt <= now) otpDataStore.delete(key);
  }
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetAt <= now) rateLimitStore.delete(key);
  }
  for (const [key, data] of otpSessionStoreMap.entries()) {
    if (data.expiresAt <= now) otpSessionStoreMap.delete(key);
  }
}

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = globalThis.setInterval(cleanupExpiredEntries, 60_000);
}

ensureCleanupTimer();

export function stopOtpStoreCleanup(): void {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
  logger.info("[OTP Store] Cleanup interval stopped");
}
