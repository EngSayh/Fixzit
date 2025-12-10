/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns server health status for monitoring and E2E test readiness checks.
 * 
 * SECURITY: Deep diagnostics only exposed when X-Health-Token header matches
 * HEALTH_CHECK_TOKEN env variable. See env.example for configuration.
 * 
 * RELIABILITY: DB liveness check uses pingDatabase() with timeout to avoid 
 * hanging on stale connections. All callers (authorized or not) get accurate status.
 */
import { NextRequest } from "next/server";
import { pingDatabase } from "@/lib/mongo";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { createSecureResponse } from "@/server/security/headers";
import { withTimeout } from "@/lib/resilience";

export const dynamic = "force-dynamic";

// Ping timeout - short to avoid hanging health checks
const PING_TIMEOUT_MS = 2_000;

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = isAuthorizedHealthRequest(request);
    
    // Check database connection using pingDatabase for reliable health checking
    let dbStatus: "connected" | "disconnected" | "error" | "timeout" = "disconnected";
    let dbLatency = 0;

    const pingResult = await pingDatabase(PING_TIMEOUT_MS);
    dbLatency = pingResult.latencyMs;
    
    if (pingResult.ok) {
      dbStatus = "connected";
    } else if (pingResult.error?.includes("timeout") || pingResult.error?.includes("Timeout")) {
      dbStatus = "timeout";
      logger.warn("[Health Check] Database ping timeout", { latency: dbLatency, error: pingResult.error });
    } else {
      dbStatus = "error";
      logger.error("[Health Check] Database error", { error: pingResult.error, latency: dbLatency });
    }

    // Check Redis connection if configured
    let redisStatus: "ok" | "error" | "not_configured" = "not_configured";
    let redisLatency = 0;
    const redisConfigured = Boolean(process.env.REDIS_URL);

    if (redisConfigured) {
      const redisStart = Date.now();
      try {
        const redis = getRedisClient();
        if (redis) {
          await withTimeout(
            async () => {
              await redis.ping();
            },
            { timeoutMs: PING_TIMEOUT_MS },
          );
          redisStatus = "ok";
        }
        redisLatency = Date.now() - redisStart;
      } catch (redisError) {
        redisLatency = Date.now() - redisStart;
        redisStatus = "error";
        logger.warn("[Health Check] Redis ping failed", { error: redisError instanceof Error ? redisError.message : String(redisError) });
      }
    }

    const redisOk = !redisConfigured || redisStatus === "ok";
    const isHealthy = dbStatus === "connected" && redisOk;
    
    const health = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      // Always include basic DB and Redis status for monitoring (not sensitive)
      database: dbStatus,
      redis: redisConfigured ? redisStatus : "not_configured",
      // Authorized callers get detailed diagnostics
      ...(isAuthorized && {
        diagnostics: {
          database: {
            status: dbStatus,
            latencyMs: dbLatency,
          },
          redis: redisConfigured ? {
            status: redisStatus,
            latencyMs: redisLatency,
          } : { status: "not_configured" },
          memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          },
          environment: process.env.NODE_ENV || "development",
          version: process.env.npm_package_version || "unknown",
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.GIT_COMMIT_SHA?.slice(0, 7) || "unknown",
        },
      }),
    };

    const statusCode = isHealthy ? 200 : 503;

    return createSecureResponse(health, statusCode, request);
  } catch (error) {
    logger.error("[Health Check] Error", error as Error);
    return createSecureResponse(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "error",
        redis: "error",
        error: process.env.NODE_ENV === "development" 
          ? (error instanceof Error ? error.message : "Unknown error")
          : "Internal error",
      },
      503,
      request,
    );
  }
}
