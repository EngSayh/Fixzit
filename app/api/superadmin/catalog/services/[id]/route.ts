/**
 * @fileoverview Superadmin Catalog Service by ID API
 * @description GET/PUT/DELETE individual FM service
 * @route GET/PUT/DELETE /api/superadmin/catalog/services/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/catalog/services/[id]
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { FMService } from "@/server/models/FMService";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PRICING_TYPES = ["fixed", "hourly", "sqm", "unit", "custom", "quote"] as const;

const PricingSchema = z.object({
  type: z.enum(PRICING_TYPES).optional(),
  basePrice: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  unitAr: z.string().max(50).optional(),
});

const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  category: z.string().min(1).max(100).optional(),
  categoryAr: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  subcategoryAr: z.string().max(100).optional(),
  icon: z.string().max(100).optional(),
  image: z.string().url().max(500).optional().nullable(),
  pricing: PricingSchema.optional(),
  duration: z.object({
    estimated: z.number().min(1).optional(),
    min: z.number().min(1).optional(),
    max: z.number().min(1).optional(),
  }).optional(),
  availability: z.object({
    enabled: z.boolean().optional(),
    schedule: z.object({
      days: z.array(z.number().min(0).max(6)).optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }).optional(),
    requiresBooking: z.boolean().optional(),
    leadTime: z.number().min(0).optional(),
  }).optional(),
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

/**
 * GET /api/superadmin/catalog/services/[id]
 * Get a specific FM service
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-catalog-service-id:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const service = await FMService.findById(id).lean();
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { service },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:CatalogService] Error fetching service", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/catalog/services/[id]
 * Update an FM service
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-catalog-service-id:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const body = await request.json();
    const validation = UpdateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const service = await FMService.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:CatalogService] Service updated", {
      serviceId: id,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { service, message: "Service updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:CatalogService] Error updating service", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/catalog/services/[id]
 * Delete an FM service
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-catalog-service-id:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if service has bookings (soft-delete recommended)
    const service = await FMService.findById(id).lean();
    if (service && service.bookingCount > 0) {
      // Soft delete by marking inactive
      await FMService.findByIdAndUpdate(id, { isActive: false });
      logger.info("[Superadmin:CatalogService] Service deactivated (has bookings)", {
        serviceId: id,
        bookingCount: service.bookingCount,
        by: session.username,
      });
      return NextResponse.json(
        { message: "Service deactivated (has associated bookings)" },
        { headers: ROBOTS_HEADER }
      );
    }

    const deleted = await FMService.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:CatalogService] Service deleted", {
      serviceId: id,
      name: deleted.name,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Service deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:CatalogService] Error deleting service", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
