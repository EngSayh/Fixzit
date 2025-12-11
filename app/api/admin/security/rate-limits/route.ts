import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  getSecurityMetrics,
  getRateLimitBreakdown,
} from "@/lib/security/monitoring";
import { getRedisClient, getRedisMetrics } from "@/lib/redis";

const ADMIN_ROLES = new Set(["SUPER_ADMIN"]);

export async function GET() {
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

    const redis = getRedisClient();
    const redisMetrics = getRedisMetrics();

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
      distributed: {
        enabled: Boolean(redis),
        status: redisMetrics.currentStatus,
        lastConnectedAt: redisMetrics.lastConnectedAt,
        lastErrorAt: redisMetrics.lastErrorAt,
        lastError: redisMetrics.lastError,
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
