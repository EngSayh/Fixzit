/**
 * @fileoverview Superadmin Audit Export API
 * @description Export audit logs
 * @route GET /api/superadmin/audit/export
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/audit/export
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { AuditLogModel } from "@/server/models/AuditLog";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import type { FilterQuery } from "mongoose";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const MAX_EXPORT_DOCS = 10000;

/**
 * GET /api/superadmin/audit/export
 * Export audit logs as JSON
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-audit-export:get",
    requests: 5,
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

    const { searchParams } = request.nextUrl;

    // Filters
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Build query
    const query: FilterQuery<typeof AuditLogModel> = {};

    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;
    if (action) query.action = { $regex: action, $options: "i" };

    // Date range (default to last 30 days if not specified)
    const now = new Date();
    const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    query.timestamp = {};
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      if (!isNaN(startDate.getTime())) {
        query.timestamp.$gte = startDate;
      }
    } else {
      query.timestamp.$gte = defaultStart;
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        query.timestamp.$lte = endDate;
      }
    }

    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(MAX_EXPORT_DOCS)
      .lean();

    logger.info("[Superadmin:Audit:Export] Export completed", {
      count: logs.length,
      by: session.username,
    });

    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        count: logs.length,
        maxDocs: MAX_EXPORT_DOCS,
        logs,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Audit:Export] Export failed", { error });
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
