import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqListing } from "@/server/models/souq/Listing";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/fulfillment/assign-fast-badge
 * Assign Fast Badge to eligible listings
 * Admin-only endpoint (or background job)
 */
export async function POST(request: NextRequest) {
  let body: { listingId?: string; sellerId?: string } | undefined;
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (!["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    body = await request.json();
    const orgId = (session.user as { orgId?: string }).orgId;
    const listingId = body?.listingId;
    const sellerId = body?.sellerId;

    let updated = 0;
    let eligible = 0;

    // 🔒 SECURITY FIX: orgId is REQUIRED for all badge mutations
    // Even platform admins must specify which org they're operating on
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required for badge assignment" },
        { status: 403 },
      );
    }

    if (listingId) {
      // Assign badge to specific listing (orgId already verified above)
      const result = await fulfillmentService.assignFastBadge(listingId, orgId);
      if (result) {
        eligible = 1;
        updated = 1;
      }
    } else if (sellerId) {
      // Assign badge to all seller's listings within the org
      const listingQuery: Record<string, unknown> = { 
        sellerId, 
        status: "active",
        orgId,
      };
      
      const listings = await SouqListing.find(listingQuery);

      for (const listing of listings) {
        const result = await fulfillmentService.assignFastBadge(
          listing._id.toString(),
          orgId,
        );
        if (result) {
          eligible++;
          updated++;
        }
      }
    } else {
      return NextResponse.json(
        {
          error: "Missing required field: listingId or sellerId",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Fast Badge assignment complete`,
      eligible,
      updated,
    });
  } catch (error) {
    logger.error("Assign Fast Badge error", error as Error, {
      listingId: body?.listingId,
      sellerId: body?.sellerId,
    });
    return NextResponse.json(
      {
        error: "Failed to assign Fast Badge",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
