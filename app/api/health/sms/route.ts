/**
 * SMS Service Health Check Endpoint
 * GET /api/health/sms
 *
 * Returns SMS/Twilio configuration status (no auth required for health checks)
 * SECURITY: Does not expose actual credentials, only configuration status
 */
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { createSecureResponse } from "@/server/security/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === "production";

    const twilioConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    // Only allow dev-mode SMS in non-production to avoid silent OTP loss in prod
    const smsDevMode =
      !isProd &&
      (process.env.SMS_DEV_MODE === "true" || process.env.SMS_DEV_MODE === undefined);

    const redisConfigured = Boolean(
      process.env.REDIS_URL ||
      process.env.REDIS_KEY ||
      process.env.OTP_STORE_REDIS_URL
    );

    // Check if demo auth is enabled (should be false in production)
    const demoAuthEnabled =
      !isProd && (process.env.ALLOW_DEMO_LOGIN === "true" || process.env.NODE_ENV === "development");

    // In production, require Twilio to be configured; in non-prod allow dev mode fallback
    const statusHealthy = isProd ? twilioConfigured : twilioConfigured || smsDevMode;
    const health = {
      status: statusHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      sms: {
        twilioConfigured,
        smsDevMode,
        // Do not expose credentials in responses
        accountSidPrefix: !isProd && twilioConfigured ? process.env.TWILIO_ACCOUNT_SID?.slice(0, 4) : null,
        phoneConfigured: Boolean(process.env.TWILIO_PHONE_NUMBER),
      },
      otp: {
        redisConfigured,
        fallbackEnabled: !redisConfigured, // Will use in-memory if Redis unavailable
      },
      auth: {
        demoAuthEnabled,
        environment: process.env.NODE_ENV || "development",
      },
      diagnostics: {
        message: statusHealthy
          ? twilioConfigured
            ? "Twilio configured and ready"
            : "SMS Dev Mode enabled - OTPs logged to console only"
          : "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER (SMS_DEV_MODE ignored in production)",
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
