/**
 * @description Manages seller inventory listings in Souq marketplace.
 * GET retrieves inventory with filtering by status, low stock alerts,
 * and product search. Returns stock levels, reservations, and availability.
 * @route GET /api/souq/inventory
 * @access Private - Authenticated sellers only
 * @query {string} sellerId - Filter by seller ID
 * @query {string} status - Filter by stock status
 * @query {boolean} lowStock - Filter low stock items
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 * @returns {Object} inventory: array of items with stock levels, pagination
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */
import { NextRequest, NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { inventoryService } from "@/services/souq/inventory-service";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { SouqListing } from "@/server/models/souq/Listing";
import mongoose from "mongoose";
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
 * GET /api/souq/inventory
 * Get seller's inventory list with optional filters
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for inventory listing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-inventory:list",
    requests: 60,
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
    const orgIdStr = orgId;

    const searchParams = request.nextUrl.searchParams;
    const sellerId = searchParams.get("sellerId") || session.user.id;
    const status = searchParams.get("status") || undefined;
    const fulfillmentType = searchParams.get("fulfillmentType") as
      | "FBM"
      | "FBF"
      | undefined;
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ?? inferSubRoleFromRole(session.user.role);
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

    // Authorization: Can only view own inventory unless admin/ops/support
    if (sellerId !== session.user.id && !isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    const inventory = await inventoryService.getSellerInventory(sellerId, {
      status,
      fulfillmentType,
      lowStockOnly,
      orgId: orgIdStr,
    });

    return NextResponse.json({
      success: true,
      inventory,
      count: inventory.length,
    });
  } catch (error) {
    logger.error("GET /api/souq/inventory error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/souq/inventory
 * Initialize or receive inventory
 */
export async function POST(request: NextRequest) {
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

    const { data: body, error: parseError } = await parseBodySafe<{
      action?: "initialize" | "receive";
      listingId?: string;
      productId?: string;
      quantity?: number;
      fulfillmentType?: string;
      warehouseId?: string;
      binLocation?: string;
      reason?: string;
    }>(request, { logPrefix: "[Souq Inventory]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const {
      action,
      listingId,
      productId,
      quantity,
      fulfillmentType,
      warehouseId,
      binLocation,
      reason,
    } = body ?? {};
    const actionType = action ?? "receive";
    if (!["initialize", "receive"].includes(actionType)) {
      return NextResponse.json(
        { error: "Invalid action. Must be initialize or receive" },
        { status: 400 },
      );
    }

    // Validation
    if (!listingId || !quantity || quantity <= 0) {
      return NextResponse.json(
        {
          error: "Missing or invalid required fields: listingId, quantity",
        },
        { status: 400 },
      );
    }

    const rawSubRole = (session.user as { subRole?: string | null }).subRole;
    const normalizedSubRole =
      normalizeSubRole(rawSubRole) ?? inferSubRoleFromRole(session.user.role);
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

    // NO_TENANT_SCOPE: buildOrgFilter enforces org scope (platform admin allowed)
    const listing = await SouqListing.findOne({
      listingId,
      ...buildOrgFilter(orgIdStr),
    }).select({ sellerId: 1, orgId: 1 });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found for this organization" },
        { status: 404 },
      );
    }

    const listingSellerId = listing.sellerId?.toString();
    const isSellerOwner = listingSellerId === session.user.id;

    if (!isPlatformAdmin && !isOrgAdmin && !isOpsOrSupport && !isSellerOwner) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (!listingSellerId) {
      return NextResponse.json(
        { error: "Listing is missing seller ownership" },
        { status: 400 },
      );
    }

    if (actionType === "initialize") {
      // Initialize new inventory
      if (!productId || !fulfillmentType) {
        return NextResponse.json(
          {
            error:
              "Missing required fields for initialization: productId, fulfillmentType",
          },
          { status: 400 },
        );
      }

      const inventory = await inventoryService.initializeInventory({
        listingId: listingId as string,
        productId: productId as string,
        sellerId: listingSellerId,
        orgId: orgIdStr,
        quantity: quantity as number,
        fulfillmentType: fulfillmentType as "FBM" | "FBF",
        warehouseId,
        binLocation,
        performedBy: session.user.id,
        reason,
      });

      return NextResponse.json(
        {
          success: true,
          inventory,
          message: "Inventory initialized successfully",
        },
        { status: 201 },
      );
    } else {
      // Receive additional stock
      const inventory = await inventoryService.receiveStock(
        listingId as string,
        quantity as number,
        session.user.id,
        orgIdStr,
        reason,
      );

      return NextResponse.json({
        success: true,
        inventory,
        message: "Stock received successfully",
      });
    }
  } catch (error) {
    logger.error("POST /api/souq/inventory error", error as Error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
