/**
 * Kubernetes Readiness Probe
 * GET /api/health/ready
 *
 * Returns 200 when the application is ready to serve traffic.
 * Checks critical dependencies: MongoDB and Redis.
 *
 * Use this endpoint for k8s readinessProbe configuration.
 * For liveness checks, use /api/health (lighter weight).
 *
 * @module api/health/ready
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/mongo";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/resilience";

export const dynamic = "force-dynamic";

// Timeout for dependency checks - fail fast for readiness
const HEALTH_CHECK_TIMEOUT_MS = 3_000;

interface ReadinessStatus {
  ready: boolean;
  checks: {
    mongodb: "ok" | "error" | "timeout";
    redis: "ok" | "error" | "disabled" | "timeout";
    email: "ok" | "error" | "disabled" | "timeout";
  };
  latency: {
    mongodb?: number;
    redis?: number;
    email?: number;
  };
  timestamp: string;
  requiresRedis?: boolean;
}

export async function GET(): Promise<NextResponse> {
  const status: ReadinessStatus = {
    ready: false,
    checks: {
      mongodb: "error",
      redis: "disabled",
      email: "disabled",
    },
    latency: {},
    timestamp: new Date().toISOString(),
  };

  try {
    // Check MongoDB
    const mongoStart = Date.now();
    try {
      const connection = (await db) as unknown as {
        command?: (cmd: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown>;
      };

      if (typeof connection?.command === "function") {
        const cmd = connection.command;
        await withTimeout(
          async (signal: AbortSignal) => {
            await cmd({ ping: 1, maxTimeMS: HEALTH_CHECK_TIMEOUT_MS }, { signal });
          },
          { timeoutMs: HEALTH_CHECK_TIMEOUT_MS }
        );
        status.checks.mongodb = "ok";
        status.latency.mongodb = Date.now() - mongoStart;
      } else {
        throw new Error("MongoDB connection does not support command()");
      }
    } catch (mongoError) {
      status.latency.mongodb = Date.now() - mongoStart;
      const isTimeout = mongoError instanceof Error && mongoError.message.includes("timeout");
      status.checks.mongodb = isTimeout ? "timeout" : "error";
      logger.warn("[Health/Ready] MongoDB check failed", {
        error: mongoError instanceof Error ? mongoError.message : String(mongoError),
      });
    }

    // Check Redis (optional - if configured)
    const redisConfigured = Boolean(process.env.REDIS_URL);
    const redisClient = getRedisClient();
    if (redisClient) {
      const redisStart = Date.now();
      try {
        await withTimeout(
          async () => {
            await redisClient.ping();
          },
          { timeoutMs: HEALTH_CHECK_TIMEOUT_MS }
        );
        status.checks.redis = "ok";
        status.latency.redis = Date.now() - redisStart;
      } catch (redisError) {
        status.latency.redis = Date.now() - redisStart;
        const isTimeout = redisError instanceof Error && redisError.message.includes("timeout");
        status.checks.redis = isTimeout ? "timeout" : "error";
        logger.warn("[Health/Ready] Redis check failed", {
          error: redisError instanceof Error ? redisError.message : String(redisError),
        });
      }
    }

    // Ready if MongoDB is OK and Redis is OK when configured
    // This gates readiness on Redis when it's configured to prevent traffic
    // routing to pods that can't reach the Redis dependency
    const redisOk = !redisConfigured || status.checks.redis === "ok";
    status.ready = status.checks.mongodb === "ok" && redisOk;
    status.requiresRedis = redisConfigured;

    if (status.ready) {
      return NextResponse.json(status, { status: 200 });
    } else {
      return NextResponse.json(status, { status: 503 });
    }
  } catch (error) {
    logger.error("[Health/Ready] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        ready: false,
        checks: { mongodb: "error", redis: "error" },
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
