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
import { SubscriptionTier } from "@/server/models/SubscriptionTier";
import { parseBodySafe } from "@/lib/api/parse-body";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

// Zod schema for tier creation/update
const TierLimitsSchema = z.object({
  users: z.number().default(-1),
  storage: z.number().default(-1),
  apiCalls: z.number().default(-1),
  properties: z.number().default(-1),
  workOrders: z.number().default(-1),
}).partial();

const CreateTierSchema = z.object({
  name: z.enum(["free", "basic", "pro", "enterprise", "custom"]),
  displayName: z.string().min(1).max(100),
  displayNameAr: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  descriptionAr: z.string().max(500).optional(),
  monthlyPrice: z.number().min(0).default(0),
  annualPrice: z.number().min(0).default(0),
  currency: z.string().regex(/^[A-Z]{3}$/).default("SAR"),
  features: z.array(z.string()).default([]),
  featuresAr: z.array(z.string()).default([]),
  limits: TierLimitsSchema.optional(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

// Default tiers to seed if collection is empty
const DEFAULT_TIERS = [
  {
    name: "free",
    displayName: "Free",
    displayNameAr: "مجاني",
    description: "Get started with basic features",
    descriptionAr: "ابدأ مع الميزات الأساسية",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "SAR",
    features: ["Up to 3 users", "Basic support", "5GB storage"],
    featuresAr: ["حتى 3 مستخدمين", "دعم أساسي", "5 جيجابايت تخزين"],
    limits: { users: 3, storage: 5, apiCalls: 1000, properties: 5, workOrders: 50 },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: "basic",
    displayName: "Basic",
    displayNameAr: "أساسي",
    description: "Perfect for small teams",
    descriptionAr: "مثالي للفرق الصغيرة",
    monthlyPrice: 99,
    annualPrice: 990,
    currency: "SAR",
    features: ["Up to 10 users", "Email support", "25GB storage", "Basic analytics"],
    featuresAr: ["حتى 10 مستخدمين", "دعم بالبريد الإلكتروني", "25 جيجابايت تخزين", "تحليلات أساسية"],
    limits: { users: 10, storage: 25, apiCalls: 10000, properties: 20, workOrders: 200 },
    isActive: true,
    isPopular: false,
    sortOrder: 2,
  },
  {
    name: "pro",
    displayName: "Professional",
    displayNameAr: "احترافي",
    description: "For growing businesses",
    descriptionAr: "للشركات الناشئة",
    monthlyPrice: 299,
    annualPrice: 2990,
    currency: "SAR",
    features: ["Up to 50 users", "Priority support", "100GB storage", "Advanced analytics", "API access"],
    featuresAr: ["حتى 50 مستخدم", "دعم ذو أولوية", "100 جيجابايت تخزين", "تحليلات متقدمة", "وصول API"],
    limits: { users: 50, storage: 100, apiCalls: 100000, properties: 100, workOrders: 1000 },
    isActive: true,
    isPopular: true,
    sortOrder: 3,
  },
  {
    name: "enterprise",
    displayName: "Enterprise",
    displayNameAr: "مؤسسات",
    description: "Custom solutions for large organizations",
    descriptionAr: "حلول مخصصة للمؤسسات الكبيرة",
    monthlyPrice: 999,
    annualPrice: 9990,
    currency: "SAR",
    features: ["Unlimited users", "24/7 support", "Unlimited storage", "Custom integrations", "Dedicated account manager"],
    featuresAr: ["مستخدمين غير محدود", "دعم 24/7", "تخزين غير محدود", "تكاملات مخصصة", "مدير حساب مخصص"],
    limits: { users: -1, storage: -1, apiCalls: -1, properties: -1, workOrders: -1 },
    isActive: true,
    isPopular: false,
    sortOrder: 4,
  },
];

/**
 * Seed default tiers if collection is empty
 */
async function seedDefaultTiersIfEmpty(): Promise<void> {
  // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide subscription tiers
  const count = await SubscriptionTier.countDocuments({});
  if (count === 0) {
    logger.info("[SubscriptionTiers] Seeding default tiers");
    await SubscriptionTier.insertMany(DEFAULT_TIERS);
  }
}

/**
 * GET /api/superadmin/subscriptions/tiers
 * List all subscription tiers from database
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-tiers:get",
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

    await connectDb();
    
    // Seed defaults if empty
    await seedDefaultTiersIfEmpty();

    // Query all tiers sorted by sortOrder
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide subscription tiers
    const tiers = await SubscriptionTier.find({})
      .sort({ sortOrder: 1 })
      .lean();

    logger.debug("[Superadmin:Tiers] Fetched tiers", {
      count: tiers.length,
      by: session.username,
    });

    return NextResponse.json(
      { tiers },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Tiers] Error fetching tiers", {
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
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-tiers:post",
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

    const { data: body, error: parseError } = await parseBodySafe(request, {
      logPrefix: "[Superadmin:Tiers]",
    });
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validation = CreateTierSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check for duplicate name
    // eslint-disable-next-line local/require-tenant-scope, local/require-lean -- SUPER_ADMIN: Platform-wide, needs document for creation check
    const existing = await SubscriptionTier.findOne({ name: validation.data.name });
    if (existing) {
      return NextResponse.json(
        { error: `Tier with name '${validation.data.name}' already exists` },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    const tier = await SubscriptionTier.create(validation.data);

    logger.info("[Superadmin:Tiers] Tier created", {
      tierId: tier._id,
      name: tier.name,
      by: session.username,
    });

    return NextResponse.json(
      { tier, message: "Tier created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Tiers] Error creating tier", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create subscription tier" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
