/**
 * @fileoverview Superadmin Security Rate Limits API
 * @description Security monitoring and rate limit metrics
 * @route GET /api/superadmin/security/rate-limits
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/security/rate-limits
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  getSecurityMetrics,
  getRateLimitBreakdown,
} from "@/lib/security/monitoring";
import { getRateLimitMetrics } from "@/server/security/rateLimit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/security/rate-limits
 * Get rate limit and security metrics
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-security-rate-limits:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const metrics = getSecurityMetrics();
    const breakdown = getRateLimitBreakdown();

    const rateLimitMetrics = getRateLimitMetrics();

    const loginWindowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 60_000;
    const loginMaxAttempts = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5;

    return NextResponse.json(
      {
        windowMs: metrics.windowMs,
        totalHits: metrics.rateLimitHits,
        uniqueKeys: metrics.rateLimitUniqueKeys,
        endpoints: breakdown,
        loginRateLimit: {
          windowMs: loginWindowMs,
          maxAttempts: loginMaxAttempts,
        },
        store: {
          type: "memory",
          entries: rateLimitMetrics.entries,
          maxEntries: rateLimitMetrics.maxEntries,
        },
        generatedAt: new Date().toISOString(),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Security:RateLimits] Failed to load metrics", { error });
    return NextResponse.json(
      { error: "Failed to load rate limit metrics" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
