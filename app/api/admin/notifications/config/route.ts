import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/notifications/config
 * Returns notification service configuration status
 * SUPER_ADMIN only
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN only" },
        { status: 403 },
      );
    }

    // Check SMS configuration (Twilio)
    const smsConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER,
    );

    // Check WhatsApp configuration (Twilio)
    const whatsappConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_NUMBER,
    );

    // Check Email configuration
    const emailConfigured = Boolean(
      process.env.SENDGRID_API_KEY || process.env.SMTP_HOST,
    );
    const emailProvider = process.env.SENDGRID_API_KEY
      ? "SendGrid"
      : process.env.SMTP_HOST
        ? "SMTP"
        : undefined;

    // Mask sensitive data for display
    const maskValue = (value: string | undefined): string | undefined => {
      if (!value) return undefined;
      if (value.length <= 8) return "****";
      return value.slice(0, 4) + "****" + value.slice(-4);
    };

    const response = {
      sms: {
        configured: smsConfigured,
        accountSid: maskValue(process.env.TWILIO_ACCOUNT_SID),
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      whatsapp: {
        configured: whatsappConfigured,
        phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      },
      email: {
        configured: emailConfigured,
        provider: emailProvider,
      },
    };

    logger.info("[NotificationConfig] Config status retrieved", {
      sms: smsConfigured,
      whatsapp: whatsappConfigured,
      email: emailConfigured,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[NotificationConfig] Error retrieving config", { error });
    return NextResponse.json(
      { error: "Failed to retrieve configuration" },
      { status: 500 },
    );
  }
}
