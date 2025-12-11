/**
 * @description Retrieves account health metrics for Seller Central.
 * Returns performance scores including order defect rate, late shipment rate,
 * cancellation rate, and customer feedback scores.
 * @route GET /api/souq/seller-central/health
 * @access Private - Authenticated sellers only
 * @query {string} period - Time period: last_7_days, last_30_days, last_90_days
 * @returns {Object} healthScore, orderDefectRate, lateShipmentRate, violations
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { accountHealthService } from "@/services/souq/account-health-service";

/**
 * GET /api/souq/seller-central/health
 * Get account health metrics for current seller
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

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "last_30_days") as
      | "last_7_days"
      | "last_30_days"
      | "last_90_days";

    // Get health metrics
    const metrics = await accountHealthService.calculateAccountHealth(
      session.user.id,
      orgId,
      period,
    );

    return NextResponse.json({
      success: true,
      ...metrics,
    });
  } catch (error) {
    logger.error("Get account health error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get account health",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
