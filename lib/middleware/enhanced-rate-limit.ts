/**
 * Enhanced rate limiting with monitoring
 * Based on lib/security/rate-limit.ts
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
