/**
 * @description Receives shipping carrier tracking webhooks for order fulfillment.
 * Updates shipment status from Aramex, SMSA, and SPL carriers.
 * Validates HMAC-SHA256 signatures per carrier webhook secret.
 * @route POST /api/webhooks/carrier/tracking - Receive tracking update
 * @route GET /api/webhooks/carrier/tracking - Health check
 * @access Public - Carrier server-to-server callback (signature validated)
 * @param {Object} body.carrier - Carrier identifier: aramex, smsa, spl
 * @param {Object} body.trackingNumber - Shipment tracking number
 * @param {Object} body.status - Updated shipment status
 * @param {Object} body.signature - HMAC-SHA256 signature for verification
 * @param {Object} body.orgId - Organization ID for tenant scoping
 * @returns {Object} success: true if processed
 * @throws {400} If payload validation fails
 * @throws {401} If signature verification fails
 * @security Each carrier has own webhook secret (ARAMEX_WEBHOOK_SECRET, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * Carrier webhook secrets - should be configured per carrier
 * Each carrier provides their own webhook signing key
 */
const CARRIER_WEBHOOK_SECRETS: Record<string, string | undefined> = {
  aramex: process.env.ARAMEX_WEBHOOK_SECRET,
  smsa: process.env.SMSA_WEBHOOK_SECRET,
  spl: process.env.SPL_WEBHOOK_SECRET,
};

const TrackingWebhookSchema = z.object({
  carrier: z.enum(["aramex", "smsa", "spl"]),
  trackingNumber: z.string().min(1),
  status: z.string().optional(),
  location: z.string().optional(),
  timestamp: z.string().optional(),
  signature: z.string().min(1, "Webhook signature is required"),
  orgId: z.string().min(1, "Organization ID is required"),
});

/**
 * Verify webhook signature using HMAC-SHA256
 * Each carrier signs webhooks with their secret key
 */
function verifyWebhookSignature(
  body: Record<string, unknown>,
  signature: string,
  carrier: string,
): boolean {
  const secret = CARRIER_WEBHOOK_SECRETS[carrier];
  if (!secret) {
    // If no secret configured, reject for security
    logger.warn(`[carrier-webhook] No secret configured for carrier: ${carrier}`);
    return false;
  }

  // Create payload for verification (exclude signature from body)
  const { signature: _sig, ...payload } = body;
  const payloadString = JSON.stringify(payload);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/carrier/tracking
 * Webhook endpoint for carrier tracking updates
 * Accepts updates from Aramex, SMSA, SPL
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 100, windowMs: 60_000, keyPrefix: "webhooks:carrier:tracking" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate request body with Zod
    const parseResult = TrackingWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues.map((i) => i.message),
        },
        { status: 400 },
      );
    }

    const { carrier, trackingNumber, signature, orgId } = parseResult.data;

    // Verify webhook signature (SECURITY: Always verify in all environments)
    const isValid = verifyWebhookSignature(body, signature, carrier);
    if (!isValid) {
      logger.warn(`[carrier-webhook] Invalid signature for carrier: ${carrier}`, {
        trackingNumber,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Update tracking
    await fulfillmentService.updateTracking(trackingNumber, carrier, orgId);

    return NextResponse.json({
      success: true,
      message: "Tracking updated successfully",
      trackingNumber,
    });
  } catch (error) {
    logger.error("Webhook tracking update error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/carrier/tracking
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "webhooks:carrier:health" });
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    status: "ok",
    service: "carrier-tracking-webhook",
    timestamp: new Date().toISOString(),
  });
}
