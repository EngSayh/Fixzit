/**
 * @description Adjusts inventory quantities for damage, loss, or correction.
 * Creates audit trail of adjustment with reason and authorization.
 * Sellers can adjust own inventory; admins can adjust any.
 * @route POST /api/souq/inventory/adjust
 * @access Private - Sellers (own inventory) or admins
 * @param {Object} body.listingId - Listing to adjust
 * @param {Object} body.quantity - Adjustment amount (positive or negative)
 * @param {Object} body.reason - Adjustment reason (damage, loss, correction)
 * @param {Object} body.notes - Optional notes about adjustment
 * @returns {Object} success: true, inventory: updated stock levels
 * @throws {400} If validation fails or insufficient stock
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 * @throws {404} If inventory not found
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
 * POST /api/souq/inventory/adjust
 * Adjust inventory for damage/loss (admin or seller only)
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for inventory adjustments
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-inventory:adjust",
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

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }

    const parseResult = await parseBodySafe<{
      listingId?: string;
      quantity?: number;
      type?: string;
      reason?: string;
    }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { listingId, quantity, type, reason } = parseResult.data!;

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

    const inventoryRecord = await (/* NO_TENANT_SCOPE */ SouqInventory.findOne({
      listingId,
      ...buildOrgFilter(orgId),
    }).select({ sellerId: 1 }));

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
