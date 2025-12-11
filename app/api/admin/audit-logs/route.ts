/**
 * @description Retrieves audit logs with pagination and filtering.
 * Provides security and compliance audit trail for all platform actions.
 * Supports filtering by actor, action type, date range, and success status.
 * @route GET /api/admin/audit-logs
 * @access Private - SUPER_ADMIN only
 * @param {string} actorId - Filter by user ID who performed action
 * @param {string} action - Filter by action type
 * @param {string} startDate - Filter from date (ISO format)
 * @param {string} endDate - Filter to date (ISO format)
 * @param {boolean} success - Filter by success status
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50)
 * @returns {Object} logs: array, total: number, page: number, pages: number
 * @throws {401} If not authenticated
 * @throws {403} If not SUPER_ADMIN
 */
import { NextRequest, NextResponse } from "next/server";
import type { FilterQuery } from "mongoose";

// Prevent prerendering/export of this API route (requires auth + database)
export const dynamic = "force-dynamic";
import { auth } from "@/auth";
import { AuditLogModel, type AuditLog } from "@/server/models/AuditLog";
import { connectDb } from "@/lib/mongo";

import { logger } from "@/lib/logger";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is Super Admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 },
      );
    }

    await connectDb();

    // Get query parameters
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const successParam = searchParams.get("success");

    // Parse and validate pagination with safe defaults and caps
    let limit = parseInt(searchParams.get("limit") || "100", 10);
    let page = parseInt(searchParams.get("page") || "1", 10);

    // Validate and cap pagination values to prevent DoS
    if (!Number.isInteger(limit) || limit < 1) {
      limit = 100;
    }
    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }
    // Cap limit at 500 for safety
    limit = Math.min(limit, 500);
    const skip = (page - 1) * limit;

    // Validate and parse date parameters
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate parameter" },
          { status: 400 },
        );
      }
      startDate = parsed;
    }

    if (endDateStr) {
      const parsed = new Date(endDateStr);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate parameter" },
          { status: 400 },
        );
      }
      endDate = parsed;
    }

    // SEC-001: Validate orgId exists for tenant isolation
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
      return NextResponse.json(
        { error: "Unauthorized: Invalid organization context" },
        { status: 403 }
      );
    }

    // Rate limiting (org-aware) to prevent abuse
    const rlKey = buildOrgAwareRateLimitKey(request, orgId, session.user.id ?? null);
    const rl = await smartRateLimit(rlKey, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const query: FilterQuery<AuditLog> = { orgId };
    if (userId) {
      query.userId = userId;
    }
    if (entityType) {
      query.entityType = entityType;
    }
    if (action) {
      query.action = action;
    }
    if (successParam === "true") {
      query["result.success"] = true;
    } else if (successParam === "false") {
      query["result.success"] = false;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip),
      AuditLogModel.countDocuments(query),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    // Search logs
    return NextResponse.json({
      logs,
      total,
      page,
      pages,
      limit,
    });
  } catch (error) {
    logger.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
