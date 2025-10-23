/**
 * Production-Ready Rate Limiter
 * 
 * IP-based rate limiting for public endpoints to prevent abuse.
 * Uses in-memory storage with automatic cleanup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isPrivateIP, validateTrustedProxyCount } from '@/server/security/ip-utils';

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
 * Hardened IP extraction with infrastructure-aware trusted proxy counting
 * 
 * SECURITY: Uses TRUSTED_PROXY_COUNT to skip known trusted proxy hops,
 * with fallback to leftmost public IP to prevent header spoofing attacks.
 * 
 * This function mirrors server/security/headers.ts getClientIP() for consistency.
 */
export function getHardenedClientIp(request: NextRequest): string {
  // 1) Cloudflare's CF-Connecting-IP is most trustworthy
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  
  // 2) X-Forwarded-For with trusted proxy counting
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(ip => ip);
    if (ips.length) {
      const trustedProxyCount = validateTrustedProxyCount();
      
      // Skip trusted proxy hops from the right
      const clientIPIndex = Math.max(0, ips.length - 1 - trustedProxyCount);
      const hopSkippedIP = ips[clientIPIndex];
      
      // If hop-skipped IP is valid and public, use it
      if (hopSkippedIP && !isPrivateIP(hopSkippedIP)) {
        return hopSkippedIP;
      }
      
      // Fallback: find leftmost public IP
      for (const ip of ips) {
        if (!isPrivateIP(ip)) {
          return ip;
        }
      }
      
      // Last resort: use hop-skipped IP even if private
      if (hopSkippedIP) {
        return hopSkippedIP;
      }
    }
  }
  
  // 3) X-Real-IP only if explicitly trusted
  if (process.env.TRUST_X_REAL_IP === 'true') {
    const realIP = request.headers.get('x-real-ip');
    if (realIP && realIP.trim()) return realIP.trim();
  }
  
  // 4) Fallback
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
