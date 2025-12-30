/**
 * @fileoverview Ad Campaign Statistics API
 * @description Retrieves performance statistics for a specific ad campaign including impressions, clicks, and conversions.
 * @route GET /api/souq/ads/campaigns/[id]/stats - Get campaign performance statistics
 * @access Authenticated (SUPER_ADMIN, CORPORATE_ADMIN, CORPORATE_OWNER, ADMIN, MANAGER, PROCUREMENT, OPERATIONS_MANAGER, VENDOR)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
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

/**
 * GET /api/souq/ads/campaigns/[id]/stats
 * Get campaign performance statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 60 requests per minute per IP for ad campaign stats
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-ads:campaign-stats",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
        { success: false, error: "Forbidden (role not allowed for ads stats)" },
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

    // Verify ownership
    const campaign = await CampaignService.getCampaign(params.id, userOrgId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.sellerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const stats = await CampaignService.getCampaignStats(
      params.id,
      session.user.id,
      userOrgId,
    );

    return NextResponse.json(
      {
        success: true,
        data: stats,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (error) {
    logger.error("[Ad API] Get campaign stats failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get campaign stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
