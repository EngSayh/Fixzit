/**
 * @fileoverview Superadmin Role Change History API
 * @description Retrieve audit logs for role changes
 * @route GET /api/superadmin/roles/history
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/roles/history
 * @agent [AGENT-0012]
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
 * GET /api/superadmin/roles/history
 * Get role change history from audit logs
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-roles-history:get",
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
    let limit = parseInt(searchParams.get("limit") || "50", 10);
    let page = parseInt(searchParams.get("page") || "1", 10);
    limit = Math.min(Math.max(1, limit), 200);
    page = Math.max(1, page);
    const skip = (page - 1) * limit;

    // Optional filter by role name
    const roleName = searchParams.get("roleName");

    // Build query for role-related audit logs
    const query: Record<string, unknown> = {
      entityType: "Role",
      action: { $regex: /^role\./, $options: "i" },
    };

    if (roleName) {
      query["details.roleName"] = { $regex: roleName, $options: "i" };
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    // Transform logs for UI consumption
    const history = logs.map((log: Record<string, unknown>) => ({
      id: String(log._id),
      action: log.action,
      roleName: (log.details as Record<string, unknown>)?.roleName || "Unknown",
      userId: log.userId,
      timestamp: log.timestamp,
      details: log.details,
      success: (log.result as Record<string, unknown>)?.success ?? true,
      ipAddress: log.ipAddress || (log.security as Record<string, unknown>)?.ip,
    }));

    return NextResponse.json(
      {
        history,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        fetchedAt: new Date().toISOString(),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Roles:History] Failed to load role history", { error });
    return NextResponse.json(
      { error: "Failed to load role history" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
