/**
 * Public API - Aqar Souq Listings
 *
 * GET /api/public/aqar/listings - Browse active listings (read-only, rate-limited)
 *
 * This endpoint provides sanitized, public access to active property listings.
 * No authentication required, but rate-limited to prevent abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/server/models/aqar";
import {
  ListingIntent,
  PropertyType,
  ListingStatus,
  type IListing,
} from "@/server/models/aqar/Listing";
import { checkRateLimit } from "@/lib/rateLimit";
import type { Model } from "mongoose";

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

const sanitizeEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined =>
  value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

const parseIntegerParam = (
  value: string | null,
  fallback: number,
  bounds: { min?: number; max?: number } = {},
) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  let normalized = Math.floor(parsed);
  if (typeof bounds.min === "number" && normalized < bounds.min) {
    normalized = bounds.min;
  }
  if (typeof bounds.max === "number" && normalized > bounds.max) {
    normalized = bounds.max;
  }

  return normalized;
};

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
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000,
      message: "Too many public API requests. Please try again later.",
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    await connectDb();

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const city = searchParams.get("city") || undefined;
    const intent = sanitizeEnum<ListingIntent>(
      searchParams.get("intent"),
      Object.values(ListingIntent),
    );
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get("propertyType"),
      Object.values(PropertyType),
    );

    // Parse numeric parameters with validation to prevent NaN propagation
    const parseNumericParam = (value: string | null): number | undefined => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const minPrice = parseNumericParam(searchParams.get("minPrice"));
    const maxPrice = parseNumericParam(searchParams.get("maxPrice"));
    const beds = parseIntegerParam(searchParams.get("beds"), NaN, { min: 0 });
    const baths = parseIntegerParam(searchParams.get("baths"), NaN, { min: 0 });

    const limit = parseIntegerParam(searchParams.get("limit"), 20, {
      min: 1,
      max: 50,
    });
    const offset = parseIntegerParam(searchParams.get("offset"), 0, { min: 0 });

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

    // Only add beds/baths filters if valid integers were parsed
    if (!Number.isNaN(beds) && beds >= 0) {
      query.beds = beds;
    }

    if (!Number.isNaN(baths) && baths >= 0) {
      query.baths = baths;
    }

    // Execute query - select only safe, public fields
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
