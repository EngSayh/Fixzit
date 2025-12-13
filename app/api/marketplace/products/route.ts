/**
 * @fileoverview Marketplace Products Catalog
 * @description Manages product listings in the marketplace - browse, create, and manage products for procurement
 * @route GET /api/marketplace/products - List products with pagination
 * @route POST /api/marketplace/products - Create new product (admin only)
 * @access Private - Requires authentication, admin roles for write operations
 * @module marketplace
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { resolveMarketplaceContext } from "@/lib/marketplace/context";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { serializeProduct } from "@/lib/marketplace/serializers";
import { objectIdFrom } from "@/lib/marketplace/objectIds";

import {
  unauthorizedError,
  forbiddenError,
  zodValidationError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "PROCUREMENT",
  "ADMIN",
]);

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const ProductSchema = z.object({
  categoryId: z.string(),
  sku: z.string().min(1),
  slug: z.string().min(1),
  title: z.object({ en: z.string().min(1), ar: z.string().optional() }),
  summary: z.string().optional(),
  brand: z.string().optional(),
  standards: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
  media: z
    .array(
      z.object({
        url: z.string().url(),
        role: z.enum(["GALLERY", "MSDS", "COA"]).optional(),
        title: z.string().optional(),
      }),
    )
    .optional(),
  buy: z.object({
    price: z.number().positive(),
    currency: z.string().min(1),
    uom: z.string().min(1),
    minQty: z.number().positive().optional(),
    leadDays: z.number().int().nonnegative().optional(),
  }),
  stock: z
    .object({
      onHand: z.number().int().nonnegative(),
      reserved: z.number().int().nonnegative(),
      location: z.string().optional(),
    })
    .optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
});

/**
 * @openapi
 * /api/marketplace/products:
 *   get:
 *     summary: marketplace/products operations
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
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "marketplace:products:list" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (process.env.MARKETPLACE_ENABLED !== "true") {
      return createSecureResponse(
        { error: "Marketplace endpoint not available in this deployment" },
        501,
        request,
      );
    }
    // Use unified database connection
    await connectToDatabase();
    let ProductMod;
    try {
      ProductMod = await import("@/server/models/marketplace/Product");
    } catch (_importErr) {
      // Optional import - marketplace may be disabled
      ProductMod = null;
    }
    const Product = ProductMod && (ProductMod.default || ProductMod);
    if (!Product) {
      return createSecureResponse(
        {
          error:
            "Marketplace Product dependencies are not available in this deployment",
        },
        501,
        request,
      );
    }
    const context = await resolveMarketplaceContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = QuerySchema.parse(params);

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      Product.find({ orgId: context.orgId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Product.countDocuments({ orgId: context.orgId }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items: items.map((item: unknown) =>
          serializeProduct(item as Record<string, unknown>),
        ),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    logger.error(
      "Marketplace products list failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Unable to list products" },
      500,
      request,
    );
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 20, windowMs: 60_000, keyPrefix: "marketplace:products:create" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (process.env.MARKETPLACE_ENABLED !== "true") {
      return createSecureResponse(
        { error: "Marketplace endpoint not available in this deployment" },
        501,
        request,
      );
    }
    // Use unified database connection
    await connectToDatabase();
    let ProductMod;
    try {
      ProductMod = await import("@/server/models/marketplace/Product");
    } catch (_importErr) {
      // Optional import - marketplace may be disabled
      ProductMod = null;
    }
    const Product = ProductMod && (ProductMod.default || ProductMod);
    if (!Product) {
      return createSecureResponse(
        {
          error:
            "Marketplace Product dependencies are not available in this deployment",
        },
        501,
        request,
      );
    }
    const context = await resolveMarketplaceContext(request);
    if (!context.userId) {
      return unauthorizedError();
    }
    if (!context.role || !ADMIN_ROLES.has(context.role)) {
      return forbiddenError();
    }
    const body = await request.json();
    const payload = ProductSchema.parse(body);

    const product = await Product.create({
      ...payload,
      orgId: context.orgId,
      categoryId: objectIdFrom(payload.categoryId),
      vendorId: payload.brand
        ? objectIdFrom(`${context.orgId}-${payload.brand}`)
        : undefined,
      status: payload.status ?? "ACTIVE",
    });

    return NextResponse.json(
      { ok: true, data: serializeProduct(product) },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, request);
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return createSecureResponse(
        { error: "Duplicate SKU or slug" },
        409,
        request,
      );
    }
    logger.error(
      "Marketplace product creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Unable to create product" },
      500,
      request,
    );
  }
}
