import { NextRequest, NextResponse } from "next/server";
import { AuctionEngine } from "@/services/souq/ads/auction-engine";
import { BudgetManager } from "@/services/souq/ads/budget-manager";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/ads/clicks
 * Track ad click and charge budget
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { bidId, campaignId, actualCpc, query, category, productId } = body;

    if (!bidId || !campaignId || !actualCpc) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: bidId, campaignId, actualCpc",
        },
        { status: 400 },
      );
    }

    const cpc = parseFloat(actualCpc);

    // Check budget availability
    const canCharge = await BudgetManager.canCharge(campaignId, cpc);

    if (!canCharge) {
      return NextResponse.json(
        { success: false, error: "Insufficient budget" },
        { status: 402 }, // Payment Required
      );
    }

    // Charge budget
    const charged = await BudgetManager.chargeBudget(campaignId, cpc);

    if (!charged) {
      return NextResponse.json(
        { success: false, error: "Failed to charge budget" },
        { status: 402 },
      );
    }

    // Record click
    await AuctionEngine.recordClick(bidId, campaignId, cpc, {
      query,
      category,
      productId,
    });

    return NextResponse.json({
      success: true,
      message: "Click recorded",
      charged: cpc,
    });
  } catch (error) {
    logger.error("[Ad API] Record click failed", { error });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record click",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
