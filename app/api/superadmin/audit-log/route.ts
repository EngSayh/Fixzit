/**
 * @fileoverview Superadmin Audit Log Create API
 * @description Create audit log entries
 * @route POST /api/superadmin/audit-log
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/audit-log
 */

/* eslint-disable local/require-tenant-scope -- Superadmin route: intentionally queries across all tenants */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { AuditLogModel } from "@/server/models/AuditLog";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * POST /api/superadmin/audit-log
 * Create an audit log entry
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-audit-log:post",
    requests: 50,
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

    const { data: body, error: parseError } = await parseBodySafe<{
      action?: string;
      entityType?: string;
      entityId?: string;
      details?: Record<string, unknown>;
    }>(request, { logPrefix: "[superadmin:audit-log]" });

    if (parseError || !body?.action) {
      return NextResponse.json(
        { error: "Invalid request body - action required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Get IP from request
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    const auditLog = await AuditLogModel.create({
      userId: session.username,
      action: body.action,
      entityType: body.entityType || "system",
      entityId: body.entityId,
      details: body.details || {},
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || "unknown",
      timestamp: new Date(),
      success: true,
    });

    logger.info("[Superadmin:AuditLog] Entry created", {
      action: body.action,
      by: session.username,
    });

    return NextResponse.json(
      { log: auditLog, message: "Audit log created" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:AuditLog] Failed to create entry", { error });
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
