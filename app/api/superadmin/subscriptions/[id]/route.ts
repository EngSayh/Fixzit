/**
 * @fileoverview Superadmin Individual Subscription API
 * @description GET/PUT/DELETE for individual subscription management
 * @route GET /api/superadmin/subscriptions/[id] - Get subscription details
 * @route PUT /api/superadmin/subscriptions/[id] - Update subscription
 * @route DELETE /api/superadmin/subscriptions/[id] - Cancel subscription
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import Subscription from "@/server/models/Subscription";
import { Organization } from "@/server/models/Organization";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Validation schema for subscription updates
const UpdateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "INCOMPLETE"]).optional(),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  amount: z.number().min(0).optional(),
  seats: z.number().int().min(1).optional(),
  nextBillingDate: z.string().datetime().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  autoRenew: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/superadmin/subscriptions/[id]
 * Get detailed subscription information
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-sub:get",
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

    const { id } = await params;
    if (!id || id.length < 12) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const subscription = await Subscription.findById(id)
      .populate("tenant_id", "name code type status subscription")
      .populate("owner_user_id", "email firstName lastName")
      .lean();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Transform to detailed format
    const org = subscription.tenant_id as { 
      _id?: string; 
      name?: string; 
      code?: string; 
      type?: string;
      subscription?: { plan?: string; status?: string };
    } | null;
    
    const owner = subscription.owner_user_id as { 
      _id?: string; 
      email?: string; 
      firstName?: string; 
      lastName?: string;
    } | null;

    return NextResponse.json({
      success: true,
      subscription: {
        _id: subscription._id.toString(),
        tenantId: org?._id?.toString() || "",
        tenantName: org?.name || "Unknown",
        tenantCode: org?.code || null,
        tenantType: org?.type || null,
        tenantPlan: org?.subscription?.plan || null,
        ownerId: owner?._id?.toString() || null,
        ownerEmail: owner?.email || null,
        ownerName: owner ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() : null,
        subscriberType: subscription.subscriber_type,
        modules: subscription.modules || [],
        seats: subscription.seats,
        billingCycle: subscription.billing_cycle?.toLowerCase(),
        currency: subscription.currency,
        amount: subscription.amount,
        status: subscription.status?.toLowerCase(),
        nextBillingDate: subscription.next_billing_date,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        billingHistory: subscription.billing_history || [],
        tap: subscription.tap ? {
          customerId: subscription.tap.customerId,
          hasCard: !!subscription.tap.cardId,
        } : null,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Subscription] Error fetching subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/subscriptions/[id]
 * Update subscription (status, plan, dates, etc.)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-sub:put",
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

    const { id } = await params;
    if (!id || id.length < 12) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { data: body, error: parseError } = await parseBodySafe(request, {
      logPrefix: "[Superadmin:Subscription]",
    });
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = UpdateSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Build update object
    const update: Record<string, unknown> = {};
    const data = validation.data;

    if (data.status) update.status = data.status;
    if (data.billingCycle) update.billing_cycle = data.billingCycle.toUpperCase();
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.seats) update.seats = data.seats;
    if (data.nextBillingDate) update.next_billing_date = new Date(data.nextBillingDate);
    if (data.currentPeriodEnd) update.current_period_end = new Date(data.currentPeriodEnd);
    if (data.notes !== undefined) update.admin_notes = data.notes;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Subscription] Subscription updated", {
      subscriptionId: id,
      updates: Object.keys(update),
      by: session.username,
    });

    // Also update organization subscription status if status changed
    if (data.status && subscription.tenant_id) {
      // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant org update
      await Organization.updateOne(
        { _id: subscription.tenant_id },
        { $set: { "subscription.status": data.status } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
      subscription: {
        _id: subscription._id.toString(),
        status: subscription.status,
        billingCycle: subscription.billing_cycle,
        amount: subscription.amount,
        seats: subscription.seats,
        nextBillingDate: subscription.next_billing_date,
      },
    }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Subscription] Error updating subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/subscriptions/[id]
 * Cancel (soft-delete) subscription
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-sub:delete",
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

    const { id } = await params;
    if (!id || id.length < 12) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Soft-cancel: set status to CANCELED
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: "CANCELED",
          canceled_at: new Date(),
          canceled_by: session.username,
        } 
      },
      { new: true }
    ).lean();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.warn("[Superadmin:Subscription] Subscription canceled", {
      subscriptionId: id,
      tenantId: subscription.tenant_id?.toString(),
      by: session.username,
    });

    // Update organization subscription status
    if (subscription.tenant_id) {
      // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant org update
      await Organization.updateOne(
        { _id: subscription.tenant_id },
        { $set: { "subscription.status": "CANCELLED" } }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
    }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[Superadmin:Subscription] Error canceling subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
