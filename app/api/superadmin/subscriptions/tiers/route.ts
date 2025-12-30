/**
 * @fileoverview Superadmin Subscription Tiers API
 * @description CRUD for subscription pricing tiers
 * @route GET/POST /api/superadmin/subscriptions/tiers
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/subscriptions/tiers
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Default tiers for when no database tiers exist
const DEFAULT_TIERS = [
  {
    _id: "tier_free",
    name: "free",
    displayName: "Free",
    description: "Get started with basic features",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "SAR",
    features: ["Up to 3 users", "Basic support", "5GB storage"],
    limits: { users: 3, storage: 5, apiCalls: 1000 },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tier_basic",
    name: "basic",
    displayName: "Basic",
    description: "Perfect for small teams",
    monthlyPrice: 99,
    annualPrice: 990,
    currency: "SAR",
    features: ["Up to 10 users", "Email support", "25GB storage", "Basic analytics"],
    limits: { users: 10, storage: 25, apiCalls: 10000 },
    isActive: true,
    isPopular: false,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tier_pro",
    name: "pro",
    displayName: "Professional",
    description: "For growing businesses",
    monthlyPrice: 299,
    annualPrice: 2990,
    currency: "SAR",
    features: ["Up to 50 users", "Priority support", "100GB storage", "Advanced analytics", "API access"],
    limits: { users: 50, storage: 100, apiCalls: 100000 },
    isActive: true,
    isPopular: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "tier_enterprise",
    name: "enterprise",
    displayName: "Enterprise",
    description: "Custom solutions for large organizations",
    monthlyPrice: 999,
    annualPrice: 9990,
    currency: "SAR",
    features: ["Unlimited users", "24/7 support", "Unlimited storage", "Custom integrations", "Dedicated account manager"],
    limits: { users: -1, storage: -1, apiCalls: -1 },
    isActive: true,
    isPopular: false,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * GET /api/superadmin/subscriptions/tiers
 * List all subscription tiers
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

    // TODO: Implement actual tier storage model
    // For now, return default tiers
    // In a real implementation, you'd query a SubscriptionTier model

    return NextResponse.json(
      { tiers: DEFAULT_TIERS },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription Tiers] Error fetching tiers", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch subscription tiers" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/subscriptions/tiers
 * Create a new subscription tier
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

    const body = await request.json();
    
    // TODO: Implement actual tier creation
    // For now, return a mock created tier
    const newTier = {
      _id: `tier_${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.info("[Superadmin Subscription Tiers] Tier created", {
      tierId: newTier._id,
      name: newTier.name,
      createdBy: session.username,
    });

    return NextResponse.json(
      { tier: newTier, message: "Tier created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Subscription Tiers] Error creating tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
