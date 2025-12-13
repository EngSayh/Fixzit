/**
 * @description Reserves inventory for a pending checkout or order.
 * Creates temporary hold on stock to prevent overselling during checkout.
 * Reservations expire automatically after specified duration.
 * @route POST /api/souq/inventory/reserve
 * @access Private - Authenticated users (checkout system)
 * @param {Object} body.listingId - Listing to reserve
 * @param {Object} body.quantity - Quantity to reserve
 * @param {Object} body.reservationId - Unique reservation identifier
 * @param {Object} body.expirationMinutes - Optional TTL (default: 15 minutes)
 * @returns {Object} success: true, reservation: reservation details
 * @throws {400} If required fields missing or invalid quantity
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {409} If insufficient stock available
 */
import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

/**
 * POST /api/souq/inventory/reserve
 * Reserve inventory for a pending checkout
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for inventory reservation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-inventory:reserve",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parseResult = await parseBodySafe<{
      listingId?: string;
      quantity?: number;
      reservationId?: string;
      expirationMinutes?: number;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { listingId, quantity, reservationId, expirationMinutes } = parseResult.data!;

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
      listingId: listingId as string,
      quantity: quantity as number,
      reservationId: reservationId as string,
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
