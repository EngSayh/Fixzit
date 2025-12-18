/**
 * @fileoverview Catalog Products API
 * @description Manages product catalog operations including FSIN generation, product creation, and localized product retrieval.
 * @route GET /api/souq/catalog/products - List products with search and filtering
 * @route POST /api/souq/catalog/products - Create new product with FSIN
 * @access Authenticated
 * @module souq
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { generateFSIN } from "@/lib/souq/fsin-generator";
import { SouqProduct } from "@/server/models/souq/Product";
import { SouqCategory } from "@/server/models/souq/Category";
import { SouqBrand } from "@/server/models/souq/Brand";
import { connectDb } from "@/lib/mongodb-unified";
import { getServerSession } from "@/lib/auth/getServerSession";
import { Types } from "mongoose";
import { parseBodySafe } from "@/lib/api/parse-body";

interface LocalizedField {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
}

interface ProductWithLocalization {
  _id: unknown;
  fsin: string;
  title: LocalizedField | string;
  description?: LocalizedField | string;
  pricing?: {
    basePrice?: number;
    [key: string]: unknown;
  };
  categoryId: string;
  brandId?: string;
  searchKeywords?: string[];
  isActive: boolean;
  [key: string]: unknown;
}

// Validation schemas
const CreateProductSchema = z.object({
  title: z.record(z.string(), z.string()).refine((data) => data.en && data.ar, {
    message: "Title must include both English and Arabic",
  }),
  description: z.record(z.string(), z.string()),
  shortDescription: z.record(z.string(), z.string()).optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  images: z.array(z.string().url()).min(1, "At least one image required"),
  videos: z.array(z.string().url()).optional(),
  attributes: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    )
    .optional(),
  hasVariations: z.boolean().default(false),
  variationTheme: z
    .enum(["color", "size", "style", "color_size", "custom"])
    .optional(),
  searchKeywords: z.array(z.string()).optional(),
  bulletPoints: z.record(z.string(), z.array(z.string())).optional(),
});

/**
 * POST /api/souq/catalog/products
 * Create new product with auto-generated FSIN
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for product creation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-catalog:create-product",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  let orgId: string | undefined;
  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }
    if (!Types.ObjectId.isValid(orgId)) {
      return NextResponse.json(
        { error: "Invalid organization id" },
        { status: 400 },
      );
    }
    const orgObjectId = new Types.ObjectId(orgId);

    await connectDb();

    const parseResult = await parseBodySafe<unknown>(request);
    if (parseResult.error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const body = parseResult.data!;
    const validated = CreateProductSchema.parse(body);

    // Tenant-scoped category lookup with legacy org_id fallback (global allowed when no org fields exist)
    const orgScope = [{ orgId: orgObjectId }, { org_id: orgObjectId }];
    const category = await SouqCategory.findOne({
      categoryId: validated.categoryId,
      isActive: true,
      $or: [
        ...orgScope,
        // allow global categories that are not tied to an org
        { orgId: { $exists: false } },
        { org_id: { $exists: false } },
      ],
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Check seller authorization for restricted categories
    if (category.isRestricted) {
      // Check if seller has approval for this restricted category
      const { SouqSeller } = await import("@/server/models/souq/Seller");
      const seller = await SouqSeller.findOne({
        orgId,
        isActive: true,
        "approvedCategories.categoryId": validated.categoryId,
      });

      if (!seller) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Seller not approved for this restricted category",
          },
          { status: 403 },
        );
      }
    }

    // Check brand exists and seller is authorized if gated
    if (validated.brandId) {
      // Tenant-scoped brand lookup with legacy org_id fallback (global allowed when no org fields exist)
      const brand = await SouqBrand.findOne({
        brandId: validated.brandId,
        isActive: true,
        $or: [
          ...orgScope,
          { orgId: { $exists: false } },
          { org_id: { $exists: false } },
        ],
      });
      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      // Check seller authorization for gated brands
      if (brand.isGated) {
        const { SouqSeller } = await import("@/server/models/souq/Seller");
        const seller = await SouqSeller.findOne({
          orgId,
          isActive: true,
          "approvedBrands.brandId": validated.brandId,
        });

        if (!seller) {
          return NextResponse.json(
            {
              error: "Unauthorized",
              message: "Seller not approved for this gated brand",
            },
            { status: 403 },
          );
        }
      }
    }

    // Generate FSIN
    const { fsin } = generateFSIN();
    let finalFsin = fsin;

    // Check for collision (extremely rare)
    const existingProduct = await SouqProduct.findOne({
      fsin: finalFsin,
      $or: [{ orgId: orgObjectId }, { org_id: orgObjectId }],
    });
    if (existingProduct) {
      // Regenerate FSIN
      const { fsin: newFsin } = generateFSIN();
      finalFsin = newFsin;
    }

    // Create product
    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const product = new SouqProduct({
      fsin: finalFsin,
      ...validated,
      orgId: orgObjectId,
      createdBy: session.user.id,
      isActive: true,
    });

    await product.save();

    // Index in search engine using shared Meilisearch client
    try {
      const { indexProduct } = await import("@/lib/meilisearch-client");
      // Index product with localized fields
      const productTyped = product as unknown as ProductWithLocalization;
      const titleObj =
        typeof productTyped.title === "object"
          ? productTyped.title
          : { en: productTyped.title };
      const descObj =
        typeof productTyped.description === "object"
          ? productTyped.description
          : { en: productTyped.description };
      await indexProduct({
        id: product._id.toString(),
        fsin: product.fsin,
        title: titleObj.en ?? titleObj.ar ?? "",
        description: descObj.en ?? descObj.ar ?? "",
        categoryId: product.categoryId,
        brandId: product.brandId,
        searchKeywords: product.searchKeywords,
        isActive: product.isActive,
        orgId,
      });
    } catch (searchError) {
      // Log but don't fail product creation if indexing fails
      logger.error("[Souq] Failed to index product", searchError as Error, {
        productId: product._id,
        fsin: product.fsin,
      });
    }

    // Publish product.created event using shared NATS client
    try {
      type PublishFn = (
        _event: string,
        _data: Record<string, unknown>,
      ) => Promise<void>;
      const natsModule = (await import("@/lib/nats-client")) as {
        publish?: PublishFn;
      };
      if (typeof natsModule.publish === "function") {
        await natsModule.publish("product.created", {
          type: "product.created",
          productId: product._id.toString(),
          fsin: product.fsin,
          orgId,
          categoryId: product.categoryId,
          brandId: product.brandId,
          title: product.title,
          price:
            (product as unknown as ProductWithLocalization).pricing
              ?.basePrice || 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (natsError) {
      // Log but don't fail product creation if event publish fails
      logger.error(
        "[Souq] Failed to publish product.created event",
        natsError as Error,
        { productId: product._id, fsin: product.fsin },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: product._id,
          fsin: product.fsin,
          title: product.title,
          categoryId: product.categoryId,
          brandId: product.brandId,
          images: product.images,
          createdAt: product.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    logger.error("[Catalog API] Product creation error", error as Error, {
      orgId,
    });
    return NextResponse.json(
      {
        error: "Failed to create product",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/souq/catalog/products
 * List products (seller-scoped or admin view)
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for product listing
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-catalog:list-products",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getServerSession();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 },
      );
    }
    if (!Types.ObjectId.isValid(session.user.orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }
    const orgObjectId = new Types.ObjectId(session.user.orgId);

    await connectDb();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const categoryId = searchParams.get("categoryId");
    const brandId = searchParams.get("brandId");
    const sellerId = searchParams.get("sellerId");
    const status = searchParams.get("status"); // 'active' | 'inactive' | 'all'

    const query: Record<string, unknown> = {};

    query.$or = [{ orgId: orgObjectId }, { org_id: orgObjectId }];

    if (categoryId) query.categoryId = categoryId;
    if (brandId) query.brandId = brandId;
    if (sellerId) query.createdBy = sellerId;
    if (status !== "all") {
      query.isActive = status === "active";
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      SouqProduct.find(query)
        .select("fsin title images categoryId brandId isActive createdAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      SouqProduct.countDocuments(query),
    ]);

    const response = NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    // Tenant-scoped data - short cache, private
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    logger.error("[Catalog API] List products error", error as Error);
    return NextResponse.json(
      {
        error: "Failed to list products",
      },
      { status: 500 },
    );
  }
}
