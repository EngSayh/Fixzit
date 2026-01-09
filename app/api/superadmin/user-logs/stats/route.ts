/**
 * @fileoverview Superadmin User Logs Stats API
 * @description User activity statistics
 * @route GET /api/superadmin/user-logs/stats
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/user-logs/stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { AuditLogModel } from "@/server/models/AuditLog";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/user-logs/stats
 * Get user activity statistics
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-user-logs-stats:get",
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

    // Get date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    /* eslint-disable local/require-tenant-scope -- SUPER_ADMIN: Platform-wide audit log stats */
    const [totalLogs, todayLogs, weekLogs, monthLogs, actionBreakdown, uniqueUsersResult, errorLogsResult] = await Promise.all([
      AuditLogModel.countDocuments({}),
      AuditLogModel.countDocuments({ timestamp: { $gte: today } }),
      AuditLogModel.countDocuments({ timestamp: { $gte: weekAgo } }),
      AuditLogModel.countDocuments({ timestamp: { $gte: monthAgo } }),
      AuditLogModel.aggregate([
        { $match: { timestamp: { $gte: weekAgo } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Get unique users in the time period
      AuditLogModel.aggregate([
        { $match: { timestamp: { $gte: weekAgo } } },
        { $group: { _id: "$userId" } },
        { $count: "uniqueUsers" },
      ]),
      // Get error count for error rate calculation
      AuditLogModel.countDocuments({ 
        timestamp: { $gte: weekAgo },
        "result.success": false,
      }),
    ]);
    /* eslint-enable local/require-tenant-scope */

    // Calculate error rate (errors as percentage of week logs)
    const uniqueUsers = uniqueUsersResult[0]?.uniqueUsers ?? 0;
    const errorRate = weekLogs > 0 ? (errorLogsResult / weekLogs) * 100 : 0;

    return NextResponse.json(
      {
        // Top-level stats for UI compatibility (stats.totalLogs, stats.errorRate.toFixed(1), etc.)
        totalLogs,
        todayLogs,
        uniqueUsers,
        errorRate,
        avgSessionDuration: 45, // Placeholder - would need session tracking
        topActions: actionBreakdown.map((a) => ({
          action: a._id,
          count: a.count,
        })),
        // Also include nested stats object for backward compatibility
        stats: {
          total: totalLogs,
          today: todayLogs,
          thisWeek: weekLogs,
          thisMonth: monthLogs,
        },
        actionBreakdown: actionBreakdown.map((a) => ({
          action: a._id,
          count: a.count,
        })),
        generatedAt: new Date().toISOString(),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:UserLogs:Stats] Failed to load stats", { error });
    return NextResponse.json(
      { error: "Failed to load user logs stats" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
