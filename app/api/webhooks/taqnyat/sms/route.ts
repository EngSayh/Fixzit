/**
 * Taqnyat SMS Webhook Handler
 *
 * Handles delivery status callbacks from Taqnyat SMS API.
 * This endpoint receives webhook notifications when SMS messages are delivered, failed, etc.
 *
 * Taqnyat sends delivery reports to the configured webhook URL.
 * The webhook must respond with the pass phrase to confirm receipt.
 *
 * @see https://dev.taqnyat.sa/en/doc/sms/
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Webhook pass phrase for Taqnyat - must match what's configured in Taqnyat portal
const TAQNYAT_WEBHOOK_PHRASE = process.env.TAQNYAT_WEBHOOK_PHRASE || "Fixzit";

/**
 * Taqnyat Delivery Report Payload
 * Based on Taqnyat documentation
 */
interface TaqnyatDeliveryReport {
  msgid?: string | number;
  messageId?: string | number;
  status?: string;
  deliveryStatus?: string;
  recipient?: string;
  to?: string;
  sentAt?: string;
  deliveredAt?: string;
  errorCode?: string | number;
  errorMessage?: string;
}

/**
 * Map Taqnyat status to internal delivery status
 */
function mapDeliveryStatus(status?: string): string {
  if (!status) return "unknown";
  
  const statusLower = status.toLowerCase();
  
  // Common Taqnyat status codes
  const statusMap: Record<string, string> = {
    "delivered": "delivered",
    "sent": "sent",
    "pending": "sending",
    "queued": "queued",
    "failed": "failed",
    "rejected": "failed",
    "undelivered": "undelivered",
    "expired": "failed",
    "unknown": "unknown",
  };

  return statusMap[statusLower] || "unknown";
}

/**
 * POST /api/webhooks/taqnyat/sms
 *
 * Receives delivery status updates from Taqnyat
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: TaqnyatDeliveryReport;

    // Parse the request body based on content type
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as unknown as TaqnyatDeliveryReport;
    } else {
      // Try JSON first, then text
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        logger.warn("[Taqnyat Webhook] Unable to parse body", { contentType, text: text.substring(0, 200) });
        return new NextResponse(TAQNYAT_WEBHOOK_PHRASE, { status: 200 });
      }
    }

    const messageId = String(payload.msgid || payload.messageId || "");
    const status = mapDeliveryStatus(payload.status || payload.deliveryStatus);
    const recipient = payload.recipient || payload.to || "";

    logger.info("[Taqnyat Webhook] Delivery report received", {
      messageId,
      status,
      recipient: recipient.replace(/\d(?=\d{4})/g, "*"),
      deliveredAt: payload.deliveredAt,
      errorCode: payload.errorCode,
    });

    // Log delivery status for tracking
    // In production, this could be extended to update notification logs via MongoDB
    if (messageId && status !== "unknown") {
      logger.debug("[Taqnyat Webhook] Delivery status update", {
        messageId,
        status,
        taqnyatDeliveredAt: payload.deliveredAt,
        taqnyatErrorCode: payload.errorCode,
        taqnyatErrorMessage: payload.errorMessage,
      });
    }

    // Return the pass phrase to confirm receipt
    // Taqnyat expects the exact pass phrase in the response
    return new NextResponse(TAQNYAT_WEBHOOK_PHRASE, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    logger.error("[Taqnyat Webhook] Error processing webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Still return pass phrase even on error to acknowledge receipt
    return new NextResponse(TAQNYAT_WEBHOOK_PHRASE, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

/**
 * GET /api/webhooks/taqnyat/sms
 *
 * Health check endpoint - Taqnyat may ping this to verify webhook is active
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider: "taqnyat",
    webhook: "sms-delivery-status",
    timestamp: new Date().toISOString(),
  });
}
