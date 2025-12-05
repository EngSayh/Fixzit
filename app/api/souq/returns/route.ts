import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { User } from "@/server/models/User";

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

    const isPlatformAdmin = session.user.isSuperAdmin || session.user.role === "ADMIN";
    const isCorporateAdmin = session.user.role === "CORPORATE_ADMIN";
    const isAdmin = isPlatformAdmin || isCorporateAdmin;

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

      // 🔒 SECURITY FIX: CORPORATE_ADMIN can only see returns involving their org's users
      let query: Record<string, unknown> = status ? { status } : {};
      
      if (isCorporateAdmin && !isPlatformAdmin) {
        const orgId = session.user.orgId;
        if (!orgId) {
          return NextResponse.json(
            { error: "Organization context required for CORPORATE_ADMIN" },
            { status: 403 },
          );
        }
        
        const orgUserIds = await User.find({ orgId }, { _id: 1 }).lean();
        const userIdStrings = orgUserIds.map((u: { _id: unknown }) => String(u._id));
        
        query = {
          $and: [
            ...(status ? [{ status }] : []),
            {
              $or: [
                { buyerId: { $in: userIdStrings } },
                { sellerId: { $in: userIdStrings } },
              ],
            },
          ],
        };
        
        // If no conditions, simplify
        if (!status) {
          query = {
            $or: [
              { buyerId: { $in: userIdStrings } },
              { sellerId: { $in: userIdStrings } },
            ],
          };
        }
      }
      
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
    logger.error("List returns error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to list returns",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
