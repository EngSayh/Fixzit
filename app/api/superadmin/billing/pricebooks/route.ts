/**
 * @fileoverview Superadmin Pricebooks API
 * @description List and create pricebook configurations
 * @route GET, POST /api/superadmin/billing/pricebooks
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/billing/pricebooks
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import PriceBook from "@/server/models/PriceBook";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Zod schema for price per module
const PricePerModuleSchema = z.object({
  module_key: z.string().min(1),
  monthly_usd: z.number().min(0),
  monthly_sar: z.number().min(0),
});

// Zod schema for seat tier
const SeatTierSchema = z.object({
  min_seats: z.number().int().min(0),
  max_seats: z.number().int().min(0),
  discount_pct: z.number().min(0).max(100).default(0),
  prices: z.array(PricePerModuleSchema).default([]),
});

// Zod schema for pricebook creation
const CreatePriceBookSchema = z.object({
  name: z.string().min(1).max(200),
  currency: z.enum(["USD", "SAR"]).default("USD"),
  effective_from: z.string().datetime().optional().transform((val) => val ? new Date(val) : new Date()),
  active: z.boolean().default(true),
  tiers: z.array(SeatTierSchema).default([]),
});

/**
 * GET /api/superadmin/billing/pricebooks
 * List all pricebooks
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // eslint-disable-next-line local/require-tenant-scope -- Platform-wide pricebook listing for superadmin
    const pricebooks = await PriceBook.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { pricebooks },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Pricebooks] Error fetching pricebooks", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch pricebooks" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/billing/pricebooks
 * Create a new pricebook
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    // Validate request body with Zod schema
    const parseResult = CreatePriceBookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: parseResult.error.flatten().fieldErrors 
        },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const pricebook = await PriceBook.create(parseResult.data);

    return NextResponse.json(
      { pricebook },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Pricebooks] Error creating pricebook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create pricebook" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
