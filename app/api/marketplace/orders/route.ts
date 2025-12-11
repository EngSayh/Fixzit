/**
 * @description Lists orders for the authenticated marketplace user.
 * Returns paginated order history with line items and status tracking.
 * Excludes cart-status orders (pending checkouts).
 * @route GET /api/marketplace/orders
 * @access Private - Authenticated marketplace users
 * @query {string} status - Optional filter by order status
 * @returns {Object} orders: array of orders with line items and totals
 * @throws {401} If user is not authenticated
 * @throws {400} If query validation fails
 */
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Order from "@/server/models/marketplace/Order";
import { serializeOrder } from "@/lib/marketplace/serializers";
import {
  unauthorizedError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

const QuerySchema = z.object({
  status: z.string().optional(),
});

export const dynamic = "force-dynamic";
/**
 * @openapi
 * /api/marketplace/orders:
 *   get:
 *     summary: marketplace/orders operations
 *     tags: [marketplace]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);
    await connectToDatabase();

    const filter: Record<string, unknown> = {
      orgId: context.orgId,
      status: { $ne: "CART" },
    };

    if (context.role === "VENDOR") {
      filter.vendorId = context.userId;
    } else {
      filter.buyerUserId = context.userId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50);

    return createSecureResponse({
      ok: true,
      data: orders.map((order) => serializeOrder(order)),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    logger.error(
      "Marketplace orders fetch failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Unable to load orders" },
      500,
      request,
    );
  }
}
