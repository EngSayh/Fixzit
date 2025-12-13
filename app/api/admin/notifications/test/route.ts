/**
 * @description Sends a test SMS or WhatsApp message for channel validation.
 * Uses Taqnyat for SMS (CITC-compliant for Saudi Arabia) and Meta
 * WhatsApp Business API for WhatsApp messaging.
 * @route POST /api/admin/notifications/test
 * @access Private - SUPER_ADMIN only
 * @param {Object} body - phoneNumber, channel (sms|whatsapp), message
 * @returns {Object} success: true, messageId: string
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 * @throws {400} If phone number or message is invalid
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { sendSMS } from "@/lib/sms";
import {
  handleApiError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { audit } from "@/lib/audit";
import { redactPhoneNumber } from "@/lib/sms-providers/phone-utils";
import type { Session } from "next-auth";
import {
  buildOrgAwareRateLimitKey,
  smartRateLimit,
} from "@/server/security/rateLimit";

const TestNotificationSchema = z.object({
  phoneNumber: z.string().min(10).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  channel: z.enum(["sms", "whatsapp"]),
  message: z.string().min(1).max(1600),
});

const ADMIN_TEST_NOTIFICATION_RL_LIMIT = 5;

const enforceAdminTestNotificationRateLimit = async (
  req: NextRequest,
  session: Session | null,
) => {
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const key = buildOrgAwareRateLimitKey(
    req,
    sessionUser?.orgId ?? null,
    sessionUser?.id ?? null,
  );
  const rl = await smartRateLimit(
    `${key}:admin-notification-test`,
    ADMIN_TEST_NOTIFICATION_RL_LIMIT,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }
  return null;
};
export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as Session | null;
    const rateLimited = await enforceAdminTestNotificationRateLimit(
      request,
      session,
    );
    if (rateLimited) return rateLimited;

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = TestNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { phoneNumber, channel, message } = parseResult.data;

    // Ensure phone number has country code
    const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    const maskedPhone = redactPhoneNumber(formattedPhone);
    const orgId = session.user.orgId || "global";

    if (channel === "sms") {
      // Send SMS via Taqnyat (CITC-compliant for Saudi Arabia)
      if (!process.env.TAQNYAT_BEARER_TOKEN || !process.env.TAQNYAT_SENDER_NAME) {
        return NextResponse.json({ error: "SMS not configured - missing Taqnyat credentials" }, { status: 400 });
      }

      const result = await sendSMS(formattedPhone, message);

      if (!result.success) {
        logger.warn("[Admin Test SMS] send failed", {
          to: formattedPhone,
          message: result.error || "Unknown error",
        });
        await audit({
          actorId: session.user.id,
          actorEmail: session.user.email || "unknown",
          actorRole: session.user.role,
          action: "admin.notifications.test.sms.failed",
          orgId,
          target: maskedPhone,
          targetType: "notification",
          meta: {
            channel: "sms",
            error: result.error || "Unknown error",
          },
          success: false,
        });
        return NextResponse.json(
          { error: "Failed to send SMS. Check server logs for details." },
          { status: 400 }
        );
      }

      await audit({
        actorId: session.user.id,
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.test.sms.sent",
        orgId,
        target: maskedPhone,
        targetType: "notification",
        meta: {
          channel: "sms",
          messageId: result.messageSid,
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: `SMS sent successfully to ${formattedPhone}`,
        messageId: result.messageSid,
      });
    } else if (channel === "whatsapp") {
      // Check for Meta WhatsApp Business API
      if (!process.env.WHATSAPP_BUSINESS_API_KEY || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_BUSINESS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone.replace("+", ""),
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const providerMessage =
          (errorData?.error?.message as string) ||
          (errorData?.message as string) ||
          "Unknown WhatsApp API error";

        logger.error("[Admin Test WhatsApp] provider error", {
          status: response.status,
          message: providerMessage,
          code: errorData?.error?.code,
          type: errorData?.error?.type,
        });
        await audit({
          actorId: session.user.id,
          actorEmail: session.user.email || "unknown",
          actorRole: session.user.role,
          action: "admin.notifications.test.whatsapp.failed",
          orgId,
          target: maskedPhone,
          targetType: "notification",
          meta: {
            channel: "whatsapp",
            status: response.status,
            providerCode: errorData?.error?.code,
          },
          success: false,
        });
        return NextResponse.json(
          { error: "Failed to send WhatsApp message. Check server logs for details." },
          { status: response.status || 400 }
        );
      }

      const result = await response.json();
      await audit({
        actorId: session.user.id,
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.test.whatsapp.sent",
        orgId,
        target: maskedPhone,
        targetType: "notification",
        meta: {
          channel: "whatsapp",
          messageId: result.messages?.[0]?.id,
        },
        success: true,
      });
      return NextResponse.json({
        success: true,
        message: `WhatsApp message sent successfully to ${formattedPhone}`,
        messageId: result.messages?.[0]?.id,
      });
    }

    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  } catch (error) {
    logger.error("Error sending test notification", error instanceof Error ? error : new Error(String(error)));
    return handleApiError(error);
  }
}
