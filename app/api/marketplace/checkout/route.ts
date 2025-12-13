/**
 * @description Processes cart checkout and creates purchase orders.
 * Validates cart contents, shipping address, and converts cart to order.
 * Supports B2B checkout with payment terms and shipping configurations.
 * @route POST /api/marketplace/checkout
 * @access Private - Authenticated marketplace users with active cart
 * @param {Object} body.shipTo - Shipping address details
 * @param {Object} body.shipTo.address - Delivery address
 * @param {Object} body.shipTo.contact - Contact person name
 * @param {Object} body.shipTo.phone - Optional contact phone
 * @returns {Object} success: true, order: created order with ID and status
 * @throws {401} If user is not authenticated
 * @throws {400} If cart is empty or validation fails
 * @throws {429} If rate limit exceeded
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseBodySafe } from "@/lib/api/parse-body";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getOrCreateCart, recalcCartTotals } from "@/lib/marketplace/cart";
import { smartRateLimit } from "@/server/security/rateLimit";
import { serializeOrder } from "@/lib/marketplace/serializers";
import { createSecureResponse } from "@/server/security/headers";
import {
  unauthorizedError,
  validationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";

const CheckoutSchema = z.object({
  shipTo: z
    .object({
      address: z.string().min(1),
      contact: z.string().min(1),
      phone: z.string().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /api/marketplace/checkout:
 *   get:
 *     summary: marketplace/checkout operations
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
export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    // Rate limiting for checkout operations (distributed for multi-instance)
    const key = `marketplace:checkout:${context.userId}`;
    const rl = await smartRateLimit(key, 10, 300_000); // 10 checkouts per 5 minutes
    if (!rl.allowed) {
      return rateLimitError("Checkout rate limit exceeded");
    }

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[Marketplace Checkout]" });
    if (parseError) {
      return validationError("Invalid request body");
    }
    const payload = CheckoutSchema.parse(body ?? {});
    await connectToDatabase();

    const cart = await getOrCreateCart(context.orgId, context.userId);
    if (!cart.lines.length) {
      return validationError("Cart is empty");
    }

    recalcCartTotals(cart);
    cart.currency = cart.lines[0]?.currency ?? cart.currency ?? "SAR";
    cart.shipTo = payload.shipTo ?? cart.shipTo;

    const approvalThreshold = Number(
      process.env.MARKETPLACE_APPROVAL_THRESHOLD ?? 5000,
    );
    if (cart.totals.grand >= approvalThreshold) {
      cart.status = "APPROVAL";
      cart.approvals = {
        required: true,
        status: "PENDING",
      };
    } else {
      cart.status = "PENDING";
      cart.approvals = {
        required: false,
        status: "APPROVED",
      };
    }

    await cart.save();

    return createSecureResponse({
      ok: true,
      data: serializeOrder(cart),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
