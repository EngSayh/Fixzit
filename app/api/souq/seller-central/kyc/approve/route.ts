/**
 * @fileoverview KYC Approval API
 * @description Allows administrators to approve or reject complete KYC submissions from sellers.
 * @route POST /api/souq/seller-central/kyc/approve - Approve or reject KYC submission
 * @access Authenticated (SUPER_ADMIN, ADMIN, CORPORATE_OWNER only)
 * @module souq
 */

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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for KYC approval (sensitive action)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-kyc:approve",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    const parseResult = await parseBodySafe<{
      sellerId?: string;
      approved?: boolean;
      rejectionReason?: string;
      targetOrgId?: string;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { sellerId, approved, rejectionReason, targetOrgId } = parseResult.data!;

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
