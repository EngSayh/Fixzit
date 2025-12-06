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
 * POST /api/souq/seller-central/kyc/verify-document
 * Verify a specific KYC document (Admin only)
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
    const { sellerId, documentType, approved, rejectionReason, targetOrgId } = body;

    // Validation
    if (!sellerId || !documentType || approved === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields: sellerId, documentType, approved",
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

    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const effectiveOrgId = isPlatformAdmin ? targetOrgId ?? sessionOrgId : sessionOrgId;
    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Verify document
    await sellerKYCService.verifyDocument({
      sellerId,
      orgId: effectiveOrgId,
      documentType,
      approved,
      verifiedBy: session.user.id,
      rejectionReason,
    });

    return NextResponse.json({
      success: true,
      message: `Document ${approved ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    logger.error("Verify document error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to verify document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
