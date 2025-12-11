/**
 * @description Provides sales performance analytics for Souq sellers.
 * Returns metrics like total revenue, order count, average order value, and trends.
 * Supports various time periods including year-to-date.
 * @route GET /api/souq/analytics/sales
 * @access Private - Authenticated sellers only
 * @query {string} period - Time period: last_7_days, last_30_days, last_90_days, ytd
 * @returns {Object} totalRevenue, orderCount, avgOrderValue, trends by period
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsService } from "@/services/souq/analytics/analytics-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/analytics/sales
 * Get sales metrics for seller
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
      | "last_90_days"
      | "ytd";

    const sales = await analyticsService.getSalesMetrics(
      orgId,
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...sales,
    });
  } catch (error) {
    logger.error("Get sales metrics error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get sales metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
