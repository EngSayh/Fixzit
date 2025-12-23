/**
 * @description Generates shipping labels for FBM (Fulfilled by Merchant) orders.
 * Creates carrier-specific labels with tracking numbers for seller shipments.
 * Validates seller ownership of order before label generation.
 * @route POST /api/souq/fulfillment/generate-label
 * @access Private - Order sellers or admins only
 * @param {Object} body.orderId - Order ID to generate label for
 * @param {Object} body.carrier - Carrier code: spl, aramex, dhl (default: spl)
 * @returns {Object} label: PDF URL, trackingNumber, carrier details
 * @throws {400} If orderId missing or orgId not found
 * @throws {401} If user is not authenticated
 * @throws {403} If user does not own order items
 * @throws {404} If order not found
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqOrder } from "@/server/models/souq/Order";
import { SouqSeller } from "@/server/models/souq/Seller";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

/**
 * POST /api/souq/fulfillment/generate-label
 * Generate shipping label for FBM orders
 * Seller-only endpoint
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for label generation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-fulfillment:generate-label",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parseResult = await parseBodySafe<{ orderId?: string; carrier?: string }>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { orderId, carrier = "spl" } = parseResult.data!;
    const orgId = (session.user as { orgId?: string }).orgId;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "Missing required field: orderId",
        },
        { status: 400 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Missing required orgId for tenant scoping" },
        { status: 400 },
      );
    }

    // Get order and verify seller ownership
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Accessing nested items property
    const order = await SouqOrder.findOne({ orderId, orgId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role);
    const isSeller = order.items.some(
      (item) => item.sellerId?.toString() === session.user.id,
    );

    if (!isAdmin && !isSeller) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // eslint-disable-next-line local/require-lean -- NO_LEAN: Accessing seller profile fields
    const seller = await SouqSeller.findOne({ _id: session.user.id, orgId });
    if (!seller) {
      return NextResponse.json(
        { error: "Seller profile not found" },
        { status: 404 },
      );
    }

    const sellerAddress = {
      name: seller.tradeName || seller.legalName,
      phone: seller.contactPhone,
      email: seller.contactEmail,
      street: seller.address,
      city: seller.city,
      state: undefined,
      postalCode: "00000",
      country: seller.country || "SA",
    };

    // Generate label
    const label = await fulfillmentService.generateFBMLabel({
      orderId,
      sellerId: seller._id.toString(),
      sellerAddress,
      carrierName: carrier,
      orgId,
    });

    return NextResponse.json({
      success: true,
      label,
    });
  } catch (error) {
    logger.error("Generate label error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to generate label",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
