/**
 * AWS SNS SMS Webhook Handler
 *
 * Receives delivery status callbacks from AWS SNS SMS.
 * Handles SNS subscription confirmation and delivery notifications.
 *
 * @module app/api/webhooks/sns/sms
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage } from "@/server/models/SMSMessage";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

// AWS SNS message types
type SNSMessageType = "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";

// SNS delivery status mapping
const STATUS_MAP: Record<string, "SENT" | "DELIVERED" | "FAILED"> = {
  SUCCESS: "DELIVERED",
  FAILURE: "FAILED",
  OPTOUT: "FAILED",
  UNKNOWN: "SENT",
};

/**
 * Verify AWS SNS message signature
 * SNS uses X.509 certificate-based signing
 */
async function verifySNSSignature(message: Record<string, unknown>): Promise<boolean> {
  try {
    // In production, you should verify the signing certificate URL
    // and validate the signature using the public key
    const signingCertUrl = message.SigningCertURL as string;
    
    // Security: Only accept certificates from AWS
    if (!signingCertUrl?.startsWith("https://sns.") || !signingCertUrl?.includes(".amazonaws.com/")) {
      logger.warn("[SNS Webhook] Invalid signing cert URL", { url: signingCertUrl });
      return false;
    }

    // For production, implement full signature verification
    // This is a simplified check - full implementation would fetch cert and verify
    return true;
  } catch (error) {
    logger.error("[SNS Webhook] Signature verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Handle SNS subscription confirmation
 */
async function handleSubscriptionConfirmation(subscribeUrl: string): Promise<boolean> {
  try {
    // Security: Only accept AWS URLs
    if (!subscribeUrl.startsWith("https://sns.") || !subscribeUrl.includes(".amazonaws.com/")) {
      logger.warn("[SNS Webhook] Invalid subscribe URL", { url: subscribeUrl });
      return false;
    }

    const response = await fetch(subscribeUrl);
    const success = response.ok;
    
    logger.info("[SNS Webhook] Subscription confirmation", {
      success,
      status: response.status,
    });
    
    return success;
  } catch (error) {
    logger.error("[SNS Webhook] Subscription confirmation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * POST /api/webhooks/sns/sms
 *
 * Handles AWS SNS delivery status webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`sns-webhook:${clientIp}`, 200, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const rawBody = await request.text();
    const snsMessage = JSON.parse(rawBody);

    // Verify SNS signature
    if (!(await verifySNSSignature(snsMessage))) {
      logger.warn("[SNS Webhook] Invalid signature", { clientIp });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const messageType = request.headers.get("x-amz-sns-message-type") as SNSMessageType;

    // Handle subscription confirmation
    if (messageType === "SubscriptionConfirmation") {
      const subscribeUrl = snsMessage.SubscribeURL as string;
      const confirmed = await handleSubscriptionConfirmation(subscribeUrl);
      return NextResponse.json({
        success: confirmed,
        type: "SubscriptionConfirmation",
      });
    }

    // Handle unsubscribe confirmation
    if (messageType === "UnsubscribeConfirmation") {
      logger.info("[SNS Webhook] Unsubscribe confirmation received");
      return NextResponse.json({
        success: true,
        type: "UnsubscribeConfirmation",
      });
    }

    // Handle delivery notification
    if (messageType === "Notification") {
      const notificationMessage = JSON.parse(snsMessage.Message as string);
      
      // SNS SMS delivery notification structure
      const {
        notification: {
          messageId: MessageId,
          timestamp,
        } = {} as { messageId?: string; timestamp?: string },
        delivery: {
          phoneCarrier,
          providerResponse,
        } = {} as { phoneCarrier?: string; providerResponse?: string },
        status: Status,
      } = notificationMessage;

      if (!MessageId) {
        logger.warn("[SNS Webhook] Missing messageId in notification");
        return NextResponse.json({ success: true, ignored: true });
      }

      await connectToDatabase();

      // Map SNS status to our status
      const ourStatus = STATUS_MAP[Status?.toUpperCase()] || "SENT";

      // Find message by provider message ID
      const message = await SMSMessage.findOne({ providerMessageId: MessageId });
      if (!message) {
        logger.warn("[SNS Webhook] Message not found", { messageId: MessageId });
        return NextResponse.json({ success: true, notFound: true });
      }

      // 🔐 STRICT v4.1: Org-scoped filter for updates
      const orgScopedFilter = { _id: message._id, orgId: message.orgId };

      if (ourStatus === "DELIVERED") {
        // Use org-scoped update instead of markDelivered to ensure tenant isolation
        await SMSMessage.findOneAndUpdate(orgScopedFilter, {
          status: "DELIVERED",
          deliveredAt: timestamp ? new Date(timestamp) : new Date(),
        });
        logger.info("[SNS Webhook] Message delivered", {
          messageId: message._id.toString(),
          providerMessageId: MessageId,
          orgId: message.orgId,
          carrier: phoneCarrier,
        });
      } else if (ourStatus === "FAILED") {
        await SMSMessage.findOneAndUpdate(orgScopedFilter, {
          status: "FAILED",
          lastError: providerResponse || "SNS delivery failed",
          lastErrorCode: "SNS_FAILURE",
        });
        logger.warn("[SNS Webhook] Message delivery failed", {
          messageId: message._id.toString(),
          providerMessageId: MessageId,
          orgId: message.orgId,
          providerResponse,
        });
      }

      return NextResponse.json({ success: true, status: ourStatus });
    }

    return NextResponse.json({ success: true, type: "unknown" });
  } catch (error) {
    logger.error("[SNS Webhook] Error processing callback", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
