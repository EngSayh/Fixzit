import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSessionUser,
  UnauthorizedError,
} from "@/server/middleware/withAuthRbac";
import { connectDb } from "@/lib/mongo";
import { AqarFavorite } from "@/models/aqar";
import { FavoriteType, type IFavorite } from "@/models/aqar/Favorite";
import {
  AqarRecommendationEngine,
  type RecommendationContext,
} from "@/services/aqar/recommendation-engine";
import { ListingIntent, PropertyType } from "@/models/aqar/Listing";
import { Types, type Model } from "mongoose";

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
  const correlationId = crypto.randomUUID();
  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    let user: { id: string; orgId?: string } | undefined;
    try {
      user = await getSessionUser(request);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
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

    let favorites: string[] | undefined = favoritesParam.length
      ? favoritesParam
      : undefined;
    if (!favorites && user) {
      const favoriteModel = AqarFavorite as unknown as Model<IFavorite>;
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
      orgId: user?.orgId,
    };

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
