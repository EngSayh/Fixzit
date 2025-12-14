/**
 * @fileoverview Tap Payments Webhook API (Refactored)
 * @description Receives and processes Tap payment webhooks for charge and refund events.
 * Verifies signature, handles idempotency, and delegates to extracted handlers.
 * @route POST /api/payments/tap/webhook - Process Tap webhook events
 * @route GET /api/payments/tap/webhook - Webhook configuration info
 * @access Tap servers only - Signature verified
 * @module payments
 * 
 * Refactored: Event handlers and persistence logic extracted to:
 * - lib/finance/tap-webhook/handlers.ts
 * - lib/finance/tap-webhook/persistence.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { Config } from "@/lib/config/constants";
import { tapPayments, type TapWebhookEvent } from "@/lib/finance/tap-payments";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import { withIdempotency } from "@/server/security/idempotency";
import { routeWebhookEvent } from "@/lib/finance/tap-webhook/handlers";

// Configuration
const TAP_WEBHOOK_MAX_BYTES = Config.payment.tap.webhook.maxBytes;
const TAP_WEBHOOK_RATE_LIMIT = {
  requests: Config.payment.tap.webhook.rateLimit,
  windowMs: Config.payment.tap.webhook.rateWindowMs,
};
const TAP_WEBHOOK_IDEMPOTENCY_TTL_MS = Config.payment.tap.webhook.idempotencyTtlMs;

/**
 * POST /api/payments/tap/webhook
 *
 * Receive and process Tap payment webhooks
 *
 * Webhook Events:
 * - charge.created: Charge was created
 * - charge.captured: Payment was successful
 * - charge.authorized: Payment was authorized (requires capture)
 * - charge.declined: Payment was declined
 * - charge.failed: Payment failed
 * - refund.created: Refund was created
 * - refund.succeeded: Refund was successful
 * - refund.failed: Refund failed
 *
 * Security:
 * - Verifies webhook signature using TAP_WEBHOOK_SECRET
 * - Logs all events for audit trail
 * - Idempotent processing based on event ID
 */
export async function POST(req: NextRequest) {
  const correlationId = randomUUID();

  try {
    // Rate limiting
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(
      `tap-webhook:${clientIp}`,
      TAP_WEBHOOK_RATE_LIMIT.requests,
      TAP_WEBHOOK_RATE_LIMIT.windowMs,
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const bodyBytes = Buffer.byteLength(rawBody, "utf8");
    if (
      Number.isFinite(TAP_WEBHOOK_MAX_BYTES) &&
      TAP_WEBHOOK_MAX_BYTES > 0 &&
      bodyBytes > TAP_WEBHOOK_MAX_BYTES
    ) {
      logger.warn(
        "[POST /api/payments/tap/webhook] Payload exceeds size limit",
        {
          correlationId,
          bodyBytes,
          limit: TAP_WEBHOOK_MAX_BYTES,
          clientIp,
        },
      );
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const signature = req.headers.get("x-tap-signature") || "";

    logger.info("[POST /api/payments/tap/webhook] Received webhook", {
      correlationId,
      signature: signature.substring(0, 10) + "...",
      bodyLength: rawBody.length,
    });

    // Parse and verify webhook event
    let event: TapWebhookEvent;
    try {
      event = tapPayments.parseWebhookEvent(rawBody, signature);
    } catch (error) {
      logger.error(
        "[POST /api/payments/tap/webhook] Invalid webhook signature or payload",
        {
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    logger.info("[POST /api/payments/tap/webhook] Processing webhook event", {
      correlationId,
      eventId: event.id,
      eventType: event.type,
      liveMode: event.live_mode,
    });

    // Process with idempotency
    await withIdempotency(
      `tap:webhook:${event.id}`,
      async () => {
        await connectToDatabase();
        await routeWebhookEvent(event, correlationId);
      },
      TAP_WEBHOOK_IDEMPOTENCY_TTL_MS,
    );

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true, eventId: event.id });
  } catch (error) {
    logger.error("[POST /api/payments/tap/webhook] Error processing webhook", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 to signal Tap to retry
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        correlationId,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/payments/tap/webhook
 *
 * Webhook configuration endpoint (for testing/debugging)
 * Returns webhook URL that should be configured in Tap dashboard
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const webhookUrl = `${baseUrl}/api/payments/tap/webhook`;

  return NextResponse.json({
    webhookUrl,
    instructions:
      "Configure this URL in your Tap dashboard under Webhooks settings",
    events: [
      "charge.created",
      "charge.captured",
      "charge.authorized",
      "charge.declined",
      "charge.failed",
      "refund.created",
      "refund.succeeded",
      "refund.failed",
    ],
  });
}
