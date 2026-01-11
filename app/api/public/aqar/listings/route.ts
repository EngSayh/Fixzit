/**
 * Public API - Aqar Souq Listings
 *
 * GET /api/public/aqar/listings - Browse active listings (read-only, rate-limited)
 *
 * This endpoint provides sanitized, public access to active property listings.
 * No authentication required, but rate-limited to prevent abuse.
 */

import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { AqarListing } from "@/server/models/aqar";
import {
    ListingStatus,
    type IListing,
} from "@/server/models/aqar/Listing";
import crypto from "crypto";
import type { Model } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface ListingQuery {
  status: string;
  "location.cityId"?: string;
  intent?: string;
  propertyType?: string;
  price?: { $gte?: number; $lte?: number };
  beds?: number;
  baths?: number;
  [key: string]: unknown;
}

export const runtime = "nodejs";

const listingModel = AqarListing as unknown as Model<IListing>;

const AqarListingsQuerySchema = z.object({
  city: z.string().max(100).optional(),
  intent: z.enum(["BUY", "RENT", "DAILY"]).optional(),
  propertyType: z.enum(["APARTMENT", "VILLA", "TOWNHOUSE", "LAND", "COMMERCIAL"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  beds: z.coerce.number().int().nonnegative().optional(),
  baths: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * GET /api/public/aqar/listings
 *
 * Query Parameters:
 * - city: Filter by city (string)
 * - intent: Filter by intent (BUY, RENT, DAILY)
 * - propertyType: Filter by property type
 * - minPrice, maxPrice: Price range
 * - beds, baths: Exact match
 * - limit: Max results (default 20, max 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    // Rate limiting: 100 requests per hour per IP
    const rateLimitResponse = enforceRateLimit(request, {
      keyPrefix: "public-aqar-listings",
      requests: 100,
      windowMs: 60 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await connectDb();

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters with Zod
    const queryResult = AqarListingsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { city, intent, propertyType, minPrice, maxPrice, beds, baths, limit, offset } =
      queryResult.data;

    // Build query - only active listings
    const query: ListingQuery = {
      status: ListingStatus.ACTIVE,
    };

    if (city) {
      query["location.cityId"] = city;
    }

    if (intent) {
      query.intent = intent;
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    // Only add price filter if we have valid numbers
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceRange: { $gte?: number; $lte?: number } = {};
      if (minPrice !== undefined && minPrice > 0) {
        priceRange.$gte = minPrice;
      }
      if (maxPrice !== undefined && maxPrice > 0) {
        priceRange.$lte = maxPrice;
      }
      if (Object.keys(priceRange).length > 0) {
        query["price.amount"] = priceRange;
      }
    }

    // Only add beds/baths filters if provided
    if (beds !== undefined && beds >= 0) {
      query.beds = beds;
    }

    if (baths !== undefined && baths >= 0) {
      query.baths = baths;
    }

    // Execute query - select only safe, public fields
    // Note: Public marketplace listing - intentionally cross-tenant for anonymous users
    const listings = await listingModel
      .find(query)
      .select({
        _id: 1,
        title: 1,
        intent: 1,
        propertyType: 1,
        price: 1,
        areaSqm: 1,
        beds: 1,
        baths: 1,
        location: 1,
        media: { $slice: 1 }, // Only first image
        amenities: 1,
        rnplEligible: 1,
        "auction.isAuction": 1,
        "auction.endAt": 1,
        "proptech.smartHomeLevel": 1,
        "proptech.features": 1,
        iotFeatures: 1,
        "pricingInsights.pricePerSqm": 1,
        "immersive.vrTour.url": 1,
        createdAt: 1,
        publishedAt: 1,
      })
      .sort({ featuredLevel: -1, publishedAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Get total count for pagination
    const total = await listingModel.countDocuments(query);

    return NextResponse.json({
      ok: true,
      items: listings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      correlationId,
    }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error("PUBLIC_API_LISTINGS_FAILED", {
      error: (error as Error)?.message ?? String(error),
      stack: (error as Error)?.stack,
      correlationId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch listings",
        correlationId,
      },
      { status: 500 },
    );
  }
}
