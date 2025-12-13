/**
 * @description Converts inventory reservation to confirmed sale.
 * Called when order is confirmed to permanently deduct reserved stock.
 * Creates audit trail linking reservation to order.
 * @route POST /api/souq/inventory/convert
 * @access Private - Authenticated users (order system)
 * @param {Object} body.listingId - Listing with reservation
 * @param {Object} body.reservationId - Reservation ID to convert
 * @param {Object} body.orderId - Order ID to link
 * @returns {Object} success: true, inventory: updated stock levels
 * @throws {400} If required fields missing
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If reservation not found or expired
 */
import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SouqInventory } from "@/server/models/souq/Inventory";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import mongoose from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

const buildOrgFilter = (orgId: string | mongoose.Types.ObjectId) => {
  const orgString = typeof orgId === "string" ? orgId : orgId?.toString?.();
  const candidates: Array<string | mongoose.Types.ObjectId> = [];
  if (orgString) {
    const trimmed = orgString.trim();
    candidates.push(trimmed);
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      candidates.push(new mongoose.Types.ObjectId(trimmed));
    }
  }
  return candidates.length ? { orgId: { $in: candidates } } : { orgId };
};

/**
 * POST /api/souq/inventory/convert
 * Convert reservation to sale (order confirmed)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for inventory conversion
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-inventory:convert",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let userId: string | undefined;
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = session.user.id;

    const parseResult = await parseBodySafe<{
      listingId?: string;
      reservationId?: string;
      orderId?: string;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { listingId, reservationId, orderId } = parseResult.data as {
      listingId?: string;
      reservationId?: string;
      orderId?: string;
    };

    // Validation
    if (!listingId || !reservationId || !orderId) {
      return NextResponse.json(
        {
          error: "Missing required fields: listingId, reservationId, orderId",
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

    const inventoryRecord = await SouqInventory.findOne({
      listingId,
      ...buildOrgFilter(orgId),
    }).select({ sellerId: 1 });

    if (!inventoryRecord) {
      return NextResponse.json(
        { error: "Inventory not found for listing" },
        { status: 404 },
      );
    }

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ??
      inferSubRoleFromRole(session.user.role);
    const normalizedRole = normalizeRole(session.user.role, normalizedSubRole);

    const isPlatformAdmin =
      normalizedRole === Role.SUPER_ADMIN || session.user.isSuperAdmin;
    const isOrgAdmin =
      normalizedRole !== null &&
      [Role.ADMIN, Role.CORPORATE_OWNER].includes(normalizedRole);
    const isOpsOrSupport =
      normalizedRole === Role.TEAM_MEMBER &&
      !!normalizedSubRole &&
      [SubRole.OPERATIONS_MANAGER, SubRole.SUPPORT_AGENT].includes(
        normalizedSubRole,
      );
    const isSellerOwner =
      inventoryRecord.sellerId?.toString() === session.user.id;

    if (!isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport && !isSellerOwner) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    const converted = await inventoryService.convertReservationToSale({
      listingId: listingId as string,
      reservationId: reservationId as string,
      orderId: orderId as string,
      orgId,
    });

    if (!converted) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to convert reservation",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reservation converted to sale successfully",
      orderId,
    });
  } catch (error) {
    logger.error("POST /api/souq/inventory/convert error", error as Error, {
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
