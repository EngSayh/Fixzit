/**
 * Taqnyat SMS Webhook Handler
 *
 * Receives delivery status callbacks from Taqnyat SMS provider.
 * Updates SMS message records with delivery status.
 *
 * @see https://taqnyat.sa/documentation (delivery reports section)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";

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
 * Verify webhook signature (if Taqnyat provides one)
 */
function verifyWebhookSignature(
  _request: NextRequest,
  _payload: TaqnyatWebhookPayload
): boolean {
  // Taqnyat may provide a signature header for webhook verification
  // Implement signature verification if available in their API
  const webhookSecret = process.env.TAQNYAT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    // No secret configured - allow all webhooks (not recommended for production)
    logger.warn("[Taqnyat Webhook] No webhook secret configured - skipping signature verification");
    return true;
  }

  // ROADMAP: Implement signature verification when Taqnyat provides HMAC documentation
  // Taqnyat API currently doesn't document webhook signatures. Monitor their API updates.
  // const signature = request.headers.get("x-taqnyat-signature");
  // return verifyHMAC(signature, JSON.stringify(payload), webhookSecret);
  
  return true;
}

/**
 * POST /api/webhooks/taqnyat
 *
 * Handle Taqnyat SMS delivery status webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const payload: TaqnyatWebhookPayload = await request.json();

    logger.info("[Taqnyat Webhook] Received delivery status", {
      messageId: payload.messageId || payload.msgId,
      status: payload.status || payload.statusCode,
      recipient: payload.recipient || payload.to,
    });

    // Verify webhook authenticity
    if (!verifyWebhookSignature(request, payload)) {
      logger.warn("[Taqnyat Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

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
export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider: "taqnyat",
    endpoint: "/api/webhooks/taqnyat",
    description: "Taqnyat SMS delivery status webhook receiver",
    timestamp: new Date().toISOString(),
  });
}
