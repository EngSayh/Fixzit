import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";
import {
  Role,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";

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

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ?? inferSubRoleFromRole(session.user.role);
    const normalizedRole = normalizeRole(session.user.role, normalizedSubRole);

    const isPlatformAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);

    if (!isPlatformAdmin && !isOrgAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { sellerId, approved, rejectionReason, targetOrgId } = body;

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
      const sessionOrgId = (session.user as { orgId?: string }).orgId;
      const effectiveOrgId = isPlatformAdmin
        ? targetOrgId ?? sessionOrgId
        : sessionOrgId;
      if (!effectiveOrgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 },
        );
      }
      await sellerKYCService.approveKYC(sellerId, effectiveOrgId, session.user.id);
    } else {
      const sessionOrgId = (session.user as { orgId?: string }).orgId;
      const effectiveOrgId = isPlatformAdmin
        ? targetOrgId ?? sessionOrgId
        : sessionOrgId;
      if (!effectiveOrgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 },
        );
      }
      await sellerKYCService.rejectKYC(
        sellerId,
        effectiveOrgId,
        session.user.id,
        rejectionReason,
      );
    }

    return NextResponse.json({
      success: true,
      message: `KYC ${approved ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    logger.error("Approve/reject KYC error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to process KYC approval",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
