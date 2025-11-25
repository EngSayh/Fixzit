import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";

/**
 * POST /api/souq/seller-central/kyc/approve
 * Approve or reject KYC submission (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { sellerId, approved, rejectionReason } = body;

    // Validation
    if (!sellerId || approved === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields: sellerId, approved",
        },
        { status: 400 },
      );
    }

    if (!approved && !rejectionReason) {
      return NextResponse.json(
        {
          error: "Rejection reason required when approved is false",
        },
        { status: 400 },
      );
    }

    if (approved) {
      await sellerKYCService.approveKYC(sellerId, session.user.id);
    } else {
      await sellerKYCService.rejectKYC(
        sellerId,
        session.user.id,
        rejectionReason,
      );
    }

    return NextResponse.json({
      success: true,
      message: `KYC ${approved ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    logger.error("Approve/reject KYC error", { error });
    return NextResponse.json(
      {
        error: "Failed to process KYC approval",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
