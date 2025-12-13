/**
 * @description Manually triggers the auto-repricer for the current seller.
 * Runs the repricing algorithm based on configured rules and competitor prices.
 * Updates listing prices to maintain Buy Box competitiveness.
 * @route POST /api/souq/repricer/run
 * @access Private - Authenticated sellers only
 * @returns {Object} success: true, result: repricing summary with updated listings
 * @throws {400} If organization context missing
 * @throws {401} If user is not authenticated
 * @throws {404} If seller profile not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { AutoRepricerService } from "@/services/souq/auto-repricer-service";
import { SouqSeller } from "@/server/models/souq/Seller";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * POST /api/souq/repricer/run
 * Manually trigger repricing for current seller
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for repricing runs (resource-intensive)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-repricer:run",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔐 Get orgId from session for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const seller = await SouqSeller.findOne({
      userId: session.user.id,
      orgId,
    }).lean();
    if (!seller?._id) {
      return NextResponse.json(
        { error: "Seller not found for user in this organization" },
        { status: 404 },
      );
    }

    const result = await AutoRepricerService.repriceSeller(
      seller._id.toString(),
      orgId,
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Manual reprice error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to run repricing",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
