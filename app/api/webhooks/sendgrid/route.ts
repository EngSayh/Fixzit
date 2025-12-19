/**
 * @description Receives SendGrid email event webhooks for delivery tracking.
 * Processes delivery, open, click, bounce, and spam report events.
 * Updates email_logs collection with real-time delivery status for auditing.
 * @route POST /api/webhooks/sendgrid
 * @route GET /api/webhooks/sendgrid - Health check for webhook endpoint
 * @access Public - SendGrid server-to-server callback (signature validated)
 * @param {Array} body - Array of SendGrid event objects
 * @returns {Object} success: true if events processed
 * @throws {400} If payload is invalid or signature verification fails
 * @security Requires valid SendGrid webhook signature when configured
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event
 */
import { NextRequest } from "next/server";
import { createSecureResponse } from "@/server/security/headers";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { verifyWebhookSignature } from "@/config/sendgrid.config";
import { getClientIp } from "@/lib/security/client-ip";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { logger } from "@/lib/logger";
/**
 * SendGrid Event Webhook Handler
 *
 * Receives delivery, open, click, bounce, and spam events from SendGrid
 * Updates email_logs collection with real-time delivery status
 *
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security
 */

interface SendGridEvent {
  email: string;
  timestamp: number;
  event:
    | "processed"
    | "delivered"
    | "open"
    | "click"
    | "bounce"
    | "dropped"
    | "spamreport"
    | "unsubscribe"
    | "group_unsubscribe"
    | "group_resubscribe";
  sg_event_id: string;
  sg_message_id: string;
  emailId?: string;
  errorId?: string;
  type?: string;
  url?: string; // For click events
  reason?: string; // For bounce/dropped events
  status?: string; // For bounce events (5.x.x format)
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 100, windowMs: 60_000, keyPrefix: "webhooks:sendgrid" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // SECURITY: Capture client IP for logging (using secure IP detection)
    const clientIp = getClientIp(req);

    // SECURITY: Validate Content-Type (exact match)
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.startsWith("application/json")) {
      logger.warn("⚠️ Invalid Content-Type:", { contentType });
      return createSecureResponse({ error: "Invalid Content-Type" }, 400, req);
    }

    // Get raw body for signature verification
    const rawBody = await req.text();

    // SECURITY: Validate payload size using byte length (prevent DoS with multi-byte chars)
    const MAX_PAYLOAD_SIZE_BYTES = 1024 * 1024; // 1MB
    const payloadBytes = Buffer.byteLength(rawBody, "utf8");
    if (payloadBytes > MAX_PAYLOAD_SIZE_BYTES) {
      logger.error(`❌ Payload too large: ${payloadBytes} bytes`);
      return createSecureResponse({ error: "Payload too large" }, 413, req);
    }

    // Parse events
    let events: SendGridEvent[];
    try {
      events = JSON.parse(rawBody);
      if (!Array.isArray(events)) {
        throw new Error(
          `Invalid payload type: Expected array, got ${typeof events}`,
        );
      }
    } catch (parseError) {
      const error =
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError));
      logger.error("❌ Invalid JSON payload:", error);
      return createSecureResponse({ error: "Invalid JSON payload" }, 400, req);
    }

    // Verify webhook signature (enforced in production, configurable in development)
    // NOTE: These headers use "x-twilio-email-event-webhook-*" because SendGrid is owned by Twilio.
    // This is NOT related to Twilio SMS - it's the standard SendGrid Event Webhook signature format.
    // See: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
    const signature =
      req.headers.get("x-twilio-email-event-webhook-signature") || "";
    const timestamp =
      req.headers.get("x-twilio-email-event-webhook-timestamp") || "";
    const publicKey =
      req.headers.get("x-twilio-email-event-webhook-public-key") || "";

    // CRITICAL SECURITY: Signature verification with timing-safe comparison
    const isValid = verifyWebhookSignature(
      publicKey,
      rawBody,
      signature,
      timestamp,
    );
    if (!isValid) {
      logger.error("❌ Invalid webhook signature from IP", undefined, {
        clientIp,
      });
      return createSecureResponse({ error: "Invalid signature" }, 401, req);
    }

    // Process events
    const db = await getDatabase();
    const emailsCollection = db.collection(COLLECTIONS.EMAIL_LOGS);

    const updates = events.map(async (event) => {
      try {
        const emailId = event.emailId; // Custom arg we sent
        const eventDate = new Date(event.timestamp * 1000);

        // Build update based on event type
        const set: Record<string, unknown> = {
          lastEvent: event.event,
          lastEventAt: eventDate,
          [`events.${event.event}`]: eventDate,
        };
        const inc: Record<string, number> = {};
        const addToSet: Record<string, unknown> = {};

        // Handle specific event types
        switch (event.event) {
          case "delivered":
            set.status = "delivered";
            set.deliveredAt = eventDate;
            break;

          case "open":
            set.opened = true;
            set.openedAt = eventDate;
            inc.openCount = 1;
            break;

          case "click":
            set.clicked = true;
            set.clickedAt = eventDate;
            inc.clickCount = 1;
            if (event.url) {
              addToSet.clickedUrls = event.url;
            }
            break;

          case "bounce":
          case "dropped":
            set.status = "failed";
            set.failedAt = eventDate;
            set.error = event.reason || `Email ${event.event}`;
            set.bounceReason = event.reason;
            set.bounceStatus = event.status;
            break;

          case "spamreport":
            set.status = "spam";
            set.spamReportedAt = eventDate;
            break;

          case "unsubscribe":
          case "group_unsubscribe":
            set.unsubscribed = true;
            set.unsubscribedAt = eventDate;
            break;

          case "group_resubscribe":
            set.unsubscribed = false;
            set.resubscribedAt = eventDate;
            break;
        }

        // Build update doc
        const updateDoc: Record<string, unknown> = { $set: set };
        if (Object.keys(inc).length) {
          updateDoc.$inc = inc;
        }
        if (Object.keys(addToSet).length) {
          updateDoc.$addToSet = addToSet;
        }

        // Update email log
        if (emailId) {
          // PLATFORM-WIDE: email logs are global
          await emailsCollection.updateOne({ emailId }, updateDoc, {
            upsert: false,
          });
        } else {
          // Fallback: find by recipient email and sg_message_id
          // PLATFORM-WIDE: email logs are global
          await emailsCollection.updateOne(
            {
              recipient: event.email,
              "metadata.sg_message_id": event.sg_message_id,
            },
            updateDoc,
            { upsert: false },
          );
        }

        logger.info(
          `✅ Processed ${event.event} for ${event.email} (${emailId || event.sg_message_id})`,
        );
        return { status: "success", event: event.event, email: event.email };
      } catch (eventError) {
        logger.error(
          `❌ Failed to process event ${event.event} for ${event.email}:`,
          eventError instanceof Error
            ? eventError
            : new Error(String(eventError)),
        );
        // Don't throw - continue processing other events
        return {
          status: "failed",
          event: event.event,
          email: event.email,
          error: eventError,
        };
      }
    });

    const results = await Promise.allSettled(updates);

    // Count successful and failed operations in a single pass
    const { successful, failed } = results.reduce(
      (acc, r) => ({
        successful:
          acc.successful +
          (r.status === "fulfilled" && r.value.status === "success" ? 1 : 0),
        failed:
          acc.failed +
          (r.status === "rejected" ||
          (r.status === "fulfilled" && r.value.status === "failed")
            ? 1
            : 0),
      }),
      { successful: 0, failed: 0 },
    );

    if (failed > 0) {
      logger.warn(
        `⚠️  Webhook processing partial success: ${successful} succeeded, ${failed} failed`,
      );
    }

    return createSecureResponse(
      {
        success: failed === 0, // Only true if all succeeded
        processed: events.length,
        successful,
        failed,
        message:
          failed > 0
            ? `Processed ${events.length} events: ${successful} successful, ${failed} failed`
            : "Events processed successfully",
      },
      failed > 0 ? 500 : 200,
      req,
    ); // Return 500 if any failed to trigger SendGrid retry
  } catch (error) {
    logger.error("❌ Webhook processing error:", error);
    return createSecureResponse(
      {
        error: "Failed to process webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      req,
    );
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 120, windowMs: 60_000, keyPrefix: "webhooks:sendgrid:health" });
  if (rateLimitResponse) return rateLimitResponse;

  return createSecureResponse(
    {
      status: "healthy",
      service: "sendgrid-webhook",
      timestamp: new Date().toISOString(),
    },
    200,
    req,
  );
}
