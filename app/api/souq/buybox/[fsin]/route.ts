/**
 * Souq Buy Box API - Get Buy Box winner and all offers for a product
 * @route /api/souq/buybox/[fsin]
 */

import { NextResponse } from "next/server";
import { BuyBoxService } from "@/services/souq/buybox-service";
import { connectDb } from "@/lib/mongodb-unified";
import { getServerSession } from "@/lib/auth/getServerSession";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  context: { params: { fsin: string } },
) {
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    // Authorization check - ensure user has orgId for multi-tenant isolation
    if (!session.user.orgId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Organization context required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { fsin } = context.params;

    if (!fsin) {
      return NextResponse.json({ error: "FSIN is required" }, { status: 400 });
    }

    const [buyBoxWinner, allOffers] = await Promise.all([
      BuyBoxService.calculateBuyBoxWinner(fsin, session.user.orgId),
      BuyBoxService.getProductOffers(fsin, { condition: "new", sort: "price", orgId: session.user.orgId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        buyBoxWinner,
        allOffers,
        offerCount: allOffers.length,
      },
    });
  } catch (error) {
    logger.error("Buy Box fetch error", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch Buy Box data" },
      { status: 500 },
    );
  }
}
