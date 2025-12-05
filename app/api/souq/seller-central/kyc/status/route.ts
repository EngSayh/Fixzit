import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";

/**
 * GET /api/souq/seller-central/kyc/status
 * Get KYC status for current seller
 */
export async function GET(_request: NextRequest) {
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
