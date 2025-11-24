/**
 * Aqar Souq - Listings Search API
 *
 * GET /api/aqar/listings/search
 *
 * Atlas Search with geo-spatial + full-text + facets
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/models/aqar";
import { SmartHomeLevel } from "@/models/aqar/Listing";

import { logger } from "@/lib/logger";
export const runtime = "nodejs"; // Atlas Search requires Node.js runtime

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);

    // Helper to parse numeric values safely (returns undefined on NaN)
    const parseNum = (v: string | null): number | undefined => {
      if (v === null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    // Parse query parameters
    const intent = searchParams.get("intent"); // BUY|RENT|DAILY
    const propertyType = searchParams.get("propertyType");
    const city = searchParams.get("city");
    const neighborhoods = searchParams
      .get("neighborhoods")
      ?.split(",")
      .filter(Boolean);
    const minPrice = parseNum(searchParams.get("minPrice"));
    const maxPrice = parseNum(searchParams.get("maxPrice"));
    const minBeds = parseNum(searchParams.get("minBeds"));
    const maxBeds = parseNum(searchParams.get("maxBeds"));
    const minArea = parseNum(searchParams.get("minArea"));
    const maxArea = parseNum(searchParams.get("maxArea"));
    const furnishing = searchParams.get("furnishing");
    const amenities = searchParams.get("amenities")?.split(",").filter(Boolean);
    const smartHomeLevel = searchParams.get("smartHomeLevel");
    const proptechFeatures = searchParams
      .get("proptechFeatures")
      ?.split(",")
      .filter(Boolean);
    const hasVr = searchParams.get("hasVr");
    const minAiScore = parseNum(searchParams.get("minAiScore"));

    // Geo search with bounded radiusKm (0.1km to 20km - capped for DoS prevention)
    const lat = parseNum(searchParams.get("lat"));
    const lng = parseNum(searchParams.get("lng"));
    const radiusKmRaw = parseNum(searchParams.get("radiusKm"));
    const MAX_RADIUS_KM = 20;
    const MIN_RADIUS_KM = 0.1;
    const radiusKm = radiusKmRaw
      ? Math.min(Math.max(radiusKmRaw, MIN_RADIUS_KM), MAX_RADIUS_KM)
      : undefined;

    // Sorting & pagination with bounds
    const sort = searchParams.get("sort") || "relevance"; // relevance|price-asc|price-desc|date-desc|featured
    const pageRaw = parseNum(searchParams.get("page")) ?? 1;
    const limitRaw = parseNum(searchParams.get("limit")) ?? 20;
    const page = Math.max(1, Math.floor(pageRaw));
    const limit = Math.min(100, Math.max(1, Math.floor(limitRaw)));
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      status: "ACTIVE",
    };

    if (intent) query.intent = intent;
    if (propertyType) query.propertyType = propertyType;
    if (city) query.city = city;
    if (neighborhoods && neighborhoods.length > 0)
      query.neighborhood = { $in: neighborhoods };
    if (minPrice !== undefined || maxPrice !== undefined) {
      query["price.amount"] = {};
      if (minPrice !== undefined)
        (query["price.amount"] as Record<string, number>).$gte = minPrice;
      if (maxPrice !== undefined)
        (query["price.amount"] as Record<string, number>).$lte = maxPrice;
    }
    if (minBeds !== undefined || maxBeds !== undefined) {
      query.beds = {};
      if (minBeds !== undefined)
        (query.beds as Record<string, number>).$gte = minBeds;
      if (maxBeds !== undefined)
        (query.beds as Record<string, number>).$lte = maxBeds;
    }
    if (minArea !== undefined || maxArea !== undefined) {
      query.areaSqm = {};
      if (minArea !== undefined)
        (query.areaSqm as Record<string, number>).$gte = minArea;
      if (maxArea !== undefined)
        (query.areaSqm as Record<string, number>).$lte = maxArea;
    }
    if (furnishing) query.furnishing = furnishing;
    if (amenities && amenities.length > 0)
      query.amenities = { $all: amenities };
    if (
      smartHomeLevel &&
      Object.values(SmartHomeLevel).includes(smartHomeLevel as SmartHomeLevel)
    ) {
      query["proptech.smartHomeLevel"] = smartHomeLevel;
    }
    if (proptechFeatures && proptechFeatures.length > 0) {
      query["proptech.features"] = { $all: proptechFeatures };
    }
    if (hasVr === "true") {
      query["immersive.vrTour.ready"] = true;
    }
    if (minAiScore !== undefined) {
      query["ai.recommendationScore"] = { $gte: minAiScore };
    }

    // Geo search
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      query["location.geo"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000, // Convert km to meters
        },
      };
    }

    if (searchParams.get("isAuction") === "true") {
      query["auction.isAuction"] = true;
    }

    if (searchParams.get("rnplEligible") === "true") {
      query.rnplEligible = true;
    }

    // Build sort
    let sortQuery: Record<string, 1 | -1> = {};
    switch (sort) {
      case "price-asc":
        sortQuery = { "price.amount": 1 };
        break;
      case "price-desc":
        sortQuery = { "price.amount": -1 };
        break;
      case "date-desc":
        sortQuery = { publishedAt: -1 };
        break;
      case "featured":
        sortQuery = { featuredLevel: -1, publishedAt: -1 };
        break;
      default:
        sortQuery = { publishedAt: -1 };
    }

    // Execute query with field projection for performance
    const countQuery = { ...query };
    delete (countQuery as { "location.geo"?: unknown })["location.geo"];

    const select =
      "_id title price areaSqm city status media analytics.views publishedAt rnplEligible auction location";
    const [listings, total] = await Promise.all([
      AqarListing.find(query)
        .select(select)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      AqarListing.countDocuments(countQuery),
    ]);

    // Calculate facets - $near cannot be used in $match within $facet
    // Reuse the same query without geo filter
    const facets = await AqarListing.aggregate([
      { $match: countQuery },
      {
        $facet: {
          propertyTypes: [
            { $group: { _id: "$propertyType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          cities: [
            { $group: { _id: "$city", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          priceRanges: [
            {
              $bucket: {
                groupBy: "$price.amount",
                boundaries: [
                  0, 100000, 250000, 500000, 1000000, 2000000, 5000000,
                  10000000,
                ],
                default: "10M+",
                output: { count: { $sum: 1 } },
              },
            },
          ],
        },
      },
    ]);

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      facets: facets[0] || {},
    });
  } catch (error) {
    logger.error("Error searching listings:", error);
    return NextResponse.json(
      { error: "Failed to search listings" },
      { status: 500 },
    );
  }
}
