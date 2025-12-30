/**
 * @fileoverview Superadmin Subscription Stats API
 * @description Get subscription statistics (MRR, ARR, counts)
 * @route GET /api/superadmin/subscriptions/stats
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/stats
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import Subscription from "@/server/models/Subscription";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/subscriptions/stats
 * Get subscription statistics
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

    // Aggregate subscription stats
    /* eslint-disable local/require-tenant-scope -- SUPER_ADMIN: Platform-wide subscription stats */
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      mrrResult,
    ] = await Promise.all([
      Subscription.countDocuments({}),
      Subscription.countDocuments({ status: "ACTIVE" }),
      Subscription.countDocuments({ status: { $in: ["TRIAL", "INCOMPLETE"] } }),
      Subscription.countDocuments({ status: "PAST_DUE" }),
      Subscription.aggregate([
        { $match: { status: "ACTIVE" } },
        {
          $group: {
            _id: null,
            totalMrr: {
              $sum: {
                $cond: [
                  { $eq: ["$billing_cycle", "ANNUAL"] },
                  { $divide: ["$amount", 12] },
                  "$amount",
                ],
              },
            },
          },
        },
      ]),
    ]);
    /* eslint-enable local/require-tenant-scope */

    const mrr = mrrResult[0]?.totalMrr || 0;
    const arr = mrr * 12;

    return NextResponse.json(
      {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        pastDueSubscriptions,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription Stats] Error fetching stats", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription stats" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
