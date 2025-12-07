/**
 * Transactions API
 * GET /api/souq/settlements/transactions - Get transaction history for seller
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SellerBalanceService } from "@/services/souq/settlements/balance-service";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId =
      searchParams.get("sellerId") || (session.user.id as string);
    const targetOrgId = searchParams.get("targetOrgId") || undefined;
    const sessionOrgId = (session.user as { orgId?: string }).orgId;
    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ??
      inferSubRoleFromRole((session.user as { role?: string }).role);
    const normalizedRole = normalizeRole(
      (session.user as { role?: string }).role,
      normalizedSubRole,
    );
    const isSuperAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );

    // Authorization: Seller can only view own transactions, admin/finance can view all
    const isAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isFinance =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      normalizedSubRole === SubRole.FINANCE_OFFICER;

    if (!isSuperAdmin && !isAdmin && !isFinance && sellerId !== session.user.id) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Transactions not found" }, { status: 404 });
    }

    const orgId = isSuperAdmin ? (targetOrgId || sessionOrgId) : sessionOrgId;
    if (isSuperAdmin && !orgId) {
      return NextResponse.json(
        { error: "targetOrgId is required for platform admins" },
        { status: 400 },
      );
    }
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    // Build filters
    const filters: Record<string, unknown> = {
      offset: (page - 1) * limit,
      limit,
    };

    if (type) {
      filters.type = type;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    // Get transactions
    const result = await SellerBalanceService.getTransactionHistory(
      sellerId,
      orgId,
      filters,
    );

    return NextResponse.json({
      transactions: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching transactions", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}
