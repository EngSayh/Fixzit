import { NextRequest, NextResponse } from "next/server";
import { CampaignService } from "@/services/souq/ads/campaign-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/ads/campaigns/[id]/stats
 * Get campaign performance statistics
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
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

    return NextResponse.json({
      success: true,
      data: stats,
    });
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
