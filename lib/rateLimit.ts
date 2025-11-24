/**
 * Production-Ready Rate Limiter
 *
 * IP-based rate limiting for public endpoints to prevent abuse.
 * Uses in-memory storage with automatic cleanup.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractClientIP } from "./ip";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

/**
 * Rate limit checker for API endpoints
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns NextResponse with 429 status if rate limit exceeded, null otherwise
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): NextResponse | null {
  // Get client IP using hardened extraction method
  const ip = getHardenedClientIp(request);

  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired - create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: config.message || "Too many requests. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
        },
      },
    );
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return null;
}

/**
 * Get client IP using shared extraction logic
 * @see lib/ip.ts:extractClientIP for implementation details
 */
export function getHardenedClientIp(request: NextRequest): string {
  return extractClientIP(request);
}

/**
 * Get rate limit info for response headers
 */
export function getRateLimitHeaders(
  request: NextRequest,
  config: RateLimitConfig,
): Record<string, string> {
  const ip = getHardenedClientIp(request);

  const key = `ratelimit:${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < Date.now()) {
    return {
      "X-RateLimit-Limit": config.maxRequests.toString(),
      "X-RateLimit-Remaining": config.maxRequests.toString(),
    };
  }

  return {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": Math.max(
      0,
      config.maxRequests - entry.count,
    ).toString(),
    "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
  };
}
