/**
 * @fileoverview Superadmin Audit Logs List API
 * @description List and filter audit logs
 * @route GET /api/superadmin/audit-logs
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/audit-logs
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { AuditLogModel } from "@/server/models/AuditLog";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { sanitizeAuditLogs } from "@/lib/audit/middleware";
import type { FilterQuery } from "mongoose";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/audit-logs
 * List audit logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-audit-logs:get",
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

    const { searchParams } = request.nextUrl;

    // Pagination
    let limit = parseInt(searchParams.get("limit") || "100", 10);
    let page = parseInt(searchParams.get("page") || "1", 10);
    limit = Math.min(Math.max(1, limit), 500);
    page = Math.max(1, page);
    const skip = (page - 1) * limit;

    // Filters
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action") || searchParams.get("eventType");
    const startDateStr = searchParams.get("startDate") || searchParams.get("timestampFrom");
    const endDateStr = searchParams.get("endDate") || searchParams.get("timestampTo");
    const successParam = searchParams.get("success");

    // Build query
    const query: FilterQuery<typeof AuditLogModel> = {};

    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;
    if (action) query.action = { $regex: action, $options: "i" };
    if (successParam !== null) {
      // BUG-20260107-001: Use result.success (matches schema), not query.success
      query["result.success"] = successParam === "true";
    }

    // Date range
    if (startDateStr || endDateStr) {
      query.timestamp = {};
      if (startDateStr) {
        const startDate = new Date(startDateStr);
        if (!isNaN(startDate.getTime())) {
          query.timestamp.$gte = startDate;
        }
      }
      if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (!isNaN(endDate.getTime())) {
          query.timestamp.$lte = endDate;
        }
      }
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    // PR-678-010: Sanitize PII/credentials from audit log responses
    const sanitizedLogs = sanitizeAuditLogs(logs as Record<string, unknown>[]);

    return NextResponse.json(
      {
        logs: sanitizedLogs,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:AuditLogs] Failed to load logs", { error });
    return NextResponse.json(
      { error: "Failed to load audit logs" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
