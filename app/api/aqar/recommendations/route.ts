/**
 * @fileoverview Aqar Recommendations API (Authenticated)
 * @description Provides authenticated property recommendations with tenant-aware filtering.
 * Requires user authentication and organization context for multi-tenant isolation.
 * @module api/aqar/recommendations
 *
 * @security Rate limited: 60 requests/minute per user/tenant
 * @security Requires authentication and org context
 *
 * @example
 * // GET /api/aqar/recommendations?listingId=xxx&city=Riyadh&intent=BUY
 */

import { NextRequest } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { ListingIntent, PropertyType } from "@/server/models/aqar/Listing";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { logger } from "@/lib/logger";
import {
  AqarRecommendationEngine,
  type RecommendationContext,
} from "@/services/aqar/recommendation-engine";
import { recordPersonalizationEvent } from "@/services/aqar/personalization-service";

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
    const baseKey = buildOrgAwareRateLimitKey(req, session.orgId ?? null, session.id);
    const rl = await smartRateLimit(
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
    const personalize =
      searchParams.get("personalize") !== "false" &&
      searchParams.get("personalization") !== "false";

    // Tenant-safe context: derive org/tenant from session, not user input
    const context: RecommendationContext = {
      currentListingId: listingId,
      preferredCity: city,
      intent,
      propertyTypes: propertyType ? [propertyType] : undefined,
      personalize,
      userId: session.id,
      orgId: session.orgId,
      tenantId: session.orgId,
      limit,
    };

    void recordPersonalizationEvent({
      userId: session.id,
      orgId: session.orgId,
      listingId: listingId ?? undefined,
      type: listingId ? "view" : "recommendation_request",
      path: new URL(req.url).pathname,
      intent,
      propertyType: propertyType ?? undefined,
      city,
      source: "aqar-auth-recommendations",
    });

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
