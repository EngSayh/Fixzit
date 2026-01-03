/**
 * @module lib/middleware/enhanced-rate-limit
 * @description Enhanced Rate Limiting with IP Reputation and Monitoring
 *
 * Extends basic rate limiting (lib/security/rate-limit.ts) with IP reputation scoring,
 * dynamic limit adjustment, and multi-tenant telemetry integration.
 *
 * @features
 * - **IP Reputation**: Dynamic rate limits based on historical behavior (good IPs get higher limits)
 * - **Multi-Tenant Telemetry**: Org-scoped rate limit violations (X-Org-ID header for monitoring)
 * - **Automatic Blocking**: IPs with poor reputation blocked before hitting rate limiter
 * - **Path-Based Limits**: Per-endpoint rate limits (e.g., /api/login vs. /api/products)
 * - **Monitoring Integration**: All violations tracked via lib/security/monitoring
 * - **Reputation Signals**: Records violations to adjust future limits
 *
 * @usage
 * In API routes (basic):
 * ```typescript
 * import { enforceRateLimit } from '@/lib/middleware/enhanced-rate-limit';
 * import { NextRequest, NextResponse } from 'next/server';
 *
 * export async function POST(request: NextRequest) {
 *   const error = enforceRateLimit(request);
 *   if (error) return error; // 429 Too Many Requests
 *
 *   // Process request
 * }
 * ```
 *
 * Custom rate limit (org-scoped):
 * ```typescript
 * const error = enforceRateLimit(request, {
 *   requests: 10,
 *   windowMs: 60000, // 10 requests per minute
 *   orgId: session.user.orgId,
 * });
 * ```
 *
 * Custom identifier (user-based):
 * ```typescript
 * const error = enforceRateLimit(request, {
 *   identifier: session.user.id, // Rate limit per user instead of IP
 *   keyPrefix: '/api/expensive-operation',
 * });
 * ```
 *
 * @security
 * - **IP Spoofing**: Uses getClientIP() from lib/server/security/headers (X-Forwarded-For validation)
 * - **Reputation Blocking**: IPs with shouldBlock=true rejected before rate limiter
 * - **Dynamic Limits**: Good IPs get higher limits (e.g., 50 req/min vs. 30 req/min)
 * - **Org Header Spoofing**: X-Org-ID header used for TELEMETRY ONLY (not auth)
 *   - Spoofing only misclassifies attacker's events in monitoring dashboards
 *   - Security decisions use session.user.orgId (authenticated source)
 * - **Brute-Force Protection**: Login endpoints should use requests=5, windowMs=60000
 *
 * @compliance
 * - **Multi-Tenancy**: Org-scoped violation tracking (prevents one org's abuse from affecting others)
 * - **Audit Trail**: All rate limit violations logged with IP, path, orgId
 *
 * @deployment
 * No environment variables required (uses lib/security/rate-limit.ts configuration).
 *
 * Default limits:
 * - 30 requests per 60 seconds (1 minute window)
 * - Adjusted up to 50 req/min for IPs with good reputation
 * - Adjusted down to 10 req/min or blocked for IPs with poor reputation
 *
 * Rate limit key format:
 * - `{keyPrefix}:{identifier}` (e.g., `/api/login:192.168.1.1`)
 *
 * @performance
 * - In-memory: O(1) rate limit checks (Map-based, non-distributed)
 * - IP reputation: <1ms lookup (in-memory cache)
 * - Monitoring: Fire-and-forget (non-blocking)
 *
 * @see {@link /lib/security/rate-limit.ts} for core rate limiting logic
 * @see {@link /lib/security/ip-reputation.ts} for reputation scoring
 * @see {@link /lib/security/monitoring.ts} for telemetry integration
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { trackRateLimitHit } from "@/lib/security/monitoring";
import {
  applyReputationToLimit,
  recordReputationSignal,
} from "@/lib/security/ip-reputation";

export type RateLimitOptions = {
  identifier?: string;
  keyPrefix?: string;
  requests?: number;
  windowMs?: number;
  orgId?: string; // For multi-tenant isolation in monitoring
};

export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {},
): NextResponse | null {
  const identifier = options.identifier ?? getClientIP(request);
  const prefix = options.keyPrefix ?? new URL(request.url).pathname;
  const key = `${prefix}:${identifier}`;
  
  // Extract orgId from options or request headers for multi-tenant tracking.
  // NOTE: Header-based orgId is used for TELEMETRY ONLY (monitoring/alerting isolation).
  // This does NOT grant any permissions - it only affects how events are grouped.
  // Spoofing would only misclassify the attacker's own events in monitoring dashboards.
  // For security-critical operations, use session.user.orgId from authenticated context.
  const orgId = options.orgId 
    ?? request.headers.get("X-Org-ID") 
    ?? request.headers.get("X-Tenant-ID")
    ?? undefined;

  const requestedLimit = options.requests ?? 30;
  const windowMs = options.windowMs ?? 60_000;
  const { limit, reputation } = applyReputationToLimit(requestedLimit, {
    ip: identifier,
    path: prefix,
    userAgent: request.headers.get("user-agent"),
  });

  if (reputation?.shouldBlock || limit <= 0) {
    recordReputationSignal({
      ip: identifier,
      type: "manual_block",
      path: prefix,
    });
    trackRateLimitHit(identifier, `${prefix}:reputation-block`, orgId ?? undefined);
    const response = rateLimitError();
    response.headers.set("X-RateLimit-Limit", String(requestedLimit));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(Date.now() + windowMs));
    response.headers.set("X-RateLimit-Reason", "ip-reputation-block");
    if (reputation) {
      response.headers.set(
        "X-IP-Reputation",
        `${reputation.score}:${reputation.level}`,
      );
    }
    return response;
  }

  const result = rateLimit(key, limit, windowMs);

  if (!result.allowed) {
    // Track rate limit event for monitoring (with org context)
    trackRateLimitHit(identifier, prefix, orgId ?? undefined);
    recordReputationSignal({
      ip: identifier,
      type: "rate_limit_exceeded",
      path: prefix,
    });
    return rateLimitError();
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Date.now() + windowMs),
  );
  if (reputation) {
    response.headers.set(
      "X-IP-Reputation",
      `${reputation.score}:${reputation.level}`,
    );
  }

  return null;
}
