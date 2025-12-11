/**
 * @description Generates inventory health report for Souq sellers.
 * Analyzes stock levels, turnover rates, aging inventory, and alerts.
 * Helps identify slow-moving products and restock needs.
 * @route GET /api/souq/inventory/health
 * @access Private - Authenticated sellers or platform admins
 * @query {string} sellerId - Seller ID (admins can query any seller)
 * @returns {Object} healthScore, lowStockItems, slowMovers, recommendations
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing or unauthorized seller
 */
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
 * GET /api/souq/inventory/health
 * Get inventory health report for a seller
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
    const orgIdStr = orgId;

    const searchParams = request.nextUrl.searchParams;
    const sellerId = searchParams.get("sellerId") || session.user.id;

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

    // Authorization: Can only view own health report unless admin/ops/support
    if (sellerId !== session.user.id && !isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const healthReport =
      await inventoryService.getInventoryHealthReport(
        sellerId,
        orgIdStr,
      );

    // Calculate health score (0-100)
    const outOfStockRate =
      healthReport.totalListings > 0
        ? (healthReport.outOfStockCount / healthReport.totalListings) * 100
        : 0;
    const strandedRate =
      healthReport.totalListings > 0
        ? (healthReport.strandedCount / healthReport.totalListings) * 100
        : 0;
    const agingRate =
      healthReport.totalListings > 0
        ? (healthReport.agingCount / healthReport.totalListings) * 100
        : 0;

    // Simple health score calculation
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        100 - outOfStockRate * 0.5 - strandedRate * 0.3 - agingRate * 0.2,
      ),
    );

    return NextResponse.json({
      success: true,
      sellerId,
      report: healthReport,
      metrics: {
        outOfStockRate: outOfStockRate.toFixed(2) + "%",
        strandedRate: strandedRate.toFixed(2) + "%",
        agingRate: agingRate.toFixed(2) + "%",
        healthScore: healthScore.toFixed(1),
      },
      recommendations: [
        ...(healthReport.outOfStockCount > 0
          ? [`Restock ${healthReport.outOfStockCount} out-of-stock listings`]
          : []),
        ...(healthReport.lowStockCount > 0
          ? [`Review ${healthReport.lowStockCount} low-stock listings`]
          : []),
        ...(healthReport.strandedCount > 0
          ? [`Resolve ${healthReport.strandedCount} stranded inventory items`]
          : []),
        ...(healthReport.agingCount > 0
          ? [`Consider promotions for ${healthReport.agingCount} aging items`]
          : []),
      ],
    });
  } catch (error) {
    logger.error("GET /api/souq/inventory/health error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
