/**
 * @fileoverview Superadmin Organizations List API
 * @description GET endpoint for listing all organizations with pagination
 * @route GET /api/superadmin/organizations
 * @access Superadmin only
 * @module api/superadmin/organizations
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Organization } from "@/server/models/Organization";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/organizations
 * List all organizations with pagination
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-orgs:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    // Build query
    const query: Record<string, unknown> = {};
    
    if (status) {
      if (status === "active") {
        query["status.isActive"] = true;
      } else if (status === "inactive") {
        query["status.isActive"] = false;
      }
      // "all" means no status filter
    }
    
    if (search) {
      // Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.name = { $regex: escapedSearch, $options: "i" };
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .select("_id orgId name code type status subscription")
        .sort({ "subscription.startDate": -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Organization.countDocuments(query),
    ]);

    logger.info("Superadmin organizations list", {
      username: session.username,
      count: organizations.length,
      total,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      organizations: organizations.map((org) => ({
        id: org._id?.toString() || org.orgId,
        orgId: org.orgId,
        name: org.name,
        code: org.code,
        type: org.type,
        status: org.status?.isActive ? "active" : "inactive",
        subscriptionPlan: org.subscription?.plan || null,
        subscriptionStatus: org.subscription?.status || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("Failed to list organizations", { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return NextResponse.json(
      { error: "Failed to list organizations" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
