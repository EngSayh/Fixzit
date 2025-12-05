import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { returnsService } from "@/services/souq/returns-service";
import { User } from "@/server/models/User";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";

/**
 * GET /api/souq/returns
 * List returns for buyer, seller, or admin
 */
export async function GET(request: NextRequest) {
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
    const type = searchParams.get("type") || "buyer"; // buyer, seller, admin

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
    const isCorporateAdmin =
      (session.user.role || "").toUpperCase() === "CORPORATE_ADMIN";
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
      );

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "seller") {
      // Get seller's returns
      const { SouqRMA } = await import("@/server/models/souq/RMA");
      const returns = await SouqRMA.find({ sellerId: session.user.id, orgId: tenantOrgId })
        .sort({ createdAt: -1 })
        .limit(100);

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else if (type === "admin" && isAdmin) {
      // Get all returns (admin view)
      const { SouqRMA } = await import("@/server/models/souq/RMA");
      const status = searchParams.get("status");

      const targetOrgId = searchParams.get("targetOrgId") || undefined;
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

      const baseOrgScope = { orgId: scopedOrgId };

      // 🔒 SECURITY FIX: CORPORATE_ADMIN can only see returns involving their org's users
      let query: Record<string, unknown> = status ? { status } : {};
      
      if (isCorporateAdmin && !isPlatformAdmin) {
        if (!scopedOrgId) {
          return NextResponse.json(
            { error: "Organization context required for CORPORATE_ADMIN" },
            { status: 403 },
          );
        }
        
        const orgUserIds = await User.find({ orgId: scopedOrgId }, { _id: 1 }).lean();
        const userIdStrings = orgUserIds.map((u: { _id: unknown }) => String(u._id));
        
        query = {
          $and: [
            baseOrgScope,
            ...(status ? [{ status }] : []),
            {
              $or: [
                { buyerId: { $in: userIdStrings } },
                { sellerId: { $in: userIdStrings } },
              ],
            },
          ],
        };
        
        // If no conditions, simplify
        if (!status) {
          query = {
            $and: [
              baseOrgScope,
              {
                $or: [
                  { buyerId: { $in: userIdStrings } },
                  { sellerId: { $in: userIdStrings } },
                ],
              },
            ],
          };
        }
      } else {
        query = { ...baseOrgScope, ...(status ? { status } : {}) };
      }
      
      const returns = await SouqRMA.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("buyerId", "email name")
        .populate("sellerId", "email businessName");

      return NextResponse.json({
        success: true,
        returns,
        total: returns.length,
      });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
