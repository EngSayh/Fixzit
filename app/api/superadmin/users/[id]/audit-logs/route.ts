/**
 * @fileoverview Superadmin User Audit Logs API
 * @description Fetch audit logs for a specific user
 * @route GET /api/superadmin/users/[id]/audit-logs
 * @access Superadmin only
 * @module api/superadmin/users/[id]/audit-logs
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { AuditLogModel } from "@/server/models/AuditLog";
import { User } from "@/server/models/User";
import { sanitizeAuditLogs } from "@/lib/audit/middleware";
import { z } from "zod";
import mongoose from "mongoose";

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateRange: z.enum(["today", "7d", "30d", "90d", "all"]).default("30d"),
  errorsOnly: z.coerce.boolean().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/superadmin/users/[id]/audit-logs
 * Get audit logs for a specific user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const { id: userId } = params;

    if (!mongoose.isValidObjectId(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await connectDb();

    // Check if user exists
    const user = await User.findById(userId).select("_id email").lean();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsed = querySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, search, action, entityType, dateRange, errorsOnly, sortOrder } = parsed.data;
    const skip = (page - 1) * limit;

    // Build date filter
    const now = new Date();
    let dateFilter: Date | undefined;

    switch (dateRange) {
      case "today":
        dateFilter = new Date(now);
        dateFilter.setHours(0, 0, 0, 0);
        break;
      case "7d":
        dateFilter = new Date(now);
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case "30d":
        dateFilter = new Date(now);
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case "90d":
        dateFilter = new Date(now);
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      case "all":
      default:
        dateFilter = undefined;
    }

    // Build filter query - SUPER_ADMIN: Cross-org audit log access for investigation
    const filter: Record<string, unknown> = {
      userId: userId,
    };

    if (dateFilter) {
      filter.timestamp = { $gte: dateFilter };
    }

    if (search) {
      // SEC-001: Escape regex special characters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { action: { $regex: escapedSearch, $options: "i" } },
        { entityType: { $regex: escapedSearch, $options: "i" } },
        { entityName: { $regex: escapedSearch, $options: "i" } },
        { "context.endpoint": { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (action && action !== "all") {
      filter.action = action;
    }

    if (entityType && entityType !== "all") {
      filter.entityType = entityType;
    }

    if (errorsOnly) {
      filter["result.success"] = false;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {
      timestamp: sortOrder === "asc" ? 1 : -1,
    };

    // Execute queries in parallel
    const [logs, total, stats] = await Promise.all([
      AuditLogModel.find(filter)
        .select("action entityType entityId entityName timestamp context changes result metadata")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      AuditLogModel.countDocuments(filter).exec(),
      // Get activity stats - SUPER_ADMIN: User activity stats for investigation
      // Uses $facet for single-query optimization (PR-678-002)
      // SUPER_ADMIN: Cross-org userId-scoped aggregate for admin investigation
      (async () => {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const [facetResult] = await AuditLogModel.aggregate([
          { $match: { userId } },
          {
            $facet: {
              totalActions: [{ $count: "count" }],
              todayActions: [
                { $match: { timestamp: { $gte: todayStart } } },
                { $count: "count" },
              ],
              errorCount: [
                { $match: { "result.success": false } },
                { $count: "count" },
              ],
              topActions: [
                { $group: { _id: "$action", count: { $sum: 1 } } },
                { $sort: { count: -1 as const } },
                { $limit: 5 },
                { $project: { action: "$_id", count: 1, _id: 0 } },
              ],
              deviceBreakdown: [
                { $match: { "context.device": { $exists: true, $ne: null } } },
                { $group: { _id: "$context.device", count: { $sum: 1 } } },
                { $sort: { count: -1 as const } },
                { $limit: 5 },
                { $project: { device: "$_id", count: 1, _id: 0 } },
              ],
              lastAction: [
                { $sort: { timestamp: -1 as const } },
                { $limit: 1 },
                { $project: { timestamp: 1, _id: 0 } },
              ],
            },
          },
        ]).exec();

        return {
          totalActions: facetResult?.totalActions?.[0]?.count ?? 0,
          todayActions: facetResult?.todayActions?.[0]?.count ?? 0,
          errorCount: facetResult?.errorCount?.[0]?.count ?? 0,
          lastActiveDate: facetResult?.lastAction?.[0]?.timestamp?.toISOString(),
          topActions: facetResult?.topActions ?? [],
          deviceBreakdown: facetResult?.deviceBreakdown ?? [],
        };
      })(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // PR-678-010: Sanitize PII/credentials from audit log responses
    const sanitizedLogs = sanitizeAuditLogs(logs as Record<string, unknown>[]);

    return NextResponse.json({
      logs: sanitizedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats,
    });
  } catch (error) {
    logger.error("[Superadmin User Audit Logs] Failed to fetch audit logs", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
