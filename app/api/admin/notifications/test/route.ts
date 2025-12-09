import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { sendSMS } from "@/lib/sms";
import { handleApiError } from "@/server/utils/errorResponses";

const TestNotificationSchema = z.object({
  phoneNumber: z.string().min(10).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  channel: z.enum(["sms", "whatsapp"]),
  message: z.string().min(1).max(1600),
});

/**
 * POST /api/admin/notifications/test
 * Send a test SMS or WhatsApp message
 * SUPER_ADMIN only
 * 
 * SMS: Uses Taqnyat (CITC-compliant for Saudi Arabia)
 * WhatsApp: Uses Meta WhatsApp Business API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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

    if (channel === "sms") {
      // Send SMS via Taqnyat (CITC-compliant for Saudi Arabia)
      if (!process.env.TAQNYAT_BEARER_TOKEN || !process.env.TAQNYAT_SENDER_NAME) {
        return NextResponse.json({ error: "SMS not configured - missing Taqnyat credentials" }, { status: 400 });
      }

      const result = await sendSMS(formattedPhone, message);

      if (!result.success) {
        return NextResponse.json(
          { error: `SMS failed: ${result.error || "Unknown error"}` },
          { status: 400 }
        );
      }

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
        const errorData = await response.json();
        return NextResponse.json(
          { error: `WhatsApp API error: ${JSON.stringify(errorData)}` },
          { status: 400 }
        );
      }

      const result = await response.json();
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
