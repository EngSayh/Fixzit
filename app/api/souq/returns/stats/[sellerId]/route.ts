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

/**
 * GET /api/souq/returns/stats/[sellerId]
 * Get return statistics for a seller
 * Seller or admin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sellerId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    const sessionOrgId = (session.user as { orgId?: string }).orgId;

    const { sellerId } = params;
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "month") as
      | "week"
      | "month"
      | "year";
    const targetOrgId = searchParams.get("targetOrgId") || undefined;

    // Check access
    const isAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isOpsOrSupport =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(
        normalizedSubRole,
      );
    const isSeller = sellerId === session.user.id;

    if (!isPlatformAdmin && !isAdmin && !isOpsOrSupport && !isSeller) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    // 🔒 TENANT SCOPING: orgId required; platform admins must explicitly choose targetOrgId
    if (isPlatformAdmin) {
      if (!targetOrgId) {
        return NextResponse.json(
          { error: "targetOrgId is required for platform admins" },
          { status: 400 },
        );
      }
    }

    const resolvedOrgId = isPlatformAdmin ? targetOrgId : sessionOrgId;
    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Get stats
    const stats = await returnsService.getSellerReturnStats(sellerId, resolvedOrgId, period);

    logger.info("Return stats fetched", {
      actorUserId: session.user.id,
      actorRole: session.user.role,
      sellerId,
      period,
      targetOrgId: resolvedOrgId,
    });

    return NextResponse.json({
      success: true,
      stats,
      period,
    });
  } catch (error) {
    logger.error("Get return stats error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to get return stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
