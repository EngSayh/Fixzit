/**
 * Kubernetes Readiness Probe
 * GET /api/health/ready
 *
 * Returns 200 when the application is ready to serve traffic.
 * Checks critical dependencies: MongoDB, Redis, and SMS provider.
 *
 * Use this endpoint for k8s readinessProbe configuration.
 * For liveness checks, use /api/health (lighter weight).
 *
 * @module api/health/ready
 */

import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/mongo";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { withTimeout } from "@/lib/resilience";
import { getAllCircuitBreakerStats, hasOpenCircuitBreakers } from "@/lib/resilience/service-circuit-breakers";
import { createTaqnyatProvider } from "@/lib/sms-providers/taqnyat";

export const dynamic = "force-dynamic";

// Timeout for dependency checks
// Increased to 10s for Vercel serverless cold starts where Mongoose connection
// can take several seconds to establish
const HEALTH_CHECK_TIMEOUT_MS = 10_000;

interface CircuitBreakerStat {
  name: string;
  state: "closed" | "open" | "half-open";
  failureCount: number;
  isOpen: boolean;
  cooldownRemaining?: number;
}

interface ReadinessStatus {
  ready: boolean;
  checks: {
    mongodb: "ok" | "error" | "timeout";
    redis: "ok" | "error" | "disabled" | "timeout";
    email: "ok" | "error" | "disabled" | "timeout";
    sms: "ok" | "not_configured" | "disabled";
  };
  latency: {
    mongodb?: number;
    redis?: number;
    email?: number;
  };
  circuitBreakers?: {
    hasOpenBreakers: boolean;
    breakers: CircuitBreakerStat[];
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
      sms: "disabled",
    },
    latency: {},
    timestamp: new Date().toISOString(),
  };

  try {
    // Check MongoDB using pingDatabase for consistent health checking
    const pingResult = await pingDatabase(HEALTH_CHECK_TIMEOUT_MS);
    status.latency.mongodb = pingResult.latencyMs;
    
    if (pingResult.ok) {
      status.checks.mongodb = "ok";
    } else if (pingResult.error?.includes("timeout") || pingResult.error?.includes("Timeout")) {
      status.checks.mongodb = "timeout";
      logger.warn("[Health/Ready] MongoDB check timeout", {
        latency: pingResult.latencyMs,
        error: pingResult.error,
      });
    } else {
      status.checks.mongodb = "error";
      logger.warn("[Health/Ready] MongoDB check failed", {
        error: pingResult.error,
        latency: pingResult.latencyMs,
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

    // Check SMS provider (Taqnyat) configuration - non-blocking
    try {
      const smsProvider = createTaqnyatProvider();
      status.checks.sms = smsProvider.isConfigured() ? "ok" : "not_configured";
    } catch {
      status.checks.sms = "not_configured";
    }

    // Ready if MongoDB is OK and Redis is OK when configured
    // This gates readiness on Redis when it's configured to prevent traffic
    // routing to pods that can't reach the Redis dependency
    const redisOk = !redisConfigured || status.checks.redis === "ok";
    status.ready = status.checks.mongodb === "ok" && redisOk;
    status.requiresRedis = redisConfigured;

    // Add circuit breaker states for observability
    status.circuitBreakers = {
      hasOpenBreakers: hasOpenCircuitBreakers(),
      breakers: getAllCircuitBreakerStats(),
    };

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
