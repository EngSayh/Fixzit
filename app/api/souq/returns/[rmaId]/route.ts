import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/returns/[rmaId]
 * Get RMA details
 * Buyer, seller, or admin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rmaId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rmaId } = params;

    // Get RMA
    const { SouqRMA } = await import("@/server/models/souq/RMA");
    const rma = await SouqRMA.findById(rmaId)
      .populate("orderId")
      .populate("buyerId")
      .populate("sellerId");

    if (!rma) {
      return NextResponse.json({ error: "RMA not found" }, { status: 404 });
    }

    // Check access
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const isBuyer = rma.buyerId.toString() === session.user.id;
    const isSeller = rma.sellerId.toString() === session.user.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      rma,
    });
  } catch (error) {
    logger.error("Get RMA error", { error });
    return NextResponse.json(
      {
        error: "Failed to get RMA",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
