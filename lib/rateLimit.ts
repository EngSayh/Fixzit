/**
 * Production-Ready Rate Limiter
 * 
 * IP-based rate limiting for public endpoints to prevent abuse.
 * Uses in-memory storage with automatic cleanup.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
  config: RateLimitConfig
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
        error: config.message || 'Too many requests. Please try again later.',
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return null;
}

/**
 * Hardened client IP extraction with security-first priority order
 * 
 * SECURITY: Uses LAST IP from X-Forwarded-For (appended by trusted proxy)
 * to prevent header spoofing attacks where client controls first IP.
 * 
 * Priority order:
 * 1. CF-Connecting-IP (Cloudflare) - most trustworthy
 * 2. X-Forwarded-For LAST IP - appended by our infrastructure
 * 3. X-Real-IP - only if TRUST_X_REAL_IP=true
 * 4. Next.js request.ip (Node runtime)
 * 5. Fallback to 'unknown'
 * 
 * @example
 * ```typescript
 * import { getHardenedClientIp } from '@/lib/rateLimit';
 * const ip = getHardenedClientIp(request);
 * ```
 */
export function getHardenedClientIp(request: NextRequest): string {
  // 1) Cloudflare's CF-Connecting-IP is most trustworthy
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  
  // 2) X-Forwarded-For: take LAST IP (appended by our trusted proxy)
  // SECURITY: Never use [0] as that's client-controlled
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd && fwd.trim()) {
    const ips = fwd.split(',').map(ip => ip.trim()).filter(ip => ip);
    if (ips.length) return ips[ips.length - 1]; // LAST IP is from our proxy
  }
  
  // 3) x-real-ip only if explicitly trusted (client-settable unless infra strips it)
  if (process.env.TRUST_X_REAL_IP === 'true') {
    const realIp = request.headers.get('x-real-ip');
    if (realIp && realIp.trim()) return realIp.trim();
  }
  
  // 4) Next.js may expose request.ip in Node runtime
  const anyReq = request as unknown as { ip?: string };
  if (anyReq?.ip && anyReq.ip.trim()) return anyReq.ip.trim();
  
  return 'unknown';
}

/**
 * Get rate limit info for response headers
 */
export function getRateLimitHeaders(
  request: NextRequest,
  config: RateLimitConfig
): Record<string, string> {
  const ip = getHardenedClientIp(request);

  const key = `ratelimit:${ip}`;
  const entry = rateLimitStore.get(key);

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
