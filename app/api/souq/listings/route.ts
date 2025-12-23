/**
 * @description Manages seller product listings (offers) in Souq marketplace.
 * POST creates a new listing linking seller to product with pricing,
 * inventory, and fulfillment options.
 * @route POST /api/souq/listings - Create seller listing
 * @access Private - Authenticated sellers only
 * @param {Object} body.productId - Product to list
 * @param {Object} body.fsin - Fixzit Standard Identification Number
 * @param {Object} body.sellerId - Seller ID
 * @param {Object} body.price - Listing price
 * @param {Object} body.stockQuantity - Initial stock quantity
 * @param {Object} body.fulfillmentMethod - fbf (Fulfilled by Fixzit) or fbm (Fulfilled by Merchant)
 * @param {Object} body.condition - Product condition: new, refurbished, used-*
 * @returns {Object} success: true, listing: created listing details
 * @throws {400} If validation fails or product not found
 * @throws {401} If user is not authenticated
 * @throws {403} If organization context missing
 */

import { NextResponse } from "next/server";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { SouqListing } from "@/server/models/souq/Listing";
import { SouqProduct } from "@/server/models/souq/Product";
import { SouqSeller } from "@/server/models/souq/Seller";
import { connectDb } from "@/lib/mongodb-unified";
import { nanoid } from "nanoid";
import { getServerSession } from "@/lib/auth/getServerSession";

const listingCreateSchema = z.object({
  productId: z.string(),
  fsin: z.string(),
  sellerId: z.string(),
  variationId: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0),
  fulfillmentMethod: z.enum(["fbf", "fbm"]),
  handlingTime: z.number().int().min(0).max(30),
  shippingOptions: z.array(
    z.object({
      method: z.enum(["standard", "express", "overnight"]),
      carrier: z.string().optional(),
      price: z.number().min(0),
      estimatedDays: z.number().int().min(0),
    }),
  ),
  freeShipping: z.boolean(),
  condition: z.enum([
    "new",
    "refurbished",
    "used-like-new",
    "used-good",
    "used-acceptable",
  ]),
  conditionNotes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP for listing creation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-listings:create",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    if (!session.user.orgId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Organization context required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { data: body, error: parseError } = await parseBodySafe<Record<string, unknown>>(request, { logPrefix: "[Souq Listings]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const validatedData = listingCreateSchema.parse(body);

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const [product, seller] = await Promise.all([
      SouqProduct.findOne({
        _id: validatedData.productId,
        orgId: session.user.orgId,
      }),
      SouqSeller.findOne({
        _id: validatedData.sellerId,
        orgId: session.user.orgId,
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const sellerDoc = seller as unknown as {
      canCreateListings?: () => boolean;
    };
    const canCreateListings =
      typeof sellerDoc.canCreateListings === "function"
        ? sellerDoc.canCreateListings()
        : true;
    if (!canCreateListings) {
      return NextResponse.json(
        { error: "Seller account not eligible to create listings" },
        { status: 403 },
      );
    }

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const existingListing = await SouqListing.findOne({
      productId: validatedData.productId,
      sellerId: validatedData.sellerId,
      orgId: session.user.orgId,
    });

    if (existingListing) {
      return NextResponse.json(
        { error: "Listing already exists for this product and seller" },
        { status: 400 },
      );
    }

    const listingId = `LST-${nanoid(10).toUpperCase()}`;

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const listing = await SouqListing.create({
      ...validatedData,
      listingId,
      orgId: session.user.orgId,
      availableQuantity: validatedData.stockQuantity,
      reservedQuantity: 0,
      status: "active",
      buyBoxEligible: false,
      isPrime: validatedData.fulfillmentMethod === "fbf",
      metrics: {
        orderCount: 0,
        cancelRate: 0,
        defectRate: 0,
        onTimeShipRate: 100,
        customerRating: 0,
        priceCompetitiveness: 50,
      },
    });

    const listingDoc = listing as unknown as {
      checkBuyBoxEligibility?: () => Promise<void>;
    };
    if (typeof listingDoc.checkBuyBoxEligibility === "function") {
      await listingDoc.checkBuyBoxEligibility();
    }
    await listing.save();

    return NextResponse.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    logger.error("Listing creation error:", error as Error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for listing reads
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "souq-listings:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authentication check
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    if (!session.user.orgId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Organization context required" },
        { status: 403 },
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const fsin = searchParams.get("fsin");
    const sellerId = searchParams.get("sellerId");
    const status = searchParams.get("status");
    const condition = searchParams.get("condition");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );

    // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
    const query: Record<string, unknown> = {
      orgId: session.user.orgId,
    };

    if (fsin) {
      query.fsin = fsin;
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (status) {
      query.status = status;
    }

    if (condition) {
      query.condition = condition;
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      SouqListing.find(query)
        .populate("sellerId", "legalName tradeName accountHealth.status")
        .populate("productId", "title images")
        .sort({ price: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SouqListing.countDocuments(query),
    ]);

    const response = NextResponse.json({
      success: true,
      data: listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    // Private cache for user-scoped listings
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60"
    );
    return response;
  } catch (error) {
    logger.error("Listing fetch error:", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 },
    );
  }
}
