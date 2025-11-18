import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';
import { logSecurityEvent } from '@/lib/monitoring/security-events';

type RateLimitOptions = {
  /**
   * Prefix used as the logical resource key (e.g., "souq-claims:create")
   */
  keyPrefix?: string;
  /**
   * Maximum number of requests allowed within the window (default 30)
   */
  requests?: number;
  /**
   * Rate limit window in milliseconds (default 60_000)
   */
  windowMs?: number;
  /**
   * Optional override for identifier (defaults to client IP)
   */
  identifier?: string;
};

/**
 * Shared API rate-limiter helper for App Router handlers.
 * Returns a NextResponse when the caller should short-circuit (429),
 * otherwise returns null so the route can continue.
 */
export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): NextResponse | null {
  const identifier = options.identifier ?? getClientIP(request);
  const prefix = options.keyPrefix ?? new URL(request.url).pathname;
  const key = `${prefix}:${identifier}`;

  const result = rateLimit(key, options.requests ?? 30, options.windowMs ?? 60_000);
  if (!result.allowed) {
    // Log security event for monitoring
    logSecurityEvent({
      type: 'rate_limit',
      ip: identifier,
      path: new URL(request.url).pathname,
      timestamp: new Date().toISOString(),
      metadata: {
        limit: options.requests ?? 30,
        windowMs: options.windowMs ?? 60_000,
        keyPrefix: prefix,
      },
    }).catch(err => console.error('[RateLimit] Failed to log security event:', err));
    
    return rateLimitError();
  }

  return null;
}
