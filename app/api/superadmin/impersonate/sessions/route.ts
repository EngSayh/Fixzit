/**
 * @fileoverview Superadmin Impersonation Sessions API
 * @description GET endpoint for retrieving impersonation session history from audit logs
 * @route GET /api/superadmin/impersonate/sessions
 * @access Superadmin only
 * @module api/superadmin/impersonate/sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { AuditLogModel, AuditLog } from "@/server/models/AuditLog";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/impersonate/sessions
 * Retrieve impersonation session history from audit logs
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-impersonate-sessions:get",
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Query audit logs for impersonation events
    /* eslint-disable local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant audit visibility */
    const [sessions, total] = await Promise.all([
      AuditLogModel.find({
        action: { $in: ["impersonate_start", "impersonate_end", "tenant_switch"] },
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select("action userId userName userEmail orgId metadata timestamp context")
        .lean(),
      AuditLogModel.countDocuments({
        action: { $in: ["impersonate_start", "impersonate_end", "tenant_switch"] },
      }),
    ]);
    /* eslint-enable local/require-tenant-scope */

    // Transform audit logs to session format
    const formattedSessions = sessions.map((log: AuditLog & { _id: unknown }) => ({
      id: log._id,
      action: log.action,
      superadmin: log.userName || log.userEmail || log.userId || "unknown",
      targetOrgId: log.orgId || (log.metadata as Record<string, unknown>)?.targetOrgId,
      targetOrgName: (log.metadata as Record<string, unknown>)?.orgName || (log.metadata as Record<string, unknown>)?.targetOrgName,
      startedAt: log.timestamp,
      ip: log.context?.ipAddress,
      userAgent: log.context?.userAgent,
      metadata: log.metadata,
    }));

    logger.debug("[Superadmin:ImpersonateSessions] Sessions fetched", {
      superadminUsername: session.username,
      total,
      page,
      limit,
    });

    return NextResponse.json(
      {
        sessions: formattedSessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ImpersonateSessions] Failed to fetch sessions", { error });
    return NextResponse.json(
      { error: "Failed to fetch impersonation sessions" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
