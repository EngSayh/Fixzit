import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * GET /api/souq/returns/stats/[sellerId]
 * Get return statistics for a seller
 * Seller or admin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sellerId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sellerId } = params;
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "month") as
      | "week"
      | "month"
      | "year";

    // Check access
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const isSeller = sellerId === session.user.id;

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get stats
    const stats = await returnsService.getSellerReturnStats(sellerId, period);

    return NextResponse.json({
      success: true,
      stats,
      period,
    });
  } catch (error) {
    logger.error("Get return stats error", { error });
    return NextResponse.json(
      {
        error: "Failed to get return stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
