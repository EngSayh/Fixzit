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
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin only
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { listingId, sellerId } = body;

    let updated = 0;
    let eligible = 0;

    if (listingId) {
      // Assign badge to specific listing
      const result = await fulfillmentService.assignFastBadge(listingId);
      if (result) {
        eligible = 1;
        updated = 1;
      }
    } else if (sellerId) {
      // Assign badge to all seller's listings
      const listings = await SouqListing.find({ sellerId, status: "active" });

      for (const listing of listings) {
        const result = await fulfillmentService.assignFastBadge(
          listing._id.toString(),
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
    logger.error("Assign Fast Badge error", { error });
    return NextResponse.json(
      {
        error: "Failed to assign Fast Badge",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
