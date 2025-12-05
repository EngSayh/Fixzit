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

    if (!fsin) {
      return NextResponse.json({ error: "FSIN is required" }, { status: 400 });
    }

    const winner = await BuyBoxService.calculateBuyBoxWinner(fsin);

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
