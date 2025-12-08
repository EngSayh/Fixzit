/**
 * Nexmo (Vonage) SMS Webhook Handler
 *
 * Receives delivery status callbacks from Nexmo/Vonage SMS provider.
 * Updates SMSMessage status based on delivery receipts.
 *
 * @module app/api/webhooks/nexmo/sms
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

// Nexmo delivery status codes
// https://developer.vonage.com/messaging/sms/guides/delivery-receipts
const STATUS_MAP: Record<string, "SENT" | "DELIVERED" | "FAILED"> = {
  delivered: "DELIVERED",
  accepted: "SENT",
  buffered: "SENT",
  expired: "FAILED",
  failed: "FAILED",
  rejected: "FAILED",
  unknown: "SENT",
};

// Nexmo error codes that indicate permanent failure
const PERMANENT_FAILURE_CODES = new Set([
  "1", // Unknown
  "2", // Absent subscriber temporary
  "3", // Absent subscriber permanent
  "4", // Call barred by user
  "5", // Portability error
  "6", // Anti-spam rejection
  "7", // Handset busy
  "8", // Network error
  "9", // Illegal number
  "10", // Invalid message
  "11", // Unroutable
  "12", // Destination unreachable
  "99", // General error
]);

/**
 * Verify Nexmo webhook signature
 * Nexmo uses HMAC-SHA256 or JWT depending on configuration
 */
function verifyNexmoSignature(
  request: NextRequest,
  params: URLSearchParams,
  secret: string
): boolean {
  if (!secret) return true; // Skip if no secret configured

  const signature = params.get("sig");
  if (!signature) return false;

  // Build the signature base string (sorted parameters without sig)
  const sortedParams = Array.from(params.entries())
    .filter(([key]) => key !== "sig")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex")
    .toUpperCase();

  return crypto.timingSafeEqual(
    Buffer.from(signature.toUpperCase()),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/nexmo/sms
 * GET /api/webhooks/nexmo/sms (Nexmo can send via GET)
 *
 * Handles Nexmo/Vonage delivery receipts
 */
async function handleNexmoWebhook(request: NextRequest) {
  try {
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`nexmo-webhook:${clientIp}`, 100, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Nexmo can send via GET or POST
    let params: URLSearchParams;
    if (request.method === "GET") {
      params = request.nextUrl.searchParams;
    } else {
      const body = await request.text();
      // Nexmo sends form-urlencoded or JSON
      if (request.headers.get("content-type")?.includes("application/json")) {
        const json = JSON.parse(body);
        params = new URLSearchParams(json);
      } else {
        params = new URLSearchParams(body);
      }
    }

    const webhookSecret = process.env.NEXMO_WEBHOOK_SECRET;
    if (webhookSecret && !verifyNexmoSignature(request, params, webhookSecret)) {
      logger.warn("[Nexmo Webhook] Invalid signature", { clientIp });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Nexmo delivery receipt fields
    const messageId = params.get("messageId") || params.get("message-id");
    const status = params.get("status")?.toLowerCase();
    const errCode = params.get("err-code");
    const messageTimestamp = params.get("message-timestamp");
    const scts = params.get("scts"); // Service center timestamp

    if (!messageId) {
      logger.warn("[Nexmo Webhook] Missing messageId");
      return NextResponse.json(
        { error: "Missing messageId" },
        { status: 400 }
      );
    }

    // Map Nexmo status to our status
    const ourStatus = status ? STATUS_MAP[status] : undefined;
    if (!ourStatus) {
      logger.info("[Nexmo Webhook] Ignoring intermediate status", {
        messageId,
        status,
      });
      return NextResponse.json({ success: true, ignored: true });
    }

    await connectToDatabase();

    // Find message by provider message ID
    const message = await SMSMessage.findOne({ providerMessageId: messageId });
    if (!message) {
      logger.warn("[Nexmo Webhook] Message not found", { messageId });
      return NextResponse.json({ success: true, notFound: true });
    }

    // 🔐 STRICT v4.1: Org-scoped filter for updates
    const orgScopedFilter = { _id: message._id, orgId: message.orgId };

    // Parse delivery timestamp
    let deliveredAt: Date | undefined;
    if (scts) {
      // SCTS format: YYMMDDHHMM
      const year = parseInt(`20${scts.substring(0, 2)}`, 10);
      const month = parseInt(scts.substring(2, 4), 10) - 1;
      const day = parseInt(scts.substring(4, 6), 10);
      const hour = parseInt(scts.substring(6, 8), 10);
      const minute = parseInt(scts.substring(8, 10), 10);
      deliveredAt = new Date(year, month, day, hour, minute);
    } else if (messageTimestamp) {
      deliveredAt = new Date(messageTimestamp);
    }

    if (ourStatus === "DELIVERED") {
      // Use org-scoped update instead of markDelivered to ensure tenant isolation
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "DELIVERED",
        deliveredAt: deliveredAt || new Date(),
      });
      logger.info("[Nexmo Webhook] Message delivered", {
        messageId: message._id.toString(),
        providerMessageId: messageId,
        orgId: message.orgId,
      });
    } else if (ourStatus === "FAILED") {
      const isPermanent = errCode ? PERMANENT_FAILURE_CODES.has(errCode) : false;
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "FAILED",
        lastError: `Nexmo error: ${errCode}`,
        lastErrorCode: errCode || "UNKNOWN",
        metadata: {
          ...message.metadata,
          nexmoPermanentFailure: isPermanent,
        },
      });
      logger.warn("[Nexmo Webhook] Message delivery failed", {
        messageId: message._id.toString(),
        providerMessageId: messageId,
        orgId: message.orgId,
        errorCode: errCode,
        permanent: isPermanent,
      });
    } else if (ourStatus === "SENT") {
      await SMSMessage.findOneAndUpdate(orgScopedFilter, {
        status: "SENT",
        sentAt: deliveredAt || new Date(),
      });
      logger.info("[Nexmo Webhook] Message sent/accepted", {
        messageId: message._id.toString(),
        providerMessageId: messageId,
        orgId: message.orgId,
      });
    }

    return NextResponse.json({ success: true, status: ourStatus });
  } catch (error) {
    logger.error("[Nexmo Webhook] Error processing callback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleNexmoWebhook(request);
}

export async function GET(request: NextRequest) {
  return handleNexmoWebhook(request);
}
