import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * GET /api/souq/returns/eligibility/[orderId]/[listingId]
 * Check if an order item is eligible for return
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string; listingId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, listingId } = params;

    // Check eligibility
    const eligibility = await returnsService.checkEligibility(
      orderId,
      listingId,
    );

    return NextResponse.json({
      success: true,
      ...eligibility,
    });
  } catch (error) {
    logger.error("Check eligibility error", { error });
    return NextResponse.json(
      {
        error: "Failed to check eligibility",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
