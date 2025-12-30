/**
 * @fileoverview Superadmin Tenants/Organizations API
 * @description CRUD endpoints for managing all organizations
 * @route GET/POST /api/superadmin/tenants
 * @access Superadmin only
 * @module api/superadmin/tenants
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { Organization } from "@/server/models/Organization";
import { z } from "zod";

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query schema for listing
const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL", "EXPIRED", "all"]).optional(),
  type: z.enum(["CORPORATE", "GOVERNMENT", "INDIVIDUAL", "NONPROFIT", "STARTUP", "all"]).optional(),
  sortBy: z.enum(["name", "createdAt", "subscriptionStatus", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Create organization schema
const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).optional(),
  type: z.enum(["CORPORATE", "GOVERNMENT", "INDIVIDUAL", "NONPROFIT", "STARTUP"]).default("CORPORATE"),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  country: z.string().default("SA"),
  timezone: z.string().default("Asia/Riyadh"),
  currency: z.string().default("SAR"),
});

/**
 * GET /api/superadmin/tenants
 * List all organizations with pagination, search, and filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsed = listQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, status, type, sortBy, sortOrder } = parsed.data;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: Record<string, unknown> = {};
    
    if (search) {
      // SEC-001: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { code: { $regex: escapedSearch, $options: "i" } },
        { slug: { $regex: escapedSearch, $options: "i" } },
        { "contactEmail": { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.subscriptionStatus = status;
    }

    if (type && type !== "all") {
      filter.type = type;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Execute queries in parallel
    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .select("name code slug type subscriptionStatus complianceStatus contactEmail contactPhone country timezone currency createdAt updatedAt features.maxUsers usage.currentUsers")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Organization.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error("[Superadmin Tenants] Failed to list organizations", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/tenants
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    await connectDb();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const parsed = createOrgSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate name
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-org duplicate check
    const existing = await Organization.findOne({
      $or: [
        { name: data.name },
        ...(data.code ? [{ code: data.code }] : []),
      ],
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "Organization with this name or code already exists" },
        { status: 409 }
      );
    }

    // Create organization
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Creating new tenant org
    const org = await Organization.create({
      ...data,
      subscriptionStatus: "TRIAL",
      complianceStatus: "PENDING_REVIEW",
      createdBy: session.username,
    });

    logger.info("[Superadmin Tenants] Organization created", {
      orgId: org._id,
      name: org.name,
      createdBy: session.username,
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    logger.error("[Superadmin Tenants] Failed to create organization", error as Error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
