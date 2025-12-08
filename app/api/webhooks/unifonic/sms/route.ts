/**
 * Unifonic SMS Webhook Handler
 *
 * Receives delivery status callbacks from Unifonic SMS provider.
 * Updates SMSMessage status based on Unifonic delivery notifications.
 *
 * @module app/api/webhooks/unifonic/sms
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

// Unifonic status mapping to our internal status
const STATUS_MAP: Record<string, "SENT" | "DELIVERED" | "FAILED"> = {
  sent: "SENT",
  delivered: "DELIVERED",
  failed: "FAILED",
  rejected: "FAILED",
  expired: "FAILED",
  undeliverable: "FAILED",
};

/**
 * Verify Unifonic webhook signature
 * Unifonic uses HMAC-SHA256 signature in X-Unifonic-Signature header
 */
function verifyUnifonicSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/unifonic/sms
 *
 * Handles Unifonic delivery status webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`unifonic-webhook:${clientIp}`, 100, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-unifonic-signature");
    const webhookSecret = process.env.UNIFONIC_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyUnifonicSignature(rawBody, signature, webhookSecret)) {
      logger.warn("[Unifonic Webhook] Invalid signature", { clientIp });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    // Unifonic webhook payload structure
    const {
      MessageId,
      Status,
      ErrorCode,
      ErrorMessage,
      DeliveredAt,
    } = body;

    if (!MessageId) {
      return NextResponse.json(
        { error: "Missing MessageId" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Map Unifonic status to our status
    const ourStatus = STATUS_MAP[Status?.toLowerCase()];
    if (!ourStatus) {
      logger.info("[Unifonic Webhook] Ignoring intermediate status", {
        messageId: MessageId,
        status: Status,
      });
      return NextResponse.json({ success: true, ignored: true });
    }

    // Find message by provider message ID
    const message = await SMSMessage.findOne({ providerMessageId: MessageId });
    if (!message) {
      logger.warn("[Unifonic Webhook] Message not found", { messageId: MessageId });
      return NextResponse.json({ success: true, notFound: true });
    }

    // 🔐 STRICT v4.1: Org-scoped filter for updates
    const orgScopedFilter = { _id: message._id, orgId: message.orgId };

    if (ourStatus === "DELIVERED") {
      // Use org-scoped update instead of markDelivered to ensure tenant isolation
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "DELIVERED",
        deliveredAt: DeliveredAt ? new Date(DeliveredAt) : new Date(),
      });
      logger.info("[Unifonic Webhook] Message marked as delivered", {
        messageId: message._id.toString(),
        providerMessageId: MessageId,
        orgId: message.orgId,
      });
    } else if (ourStatus === "FAILED") {
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "FAILED",
        lastError: ErrorMessage || `Unifonic error: ${ErrorCode}`,
        lastErrorCode: ErrorCode?.toString(),
      });
      logger.warn("[Unifonic Webhook] Message delivery failed", {
        messageId: message._id.toString(),
        providerMessageId: MessageId,
        orgId: message.orgId,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage,
      });
    } else if (ourStatus === "SENT") {
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "SENT",
        sentAt: new Date(),
      });
      logger.info("[Unifonic Webhook] Message sent", {
        messageId: message._id.toString(),
        providerMessageId: MessageId,
        orgId: message.orgId,
      });
    }

    return NextResponse.json({ success: true, status: ourStatus });
  } catch (error) {
    logger.error("[Unifonic Webhook] Error processing callback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
