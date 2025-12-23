/**
 * @description Receives Taqnyat SMS delivery status webhooks.
 * Updates SMS message records with delivery confirmation or failure status.
 * Taqnyat is the ONLY supported SMS provider (CITC-compliant for Saudi Arabia).
 * @route POST /api/webhooks/taqnyat - Receive delivery status callbacks
 * @route GET /api/webhooks/taqnyat - Health check for webhook endpoint
 * @access Public - Taqnyat server-to-server callback
 * @param {Object} body.messageId - Original message ID from send request
 * @param {Object} body.status - Delivery status code (1-7)
 * @param {Object} body.recipient - Phone number that received the SMS
 * @returns {Object} success: true if status processed
 * @throws {400} If payload is invalid
 * @throws {401} If webhook signature is invalid
 * @security SMS provider limited to Taqnyat only (no Twilio, Unifonic, etc.)
 * @security Webhook signature verification using HMAC-SHA256
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * Taqnyat delivery status codes mapping
 */
const TAQNYAT_STATUS_MAP: Record<string, string> = {
  "1": "delivered",
  "2": "failed",
  "3": "pending",
  "4": "sent",
  "5": "undelivered",
  "6": "expired",
  "7": "rejected",
};

interface TaqnyatWebhookPayload {
  messageId?: string;
  msgId?: string;
  status?: string;
  statusCode?: string;
  recipient?: string;
  to?: string;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: string;
  timestamp?: string;
}

/**
 * Verify webhook signature using HMAC-SHA256
 * 
 * @security CRITICAL: This function validates that webhooks originate from Taqnyat
 * Without this verification, attackers could forge SMS delivery status updates
 * 
 * @param request - Incoming webhook request
 * @param rawBody - Raw request body as string (for signature calculation)
 * @returns true if signature is valid, false otherwise
 */
function verifyWebhookSignature(
  request: NextRequest,
  rawBody: string,
): boolean {
  const webhookSecret = process.env.TAQNYAT_WEBHOOK_SECRET;
  
  // SECURITY: Require explicit bypass flag for non-production testing
  if (!webhookSecret) {
    // To bypass verification in non-production, set SKIP_TAQNYAT_WEBHOOK_VERIFICATION=true
    if (process.env.NODE_ENV !== "production" && process.env.SKIP_TAQNYAT_WEBHOOK_VERIFICATION === "true") {
      logger.warn("[Taqnyat Webhook] Skipping signature verification due to SKIP_TAQNYAT_WEBHOOK_VERIFICATION flag");
      return true;
    }
    logger.error("[Taqnyat Webhook] SECURITY: TAQNYAT_WEBHOOK_SECRET not configured - rejecting webhook");
    return false;
  }

  // Get signature from headers (try multiple common header names)
  const signature = 
    request.headers.get("x-taqnyat-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("x-webhook-signature");

  if (!signature) {
    logger.error("[Taqnyat Webhook] SECURITY: Missing signature header");
    return false;
  }

  try {
    // Calculate expected HMAC-SHA256 signature
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const expectedSignature = hmac.update(rawBody).digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      logger.error("[Taqnyat Webhook] SECURITY: Signature length mismatch");
      return false;
    }

    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      logger.error("[Taqnyat Webhook] SECURITY: Invalid signature", {
        providedPrefix: signature.substring(0, 10) + "...",
      });
    }

    return isValid;
  } catch (error) {
    logger.error("[Taqnyat Webhook] SECURITY: Signature verification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * POST /api/webhooks/taqnyat
 *
 * Handle Taqnyat SMS delivery status webhooks
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 100, windowMs: 60_000, keyPrefix: "webhooks:taqnyat" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const MAX_PAYLOAD_BYTES = 512 * 1024; // 512KB safety cap
    if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
      logger.error("[Taqnyat Webhook] Payload too large", {
        size: Buffer.byteLength(rawBody, "utf8"),
      });
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    
    // Verify webhook authenticity FIRST (before parsing)
    if (!verifyWebhookSignature(request, rawBody)) {
      logger.warn("[Taqnyat Webhook] Rejected - invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse payload after verification
    let payload: TaqnyatWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      logger.error("[Taqnyat Webhook] Invalid JSON payload", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    logger.info("[Taqnyat Webhook] Received delivery status", {
      messageId: payload.messageId || payload.msgId,
      status: payload.status || payload.statusCode,
      recipient: payload.recipient || payload.to,
    });

    const messageId = payload.messageId || payload.msgId;
    const statusCode = payload.status || payload.statusCode || "";
    const status = TAQNYAT_STATUS_MAP[statusCode] || "unknown";
    const recipient = payload.recipient || payload.to;

    if (!messageId) {
      logger.warn("[Taqnyat Webhook] Missing messageId in payload");
      return NextResponse.json(
        { error: "Missing messageId" },
        { status: 400 }
      );
    }

    // Update SMS message record in database
    try {
      await connectToDatabase();
      
      // eslint-disable-next-line local/require-tenant-scope -- WEBHOOK: SMS messages keyed by messageSid/providerMessageId
      const updateResult = await SMSMessage.findOneAndUpdate(
        { 
          $or: [
            { messageSid: messageId },
            { providerMessageId: messageId },
          ]
        },
        {
          $set: {
            status: status,
            deliveryStatus: status,
            deliveredAt: payload.deliveredAt || payload.timestamp ? new Date(payload.deliveredAt || payload.timestamp!) : undefined,
            errorCode: payload.errorCode,
            errorMessage: payload.errorMessage,
            updatedAt: new Date(),
          },
          $push: {
            statusHistory: {
              status,
              timestamp: new Date(),
              rawPayload: payload,
            },
          },
        },
        { new: true }
      );

      if (updateResult) {
        logger.info("[Taqnyat Webhook] Updated SMS message status", {
          messageId,
          status,
          recipient,
          dbId: updateResult._id,
        });
      } else {
        logger.warn("[Taqnyat Webhook] SMS message not found in database", {
          messageId,
          status,
        });
      }
    } catch (dbError) {
      // Log but don't fail - we've received the webhook successfully
      logger.error("[Taqnyat Webhook] Database update failed", {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        messageId,
      });
    }

    // Always acknowledge webhook receipt
    return NextResponse.json({
      success: true,
      messageId,
      status,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Taqnyat Webhook] Error processing webhook", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/taqnyat
 *
 * Health check for webhook endpoint
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "webhooks:taqnyat:health" });
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    status: "ok",
    provider: "taqnyat",
    endpoint: "/api/webhooks/taqnyat",
    description: "Taqnyat SMS delivery status webhook receiver",
    timestamp: new Date().toISOString(),
  });
}
