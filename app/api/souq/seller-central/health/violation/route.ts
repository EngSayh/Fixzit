import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { accountHealthService } from "@/services/souq/account-health-service";
import {
  Role,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import mongoose from "mongoose";

const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) => {
  const orgString = typeof orgId === "string" ? orgId : orgId?.toString?.();
  const candidates: Array<string | mongoose.Types.ObjectId> = [];
  if (orgString) {
    const trimmed = orgString.trim();
    candidates.push(trimmed);
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      candidates.push(new mongoose.Types.ObjectId(trimmed));
    }
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId };
};

/**
 * POST /api/souq/seller-central/health/violation
 * Record a policy violation (Admin only)
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
    const { sellerId, type, severity, description, action, targetOrgId } = body;

    // Validation
    if (!sellerId || !type || !severity || !description || !action) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: sellerId, type, severity, description, action",
        },
        { status: 400 },
      );
    }

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

    // Ensure seller is within org scope for non-platform admin
    if (!isPlatformAdmin) {
      const sellerInOrg = await (await import("@/server/models/souq/Seller")).SouqSeller.findOne({
        _id: sellerId,
        ...buildOrgFilter(effectiveOrgId),
      }).select({ _id: 1 });
      if (!sellerInOrg) {
        return NextResponse.json(
          { error: "Seller not found in organization scope" },
          { status: 404 },
        );
      }
    }

    // Record violation
    await accountHealthService.recordViolation(sellerId, effectiveOrgId, {
      type,
      severity,
      description,
      action,
    });

    return NextResponse.json({
      success: true,
      message: "Policy violation recorded successfully",
    });
  } catch (error) {
    logger.error("Record violation error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to record violation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
