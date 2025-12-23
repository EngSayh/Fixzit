/**
 * @fileoverview Aqar Listings Recommendations API
 * @description Provides personalized property recommendations based on user preferences,
 * browsing history, and favorited listings. Uses ML-powered recommendation engine.
 * @module api/aqar/listings/recommendations
 *
 * @example
 * // GET /api/aqar/listings/recommendations?propertyTypes=APARTMENT,VILLA&intent=BUY&limit=10
 * // Returns: { recommendations: [...], score, context }
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";
import { connectDb } from "@/lib/mongo";
import { AqarFavorite } from "@/server/models/aqar";
import { FavoriteType, type IFavorite } from "@/server/models/aqar/Favorite";
import {
  AqarRecommendationEngine,
  type RecommendationContext,
} from "@/services/aqar/recommendation-engine";
import { ListingIntent, PropertyType } from "@/server/models/aqar/Listing";
import { Types, type Model } from "mongoose";
import { recordPersonalizationEvent } from "@/services/aqar/personalization-service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

const parseCsv = (value: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const parseNumberParam = (value: string | null): number | undefined => {
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP for recommendations
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:recommendations:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const correlationId = crypto.randomUUID();
  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    let user: { id: string; orgId?: string } | undefined;
    try {
      user = await getSessionUser(request);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        const message =
          error instanceof Error ? error.message : "Unknown auth error";
        logger.warn("AQAR_RECO_USER_LOOKUP_FAILED", {
          error: message,
          correlationId,
        });
      }
    }

    const propertyTypes = parseCsv(
      searchParams.get("propertyTypes"),
    ) as PropertyType[];
    const neighborhoods = parseCsv(searchParams.get("neighborhoods"));
    const favoritesParam = parseCsv(searchParams.get("favorites"));
    const budgetMin = parseNumberParam(searchParams.get("budgetMin"));
    const budgetMax = parseNumberParam(searchParams.get("budgetMax"));
    const limit = parseNumberParam(searchParams.get("limit"));
    const personalize =
      searchParams.get("personalize") !== "false" &&
      searchParams.get("personalization") !== "false";

    let favorites: string[] | undefined = favoritesParam.length
      ? favoritesParam
      : undefined;
    if (!favorites && user) {
      const favoriteModel = AqarFavorite as unknown as Model<IFavorite>;
      // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: Scoped by userId (user's own favorites)
      const ids = await favoriteModel
        .find({
          userId: new Types.ObjectId(user.id),
          targetType: FavoriteType.LISTING,
        })
        .sort({ updatedAt: -1 })
        .limit(20)
        .distinct("targetId");
      favorites = (ids as Types.ObjectId[]).map((id) => id.toHexString());
    }

    const context: RecommendationContext = {
      intent: (searchParams.get("intent") as ListingIntent) || undefined,
      propertyTypes: propertyTypes.length ? propertyTypes : undefined,
      preferredCity: searchParams.get("city") || undefined,
      preferredNeighborhoods: neighborhoods.length ? neighborhoods : undefined,
      budget:
        budgetMin !== undefined || budgetMax !== undefined
          ? {
              min: budgetMin,
              max: budgetMax,
            }
          : undefined,
      favorites,
      limit: typeof limit === "number" ? limit : undefined,
      currentListingId: searchParams.get("listingId") || undefined,
      updateAiSnapshot: searchParams.get("updateAi") !== "false",
      includeExperimental: searchParams.get("experimental") !== "false",
      personalize,
      userId: user?.id,
      orgId: user?.orgId,
    };

    if (user?.id) {
      void recordPersonalizationEvent({
        userId: user.id,
        orgId: user.orgId,
        listingId: context.currentListingId,
        type: context.currentListingId ? "view" : "recommendation_request",
        path: new URL(request.url).pathname,
        intent: context.intent,
        propertyType: context.propertyTypes?.[0],
        city: context.preferredCity,
        source: "aqar-listings-recommendations",
      });
    }

    const recommendations = await AqarRecommendationEngine.recommend(context);
    return NextResponse.json(recommendations);
  } catch (error) {
    logger.error("AQAR_RECO_API_FAILED", {
      error: (error as Error)?.message ?? String(error),
      stack: (error as Error)?.stack,
      correlationId,
    });
    return NextResponse.json(
      { error: "Failed to load recommendations", correlationId },
      { status: 500 },
    );
  }
}
