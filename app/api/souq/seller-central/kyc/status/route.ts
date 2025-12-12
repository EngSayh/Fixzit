/**
 * @description Retrieves KYC (Know Your Customer) verification status.
 * Shows document submission status, verification progress, and any issues.
 * Required for seller account activation and payment processing.
 * @route GET /api/souq/seller-central/kyc/status
 * @access Private - Authenticated sellers only
 * @returns {Object} status: pending/verified/rejected, documents: array, issues: array
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/seller-central/kyc/status
 * Get KYC status for current seller
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for KYC status check
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-kyc:status",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    // Get KYC status
    const status = await sellerKYCService.getKYCStatus(session.user.id, orgId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    logger.error("Get KYC status error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get KYC status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
