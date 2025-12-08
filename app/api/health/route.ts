/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns server health status for monitoring and E2E test readiness checks.
 * 
 * SECURITY: Deep diagnostics only exposed when X-Health-Token header matches
 * HEALTH_CHECK_TOKEN env variable. See env.example for configuration.
 * 
 * RELIABILITY: DB liveness check uses withTimeout to avoid hanging on stale
 * connections. All callers (authorized or not) get an accurate health status.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/mongo";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { createSecureResponse } from "@/server/security/headers";
import { withTimeout } from "@/lib/resilience";

export const dynamic = "force-dynamic";

// DB ping timeout - short to avoid hanging health checks
const DB_PING_TIMEOUT_MS = 2_000;
const REDIS_PING_TIMEOUT_MS = 2_000;

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = isAuthorizedHealthRequest(request);
    const redisConfigured = Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);
    
    // Check database connection with timeout to avoid false positives from stale connections
    let dbStatus: "connected" | "disconnected" | "error" | "timeout" = "disconnected";
    let dbLatency = 0;
    let redisStatus: "connected" | "disconnected" | "error" | "timeout" | "disabled" =
      redisConfigured ? "error" : "disabled";
    let redisLatency = 0;

    const dbStart = Date.now();
    try {
      const connection = (await db) as unknown as {
        command?: (
          cmd: Record<string, unknown>,
          options?: { signal?: AbortSignal },
        ) => Promise<unknown>;
      };

      // Lightweight admin ping with server-side timeout; avoids full collection scans.
      const command = connection?.command;
      if (typeof command === "function") {
        const cmd = command;
        await withTimeout(
          async (signal: AbortSignal) => {
            await cmd({ ping: 1, maxTimeMS: DB_PING_TIMEOUT_MS }, { signal });
          },
          { timeoutMs: DB_PING_TIMEOUT_MS },
        );
        dbStatus = "connected";
        dbLatency = Date.now() - dbStart;
      } else {
        throw new Error("Database handle does not support command()");
      }
    } catch (dbError) {
      dbLatency = Date.now() - dbStart;
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        dbStatus = "timeout";
        logger.warn("[Health Check] Database ping timeout", { latency: dbLatency });
      } else {
        dbStatus = "error";
        logger.error("[Health Check] Database error", dbError as Error);
      }
    }

    // Check Redis if configured
    const redisClient = redisConfigured ? getRedisClient() : null;
    if (redisConfigured) {
      if (redisClient) {
        const redisStart = Date.now();
        try {
          await withTimeout(
            async () => {
              await redisClient.ping();
            },
            { timeoutMs: REDIS_PING_TIMEOUT_MS },
          );
          redisStatus = "connected";
          redisLatency = Date.now() - redisStart;
        } catch (redisError) {
          redisLatency = Date.now() - redisStart;
          const message = redisError instanceof Error ? redisError.message : String(redisError);
          if (message.toLowerCase().includes("timeout")) {
            redisStatus = "timeout";
            logger.warn("[Health Check] Redis ping timeout", { latency: redisLatency });
          } else {
            redisStatus = "error";
            logger.error("[Health Check] Redis error", redisError as Error);
          }
        }
      } else {
        redisStatus = "error";
        logger.warn("[Health Check] Redis configured but client unavailable");
      }
    }

    const isHealthy = dbStatus === "connected" && (!redisConfigured || redisStatus === "connected");
    
    const health = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      // Always include basic DB status for monitoring (not sensitive)
      database: dbStatus,
      redis: redisStatus,
      // Authorized callers get detailed diagnostics
      ...(isAuthorized && {
        diagnostics: {
          database: {
            status: dbStatus,
            latencyMs: dbLatency,
          },
          redis: redisConfigured
            ? {
                status: redisStatus,
                latencyMs: redisLatency,
              }
            : undefined,
          memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          },
          environment: process.env.NODE_ENV || "development",
          version: process.env.npm_package_version || "unknown",
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
        error: process.env.NODE_ENV === "development" 
          ? (error instanceof Error ? error.message : "Unknown error")
          : "Internal error",
      },
      503,
      request,
    );
  }
}
