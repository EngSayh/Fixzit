/**
 * @fileoverview Ad Campaigns API
 * @description Manages advertisement campaigns for marketplace sellers including creation and listing.
 * @route POST /api/souq/ads/campaigns - Create new ad campaign
 * @route GET /api/souq/ads/campaigns - List campaigns
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
 * POST /api/souq/ads/campaigns
 * Create new ad campaign
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP for campaign creation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-ads:create-campaign",
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

    const userOrgId = session.user.orgId;
    const rbac = buildRbacContext(session.user);
    if (!hasAnyRole(rbac, ALLOWED_AD_ROLES)) {
      return NextResponse.json(
        { success: false, error: "Forbidden (role not allowed for ads)" },
        { status: 403 },
      );
    }
    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: "orgId is required (STRICT v4.1 tenant isolation)" },
        { status: 400 },
      );
    }

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { success: false, error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Validate required fields
    const required = [
      "name",
      "type",
      "dailyBudget",
      "startDate",
      "biddingStrategy",
      "targeting",
      "products",
    ];
    const missing = required.filter((field) => !body[field]);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missing.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const campaign = await CampaignService.createCampaign({
      orgId: userOrgId, // Required for tenant isolation (STRICT v4.1)
      sellerId: session.user.id,
      name: body.name as string,
      type: body.type as "sponsored_products" | "sponsored_brands" | "product_display",
      dailyBudget: parseFloat(String(body.dailyBudget)),
      startDate: new Date(body.startDate as string | number),
      endDate: body.endDate ? new Date(body.endDate as string | number) : undefined,
      biddingStrategy: body.biddingStrategy as "manual" | "automatic",
      defaultBid: body.defaultBid ? parseFloat(String(body.defaultBid)) : undefined,
      targeting: body.targeting as Parameters<typeof CampaignService.createCampaign>[0]["targeting"],
      products: body.products as string[],
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error("[Ad API] Create campaign failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create campaign",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/souq/ads/campaigns
 * List campaigns for authenticated seller
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userOrgId = session.user.orgId;
    const rbac = buildRbacContext(session.user);
    if (!hasAnyRole(rbac, ALLOWED_AD_ROLES)) {
      return NextResponse.json(
        { success: false, error: "Forbidden (role not allowed for ads)" },
        { status: 403 },
      );
    }
    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: "orgId is required (STRICT v4.1 tenant isolation)" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "active"
      | "paused"
      | "ended"
      | null;
    const type = searchParams.get("type") as
      | "sponsored_products"
      | "sponsored_brands"
      | "product_display"
      | null;

    const campaigns = await CampaignService.listCampaigns(session.user.id, userOrgId, {
      status: status || undefined,
      type: type || undefined,
    });

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    logger.error("[Ad API] List campaigns failed", error as Error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to list campaigns",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
