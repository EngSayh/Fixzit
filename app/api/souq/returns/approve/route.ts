import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * POST /api/souq/returns/approve
 * Approve a return request
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (!["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { rmaId, approve, approvalNotes, rejectionReason } = body;

    if (!rmaId) {
      return NextResponse.json(
        {
          error: "Missing required field: rmaId",
        },
        { status: 400 },
      );
    }

    if (approve) {
      await returnsService.approveReturn({
        rmaId,
        adminId: session.user.id,
        approvalNotes,
      });

      return NextResponse.json({
        success: true,
        message: "Return approved successfully",
      });
    } else {
      if (!rejectionReason) {
        return NextResponse.json(
          {
            error: "Missing required field: rejectionReason",
          },
          { status: 400 },
        );
      }

      await returnsService.rejectReturn(
        rmaId,
        session.user.id,
        rejectionReason,
      );

      return NextResponse.json({
        success: true,
        message: "Return rejected successfully",
      });
    }
  } catch (error) {
    logger.error("Approve/reject return error", { error });
    return NextResponse.json(
      {
        error: "Failed to process return approval",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
