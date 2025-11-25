import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";

/**
 * GET /api/souq/seller-central/kyc/pending
 * Get pending KYC submissions (Admin only)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get pending submissions
    const pending = await sellerKYCService.getPendingKYCSubmissions();

    return NextResponse.json({
      success: true,
      pending,
      total: pending.length,
    });
  } catch (error) {
    logger.error("Get pending KYC error", { error });
    return NextResponse.json(
      {
        error: "Failed to get pending KYC submissions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
