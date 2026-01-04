import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  getSecurityMetrics,
  getRateLimitBreakdown,
} from "@/lib/security/monitoring";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getRateLimitMetrics } from "@/server/security/rateLimit";

const ADMIN_ROLES = new Set(["SUPER_ADMIN"]);

export async function GET(request: NextRequest) {
  // Rate limiting: 30 requests per minute for admin dashboard
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-security:rate-limits",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(session.user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const metrics = getSecurityMetrics();
    const breakdown = getRateLimitBreakdown();

    const rateLimitMetrics = getRateLimitMetrics();

    const loginWindowMs =
      Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 60_000;
    const loginMaxAttempts =
      Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5;

    return NextResponse.json({
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
    });
  } catch (error) {
    logger.error("[RateLimit] Failed to load dashboard metrics", {
      error,
    });
    return NextResponse.json(
      { error: "Failed to load rate limit metrics" },
      { status: 500 },
    );
  }
}
