/**
 * @fileoverview Support Tickets API (Superadmin)
 * @description GET endpoint for retrieving all support tickets across organizations
 * @route GET /api/admin/support-tickets
 * @access Superadmin only
 * @module api/admin/support-tickets
 *
 * @security Platform-wide query (superadmin) - no tenant scope filter required
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";

const COLLECTION = "fm_support_tickets";

/**
 * GET /api/admin/support-tickets
 * Retrieve all support tickets across organizations (superadmin view)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // null = all
    const priority = searchParams.get("priority");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    logger.debug("Support tickets requested by superadmin", {
      superadminUsername: session?.username ?? "unknown",
      status,
      priority,
      limit,
      skip,
    });

    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    // Build filter - NO_TENANT_SCOPE: superadmin has platform-wide access
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    // Get total count for pagination
    const total = await collection.countDocuments(filter);

    // Get tickets with pagination, sorted by newest first
    const tickets = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + tickets.length < total,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch support tickets", { error });
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}
