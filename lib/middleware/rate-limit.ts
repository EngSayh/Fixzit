import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';

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
    return rateLimitError();
  }

  return null;
}
