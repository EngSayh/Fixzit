/**
 * @description Calculates and returns the Buy Box winner for a product FSIN.
 * The Buy Box algorithm considers price, seller rating, shipping speed, and inventory.
 * Returns the winning seller's offer details if eligible sellers exist.
 * @route GET /api/souq/buybox/winner/[fsin]
 * @access Public - Tenant-scoped via orgId query parameter
 * @param {string} fsin - Fixzit Standard Identification Number (product identifier)
 * @query {string} orgId - Organization ID for tenant scoping
 * @returns {Object} success: true, winner: offer details with sellerId, price, shipping
 * @throws {400} If FSIN or orgId is missing
 * @throws {404} If no eligible sellers found for product
 */
import { NextRequest, NextResponse } from "next/server";
import { BuyBoxService } from "@/services/souq/buybox-service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ fsin: string }>;
}

/**
 * GET /api/souq/buybox/winner/[fsin]
 * Get Buy Box winner for a product
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { fsin } = await context.params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "";

    if (!fsin) {
      return NextResponse.json({ error: "FSIN is required" }, { status: 400 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const winner = await BuyBoxService.calculateBuyBoxWinner(fsin, orgId);

    if (!winner) {
      return NextResponse.json(
        { error: "No eligible sellers found for this product" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      winner,
    });
  } catch (error) {
    logger.error("Get Buy Box winner error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get Buy Box winner",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
