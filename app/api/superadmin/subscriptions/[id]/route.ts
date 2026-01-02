/**
 * @fileoverview Superadmin Subscription Management API
 * @description Get, modify, or cancel individual subscriptions
 * @route GET/PATCH/DELETE /api/superadmin/subscriptions/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/[id]
 * @since FEAT-0029, FEAT-0030 (Subscription Plan Change & Cancellation)
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import Subscription from "@/server/models/Subscription";
import {
  changePlan,
  cancelSubscription,
} from "@/server/services/subscriptionBillingService";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/superadmin/subscriptions/[id]
 * Get a single subscription by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    await connectDb();

    const subscription = await Subscription.findById(id)
      .populate("tenant_id", "name slug")
      .populate("price_book_id", "name")
      .lean();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    const org = subscription.tenant_id as { name?: string; slug?: string } | null;
    const priceBook = subscription.price_book_id as { name?: string } | null;

    return NextResponse.json(
      {
        subscription: {
          _id: subscription._id.toString(),
          tenantId: subscription.tenant_id?.toString() || "",
          tenantName: org?.name || org?.slug || "Unknown",
          tierId: subscription.price_book_id?.toString() || "",
          tierName: priceBook?.name || subscription.subscriber_type || "Standard",
          billingCycle: subscription.billing_cycle?.toLowerCase() || "monthly",
          status: subscription.status?.toLowerCase() || "active",
          startDate: subscription.createdAt,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          nextBillingDate: subscription.next_billing_date,
          amount: subscription.amount || 0,
          currency: subscription.currency || "SAR",
          seats: subscription.seats || 1,
          modules: subscription.modules || [],
          autoRenew: subscription.status === "ACTIVE",
          metadata: subscription.metadata,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription] Error fetching subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PATCH /api/superadmin/subscriptions/[id]
 * Update subscription - change plan or cancel
 *
 * @body action - "change_plan" | "cancel"
 * @body newPriceBookId - Required for change_plan action
 * @body immediate - Apply immediately (default: false)
 * @body newSeats - Optional new seat count
 * @body newBillingCycle - Optional new billing cycle
 * @body cancelAtPeriodEnd - For cancel action, whether to cancel at period end (default: true)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { action } = body;

    if (!action || !["change_plan", "cancel"].includes(action as string)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'change_plan' or 'cancel'" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    let updatedSubscription;

    if (action === "change_plan") {
      const { newPriceBookId, immediate, newSeats, newBillingCycle } = body;

      if (!newPriceBookId || typeof newPriceBookId !== "string") {
        return NextResponse.json(
          { error: "newPriceBookId is required for plan change" },
          { status: 400, headers: ROBOTS_HEADER }
        );
      }

      try {
        updatedSubscription = await changePlan(id, newPriceBookId, {
          immediate: Boolean(immediate),
          newSeats: typeof newSeats === "number" ? newSeats : undefined,
          newBillingCycle:
            newBillingCycle === "MONTHLY" || newBillingCycle === "ANNUAL"
              ? newBillingCycle
              : undefined,
        });

        logger.info("[Superadmin Subscription] Plan changed", {
          subscriptionId: id,
          newPriceBookId,
          immediate,
          admin: session.username,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to change plan",
          },
          { status: 400, headers: ROBOTS_HEADER }
        );
      }
    } else if (action === "cancel") {
      const { cancelAtPeriodEnd = true } = body;

      try {
        updatedSubscription = await cancelSubscription(
          id,
          Boolean(cancelAtPeriodEnd)
        );

        if (!updatedSubscription) {
          return NextResponse.json(
            { error: "Subscription not found" },
            { status: 404, headers: ROBOTS_HEADER }
          );
        }

        logger.info("[Superadmin Subscription] Subscription canceled", {
          subscriptionId: id,
          cancelAtPeriodEnd,
          admin: session.username,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to cancel subscription",
          },
          { status: 400, headers: ROBOTS_HEADER }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          action === "change_plan"
            ? "Plan changed successfully"
            : "Subscription canceled successfully",
        subscription: {
          _id: updatedSubscription._id.toString(),
          status: updatedSubscription.status?.toLowerCase(),
          amount: updatedSubscription.amount,
          seats: updatedSubscription.seats,
          billingCycle: updatedSubscription.billing_cycle?.toLowerCase(),
          metadata: updatedSubscription.metadata,
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription] Error updating subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
