import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/inventory/adjust
 * Adjust inventory for damage/loss (admin or seller only)
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { listingId, quantity, type, reason } = body as {
      listingId?: string;
      quantity?: number;
      type?: string;
      reason?: string;
    };

    // Validation
    if (!listingId || !quantity || !type || !reason) {
      return NextResponse.json(
        {
          error: "Missing required fields: listingId, quantity, type, reason",
        },
        { status: 400 },
      );
    }

    if (!["damage", "lost"].includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid type. Must be: damage or lost",
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

    const inventory = await inventoryService.adjustInventory({
      listingId,
      quantity,
      type: type as "damage" | "lost",
      reason,
      performedBy: session.user.id,
      orgId,
    });

    return NextResponse.json({
      success: true,
      message: `Inventory adjusted successfully. ${quantity} units marked as ${type}`,
      inventory: {
        inventoryId: inventory.inventoryId,
        availableQuantity: inventory.availableQuantity,
        totalQuantity: inventory.totalQuantity,
        health: inventory.health,
      },
    });
  } catch (error) {
    logger.error("POST /api/souq/inventory/adjust error", error as Error, {
      userId,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
