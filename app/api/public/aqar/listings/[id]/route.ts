/**
 * Public API - Single Aqar Listing
 *
 * GET /api/public/aqar/listings/[id] - Get single listing details (read-only)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/server/models/aqar";
import { ListingStatus, type IListing } from "@/server/models/aqar/Listing";
import { isValidObjectIdSafe } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import type { Model } from "mongoose";

export const runtime = "nodejs";

const listingModel = AqarListing as unknown as Model<IListing>;

/**
 * GET /api/public/aqar/listings/[id]
 *
 * Returns public-safe fields only for active listings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = crypto.randomUUID();

  try {
    // Rate limiting: 200 requests per hour per IP
    const rateLimitResponse = enforceRateLimit(request, {
      requests: 200,
      windowMs: 60 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;

    if (!isValidObjectIdSafe(id)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid listing ID",
          correlationId,
        },
        { status: 400 },
      );
    }

    await connectDb();

    // Only return ACTIVE listings
    const listing = await listingModel
      .findOne({
        _id: id,
        status: ListingStatus.ACTIVE,
      })
      .select({
        _id: 1,
        title: 1,
        description: 1,
        intent: 1,
        propertyType: 1,
        price: 1,
        areaSqm: 1,
        beds: 1,
        baths: 1,
        kitchens: 1,
        ageYears: 1,
        furnishing: 1,
        location: 1,
        media: 1,
        amenities: 1,
        rnplEligible: 1,
        "auction.isAuction": 1,
        "auction.startAt": 1,
        "auction.endAt": 1,
        "auction.reserve": 1,
        "proptech.smartHomeLevel": 1,
        "proptech.features": 1,
        "proptech.iotVendors": 1,
        "proptech.energyScore": 1,
        "proptech.waterScore": 1,
        "proptech.evCharging": 1,
        "proptech.solarReady": 1,
        iotFeatures: 1,
        "pricingInsights.pricePerSqm": 1,
        "pricingInsights.percentile": 1,
        "pricingInsights.neighborhoodAvg": 1,
        "pricingInsights.projectedAppreciationPct": 1,
        "pricingInsights.demandScore": 1,
        "immersive.vrTour": 1,
        "immersive.highlights": 1,
        "ai.recommendationScore": 1,
        "ai.badges": 1,
        "analytics.views": 1,
        "analytics.favorites": 1,
        createdAt: 1,
        publishedAt: 1,
      })
      .lean();

    if (!listing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Listing not found or not available",
          correlationId,
        },
        { status: 404 },
      );
    }

    // Increment views (async, don't wait)
    listingModel
      .findByIdAndUpdate(id, {
        $inc: { "analytics.views": 1 },
        $set: { "analytics.lastViewedAt": new Date() },
      })
      .exec()
      .catch((err: Error) => {
        logger.warn("PUBLIC_API_VIEW_INC_FAILED", {
          correlationId,
          id,
          error: err.message,
        });
      });

    return NextResponse.json({
      ok: true,
      listing,
      correlationId,
    });
  } catch (error) {
    logger.error("PUBLIC_API_LISTING_DETAIL_FAILED", {
      error: (error as Error)?.message ?? String(error),
      stack: (error as Error)?.stack,
      correlationId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch listing",
        correlationId,
      },
      { status: 500 },
    );
  }
}
