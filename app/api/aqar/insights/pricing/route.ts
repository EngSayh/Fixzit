import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSessionUser,
  UnauthorizedError,
} from "@/server/middleware/withAuthRbac";
import { PricingInsightsService } from "@/services/aqar/pricing-insights-service";
import { ListingIntent, PropertyType } from "@/models/aqar/Listing";
import { isValidObjectIdSafe } from "@/lib/api/validation";

export const runtime = "nodejs";

const sanitizeEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined =>
  value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;

export async function GET(request: NextRequest) {
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
    const body = await request.json();
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
