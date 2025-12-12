/**
 * @fileoverview Return Eligibility Check API
 * @description Checks if a specific order item is eligible for return based on return policy and time constraints.
 * @route GET /api/souq/returns/eligibility/[orderId]/[listingId] - Check return eligibility for order item
 * @access Authenticated (requires organization context)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string; listingId: string } },
) {
  // Rate limiting: 60 requests per minute per IP for eligibility checks
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-returns:eligibility",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, listingId } = params;
    const orgId = (session.user as { orgId?: string }).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Check eligibility
    const eligibility = await returnsService.checkEligibility(
      orderId,
      listingId,
      orgId,
    );

    return NextResponse.json({
      success: true,
      ...eligibility,
    });
  } catch (error) {
    logger.error("Check eligibility error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to check eligibility",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
