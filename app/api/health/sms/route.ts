/**
 * SMS Service Health Check Endpoint
 * GET /api/health/sms
 *
 * Returns SMS/Twilio health status with configuration details
 * SECURITY: Detailed config is only exposed to authorized internal tools using
 * the X-Health-Token header (redacted otherwise). Preview/Dev environments are
 * treated as non-prod for dev-mode SMS.
 */
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { createSecureResponse } from "@/server/security/headers";
import { withTimeout } from "@/lib/resilience";
import { getRedisClient } from "@/lib/redis-client";

export const dynamic = "force-dynamic";

const TWILIO_TIMEOUT_MS = 3_000;
const REDIS_TIMEOUT_MS = 1_500;

/**
 * Check if the request is from an authorized internal tool
 * Uses X-Health-Token header to authenticate monitoring systems
 */
function isAuthorizedInternal(request: NextRequest): boolean {
  const healthToken = process.env.HEALTH_CHECK_TOKEN;
  if (!healthToken) return false;

  const providedToken =
    request.headers.get("X-Health-Token") || request.headers.get("x-health-token");
  return providedToken === healthToken;
}

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

async function checkTwilioReachability(twilioConfigured: boolean) {
  if (!twilioConfigured) {
    return { reachable: false, latencyMs: null, error: "Twilio not configured" };
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );

    const start = Date.now();
    await withTimeout(
      () => client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch(),
      { timeoutMs: TWILIO_TIMEOUT_MS },
    );

    return { reachable: true, latencyMs: Date.now() - start, error: null };
  } catch (error) {
    logger.warn("[SMS Health Check] Twilio reachability failed", { error });
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
    const isAuthorized = isAuthorizedInternal(request);
    const deepCheckRequested =
      isAuthorized &&
      (request.headers.get("X-Health-Deep") === "1" ||
        request.headers.get("x-health-deep") === "1");

    const twilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER,
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
    const twilioReachability = deepCheckRequested
      ? await checkTwilioReachability(twilioConfigured)
      : { reachable: null, latencyMs: null, error: null };

    const redisReachability = deepCheckRequested
      ? await checkRedisReachability(redisConfigured)
      : { reachable: null, latencyMs: null, error: null };

    // In production, require Twilio to be configured; in non-prod allow dev mode fallback.
    // When a deep check ran, prefer its result for health determination.
    const twilioHealthy =
      twilioReachability.reachable ?? (twilioConfigured || smsDevMode);

    const statusHealthy = isProd ? twilioHealthy : twilioHealthy || smsDevMode;
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
        twilioConfigured,
        smsDevMode,
        twilioReachable: twilioReachability.reachable,
        twilioLatencyMs: twilioReachability.latencyMs,
        twilioError: twilioReachability.error,
        // Do not expose credentials in responses (mask even in non-prod)
        accountSidPrefix: null,
        phoneConfigured: Boolean(process.env.TWILIO_PHONE_NUMBER),
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
            if (twilioReachability.reachable === false) {
              return "Twilio configured but unreachable (check credentials/network)";
            }
            if (twilioConfigured) {
              return "Twilio configured and ready";
            }
            if (smsDevMode) {
              return "SMS Dev Mode enabled - OTPs logged to console only";
            }
            return "Healthy";
          }
          if (!twilioConfigured) {
            return "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (SMS_DEV_MODE ignored in production)";
          }
          if (twilioReachability.reachable === false) {
            return "Twilio configured but unreachable. Verify credentials and network.";
          }
          return "Twilio health indeterminate";
        })(),
      },
    };

    const statusCode = health.status === "healthy" ? 200 : 503;

    return createSecureResponse(health, statusCode, request);
  } catch (error) {
    logger.error("[SMS Health Check] Error", { error });
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
