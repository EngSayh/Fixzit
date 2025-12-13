/**
 * @description Provides product-level performance analytics for Souq sellers.
 * Returns metrics like units sold, revenue, conversion rate, and ranking per product.
 * Supports period filtering for trend analysis.
 * @route GET /api/souq/analytics/products
 * @access Private - Authenticated sellers only
 * @query {string} period - Time period: last_7_days, last_30_days, last_90_days
 * @returns {Object} products: array of product metrics with views, orders, revenue
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsService } from "@/services/souq/analytics/analytics-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/analytics/products
 * Get product performance metrics for seller
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for product analytics
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-analytics:products",
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
      | "last_90_days";

    const products = await analyticsService.getProductPerformance(
      orgId,
      session.user.id,
      period,
    );

    return NextResponse.json({
      success: true,
      ...products,
    });
  } catch (error) {
    logger.error("Get product performance error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get product performance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
