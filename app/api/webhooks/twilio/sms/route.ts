/**
 * Twilio SMS Status Webhook Handler
 *
 * Receives delivery status callbacks from Twilio to update SMS message status.
 * Twilio sends POST requests with status updates (queued, sent, delivered, failed, etc.)
 *
 * @see https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 *
 * @module app/api/webhooks/twilio/sms/route
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";
import crypto from "crypto";

// Twilio status to our status mapping
const STATUS_MAP: Record<string, "SENT" | "DELIVERED" | "FAILED"> = {
  queued: "SENT",
  sending: "SENT",
  sent: "SENT",
  delivered: "DELIVERED",
  undelivered: "FAILED",
  failed: "FAILED",
};

/**
 * Validate Twilio webhook signature
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.warn("[Twilio Webhook] No auth token configured, skipping validation");
    return process.env.NODE_ENV !== "production"; // Allow in dev
  }

  if (!signature) {
    logger.warn("[Twilio Webhook] No signature header provided");
    return false;
  }

  // Build the data string: URL + sorted params
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");
  const data = url + sortedParams;

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/twilio/sms
 *
 * Twilio SMS status callback handler
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    // Validate signature in production
    const signature = request.headers.get("X-Twilio-Signature");
    const url = request.url;

    if (process.env.NODE_ENV === "production") {
      if (!validateTwilioSignature(signature, url, params)) {
        logger.warn("[Twilio Webhook] Invalid signature", { url });
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    } = params;

    if (!MessageSid || !MessageStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    logger.info("[Twilio Webhook] Status update received", {
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode,
    });

    await connectToDatabase();

    // Map Twilio status to our status
    const ourStatus = STATUS_MAP[MessageStatus.toLowerCase()];
    if (!ourStatus) {
      logger.info("[Twilio Webhook] Ignoring intermediate status", {
        messageSid: MessageSid,
        status: MessageStatus,
      });
      return NextResponse.json({ success: true, ignored: true });
    }

    // Find and update the message (org-scoped to prevent cross-tenant leakage)
    const message = await SMSMessage.findOne({ providerMessageId: MessageSid });
    if (!message) {
      logger.warn("[Twilio Webhook] Message not found", { messageSid: MessageSid });
      return NextResponse.json({ success: true, notFound: true });
    }
    const orgScopedFilter = { _id: message._id, orgId: message.orgId };

    // Update based on status
    if (ourStatus === "DELIVERED") {
      await SMSMessage.markDelivered(MessageSid, new Date(), message.orgId);
      logger.info("[Twilio Webhook] Message marked as delivered", {
        messageId: message._id.toString(),
        messageSid: MessageSid,
      });
    } else if (ourStatus === "FAILED") {
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "FAILED",
        lastError: ErrorMessage || `Twilio error: ${ErrorCode}`,
        lastErrorCode: ErrorCode,
      });
      logger.warn("[Twilio Webhook] Message delivery failed", {
        messageId: message._id.toString(),
        messageSid: MessageSid,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage,
      });
    }

    return NextResponse.json({ success: true, status: ourStatus });
  } catch (error) {
    logger.error("[Twilio Webhook] Error processing callback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Twilio may send GET for verification
export async function GET() {
  return NextResponse.json({ status: "ok", service: "twilio-sms-webhook" });
}
