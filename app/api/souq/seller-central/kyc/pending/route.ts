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
 * GET /api/souq/seller-central/kyc/pending
 * Get pending KYC submissions (Admin only)
 */
export async function GET(_request: NextRequest) {
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

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId && !isPlatformAdmin) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const effectiveOrgId = orgId;
    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Get pending submissions
    const pending = await sellerKYCService.getPendingKYCSubmissions(
      effectiveOrgId as string,
    );

    return NextResponse.json({
      success: true,
      pending,
      total: pending.length,
    });
  } catch (error) {
    logger.error("Get pending KYC error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get pending KYC submissions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
