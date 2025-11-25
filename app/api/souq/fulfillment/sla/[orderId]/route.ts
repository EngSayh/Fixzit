import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqOrder } from "@/server/models/souq/Order";
import { logger } from "@/lib/logger";

/**
 * GET /api/souq/fulfillment/sla/[orderId]
 * Check SLA metrics for an order
 * Seller and admin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = params;

    // Get order and verify access
    const order = await SouqOrder.findOne({ orderId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const isSeller = order.items.some(
      (item) => item.sellerId?.toString() === session.user.id,
    );

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate SLA
    const sla = await fulfillmentService.calculateSLA(orderId);

    return NextResponse.json({
      success: true,
      sla,
    });
  } catch (error) {
    logger.error("SLA check error", { error });
    return NextResponse.json(
      {
        error: "Failed to check SLA",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
