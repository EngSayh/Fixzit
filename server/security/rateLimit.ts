/**
 * Production-Ready Rate Limiter
 * 
 * IP-based rate limiting for public endpoints to prevent abuse.
 * Uses LRU cache for efficient memory management.
 */

import { LRUCache } from "lru-cache";
import type { NextRequest, NextResponse } from 'next/server';

const cache = new LRUCache<string, { count:number; resetAt:number }>({ max: 5000 });

/**
 * Low-level rate limiting function
 * @param key - Rate limit key (typically IP address)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const entry = cache.get(key);
  if (!entry || now > entry.resetAt) {
    cache.set(key, { count:1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Configuration for API endpoint rate limiting
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

/**
 * Extract client IP from Next.js request
 * Checks multiple headers in order of preference for reliability
 */
export function getClientIp(request: NextRequest): string {
  // Check Cloudflare header first
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Check standard forwarded-for header
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  // Check real IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback to unknown (shouldn't happen in production)
  return 'unknown';
}

/**
 * Rate limit checker for API endpoints
 * Returns NextResponse with 429 status if rate limit exceeded, null otherwise
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns NextResponse with 429 status if rate limit exceeded, null otherwise
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): ReturnType<typeof NextResponse.json> | null {
  const ip = getClientIp(request);
  const key = `ratelimit:${ip}`;
  
  const result = rateLimit(key, config.maxRequests, config.windowMs);
  
  if (!result.allowed) {
    const entry = cache.get(key);
    const retryAfter = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 60;
    
    // Dynamically import NextResponse to avoid edge runtime issues
    const { NextResponse } = require('next/server');
    
    return NextResponse.json(
      { 
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry ? new Date(entry.resetAt).toISOString() : '',
        },
      }
    );
  }
  
  return null;
}

/**
 * Get rate limit info for response headers
 */
export function getRateLimitHeaders(
  request: NextRequest,
  config: RateLimitConfig
): Record<string, string> {
  const ip = getClientIp(request);
  const key = `ratelimit:${ip}`;
  const entry = cache.get(key);

  if (!entry || entry.resetAt < Date.now()) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString(),
    };
  }

  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
    'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
  };
}

