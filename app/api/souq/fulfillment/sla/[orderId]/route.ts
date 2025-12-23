/**
 * @description Checks SLA (Service Level Agreement) metrics for an order.
 * Returns fulfillment timeline compliance including ship-by, deliver-by deadlines.
 * Tracks late shipment and delivery metrics.
 * @route GET /api/souq/fulfillment/sla/[orderId]
 * @access Private - Order seller or admin
 * @param {string} orderId - Order ID to check SLA for
 * @returns {Object} slaMetrics: deadlines, compliance status, late flags
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing or unauthorized
 * @throws {404} If order not found
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/getServerSession";
import { fulfillmentService } from "@/services/souq/fulfillment-service";
import { SouqOrder } from "@/server/models/souq/Order";
import { logger } from "@/lib/logger";
import {
  Role,
  SubRole,
  normalizeRole,
  normalizeSubRole,
  inferSubRoleFromRole,
} from "@/lib/rbac/client-roles";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/souq/fulfillment/sla/[orderId]
 * Check SLA metrics for an order
 * Seller and admin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  // Rate limiting: 60 requests per minute per IP for SLA checks
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-fulfillment:sla",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

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
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Accessing order fields for SLA calculation
    const order = await SouqOrder.findOne({ orderId, orgId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 🔐 SECURITY: Use canonical Role enum + subRole gating per STRICT v4.1
    const rawSubRole = ((user as { subRole?: string | null }).subRole ?? undefined) as string | undefined;
    const normalizedSubRole =
      rawSubRole && Object.values(SubRole).includes(rawSubRole as SubRole)
        ? (rawSubRole as SubRole)
        : undefined;
    const userRole = normalizeRole(user.role, normalizedSubRole);
    const userSubRole =
      normalizeSubRole(normalizedSubRole) ??
      inferSubRoleFromRole(user.role);
    
    // Core admin roles with SLA visibility
    const isAdminRole = userRole !== null && [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.CORPORATE_OWNER,
    ].includes(userRole);
    
    // TEAM_MEMBER only gets SLA access with ops/support subRole
    const isOpsSupport = userRole === Role.TEAM_MEMBER && userSubRole !== undefined && [
      SubRole.OPERATIONS_MANAGER,
      SubRole.SUPPORT_AGENT,
    ].includes(userSubRole);
    
    const isAdmin = isAdminRole || isOpsSupport;
    const userId = user.id;
    const isSeller = order.items.some(
      (item) => item.sellerId?.toString() === userId,
    );

    if (!isAdmin && !isSeller) {
      // Return 404 to prevent cross-tenant existence leak
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate SLA
    const sla = await fulfillmentService.calculateSLA(orderId, orgId);

    return NextResponse.json({
      success: true,
      sla,
    });
  } catch (error) {
    logger.error("SLA check error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to check SLA",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
