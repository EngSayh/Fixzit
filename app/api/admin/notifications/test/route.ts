import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Lazy load Twilio to avoid import errors if not configured
async function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  const twilio = await import("twilio");
  return twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const TestNotificationSchema = z.object({
  phoneNumber: z.string().min(10).regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  channel: z.enum(["sms", "whatsapp"]),
  message: z.string().min(1).max(1600),
});

/**
 * POST /api/admin/notifications/test
 * Send a test SMS or WhatsApp message
 * SUPER_ADMIN only
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
      // Send SMS via Twilio
      if (!process.env.TWILIO_PHONE_NUMBER) {
        return NextResponse.json({ error: "SMS not configured - missing TWILIO_PHONE_NUMBER" }, { status: 400 });
      }

      const client = await getTwilioClient();
      if (!client) {
        return NextResponse.json({ error: "Twilio not configured" }, { status: 400 });
      }

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });

      return NextResponse.json({
        success: true,
        message: `SMS sent successfully to ${formattedPhone}`,
        messageId: result.sid,
        status: result.status,
      });
    } else if (channel === "whatsapp") {
      // Check for Twilio WhatsApp first
      if (process.env.TWILIO_WHATSAPP_NUMBER) {
        const client = await getTwilioClient();
        if (!client) {
          return NextResponse.json({ error: "Twilio not configured" }, { status: 400 });
        }

        const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
          ? process.env.TWILIO_WHATSAPP_NUMBER
          : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

        const result = await client.messages.create({
          body: message,
          from: whatsappFrom,
          to: `whatsapp:${formattedPhone}`,
        });

        return NextResponse.json({
          success: true,
          message: `WhatsApp message sent successfully to ${formattedPhone}`,
          messageId: result.sid,
          status: result.status,
        });
      }

      // Check for Meta WhatsApp Business API
      if (process.env.WHATSAPP_BUSINESS_API_KEY && process.env.WHATSAPP_PHONE_NUMBER_ID) {
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

      return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  } catch (error) {
    logger.error("Error sending test notification", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: `Failed to send notification: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
