import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { accountHealthService } from "@/services/souq/account-health-service";

/**
 * GET /api/souq/seller-central/health/summary
 * Get comprehensive account health summary with trends and recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract period parameter (defaults to last_30_days)
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "last_30_days") as
      | "last_7_days"
      | "last_30_days"
      | "last_90_days";

    // Get health summary for specified period
    const summary = await accountHealthService.getHealthSummary(
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error("Get health summary error", { error });
    return NextResponse.json(
      {
        error: "Failed to get health summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
