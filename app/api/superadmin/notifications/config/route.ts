/**
 * @description Returns notification service configuration status for superadmin.
 * Shows which channels (Email, SMS, WhatsApp) are properly configured.
 * @route GET /api/superadmin/notifications/config
 * @access Private - Superadmin session required
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Superadmin session check
    const session = await getSuperadminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Return channel configuration status based on env vars
    const config = {
      email: {
        enabled: !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
        provider: process.env.RESEND_API_KEY ? "resend" : process.env.SENDGRID_API_KEY ? "sendgrid" : null,
      },
      sms: {
        enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        provider: process.env.TWILIO_ACCOUNT_SID ? "twilio" : null,
      },
      whatsapp: {
        enabled: !!(process.env.WHATSAPP_API_KEY || process.env.TWILIO_WHATSAPP_NUMBER),
        provider: process.env.TWILIO_WHATSAPP_NUMBER ? "twilio" : null,
      },
      push: {
        enabled: !!(process.env.FIREBASE_PROJECT_ID || process.env.ONESIGNAL_APP_ID),
        provider: process.env.FIREBASE_PROJECT_ID ? "firebase" : process.env.ONESIGNAL_APP_ID ? "onesignal" : null,
      },
    };

    return NextResponse.json({ success: true, config });
  } catch (error) {
    logger.error("[SUPERADMIN] Notifications config error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}
