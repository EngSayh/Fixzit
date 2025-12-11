/**
 * @fileoverview SMS Service Health Check Endpoint
 * @description Returns Taqnyat SMS provider health status and configuration. Detailed config only exposed to authorized callers via X-Health-Token header.
 * @route GET /api/health/sms - SMS service (Taqnyat) health check
 * @access Public (detailed info requires X-Health-Token)
 * @module health
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { createSecureResponse } from "@/server/security/headers";
import { withTimeout } from "@/lib/resilience";
import { getRedisClient } from "@/lib/redis-client";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";

export const dynamic = "force-dynamic";

const TAQNYAT_TIMEOUT_MS = 3_000;
const REDIS_TIMEOUT_MS = 1_500;

/**
 * Resolve production/preview flags so that Vercel preview deployments do not
 * get treated as production (where dev-mode SMS must be disabled).
 */
function resolveEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProd = vercelEnv
    ? vercelEnv === "production"
    : nodeEnv === "production";
  const isPreview = vercelEnv === "preview";

  return { isProd, isPreview, vercelEnv, nodeEnv };
}

/**
 * Check Taqnyat API reachability
 * Uses the balance endpoint as a lightweight health check
 */
async function checkTaqnyatReachability(taqnyatConfigured: boolean) {
  if (!taqnyatConfigured) {
    return { reachable: false, latencyMs: null, error: "Taqnyat not configured" };
  }

  try {
    const start = Date.now();
    const response = await withTimeout(
      async () => {
        const res = await fetch("https://api.taqnyat.sa/v1/messages/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.TAQNYAT_BEARER_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        return res;
      },
      { timeoutMs: TAQNYAT_TIMEOUT_MS },
    );

    // Any response (including 401/403) means the API is reachable
    // We're just checking connectivity, not credentials validity
    const latencyMs = Date.now() - start;

    if (response.ok || response.status < 500) {
      return { reachable: true, latencyMs, error: null };
    }

    return {
      reachable: false,
      latencyMs,
      error: `Taqnyat API returned ${response.status}`,
    };
  } catch (error) {
    logger.warn("[SMS Health Check] Taqnyat reachability failed", { error });
    return {
      reachable: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedisReachability(redisConfigured: boolean) {
  if (!redisConfigured) {
    return { reachable: false, latencyMs: null, error: "Redis not configured" };
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return { reachable: false, latencyMs: null, error: "Redis client unavailable" };
    }

    if (client.status === "wait") {
      await withTimeout(() => client.connect(), { timeoutMs: REDIS_TIMEOUT_MS });
    }

    const start = Date.now();
    await withTimeout(() => client.ping(), { timeoutMs: REDIS_TIMEOUT_MS });

    return { reachable: true, latencyMs: Date.now() - start, error: null };
  } catch (error) {
    logger.warn("[SMS Health Check] Redis reachability failed", { error });
    return {
      reachable: false,
      latencyMs: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { isProd, isPreview, vercelEnv, nodeEnv } = resolveEnvironment();
    const isAuthorized = isAuthorizedHealthRequest(request);
    const deepCheckRequested =
      isAuthorized &&
      request.headers.get("X-Health-Deep") !== "0" &&
      request.headers.get("x-health-deep") !== "0";

    // Check for Taqnyat configuration (ONLY supported SMS provider)
    const taqnyatConfigured = Boolean(
      process.env.TAQNYAT_BEARER_TOKEN && process.env.TAQNYAT_SENDER_NAME,
    );

    // Only allow dev-mode SMS in non-production to avoid silent OTP loss in prod
    const smsDevMode =
      !isProd &&
      (process.env.SMS_DEV_MODE === "true" ||
        process.env.SMS_DEV_MODE === undefined);

    const redisConfigured = Boolean(
      process.env.REDIS_URL ||
        process.env.REDIS_KEY ||
        process.env.OTP_STORE_REDIS_URL,
    );

    // Check if demo auth is enabled (should be false in production)
    const demoAuthEnabled =
      !isProd &&
      (process.env.ALLOW_DEMO_LOGIN === "true" || nodeEnv === "development");

    // Optional deep checks (only when authorized to avoid unnecessary external calls)
    const taqnyatReachability = deepCheckRequested
      ? await checkTaqnyatReachability(taqnyatConfigured)
      : { reachable: null, latencyMs: null, error: null };

    const redisReachability = deepCheckRequested
      ? await checkRedisReachability(redisConfigured)
      : { reachable: null, latencyMs: null, error: null };

    // In production, require Taqnyat to be configured; in non-prod allow dev mode fallback.
    // When a deep check ran, prefer its result for health determination.
    const taqnyatHealthy =
      taqnyatReachability.reachable ?? (taqnyatConfigured || smsDevMode);

    const statusHealthy = isProd ? taqnyatHealthy : taqnyatHealthy || smsDevMode;
    const healthStatus = statusHealthy ? "healthy" : "unhealthy";

    // SECURITY: Only expose detailed config to authorized internal tools.
    if (!isAuthorized) {
      return createSecureResponse(
        {
          status: healthStatus,
          timestamp: new Date().toISOString(),
        },
        statusHealthy ? 200 : 503,
        request,
      );
    }

    const health = {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv,
        vercelEnv: vercelEnv || "not-set",
        isProd,
        isPreview,
      },
      sms: {
        provider: "taqnyat",
        providerNote: "CITC-compliant for Saudi Arabia",
        configured: taqnyatConfigured,
        smsDevMode,
        reachable: taqnyatReachability.reachable,
        latencyMs: taqnyatReachability.latencyMs,
        error: taqnyatReachability.error,
        // Do not expose credentials in responses
        senderConfigured: Boolean(process.env.TAQNYAT_SENDER_NAME),
      },
      otp: {
        redisConfigured,
        redisReachable: redisReachability.reachable,
        redisLatencyMs: redisReachability.latencyMs,
        redisError: redisReachability.error,
        fallbackEnabled: !redisConfigured, // Will use in-memory if Redis unavailable
      },
      auth: {
        demoAuthEnabled,
        environment: nodeEnv,
      },
      diagnostics: {
        message: (() => {
          if (statusHealthy) {
            if (taqnyatReachability.reachable === false) {
              return "Taqnyat configured but unreachable (check credentials/network)";
            }
            if (taqnyatConfigured) {
              return "Taqnyat configured and ready";
            }
            if (smsDevMode) {
              return "SMS Dev Mode enabled - OTPs logged to console only";
            }
            return "Healthy";
          }
          if (!taqnyatConfigured) {
            return "Taqnyat not configured. Set TAQNYAT_BEARER_TOKEN and TAQNYAT_SENDER_NAME (SMS_DEV_MODE ignored in production)";
          }
          if (taqnyatReachability.reachable === false) {
            return "Taqnyat configured but unreachable. Verify credentials and network.";
          }
          return "SMS health indeterminate";
        })(),
      },
    };

    const statusCode = health.status === "healthy" ? 200 : 503;

    return createSecureResponse(health, statusCode, request);
  } catch (error) {
    logger.error("[SMS Health Check] Error", error as Error);
    return createSecureResponse(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      request,
    );
  }
}
