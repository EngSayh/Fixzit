/**
 * @fileoverview Superadmin User Logs API
 * @description Retrieves user activity logs for superadmin portal
 * @route GET /api/superadmin/user-logs
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/user-logs
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { AuditLogModel } from "@/server/models/AuditLog";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/user-logs
 * Retrieves user activity logs with pagination and date range filtering
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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Calculate date filter based on range
    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Query audit logs
    const query = {
      timestamp: { $gte: startDate },
    };

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    // Transform logs to expected format
    const transformedLogs = logs.map((log) => ({
      _id: log._id.toString(),
      userId: log.userId?.toString() || "system",
      userName: log.userName || log.userEmail || "Unknown",
      userEmail: log.userEmail || "",
      action: log.action || "unknown",
      entityType: log.entityType || "",
      entityId: log.entityId || "",
      description: log.metadata?.reason || log.metadata?.comment || "",
      ipAddress: log.context?.ipAddress || "",
      userAgent: log.context?.userAgent || "",
      timestamp: log.timestamp,
      success: log.result?.success !== false,
      metadata: log.metadata || {},
    }));

    return NextResponse.json(
      {
        logs: transformedLogs,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin User Logs] Error fetching logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch user logs" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
