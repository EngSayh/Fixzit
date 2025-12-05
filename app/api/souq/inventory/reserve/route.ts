import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/inventory/reserve
 * Reserve inventory for a pending checkout
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, quantity, reservationId, expirationMinutes } = body;

    // Validation
    if (!listingId || !quantity || !reservationId) {
      return NextResponse.json(
        {
          error: "Missing required fields: listingId, quantity, reservationId",
        },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          error: "Quantity must be greater than 0",
        },
        { status: 400 },
      );
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const reserved = await inventoryService.reserveInventory({
      listingId,
      quantity,
      reservationId,
      expirationMinutes,
      orgId,
    });

    if (!reserved) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient stock or inventory not available",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inventory reserved successfully",
      reservationId,
      expiresIn: `${expirationMinutes || 15} minutes`,
    });
  } catch (error) {
    logger.error("POST /api/souq/inventory/reserve error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
