import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";

/**
 * POST /api/souq/returns/approve
 * Approve or reject a return request
 * Admin-only endpoint with explicit org scoping
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

    const isPlatformAdmin = session.user.role === "SUPER_ADMIN" || session.user.isSuperAdmin;
    const sessionOrgId = (session.user as { orgId?: string }).orgId;

    const body = await request.json();
    const { rmaId, approve, approvalNotes, rejectionReason, targetOrgId } = body;

    if (!rmaId) {
      return NextResponse.json(
        { error: "Missing required field: rmaId" },
        { status: 400 },
      );
    }

    // 🔒 TENANT SCOPING: orgId required; platform admins must explicitly set targetOrgId if switching orgs
    const orgId = isPlatformAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    if (approve) {
      await returnsService.approveReturn({
        rmaId,
        orgId,
        adminId: session.user.id,
        approvalNotes,
      });

      logger.info("Return approved", {
        actorUserId: session.user.id,
        actorRole: session.user.role,
        rmaId,
        targetOrgId: orgId,
      });

      return NextResponse.json({
        success: true,
        message: "Return approved successfully",
      });
    }

    if (!rejectionReason) {
      return NextResponse.json(
        { error: "Missing required field: rejectionReason" },
        { status: 400 },
      );
    }

    await returnsService.rejectReturn(
      rmaId,
      session.user.id,
      rejectionReason,
      orgId,
    );

    logger.info("Return rejected", {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      rmaId,
      targetOrgId: orgId,
    });

    return NextResponse.json({
      success: true,
      message: "Return rejected successfully",
    });
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
