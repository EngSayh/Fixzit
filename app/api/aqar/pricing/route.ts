import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/db/mongoose";
import { ListingIntent, PropertyType } from "@/server/models/aqar/Listing";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";
import { logger } from "@/lib/logger";
import { PricingInsightsService } from "@/services/aqar/pricing-insights-service";

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
    // Rate limit based on IP for public endpoint
    const ip = getClientIP(req);
    const rl = await smartRateLimit(`aqar:pricing:${ip}`, 30, 60_000); // 30 requests per minute
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    // Support both old (cityId/neighborhoodId) and new (city/neighborhood) param names
    const city = searchParams.get("city") || searchParams.get("cityId") || undefined;
    if (!city) {
      return NextResponse.json(
        { ok: false, error: "city is required" },
        { status: 400 },
      );
    }
    const neighborhood = searchParams.get("neighborhood") || searchParams.get("neighborhoodId") || undefined;
    const propertyType = sanitizeEnum<PropertyType>(
      searchParams.get("propertyType"),
      Object.values(PropertyType),
    );
    const intent =
      sanitizeEnum<ListingIntent>(
        searchParams.get("intent"),
        Object.values(ListingIntent),
      ) || ListingIntent.BUY;

    const insights = await PricingInsightsService.getInsights({
      city,
      neighborhood,
      propertyType,
      intent,
    });

    return NextResponse.json({ ok: true, insight: insights });
  } catch (err) {
    logger.error("GET /api/aqar/pricing error", { error: err });
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
