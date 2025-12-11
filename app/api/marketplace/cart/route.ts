/**
 * @description Manages shopping cart operations for the B2B marketplace.
 * GET retrieves current cart with populated product details.
 * POST adds items to cart with quantity and pricing calculations.
 * Uses tenant-scoped cart storage with automatic total recalculation.
 * @route GET /api/marketplace/cart - Retrieve current cart
 * @route POST /api/marketplace/cart - Add item to cart
 * @access Private - Authenticated marketplace users
 * @param {Object} body.productId - Product ID to add to cart
 * @param {Object} body.quantity - Quantity to add (positive integer)
 * @returns {Object} GET: cart with lines and totals | POST: updated cart
 * @throws {401} If user is not authenticated
 * @throws {400} If product not found or validation fails
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { connectToDatabase } from "@/lib/mongodb-unified";
import Product from "@/server/models/marketplace/Product";
import { smartRateLimit } from "@/server/security/rateLimit";
import { createSecureResponse } from "@/server/security/headers";
import { objectIdFrom } from "@/lib/marketplace/objectIds";
import {
  serializeOrder,
  serializeProduct,
} from "@/lib/marketplace/serializers";
import { getOrCreateCart, recalcCartTotals } from "@/lib/marketplace/cart";
import {
  unauthorizedError,
  notFoundError,
  rateLimitError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { Types } from "mongoose";

interface CartLine {
  productId: Types.ObjectId | string;
  qty: number;
  price: number;
  currency: string;
  uom: string;
  total: number;
  product?: unknown;
}

interface CartDocument {
  lines: CartLine[];
  save?: () => Promise<unknown>;
  [key: string]: unknown;
}

const AddToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

/**
 * @openapi
 * /api/marketplace/cart:
 *   get:
 *     summary: marketplace/cart operations
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
      const allowAnon =
        process.env.MARKETPLACE_ALLOW_ANON_CART === "true" ||
        process.env.NODE_ENV !== "production";
      if (!allowAnon) {
        return unauthorizedError();
      }
      // Serve an empty cart for unauthenticated verification/local runs to avoid hard failures
      return createSecureResponse(
        {
          ok: true,
          data: {
            _id: undefined,
            orgId: context.orgId.toString(),
            buyerUserId: undefined,
            status: "CART",
            currency: "SAR",
            totals: { subtotal: 0, vat: 0, grand: 0 },
            lines: [],
          },
        },
        200,
        request,
      );
    }
    await connectToDatabase();
    const cart = (await getOrCreateCart(
      context.orgId,
      context.userId,
    )) as unknown as CartDocument;
    const productIds = cart.lines.map((line) => line.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(
      products.map((product) => {
        const id = (product as { _id: Types.ObjectId })._id.toString();
        return [id, serializeProduct(product as Record<string, unknown>)];
      }),
    );

    return createSecureResponse(
      {
        ok: true,
        data: {
          ...serializeOrder(cart),
          lines: cart.lines.map((line) => ({
            ...line,
            productId: line.productId.toString(),
            product: productMap.get(line.productId.toString()),
          })),
        },
      },
      200,
      request,
    );
  } catch (error) {
    logger.error(
      "Marketplace cart fetch failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Unable to load cart" }, 500, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }

    // Rate limiting for cart operations
    const key = `marketplace:cart:${context.userId}`;
    const rl = await smartRateLimit(key, 60, 60_000); // 60 cart operations per minute
    if (!rl.allowed) {
      return rateLimitError();
    }

    const body = await request.json();
    const payload = AddToCartSchema.parse(body);
    await connectToDatabase();

    const productId = objectIdFrom(payload.productId);
    const product = await Product.findOne({
      _id: productId,
      orgId: context.orgId,
    });
    if (!product) {
      return notFoundError("Product");
    }

    const cart = (await getOrCreateCart(
      context.orgId,
      context.userId,
    )) as unknown as CartDocument;
    const lineIndex = cart.lines.findIndex(
      (line) => line.productId.toString() === productId.toString(),
    );

    if (lineIndex >= 0) {
      cart.lines[lineIndex].qty += payload.quantity;
      cart.lines[lineIndex].total =
        cart.lines[lineIndex].qty * cart.lines[lineIndex].price;
    } else {
      cart.lines.push({
        productId,
        qty: payload.quantity,
        price: product.buy.price,
        currency: product.buy.currency,
        uom: product.buy.uom,
        total: product.buy.price * payload.quantity,
      });
    }

    recalcCartTotals(cart);
    if (typeof cart.save === "function") {
      await cart.save();
    }

    return NextResponse.json({
      ok: true,
      data: serializeOrder(cart),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    logger.error(
      "Marketplace add to cart failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Unable to update cart" },
      500,
      request,
    );
  }
}
