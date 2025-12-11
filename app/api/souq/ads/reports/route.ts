/**
 * @fileoverview Souq Advertising Reports API
 * @description Provides advertising campaign performance reports including
 * impressions, clicks, conversions, and spend analytics.
 * 
 * @module api/souq/ads/reports
 * @requires SUPER_ADMIN, CORPORATE_ADMIN, CORPORATE_OWNER, ADMIN, MANAGER, PROCUREMENT, OPERATIONS_MANAGER, or VENDOR role
 * 
 * @endpoints
 * - GET /api/souq/ads/reports - Get advertising performance report
 * 
 * @queryParams
 * - campaignId: Filter by specific campaign
 * - start: Start date for report period
 * - end: End date for report period
 * 
 * @response
 * - success: boolean
 * - data: Report metrics (impressions, clicks, CTR, spend, conversions)
 * 
 * @security
 * - RBAC: Admin, management, and vendor roles
 * - STRICT v4.1: orgId required for tenant isolation
 * - Vendors see only their own campaign data
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { createRbacContext, hasAnyRole } from "@/lib/rbac";
import { CampaignService } from "@/services/souq/ads/campaign-service";
import { UserRole, type UserRoleType } from "@/types/user";

const ALLOWED_AD_ROLES: UserRoleType[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CORPORATE_ADMIN,
  UserRole.CORPORATE_OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.PROCUREMENT,
  UserRole.OPERATIONS_MANAGER,
  UserRole.VENDOR, // Marketplace seller
];

const buildRbacContext = (user: {
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
  role?: string;
}) =>
  createRbacContext({
    isSuperAdmin: user?.isSuperAdmin,
    permissions: user?.permissions,
    roles: user?.roles ?? (user?.role ? [user.role] : []),
  });

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const rbac = buildRbacContext(session.user);
    if (!hasAnyRole(rbac, ALLOWED_AD_ROLES)) {
      return NextResponse.json(
        { success: false, error: "Forbidden (role not allowed for ads reports)" },
        { status: 403 },
      );
    }

    const userOrgId = session.user.orgId;
    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: "orgId is required (STRICT v4.1 tenant isolation)" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId") || undefined;
    const start = searchParams.get("start") || undefined;
    const end = searchParams.get("end") || undefined;

    const report = await CampaignService.getPerformanceReport({
      sellerId: session.user.id,
      orgId: userOrgId, // Required for tenant isolation (STRICT v4.1)
      campaignId: campaignId === "all" ? undefined : campaignId,
      startDate: start || undefined,
      endDate: end || undefined,
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error("[Ad API] Get performance report failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load performance report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
