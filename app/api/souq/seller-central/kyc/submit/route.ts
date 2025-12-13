/**
 * @fileoverview KYC Submission API
 * @description Handles multi-step KYC submission for sellers including company info, documents, and bank details.
 * @route POST /api/souq/seller-central/kyc/submit - Submit KYC information (multi-step)
 * @access Authenticated (Seller)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { sellerKYCService } from "@/services/souq/seller-kyc-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { createRbacContext, hasAnyRole } from "@/lib/rbac";
import { UserRole } from "@/types/user";

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for KYC submission (sensitive action)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-kyc:submit",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles =
      (session.user as { roles?: string[]; role?: string }).roles ??
      ((session.user as { role?: string }).role
        ? [(session.user as { role?: string }).role as string]
        : []);
    const rbac = createRbacContext({
      isSuperAdmin: (session.user as { isSuperAdmin?: boolean }).isSuperAdmin,
      permissions: (session.user as { permissions?: string[] }).permissions,
      roles,
    });

    const isAuthorized =
      rbac.isSuperAdmin || hasAnyRole(rbac, [UserRole.VENDOR]);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: seller role required for KYC submission" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { step, data } = body;

    // Validation
    if (!step || !data) {
      return NextResponse.json(
        {
          error: "Missing required fields: step, data",
        },
        { status: 400 },
      );
    }

    const validSteps = ["company_info", "documents", "bank_details"];
    if (!validSteps.includes(step)) {
      return NextResponse.json(
        {
          error: `Invalid step. Must be one of: ${validSteps.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Submit KYC
    await sellerKYCService.submitKYC({
      sellerId: session.user.id,
      orgId,
      vendorId: session.user.id,
      step,
      data,
    });

    return NextResponse.json({
      success: true,
      message: `KYC ${step} submitted successfully`,
      nextStep:
        step === "company_info"
          ? "documents"
          : step === "documents"
            ? "bank_details"
            : "verification",
    });
  } catch (error) {
    logger.error("Submit KYC error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to submit KYC",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
