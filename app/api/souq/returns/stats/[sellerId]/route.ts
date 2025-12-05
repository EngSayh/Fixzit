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
    const isPlatformAdmin = session.user.role === "SUPER_ADMIN" || session.user.isSuperAdmin;
    const sessionOrgId = (session.user as { orgId?: string }).orgId;

    const { sellerId } = params;
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "month") as
      | "week"
      | "month"
      | "year";
    const targetOrgId = searchParams.get("targetOrgId") || undefined;

    // Check access
    const isAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role);
    const isSeller = sellerId === session.user.id;

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🔒 TENANT SCOPING: orgId required; platform admins must explicitly choose targetOrgId
    if (isPlatformAdmin) {
      if (!targetOrgId) {
        return NextResponse.json(
          { error: "targetOrgId is required for platform admins" },
          { status: 400 },
        );
      }
    }

    const resolvedOrgId = isPlatformAdmin ? targetOrgId : sessionOrgId;
    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Get stats
    const stats = await returnsService.getSellerReturnStats(sellerId, resolvedOrgId, period);

    logger.info("Return stats fetched", {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      sellerId,
      period,
      targetOrgId: resolvedOrgId,
    });

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
