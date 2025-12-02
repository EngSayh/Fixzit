import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { ListingIntent, PropertyType } from "@/server/models/aqar/Listing";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { rateLimit } from "@/server/security/rateLimit";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";
import { logger } from "@/lib/logger";
import {
  AqarRecommendationEngine,
  type RecommendationContext,
} from "@/services/aqar/recommendation-engine";

export const runtime = "nodejs";

const sanitizeEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined =>
  value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

export async function GET(req: NextRequest) {
  try {
    // Authenticate user and require tenant context
    const session = await getSessionUser(req).catch(() => null);
    if (!session || !session.orgId) {
      return createSecureResponse(
        { ok: false, error: "Authentication and org context required" },
        session ? 403 : 401,
        req,
      );
    }

    // Rate limit per user/tenant (include org for multi-tenant throttling)
    const baseKey = buildRateLimitKey(req, session.id);
    const rl = rateLimit(
      `${baseKey}:${session.orgId}`,
      60,
      60_000,
    ); // 60 requests per minute
    if (!rl.allowed) {
      return createSecureResponse(
        { ok: false, error: "Rate limit exceeded" },
        429,
        req,
      );
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId") || undefined;
    // userId is intentionally ignored to avoid cross-tenant probing
    const city = searchParams.get("city") || undefined;
    const intent = sanitizeEnum<ListingIntent>(
      searchParams.get("intent"),
      Object.values(ListingIntent),
    );
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get("propertyType"),
      Object.values(PropertyType),
    );
    const limitParam = Number(searchParams.get("limit") || "");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), 12)
      : 8;

    // Tenant-safe context: derive org/tenant from session, not user input
    const context: RecommendationContext = {
      currentListingId: listingId,
      preferredCity: city,
      intent,
      propertyTypes: propertyType ? [propertyType] : undefined,
      orgId: session.orgId,
      tenantId: session.orgId,
      limit,
    };

    const recommendation = await AqarRecommendationEngine.recommend(context);

    const items = recommendation.primary.map((item) => ({
      listingId: item.listingId,
      title: item.listing.title,
      city: item.listing.city,
      neighborhood: item.listing.neighborhood,
      price: item.listing.price,
      propertyType: item.listing.propertyType,
      intent: item.listing.intent,
      badges: item.badges,
      reasons: item.reasons,
      highlights: item.highlights,
      score: item.score,
    }));

    return createSecureResponse({ ok: true, items }, 200, req);
  } catch (err) {
    logger.error("GET /api/aqar/recommendations error", { error: err });
    return createSecureResponse({ ok: false, error: "Server error" }, 500, req);
  }
}
