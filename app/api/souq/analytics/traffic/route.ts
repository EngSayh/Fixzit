import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { analyticsService } from "@/services/souq/analytics/analytics-service";

/**
 * GET /api/souq/analytics/traffic
 * Get traffic and engagement analytics for seller
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // 🔐 STRICT v4.1: Require orgId for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "last_30_days") as
      | "last_7_days"
      | "last_30_days"
      | "last_90_days";

    const traffic = await analyticsService.getTrafficAnalytics(
      orgId,
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...traffic,
    });
  } catch (error) {
    logger.error("Get traffic analytics error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get traffic analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
