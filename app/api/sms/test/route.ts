/**
 * @fileoverview SMS Test API
 * @description Tests SMS configuration and sends test messages via Taqnyat provider for system verification.
 * @route POST /api/sms/test - Test SMS configuration or send test message
 * @access Authenticated (SUPER_ADMIN only)
 * @module sms
 */
import { NextRequest, NextResponse } from "next/server";
import { sendSMS, testSMSConfiguration } from "@/lib/sms";
import { logger } from "@/lib/logger";
import { auth } from "@/auth";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { redactPhoneNumber } from "@/lib/sms-providers/phone-utils";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIP(req);
    // Strict rate limit for SMS test: 5 requests per minute
    const rl = await smartRateLimit(`/api/sms/test:${clientIp}:POST`, 5, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Admin access required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { phone, message, testConfig } = body;

    // If testing configuration only
    if (testConfig) {
      const isConfigured = await testSMSConfiguration();
      return NextResponse.json({
        success: isConfigured,
        message: isConfigured
          ? "Taqnyat configuration is valid"
          : "Taqnyat configuration is invalid or missing",
      });
    }

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: phone and message" },
        { status: 400 },
      );
    }

    // Send SMS
    const result = await sendSMS(phone, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        message: "SMS sent successfully",
      });
    } else {
      const normalizedError = (result.error || "").toLowerCase();
      const isClientError =
        normalizedError.includes("invalid saudi phone number") ||
        normalizedError.includes("not configured") ||
        normalizedError.includes("missing credentials");

      logger.warn("[API] SMS test send failed", {
        phone: phone ? redactPhoneNumber(phone) : "unknown",
        error: result.error || "Unknown error",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send SMS. Check server logs for details.",
        },
        { status: isClientError ? 400 : 502 },
      );
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error("[API] SMS test failed", { error });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
