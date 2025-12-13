/**
 * @description Records policy violations against seller accounts.
 * Creates violation records that impact seller account health scores.
 * Admin-only action for policy enforcement.
 * @route POST /api/souq/seller-central/health/violation
 * @access Private - Admin only
 * @param {Object} body.sellerId - Seller to record violation against
 * @param {Object} body.type - Violation type: policy, counterfeit, listing, shipping
 * @param {Object} body.severity - Severity: warning, minor, major, critical
 * @param {Object} body.description - Violation description
 * @returns {Object} success: true, violation: created violation record
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not admin
 */
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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

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
  // Rate limiting: 20 requests per minute per IP for violation recording
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-seller-health:violation",
    requests: 20,
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
      type?: string;
      severity?: string;
      description?: string;
      action?: string;
      targetOrgId?: string;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { sellerId, type, severity, description, action, targetOrgId } = parseResult.data!;

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
      type: type as "restricted_product" | "fake_review" | "price_gouging" | "counterfeit" | "late_shipment" | "high_odr" | "other",
      severity: severity as "warning" | "minor" | "major" | "critical",
      description,
      action: action as "warning" | "listing_suppression" | "account_suspension" | "permanent_deactivation" | "none",
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
