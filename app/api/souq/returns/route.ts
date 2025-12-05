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
      const returns = await SouqRMA.find({
        sellerId: session.user.id,
        ...buildOrgFilter(tenantOrgId),
      })
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

      const baseOrgScope = buildOrgFilter(scopedOrgId);
      const query: Record<string, unknown> = { ...baseOrgScope };

      if (status) {
        query.status = status;
      }

      // For non-platform admins, ensure only same-org records (baseOrgScope already enforces this).
      // Additional per-user scoping can be added here if we later allow finer-grained permissions.
      
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
