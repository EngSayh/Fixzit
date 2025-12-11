/**
 * @description Releases a previously made inventory reservation.
 * Called when checkout is cancelled, cart expires, or order is abandoned.
 * Returns reserved stock back to available inventory.
 * @route POST /api/souq/inventory/release
 * @access Private - Authenticated users (checkout system)
 * @param {Object} body.listingId - Listing with reservation
 * @param {Object} body.reservationId - Reservation ID to release
 * @returns {Object} success: true, message: confirmation
 * @throws {400} If required fields missing
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If reservation not found
 */
import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/inventory/release
 * Release a reservation (order cancelled or expired)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, reservationId } = body as { listingId?: string; reservationId?: string };

    // Validation
    if (!listingId || !reservationId) {
      return NextResponse.json(
        {
          error: "Missing required fields: listingId, reservationId",
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

    const released = await inventoryService.releaseReservation({
      listingId: listingId as string,
      reservationId: reservationId as string,
      orgId,
    });

    if (!released) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservation not found or already released",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reservation released successfully",
    });
  } catch (error) {
    logger.error("POST /api/souq/inventory/release error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
