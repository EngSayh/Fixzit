import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";

/**
 * GET /api/souq/inventory/[listingId]
 * Get inventory for a specific listing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { listingId: string } },
) {
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
    const orgIdStr = orgId;

    const inventory = await inventoryService.getInventory(
      params.listingId,
      orgIdStr,
    );

    if (!inventory) {
      return NextResponse.json(
        {
          error: "Inventory not found",
        },
        { status: 404 },
      );
    }

    // Authorization: Can only view own inventory unless admin
    const sellerMatches =
      inventory.sellerId?.toString() === session.user.id ||
      (orgIdStr && inventory.orgId && inventory.orgId.toString() === orgIdStr);

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ?? inferSubRoleFromRole(session.user.role);
    const normalizedRole = normalizeRole(session.user.role, normalizedSubRole);

    const isPlatformAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isOpsOrSupport =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(
        normalizedSubRole,
      );

    if (!sellerMatches && !isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    logger.error("GET /api/souq/inventory/[listingId] error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
