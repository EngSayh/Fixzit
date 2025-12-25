/**
 * @description Retrieves details for a specific return (RMA) request.
 * Returns full RMA information including items, status, and timeline.
 * Accessible by buyer, seller, or admin with proper org scoping.
 * @route GET /api/souq/returns/[rmaId]
 * @access Private - Buyer, seller, or admin
 * @param {string} rmaId - Return Merchandise Authorization ID
 * @returns {Object} return: full RMA details with items and timeline
 * @throws {400} If rmaId is invalid
 * @throws {401} If user is not authenticated
 * @throws {403} If user does not have access
 * @throws {404} If return not found
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import mongoose from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/returns/[rmaId]
 * Get RMA details
 * Buyer, seller, or admin access with org scoping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rmaId: string } },
) {
  // Rate limiting: 60 requests per minute per IP for return details
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-returns:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rmaId } = params;

    if (!mongoose.Types.ObjectId.isValid(rmaId)) {
      return NextResponse.json(
        { error: "Invalid rmaId" },
        { status: 400 },
      );
    }

    // 🔐 STRICT v4.1: Use canonical Role enum with subRole enforcement
    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const validatedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(session.user.role, validatedSubRole);
    const userSubRole =
      normalizeSubRole(validatedSubRole) ??
      inferSubRoleFromRole(session.user.role);

    const isPlatformAdmin = userRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isAdminRole = userRole !== null && [Role.ADMIN, Role.CORPORATE_OWNER].includes(userRole);
    const isOpsOrSupport =
      userRole === Role.TEAM_MEMBER &&
      !!userSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(userSubRole);
    const isAdmin = isPlatformAdmin || isAdminRole || isOpsOrSupport;

    // 🔐 SECURITY: Get org context and scope RMA lookup
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    if (!isPlatformAdmin && !sessionOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const { SouqRMA } = await import("@/server/models/souq/RMA");
    const { ObjectId } = await import("mongodb");
    type ObjectIdType = InstanceType<typeof ObjectId>;

    // Helper to match orgId stored as string or ObjectId during migration
    const buildOrgFilter = (orgId: string) => {
      const candidates: Array<string | ObjectIdType> = [orgId];
      if (ObjectId.isValid(orgId)) {
        candidates.push(new ObjectId(orgId));
      }
      return { orgId: { $in: candidates } };
    };

    // 🔐 SECURITY: Org-scoped RMA lookup prevents cross-tenant metadata leaks
    // SUPER_ADMIN can access any org's RMA; others must scope to their org
    const rmaQuery = isPlatformAdmin
      ? { _id: rmaId }
      : { _id: rmaId, ...buildOrgFilter(sessionOrgId!) };

    const rma = await SouqRMA.findOne(rmaQuery)
      .populate("orderId")
      .populate("buyerId")
      .populate("sellerId")
      .lean();

    if (!rma) {
      return NextResponse.json({ error: "RMA not found" }, { status: 404 });
    }

    // Check access: admin, buyer, or seller
    const isBuyer = rma.buyerId?.toString() === session.user.id;
    const isSeller = rma.sellerId?.toString() === session.user.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "RMA not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rma,
    });
  } catch (error) {
    logger.error("Get RMA error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get RMA",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
