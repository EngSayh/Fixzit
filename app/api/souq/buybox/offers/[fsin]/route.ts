import { NextRequest, NextResponse } from "next/server";
import { BuyBoxService } from "@/services/souq/buybox-service";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ fsin: string }>;
}

/**
 * GET /api/souq/buybox/offers/[fsin]
 * Get all offers for a product (for "Other Sellers" section)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { fsin } = await context.params;
    const { searchParams } = new URL(request.url);

    if (!fsin) {
      return NextResponse.json({ error: "FSIN is required" }, { status: 400 });
    }

    const condition = searchParams.get("condition") || "new";
    const sort = searchParams.get("sort") || "price";

    const offers = await BuyBoxService.getProductOffers(fsin, {
      condition,
      sort,
    });

    return NextResponse.json({
      success: true,
      offers,
      total: offers.length,
    });
  } catch (error) {
    logger.error("Get product offers error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get product offers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
