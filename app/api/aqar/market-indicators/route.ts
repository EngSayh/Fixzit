/**
 * @fileoverview Market Indicators API Routes
 * @description Real estate price intelligence and market trends.
 * 
 * @module api/aqar/market-indicators
 * @requires Authenticated user
 * 
 * @endpoints
 * - GET /api/aqar/market-indicators - Get price trends and location data
 * - POST /api/aqar/market-indicators - Record new price data (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { MarketIndicator, PropertyType, TransactionType } from "@/server/models/aqar/MarketIndicator";
import { connectMongo as connectDB } from "@/lib/db/mongoose";
import { z } from "zod";

// ============================================================================
// VALIDATION
// ============================================================================

const GetIndicatorsSchema = z.object({
  city: z.string().min(1).optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  property_type: z.enum(Object.values(PropertyType) as [string, ...string[]]).optional(),
  transaction_type: z.enum(Object.values(TransactionType) as [string, ...string[]]).optional(),
  rooms: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateIndicatorSchema = z.object({
  city: z.string().min(1),
  city_ar: z.string().min(1),
  district: z.string().optional(),
  district_ar: z.string().optional(),
  neighborhood: z.string().optional(),
  neighborhood_ar: z.string().optional(),
  property_type: z.enum(Object.values(PropertyType) as [string, ...string[]]),
  transaction_type: z.enum(Object.values(TransactionType) as [string, ...string[]]),
  rooms: z.number().int().min(0).optional(),
  period: z.string().regex(/^H[12] \d{4}$/, "Format: H1 2025 or H2 2024"),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  average_price: z.number().positive(),
  median_price: z.number().positive(),
  min_price: z.number().positive(),
  max_price: z.number().positive(),
  sample_size: z.number().int().positive(),
  price_change_pct: z.number(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/aqar/market-indicators
 * Get price trends and market data
 */
export async function GET(request: NextRequest) {
  enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "market:get" });

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      city: searchParams.get("city") || undefined,
      district: searchParams.get("district") || undefined,
      neighborhood: searchParams.get("neighborhood") || undefined,
      property_type: searchParams.get("property_type") || undefined,
      transaction_type: searchParams.get("transaction_type") || undefined,
      rooms: searchParams.get("rooms") || undefined,
      limit: searchParams.get("limit") || "20",
    };

    const validation = GetIndicatorsSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { city, district, neighborhood, property_type, transaction_type, rooms, limit } = validation.data;

    // If no city specified, return available locations
    if (!city) {
      const [cities, districts, neighborhoods] = await Promise.all([
        MarketIndicator.distinct("city"),
        MarketIndicator.distinct("district"),
        MarketIndicator.distinct("neighborhood"),
      ]);
      return NextResponse.json({
        type: "locations",
        data: {
          cities: cities.filter(Boolean),
          districts: districts.filter(Boolean),
          neighborhoods: neighborhoods.filter(Boolean),
        },
      });
    }

    // Build filter
    const filter: Record<string, unknown> = { city };
    if (district) filter.district = district;
    if (neighborhood) filter.neighborhood = neighborhood;
    if (property_type) filter.property_type = property_type;
    if (transaction_type) filter.transaction_type = transaction_type;
    if (rooms !== undefined) filter.rooms = rooms;

    // Get price history
    // NO_TENANT: Market indicators are platform-wide reference data, not tenant-specific
    const indicators = await MarketIndicator.find(filter)
      .sort({ period_start: -1 })
      .limit(limit)
      .lean();

    // Calculate summary if data exists
    let summary = null;
    if (indicators.length > 0) {
      const latest = indicators[0];
      const previous = indicators[1];
      summary = {
        current_period: latest.period,
        average_price: latest.average_price,
        median_price: latest.median_price,
        price_range: { min: latest.min_price, max: latest.max_price },
        sample_size: latest.sample_size,
        trend: latest.price_change_pct,
        trend_direction: latest.price_change_pct > 0 ? "up" : latest.price_change_pct < 0 ? "down" : "stable",
        vs_previous: previous ? {
          period: previous.period,
          change_pct: latest.price_change_pct,
        } : null,
      };
    }

    return NextResponse.json({
      type: "indicators",
      summary,
      data: indicators,
      count: indicators.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[MarketIndicators GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market indicators" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/aqar/market-indicators
 * Record new price data (admin only)
 */
export async function POST(request: NextRequest) {
  enforceRateLimit(request, { requests: 20, windowMs: 60_000, keyPrefix: "market:create" });

  try {
    const session = await auth();
    const userRole = session?.user?.role;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create market data
    const allowedRoles = ["admin", "superadmin", "ADMIN", "SUPER_ADMIN"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const validation = CreateIndicatorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check for duplicate period/location combo
    // eslint-disable-next-line local/require-tenant-scope -- Market indicators are platform-wide reference data
    const existing = await MarketIndicator.findOne({
      city: data.city,
      district: data.district || null,
      neighborhood: data.neighborhood || null,
      property_type: data.property_type,
      transaction_type: data.transaction_type,
      rooms: data.rooms,
      period: data.period,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "Indicator already exists for this period and criteria" },
        { status: 409 }
      );
    }

    // eslint-disable-next-line local/require-tenant-scope -- Market indicators are platform-wide reference data
    const indicator = await MarketIndicator.create({
      ...data,
      period_start: new Date(data.period_start),
      period_end: new Date(data.period_end),
    });

    return NextResponse.json(
      { 
        message: "Market indicator created",
        data: indicator,
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- Server-side error logging
    console.error("[MarketIndicators POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create market indicator" },
      { status: 500 }
    );
  }
}
