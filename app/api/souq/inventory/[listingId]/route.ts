import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/inventory/[listingId]
 * Get inventory for a specific listing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { listingId: string } },
) {
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

    const inventory = await inventoryService.getInventory(
      params.listingId,
      orgIdStr,
    );

    if (!inventory) {
      return NextResponse.json(
        {
          error: "Inventory not found",
        },
        { status: 404 },
      );
    }

    // Authorization: Can only view own inventory unless admin
    const sellerMatches =
      inventory.sellerId?.toString() === session.user.id ||
      (orgIdStr && inventory.orgId && inventory.orgId.toString() === orgIdStr);
    const isAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(
      session.user.role,
    );

    if (!sellerMatches && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    logger.error("GET /api/souq/inventory/[listingId] error", { error });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
