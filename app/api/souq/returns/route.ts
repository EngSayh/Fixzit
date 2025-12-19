/**
 * @description Lists return requests for buyers, sellers, or admins.
 * Buyers see their submitted returns; sellers see returns for their orders.
 * Supports filtering by status, date range, and pagination.
 * @route GET /api/souq/returns
 * @access Private - Role-based access (buyers see own, sellers see received)
 * @query {string} status - Filter by return status
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 * @returns {Object} returns: array of return requests, pagination: metadata
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import mongoose from "mongoose";
import { listQuerySchema, parseQueryParams, formatZodError } from "./validation";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

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
 * GET /api/souq/returns
 * List returns for buyer, seller, or admin
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for returns listing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-returns:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    const tenantOrgId = orgId;

    const { searchParams } = new URL(request.url);
    const parsedQuery = parseQueryParams(searchParams, listQuerySchema);
    if (!parsedQuery.success) {
      return NextResponse.json(
        formatZodError(parsedQuery.error),
        { status: 400 },
      );
    }
    const { type, status, targetOrgId, page, limit, sortBy, sortDir } = parsedQuery.data;
    const safeLimit = Math.min(limit, 200);
    const skip = (page - 1) * safeLimit;
    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 } as const;

    const rawSubRole = ((session.user as { subRole?: string | null }).subRole ??
      undefined) as string | undefined;
    const validatedSubRole: SubRole | undefined =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const normalizedRole = normalizeRole(session.user.role, validatedSubRole);
    const normalizedSubRole =
      normalizeSubRole(validatedSubRole) ??
      inferSubRoleFromRole(session.user.role);

    const isPlatformAdmin = normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isOpsOrSupport =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(
        normalizedSubRole,
      );
    const isAdmin = isPlatformAdmin || isOrgAdmin || isOpsOrSupport;

    if (type === "buyer") {
      // Get buyer's return history
      const returns = await returnsService.getBuyerReturnHistory(
        session.user.id,
        tenantOrgId,
        { page, limit: safeLimit },
      );

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "seller") {
      // Get seller's returns
      const { SouqRMA } = await import("@/server/models/souq/RMA");
      const returns = await (/* NO_TENANT_SCOPE */ SouqRMA.find({
        sellerId: session.user.id,
        ...buildOrgFilter(tenantOrgId),
      })
        .sort(sort)
        .skip(skip)
        .limit(safeLimit));

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "admin" && isAdmin) {
      // Get all returns (admin view)
      const { SouqRMA } = await import("@/server/models/souq/RMA");

      const scopedOrgId = isPlatformAdmin ? targetOrgId : tenantOrgId;

      if (isPlatformAdmin && !targetOrgId) {
        return NextResponse.json(
          { error: "targetOrgId is required for platform admins" },
          { status: 400 },
        );
      }

      if (!scopedOrgId) {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 },
        );
      }

      const baseOrgScope = buildOrgFilter(scopedOrgId);
      const query: Record<string, unknown> = { ...baseOrgScope };

      if (status) {
        query.status = status;
      }

      // For non-platform admins, ensure only same-org records (baseOrgScope already enforces this).
      // Additional per-user scoping can be added here if we later allow finer-grained permissions.
      
      const returns = await SouqRMA.find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .populate("buyerId", "email name")
        .populate("sellerId", "email businessName");

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else {
      // Return 404 to prevent cross-tenant existence leak (type=admin but not admin role)
      return NextResponse.json({ error: "Returns not found" }, { status: 404 });
    }
  } catch (error) {
    logger.error("List returns error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to list returns",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
