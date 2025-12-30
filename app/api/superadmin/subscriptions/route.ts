/**
 * @fileoverview Superadmin Subscriptions API
 * @description List tenant subscriptions
 * @route GET /api/superadmin/subscriptions
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions
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
 * GET /api/superadmin/subscriptions
 * List all tenant subscriptions
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");

    // Build query
    const query: Record<string, unknown> = {};
    if (status && status !== "all") {
      query.status = status.toUpperCase();
    }

    // Fetch subscriptions with organization info
    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate("tenant_id", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    // Transform to expected format
    const transformedSubscriptions = subscriptions.map((sub) => {
      const org = sub.tenant_id as { name?: string; slug?: string } | null;
      return {
        _id: sub._id.toString(),
        tenantId: sub.tenant_id?.toString() || "",
        tenantName: org?.name || org?.slug || "Unknown",
        tierId: sub.price_book_id?.toString() || "",
        tierName: sub.subscriber_type || "Standard",
        billingCycle: sub.billing_cycle?.toLowerCase() || "monthly",
        status: sub.status?.toLowerCase() || "active",
        startDate: sub.createdAt,
        endDate: sub.current_period_end,
        amount: sub.amount || 0,
        currency: sub.currency || "SAR",
        autoRenew: sub.status === "ACTIVE",
        createdAt: sub.createdAt,
      };
    });

    return NextResponse.json(
      {
        subscriptions: transformedSubscriptions,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscriptions] Error fetching subscriptions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
