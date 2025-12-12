/**
 * @description Provides comprehensive analytics dashboard for Souq sellers.
 * Aggregates sales, traffic, product performance, and customer metrics.
 * Returns combined data optimized for dashboard display.
 * @route GET /api/souq/analytics/dashboard
 * @access Private - Authenticated sellers only
 * @query {string} period - Time period: last_7_days, last_30_days, last_90_days, ytd
 * @returns {Object} sales, traffic, topProducts, customerInsights, healthScore
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsService } from "@/services/souq/analytics/analytics-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/analytics/dashboard
 * Get comprehensive analytics dashboard for seller
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for dashboard analytics
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-analytics:dashboard",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    const dashboard = await analyticsService.getDashboard(
      orgId,
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...dashboard,
    });
  } catch (error) {
    logger.error("Get analytics dashboard error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get analytics dashboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
