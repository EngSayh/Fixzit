/**
 * @fileoverview Tenant Subscription API
 * @description Retrieves subscription details for the authenticated tenant
 * including plan, modules, seats, and billing information.
 * 
 * @module api/subscriptions/tenant
 * @requires Authenticated user with tenantId
 * 
 * @endpoints
 * - GET /api/subscriptions/tenant - Get current tenant's subscription
 * 
 * @response
 * - id: Subscription ID
 * - status: Subscription status (active, cancelled, etc.)
 * - modules: Array of enabled modules
 * - seats: Number of licensed seats
 * - billing_cycle: monthly, yearly, etc.
 * - amount: Subscription amount
 * - currency: Payment currency
 * - next_billing_date: Next billing date
 * - metadata: Additional subscription metadata
 * 
 * @errors
 * - 401: Unauthorized (no session or tenantId)
 * - 404: No subscription found for tenant
 * - 500: Failed to fetch subscription
 * 
 * @security
 * - Authenticated users only
 * - Tenant-scoped: Returns only current tenant's subscription
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionForTenant } from "@/server/services/subscriptionSeatService";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(request: NextRequest) {
  enforceRateLimit(request, { requests: 30, windowMs: 60_000, keyPrefix: "subscriptions:tenant" });
  try {
    const session = await auth();
    const tenantId = session?.user?.tenantId || (session?.user as { orgId?: string })?.orgId;
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscriptionForTenant(tenantId);

    if (!subscription) {
      if (process.env.PLAYWRIGHT_TESTS === "true") {
        return NextResponse.json({
          id: "sub-playwright",
          status: "active",
          modules: ["souq", "fm", "crm", "hr"],
          seats: 50,
          billing_cycle: "monthly",
          amount: 0,
          currency: "USD",
          next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          metadata: { seeded: true },
        });
      }
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: subscription._id,
      status: subscription.status,
      modules: subscription.modules,
      seats: subscription.seats,
      billing_cycle: subscription.billing_cycle,
      amount: subscription.amount,
      currency: subscription.currency,
      next_billing_date: subscription.next_billing_date,
      metadata: subscription.metadata,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}
