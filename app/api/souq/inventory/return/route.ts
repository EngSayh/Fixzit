/**
 * @description Processes product returns and restocks inventory.
 * Handles RMA completion by adding returned items back to stock.
 * Tracks return condition for quality control.
 * @route POST /api/souq/inventory/return
 * @access Private - Authenticated sellers or admins
 * @param {Object} body.listingId - Listing to restock
 * @param {Object} body.rmaId - RMA/return ID
 * @param {Object} body.quantity - Quantity being returned
 * @param {Object} body.condition - Item condition: new, refurbished, damaged
 * @returns {Object} success: true, inventory: updated stock levels
 * @throws {400} If required fields missing
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing or unauthorized
 * @throws {404} If inventory or RMA not found
 */
import { NextRequest, NextResponse } from "next/server";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { SouqInventory } from "@/server/models/souq/Inventory";
import mongoose from "mongoose";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

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
 * POST /api/souq/inventory/return
 * Process return (RMA) and restock inventory
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for return processing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-inventory:return",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    const body = await request.json();
    const { listingId, rmaId, quantity, condition } = body;

    // Validation
    if (!listingId || !rmaId || !quantity || !condition) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: listingId, rmaId, quantity, condition",
        },
        { status: 400 },
      );
    }

    if (!["sellable", "unsellable"].includes(condition)) {
      return NextResponse.json(
        {
          error: "Invalid condition. Must be: sellable or unsellable",
        },
        { status: 400 },
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
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    const inventory = await inventoryService.processReturn({
      listingId,
      rmaId,
      quantity,
      condition,
      orgId,
    });

    return NextResponse.json({
      success: true,
      message: `Return processed successfully. ${quantity} units restocked as ${condition}`,
      inventory: {
        inventoryId: inventory.inventoryId,
        availableQuantity: inventory.availableQuantity,
        totalQuantity: inventory.totalQuantity,
        health: inventory.health,
      },
    });
  } catch (error) {
    logger.error("POST /api/souq/inventory/return error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
