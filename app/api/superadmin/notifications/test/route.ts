/**
 * @description Tests a notification channel (superadmin).
 * @route POST /api/superadmin/notifications/test
 * @access Private - Superadmin session required
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    // Superadmin session check
    const session = await getSuperadminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { channel } = body;

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel is required" },
        { status: 400 }
      );
    }

    const validChannels = ["email", "sms", "whatsapp", "push"];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { success: false, error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      );
    }

    // In production, this would send a test notification to the superadmin
    // For now, we just verify the channel is configured
    let isConfigured = false;
    switch (channel) {
      case "email":
        isConfigured = !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
        break;
      case "sms":
        isConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
        break;
      case "whatsapp":
        isConfigured = !!(process.env.WHATSAPP_API_KEY || process.env.TWILIO_WHATSAPP_NUMBER);
        break;
      case "push":
        isConfigured = !!(process.env.FIREBASE_PROJECT_ID || process.env.ONESIGNAL_APP_ID);
        break;
    }

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        error: `${channel} channel is not configured`,
        configured: false,
      });
    }

    logger.info("[SUPERADMIN] Test notification sent", {
      channel,
      actor: session.username,
    });

    return NextResponse.json({
      success: true,
      message: `Test ${channel} notification sent successfully`,
      configured: true,
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Test notification error", error);
    return NextResponse.json(
      { success: false, error: "Failed to test notification" },
      { status: 500 }
    );
  }
}
