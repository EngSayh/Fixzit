import { NextRequest, NextResponse } from "next/server";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/webhooks/carrier/tracking
 * Webhook endpoint for carrier tracking updates
 * Accepts updates from Aramex, SMSA, SPL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      carrier,
      trackingNumber,
      status: _status,
      location: _location,
      timestamp: _timestamp,
      signature: _signature,
      orgId,
    } = body;

    // Validation
    if (!carrier || !trackingNumber) {
      return NextResponse.json(
        {
          error: "Missing required fields: carrier, trackingNumber",
        },
        { status: 400 },
      );
    }

    // Verify webhook signature (in production)
    // const isValid = verifyWebhookSignature(body, signature, carrier);
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // Update tracking
    await fulfillmentService.updateTracking(trackingNumber, carrier, orgId);

    return NextResponse.json({
      success: true,
      message: "Tracking updated successfully",
      trackingNumber,
    });
  } catch (error) {
    logger.error("Webhook tracking update error", { error });
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
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "carrier-tracking-webhook",
    timestamp: new Date().toISOString(),
  });
}
