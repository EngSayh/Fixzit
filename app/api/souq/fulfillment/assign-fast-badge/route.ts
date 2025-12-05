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

    // 🔒 SECURITY: Platform admin check for cross-org operations
    const isPlatformAdmin = session.user.role === "SUPER_ADMIN" || session.user.isSuperAdmin;

    let updated = 0;
    let eligible = 0;

    if (listingId) {
      // 🔒 SECURITY FIX: CORPORATE_ADMIN must operate within their org scope
      // Platform admins may optionally scope by orgId
      if (!orgId && session.user.role === "CORPORATE_ADMIN") {
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 },
        );
      }

      // Assign badge to specific listing
      const result = await fulfillmentService.assignFastBadge(listingId, orgId);
      if (result) {
        eligible = 1;
        updated = 1;
      }
    } else if (sellerId) {
      // Assign badge to all seller's listings
      // 🔒 SECURITY FIX: Always require orgId for CORPORATE_ADMIN
      // Platform admins (SUPER_ADMIN) can optionally scope by orgId
      const listingQuery: Record<string, unknown> = { sellerId, status: "active" };
      if (orgId) {
        listingQuery.orgId = orgId;
      } else if (!isPlatformAdmin) {
        // CORPORATE_ADMIN must have orgId
        return NextResponse.json(
          { error: "Organization context required" },
          { status: 403 },
        );
      }
      
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
