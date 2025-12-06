import { NextRequest, NextResponse } from "next/server";
import { AuctionEngine } from "@/services/souq/ads/auction-engine";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";

/**
 * POST /api/souq/ads/impressions
 * Track ad impression
 * 
 * SECURITY: Rate limited to prevent impression fraud.
 * For production, consider server-side impression tracking.
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP to prevent automated impression fraud
  const clientIp = getClientIP(request);
  const rl = await smartRateLimit(`ad-impression:${clientIp}`, 100, 60_000); // 100 impressions per minute per IP
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    const { bidId, campaignId, orgId, query, category, productId } = body;

    if (!bidId || !campaignId || !orgId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: bidId, campaignId, orgId" },
        { status: 400 },
      );
    }

    await AuctionEngine.recordImpression(bidId, campaignId, {
      orgId, // Required for tenant isolation (STRICT v4.1)
      query,
      category,
      productId,
    });

    return NextResponse.json({
      success: true,
      message: "Impression recorded",
    });
  } catch (error) {
    logger.error("[Ad API] Record impression failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record impression",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
