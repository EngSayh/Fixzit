/**
 * @fileoverview Superadmin Catalog Services API
 * @description GET/POST facility management services
 * @route GET/POST /api/superadmin/catalog/services
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/catalog/services
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { FMService } from "@/server/models/FMService";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const PRICING_TYPES = ["fixed", "hourly", "sqm", "unit", "custom", "quote"] as const;

const PricingSchema = z.object({
  type: z.enum(PRICING_TYPES),
  basePrice: z.number().min(0).optional(),
  currency: z.string().max(3).default("SAR"),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  unitAr: z.string().max(50).optional(),
});

const DurationSchema = z.object({
  estimated: z.number().min(1),
  min: z.number().min(1).optional(),
  max: z.number().min(1).optional(),
});

const AvailabilitySchema = z.object({
  enabled: z.boolean().optional(),
  schedule: z.object({
    days: z.array(z.number().min(0).max(6)).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
  requiresBooking: z.boolean().optional(),
  leadTime: z.number().min(0).optional(),
});

const CreateServiceSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  category: z.string().min(1).max(100),
  categoryAr: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  subcategoryAr: z.string().max(100).optional(),
  icon: z.string().max(100).optional(),
  image: z.string().url().max(500).optional(),
  pricing: PricingSchema,
  duration: DurationSchema.optional(),
  availability: AvailabilitySchema.optional(),
  requirements: z.array(z.string().max(500)).max(20).optional(),
  requirementsAr: z.array(z.string().max(500)).max(20).optional(),
  includes: z.array(z.string().max(200)).max(20).optional(),
  includesAr: z.array(z.string().max(200)).max(20).optional(),
  excludes: z.array(z.string().max(200)).max(20).optional(),
  excludesAr: z.array(z.string().max(200)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
});

// Default services to seed
const DEFAULT_FM_SERVICES = [
  {
    name: "AC Maintenance",
    nameAr: "صيانة المكيفات",
    description: "Professional air conditioning maintenance and repair services",
    descriptionAr: "خدمات صيانة وإصلاح أنظمة التكييف المركزي والسبليت",
    category: "HVAC",
    categoryAr: "التكييف والتبريد",
    icon: "ac_unit",
    pricing: { type: "fixed" as const, basePrice: 150, currency: "SAR" },
    duration: { estimated: 60 },
    availability: { enabled: true, requiresBooking: true, leadTime: 24 },
    tags: ["ac", "hvac", "maintenance", "cooling"],
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: "Plumbing Services",
    nameAr: "خدمات السباكة",
    description: "Expert plumbing repair and installation services",
    descriptionAr: "خدمات إصلاح وتركيب السباكة المتخصصة",
    category: "Plumbing",
    categoryAr: "السباكة",
    icon: "plumbing",
    pricing: { type: "hourly" as const, basePrice: 100, currency: "SAR" },
    duration: { estimated: 90, min: 30, max: 180 },
    availability: { enabled: true, requiresBooking: true, leadTime: 4 },
    tags: ["plumbing", "water", "pipes", "repair"],
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: "Electrical Work",
    nameAr: "أعمال الكهرباء",
    description: "Licensed electrical repairs and installations",
    descriptionAr: "إصلاحات وتركيبات كهربائية مرخصة",
    category: "Electrical",
    categoryAr: "الكهرباء",
    icon: "electrical_services",
    pricing: { type: "hourly" as const, basePrice: 120, currency: "SAR" },
    duration: { estimated: 60 },
    availability: { enabled: true, requiresBooking: true, leadTime: 24 },
    tags: ["electrical", "wiring", "lighting", "power"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Cleaning Services",
    nameAr: "خدمات التنظيف",
    description: "Professional cleaning for homes and offices",
    descriptionAr: "تنظيف احترافي للمنازل والمكاتب",
    category: "Cleaning",
    categoryAr: "التنظيف",
    icon: "cleaning_services",
    pricing: { type: "sqm" as const, basePrice: 5, currency: "SAR", unit: "sqm", unitAr: "متر مربع" },
    duration: { estimated: 120, min: 60, max: 480 },
    availability: { enabled: true, requiresBooking: true, leadTime: 48 },
    tags: ["cleaning", "housekeeping", "sanitization"],
    isActive: true,
    isFeatured: true,
    isPopular: true,
    sortOrder: 4,
  },
  {
    name: "Pest Control",
    nameAr: "مكافحة الحشرات",
    description: "Safe and effective pest control solutions",
    descriptionAr: "حلول آمنة وفعالة لمكافحة الحشرات والقوارض",
    category: "Pest Control",
    categoryAr: "مكافحة الآفات",
    icon: "pest_control",
    pricing: { type: "fixed" as const, basePrice: 200, currency: "SAR" },
    duration: { estimated: 90 },
    availability: { enabled: true, requiresBooking: true, leadTime: 24 },
    tags: ["pest", "insects", "rodents", "fumigation"],
    isActive: true,
    sortOrder: 5,
  },
];

async function seedDefaultServices(): Promise<void> {
  try {
    const existingCount = await FMService.countDocuments();
    if (existingCount > 0) return;

    await FMService.insertMany(DEFAULT_FM_SERVICES, { ordered: false });
    logger.info("[Superadmin:CatalogServices] Seeded default services", {
      count: DEFAULT_FM_SERVICES.length,
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes("duplicate key")) {
      logger.warn("[Superadmin:CatalogServices] Error seeding services", {
        error: error.message,
      });
    }
  }
}

/**
 * GET /api/superadmin/catalog/services
 * List all FM services
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-catalog-services:get",
    requests: 30,
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
    await seedDefaultServices();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");
    const isFeatured = searchParams.get("isFeatured");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (category) {
      query.category = category;
    }
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (isFeatured !== null && isFeatured !== undefined) {
      query.isFeatured = isFeatured === "true";
    }
    if (search) {
      query.$text = { $search: search };
    }

    const services = await FMService.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Get unique categories for filter
    const categories = await FMService.distinct("category");

    return NextResponse.json(
      { services, total: services.length, categories },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:CatalogServices] Error fetching services", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/catalog/services
 * Create a new FM service
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-catalog-services:post",
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

    const body = await request.json();
    const validation = CreateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const service = await FMService.create({
      ...validation.data,
      viewCount: 0,
      bookingCount: 0,
    });

    logger.info("[Superadmin:CatalogServices] Service created", {
      serviceId: service._id.toString(),
      name: service.name,
      category: service.category,
      by: session.username,
    });

    return NextResponse.json(
      { service, message: "Service created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:CatalogServices] Error creating service", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
