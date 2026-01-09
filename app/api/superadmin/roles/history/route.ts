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
import { AuditLogModel, type AuditLog } from "@/server/models/AuditLog";
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
    // AuditLog schema uses:
    // - entityType: "SETTING" or "OTHER" for role changes (no "Role" enum value)
    // - action: "CREATE" | "UPDATE" | "DELETE" (not "role.create" patterns)
    // - entityName: contains role name
    // - metadata.reason: may contain role info
    // - context.ipAddress: IP address (not top-level)
    const query: Record<string, unknown> = {
      $or: [
        // Role-related by entity name pattern
        { entityName: { $regex: /role|permission/i } },
        // Role-related by action + entityType
        { 
          action: { $in: ["CREATE", "UPDATE", "DELETE"] },
          entityType: { $in: ["SETTING", "OTHER"] },
          "metadata.tags": "role",
        },
        // Role-related by metadata reason
        { "metadata.reason": { $regex: /role|permission/i } },
      ],
    };

    if (roleName) {
      // Truncate to prevent slow regex queries (MED: length cap)
      const truncatedRoleName = roleName.slice(0, 100);
      // Filter by specific role name - escape regex special chars to prevent ReDoS
      const escapedRoleName = truncatedRoleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // When filtering by specific roleName, search only by that name without base predicate
      // This avoids false negatives from requiring role|permission in entityName
      query.$or = [
        { entityName: { $regex: escapedRoleName, $options: "i" } },
        { "metadata.reason": { $regex: escapedRoleName, $options: "i" } },
        { "metadata.tags": "role", entityName: { $regex: escapedRoleName, $options: "i" } },
      ];
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
    // Map AuditLog schema fields to UI expectations:
    // - roleName: from entityName or metadata.reason
    // - ipAddress: from context.ipAddress
    // - success: from result.success
    // Use proper typing for logs (was: any)
    const history = logs.map((log: AuditLog & { _id: unknown }) => {
      const context = log.context as Record<string, unknown> | undefined;
      const result = log.result as Record<string, unknown> | undefined;
      const metadata = log.metadata as Record<string, unknown> | undefined;
      
      // Extract role name from entityName or metadata
      let derivedRoleName = (log.entityName as string) || "Unknown";
      if (derivedRoleName === "Unknown" && metadata?.reason) {
        // Try to extract from reason if it mentions a role
        // Expanded regex to capture roles with spaces, hyphens, numbers (e.g. "Senior Manager-HR")
        const reasonStr = String(metadata.reason);
        const roleMatch = reasonStr.match(/role[:\s]+([A-Za-z0-9_\s-]+)/i);
        if (roleMatch) {
          derivedRoleName = roleMatch[1].trim();
        }
      }
      
      return {
        id: String(log._id),
        action: log.action,
        roleName: derivedRoleName,
        userId: log.userId,
        userName: log.userName,
        userEmail: log.userEmail,
        timestamp: log.timestamp,
        details: metadata || log.changes,
        success: result?.success ?? true,
        ipAddress: context?.ipAddress || "",
      };
    });

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
