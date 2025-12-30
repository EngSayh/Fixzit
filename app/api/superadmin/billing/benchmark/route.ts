/**
 * @fileoverview Superadmin Benchmarks API
 * @description Retrieve billing benchmarks for pricing comparison
 * @route GET /api/superadmin/billing/benchmark
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/billing/benchmark
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import Benchmark from "@/server/models/Benchmark";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/billing/benchmark
 * List all benchmarks
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

    // eslint-disable-next-line local/require-tenant-scope -- Platform-wide benchmarks for superadmin
    const benchmarks = await Benchmark.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { benchmarks },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Benchmarks] Error fetching benchmarks", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch benchmarks" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
