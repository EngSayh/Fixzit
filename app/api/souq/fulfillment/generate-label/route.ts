import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqOrder } from "@/server/models/souq/Order";
import { SouqSeller } from "@/server/models/souq/Seller";
import { logger } from "@/lib/logger";

/**
 * POST /api/souq/fulfillment/generate-label
 * Generate shipping label for FBM orders
 * Seller-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, carrier = "spl" } = body;
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
    const order = await SouqOrder.findOne({ orderId, orgId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(session.user.role);
    const isSeller = order.items.some(
      (item) => item.sellerId?.toString() === session.user.id,
    );

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
