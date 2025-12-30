/**
 * @fileoverview Superadmin Pricebooks API
 * @description List and create pricebook configurations
 * @route GET, POST /api/superadmin/billing/pricebooks
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/billing/pricebooks
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import PriceBook from "@/server/models/PriceBook";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

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

    const body = await request.json();
    const pricebook = await PriceBook.create(body);

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
