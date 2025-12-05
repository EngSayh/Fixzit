import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqOrder } from "@/server/models/souq/Order";
import { logger } from "@/lib/logger";
import { Role, normalizeRole } from "@/lib/rbac/client-roles";

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
    const orgId = (session.user as { orgId?: string }).orgId;

    // 🔒 SECURITY: orgId is required for tenant isolation
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }

    // Get order and verify access (always scoped by orgId)
    const order = await SouqOrder.findOne({ orderId, orgId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 🔐 SECURITY: Use canonical Role enum for role checks
    const userRole = normalizeRole(session.user.role);
    const adminRoles: Role[] = [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.CORPORATE_OWNER,
      Role.TEAM_MEMBER,
    ];
    const legacyOpsSupport = ["OPS", "SUPPORT"].includes(
      (session.user.role || "").toUpperCase(),
    );
    const isAdmin =
      (userRole !== null && adminRoles.includes(userRole)) || legacyOpsSupport;
    const isSeller = order.items.some(
      (item) => item.sellerId?.toString() === session.user.id,
    );

    if (!isAdmin && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate SLA
    const sla = await fulfillmentService.calculateSLA(orderId, orgId);

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
