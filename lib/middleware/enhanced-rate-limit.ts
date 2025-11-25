/**
 * Enhanced rate limiting with monitoring
 * Based on lib/security/rate-limit.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { trackRateLimitHit } from "@/lib/security/monitoring";

export type RateLimitOptions = {
  identifier?: string;
  keyPrefix?: string;
  requests?: number;
  windowMs?: number;
};

export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {},
): NextResponse | null {
  const identifier = options.identifier ?? getClientIP(request);
  const prefix = options.keyPrefix ?? new URL(request.url).pathname;
  const key = `${prefix}:${identifier}`;

  const result = rateLimit(
    key,
    options.requests ?? 30,
    options.windowMs ?? 60_000,
  );

  if (!result.allowed) {
    // Track rate limit event for monitoring
    trackRateLimitHit(identifier, prefix);
    return rateLimitError();
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(options.requests ?? 30));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Date.now() + (options.windowMs ?? 60_000)),
  );

  return null;
}
