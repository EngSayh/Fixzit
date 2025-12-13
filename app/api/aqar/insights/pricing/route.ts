/**
 * @fileoverview Aqar Pricing Insights API
 * @description Provides market pricing insights for real estate listings including
 * average prices, price trends, and comparable property analysis by city/neighborhood.
 * @module api/aqar/insights/pricing
 *
 * @example
 * // GET /api/aqar/insights/pricing?city=Riyadh&propertyType=APARTMENT&intent=BUY
 * // Returns: { averagePrice, priceRange, comparables, marketTrend }
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSessionUser,
  UnauthorizedError,
} from "@/server/middleware/withAuthRbac";
import { PricingInsightsService } from "@/services/aqar/pricing-insights-service";
import { ListingIntent, PropertyType } from "@/server/models/aqar/Listing";
import { isValidObjectIdSafe } from "@/lib/api/validation";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

export const runtime = "nodejs";

const sanitizeEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined =>
  value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

export async function GET(request: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:insights:pricing",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const correlationId = crypto.randomUUID();
  try {
    let user: { orgId?: string } | undefined;
    try {
      user = await getSessionUser(request);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        const message =
          error instanceof Error ? error.message : "Unknown auth error";
        logger.warn("AQAR_PRICING_SESSION_WARN", {
          error: message,
          correlationId,
        });
      }
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || undefined;
    const neighborhood = searchParams.get("neighborhood") || undefined;
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get("propertyType"),
      Object.values(PropertyType),
    );
    const intent = sanitizeEnum<ListingIntent>(
      searchParams.get("intent"),
      Object.values(ListingIntent),
    );

    const insights = await PricingInsightsService.getInsights({
      city,
      neighborhood,
      propertyType,
      intent,
      orgId: user?.orgId,
      correlationId,
    });

    return NextResponse.json(insights);
  } catch (error) {
    logger.error("AQAR_PRICING_GET_FAILED", {
      correlationId,
      error: (error as Error)?.message ?? String(error),
    });
    return NextResponse.json(
      { error: "Unable to compute pricing insights", correlationId },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    await getSessionUser(request); // require auth for recalculation
    const { data: body, error: parseError } = await parseBodySafe<{ listingId?: string }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body", correlationId },
        { status: 400 },
      );
    }
    const listingId =
      typeof body.listingId === "string" ? body.listingId : undefined;
    if (!listingId || !isValidObjectIdSafe(listingId)) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 },
      );
    }
    const pricingInsights =
      await PricingInsightsService.updateListingInsights(listingId);
    if (!pricingInsights) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ pricingInsights, correlationId });
  } catch (error) {
    logger.error("AQAR_PRICING_POST_FAILED", {
      correlationId,
      error: (error as Error)?.message ?? String(error),
    });
    return NextResponse.json(
      { error: "Unable to refresh pricing insights", correlationId },
      { status: 500 },
    );
  }
}
