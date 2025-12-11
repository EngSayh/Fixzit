/**
 * @description Provides comprehensive account health summary with trends.
 * Includes historical comparison, improvement recommendations, and risk alerts.
 * Shows trajectory towards account suspension thresholds.
 * @route GET /api/souq/seller-central/health/summary
 * @access Private - Authenticated sellers only
 * @query {string} period - Time period: last_7_days, last_30_days, last_90_days
 * @returns {Object} healthScore, trends, recommendations, riskLevel
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
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

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
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
      orgId,
      period,
    );

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error("Get health summary error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get health summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
