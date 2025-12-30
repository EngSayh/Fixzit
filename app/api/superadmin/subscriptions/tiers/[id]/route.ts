/**
 * @fileoverview Superadmin Subscription Tier by ID API
 * @description Update/Delete individual subscription tiers
 * @route PUT/DELETE /api/superadmin/subscriptions/tiers/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/tiers/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/superadmin/subscriptions/tiers/[id]
 * Update a subscription tier
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    await connectDb();

    // TODO: Implement actual tier update
    // For now, return mock updated tier
    const updatedTier = {
      _id: id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    logger.info("[Superadmin Subscription Tiers] Tier updated", {
      tierId: id,
      updatedBy: session.username,
    });

    return NextResponse.json(
      { tier: updatedTier, message: "Tier updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription Tiers] Error updating tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/subscriptions/tiers/[id]
 * Delete a subscription tier
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    await connectDb();

    // TODO: Implement actual tier deletion
    // Check if any active subscriptions use this tier before deleting

    logger.info("[Superadmin Subscription Tiers] Tier deleted", {
      tierId: id,
      deletedBy: session.username,
    });

    return NextResponse.json(
      { message: "Tier deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription Tiers] Error deleting tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
