/**
 * @fileoverview Ad Campaign Details API
 * @description Manages individual ad campaign operations including retrieval, updates, and deletion.
 * @route GET /api/souq/ads/campaigns/[id] - Get campaign details
 * @route PATCH /api/souq/ads/campaigns/[id] - Update campaign
 * @route DELETE /api/souq/ads/campaigns/[id] - Delete campaign
 * @access Authenticated (SUPER_ADMIN, CORPORATE_ADMIN, CORPORATE_OWNER, ADMIN, MANAGER, PROCUREMENT, OPERATIONS_MANAGER, VENDOR)
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { CampaignService } from "@/services/souq/ads/campaign-service";
import { createRbacContext, hasAnyRole } from "@/lib/rbac";
import { UserRole, type UserRoleType } from "@/types/user";
import { parseBodySafe } from "@/lib/api/parse-body";

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
 * GET /api/souq/ads/campaigns/[id]
 * Get campaign details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 60 requests per minute per IP for campaign reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-ads:get-campaign",
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
        { success: false, error: "Forbidden (role not allowed for ads)" },
        { status: 403 },
      );
    }
    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Organization required" },
        { status: 403 },
      );
    }

    const campaign = await CampaignService.getCampaign(params.id, orgId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (campaign.sellerId !== session.user.id) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error("[Ad API] Get campaign failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get campaign",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/souq/ads/campaigns/[id]
 * Update campaign
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 30 requests per minute per IP for campaign updates
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-ads:update-campaign",
    requests: 30,
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
        { success: false, error: "Forbidden (role not allowed for ads)" },
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
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<{
      name?: string;
      dailyBudget?: string | number;
      startDate?: string;
      endDate?: string;
      status?: "active" | "paused" | "ended";
      biddingStrategy?: "manual" | "automatic";
      defaultBid?: string | number;
    }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { success: false, error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }

    const updates: {
      name?: string;
      dailyBudget?: number;
      startDate?: Date;
      endDate?: Date;
      status?: "active" | "paused" | "ended";
      biddingStrategy?: "manual" | "automatic";
      defaultBid?: number;
    } = {};

    if (body.name) updates.name = body.name;
    if (body.dailyBudget) updates.dailyBudget = parseFloat(String(body.dailyBudget));
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);
    if (body.status) updates.status = body.status;
    if (body.biddingStrategy) updates.biddingStrategy = body.biddingStrategy;
    if (body.defaultBid) updates.defaultBid = parseFloat(String(body.defaultBid));

    const updated = await CampaignService.updateCampaign(
      params.id,
      updates,
      session.user.id,
      userOrgId, // Required for tenant isolation (STRICT v4.1)
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error("[Ad API] Update campaign failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update campaign",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/souq/ads/campaigns/[id]
 * Delete campaign
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting: 20 requests per minute per IP for campaign deletion
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-ads:delete-campaign",
    requests: 20,
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

    // 🔐 STRICT v4.1: Use canonical ALLOWED_AD_ROLES for consistent RBAC enforcement
    const rbac = buildRbacContext(session.user);
    if (!hasAnyRole(rbac, ALLOWED_AD_ROLES)) {
      return NextResponse.json(
        { success: false, error: "Forbidden (role not allowed for ads)" },
        { status: 403 },
      );
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Organization required" },
        { status: 403 },
      );
    }

    // Verify ownership (now scoped by orgId)
    const campaign = await CampaignService.getCampaign(params.id, orgId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.sellerId !== session.user.id) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    await CampaignService.deleteCampaign(params.id, session.user.id, orgId);

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    logger.error("[Ad API] Delete campaign failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete campaign",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
