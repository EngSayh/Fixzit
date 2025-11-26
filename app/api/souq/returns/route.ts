import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * GET /api/souq/returns
 * List returns for buyer, seller, or admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "buyer"; // buyer, seller, admin

    const isAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role);

    if (type === "buyer") {
      // Get buyer's return history
      const returns = await returnsService.getBuyerReturnHistory(
        session.user.id,
      );

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "seller") {
      // Get seller's returns
      const { SouqRMA } = await import("@/server/models/souq/RMA");
      const returns = await SouqRMA.find({ sellerId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(100);

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "admin" && isAdmin) {
      // Get all returns (admin view)
      const { SouqRMA } = await import("@/server/models/souq/RMA");
      const status = searchParams.get("status");

      const query = status ? { status } : {};
      const returns = await SouqRMA.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("buyerId", "email name")
        .populate("sellerId", "email businessName");

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch (error) {
    logger.error("List returns error", { error });
    return NextResponse.json(
      {
        error: "Failed to list returns",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
