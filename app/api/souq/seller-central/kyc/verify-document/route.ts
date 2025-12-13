/**
 * @fileoverview KYC Document Verification API
 * @description Allows administrators to verify or reject individual KYC documents submitted by sellers.
 * @route POST /api/souq/seller-central/kyc/verify-document - Verify a specific KYC document
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
  // Rate limiting: 10 requests per minute per IP for document verification (sensitive action)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-kyc:verify-document",
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
      documentType?: string;
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
    const { sellerId, documentType, approved, rejectionReason, targetOrgId } = parseResult.data!;

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
