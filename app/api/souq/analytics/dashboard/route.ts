import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsService } from "@/services/souq/analytics/analytics-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/analytics/dashboard
 * Get comprehensive analytics dashboard for seller
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "last_30_days") as
      | "last_7_days"
      | "last_30_days"
      | "last_90_days"
      | "ytd";

    const dashboard = await analyticsService.getDashboard(
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...dashboard,
    });
  } catch (error) {
    logger.error("Get analytics dashboard error", { error });
    return NextResponse.json(
      {
        error: "Failed to get analytics dashboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
