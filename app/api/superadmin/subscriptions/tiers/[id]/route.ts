/**
 * @fileoverview Superadmin Subscription Tier by ID API
 * @description Update/Delete individual subscription tiers
 * @route GET/PUT/DELETE /api/superadmin/subscriptions/tiers/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/tiers/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { SubscriptionTier } from "@/server/models/SubscriptionTier";
import Subscription from "@/server/models/Subscription";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { isValidObjectId } from "@/lib/utils/objectid";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Zod schema for tier update (all fields optional)
const UpdateTierSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  displayNameAr: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  descriptionAr: z.string().max(500).optional(),
  monthlyPrice: z.number().min(0).optional(),
  annualPrice: z.number().min(0).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  features: z.array(z.string()).optional(),
  featuresAr: z.array(z.string()).optional(),
  limits: z.object({
    users: z.number().optional(),
    storage: z.number().optional(),
    apiCalls: z.number().optional(),
    properties: z.number().optional(),
    workOrders: z.number().optional(),
  }).partial().optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number().optional(),
}).strict();

/**
 * GET /api/superadmin/subscriptions/tiers/[id]
 * Get a single subscription tier by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-tier:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid tier ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const tier = await SubscriptionTier.findById(id).lean();

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { tier },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Tier] Error fetching tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/subscriptions/tiers/[id]
 * Update a subscription tier
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-tier:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid tier ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(request, {
      logPrefix: "[Superadmin:Tier:Update]",
    });
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = UpdateTierSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const tier = await SubscriptionTier.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Tier] Tier updated", {
      tierId: id,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { tier, message: "Tier updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Tier] Error updating tier", {
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
 * Delete a subscription tier (soft delete by setting isActive=false)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-tier:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid tier ID format" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if tier exists
    // eslint-disable-next-line local/require-lean -- Needs document for delete operation
    const tier = await SubscriptionTier.findById(id);
    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Check if any active subscriptions use this tier
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide subscription check
    const activeSubscriptionsCount = await Subscription.countDocuments({
      tierId: id,
      status: "ACTIVE",
    });

    // Soft delete by marking inactive
    await SubscriptionTier.findByIdAndUpdate(id, { $set: { isActive: false } });

    logger.info("[Superadmin:Tier] Tier soft-deleted", {
      tierId: id,
      tierName: tier.name,
      activeSubscriptions: activeSubscriptionsCount,
      by: session.username,
    });

    return NextResponse.json(
      { 
        message: "Tier deactivated successfully",
        note: activeSubscriptionsCount > 0 
          ? `Note: ${activeSubscriptionsCount} active subscriptions exist. Tier marked inactive instead of deleted.`
          : undefined,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Tier] Error deleting tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
