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

    // Server-side filters
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const userId = searchParams.get("userId") || "";
    const entityType = searchParams.get("entityType") || "";

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

    // Build query with server-side filters
    const query: Record<string, unknown> = {
      timestamp: { $gte: startDate },
    };

    // Category filter - map to action patterns
    if (category && category !== "all") {
      const categoryActionMap: Record<string, RegExp> = {
        auth: /^(LOGIN|LOGOUT|password|auth)/i,
        navigation: /^(view|navigate|visit|read)/i,
        crud: /^(CREATE|UPDATE|DELETE|add|remove)/i,
        settings: /^(settings|config|preference)/i,
        api: /^(api|request|call)/i,
        error: /^(error|fail)/i,
      };
      if (categoryActionMap[category]) {
        query.action = categoryActionMap[category];
      }
    }

    // Status filter - map to result.success
    // Supports: success, error, warning (partial success or slow operations)
    if (status && status !== "all") {
      if (status === "error") {
        query["result.success"] = false;
      } else if (status === "success") {
        query["result.success"] = true;
      } else if (status === "warning") {
        // Warning = success but with warnings (errorMessage exists) or slow (duration > 3000ms)
        const andConditions = (query.$and as unknown[] | undefined) || [];
        andConditions.push({
          $or: [
            { "result.success": true, "result.errorMessage": { $exists: true, $ne: "" } },
            { "result.success": true, "result.duration": { $gt: 3000 } },
            { "metadata.tags": "warning" },
          ],
        });
        query.$and = andConditions;
      }
    }

    // User filter
    if (userId) {
      query.userId = userId;
    }

    // Entity type filter
    if (entityType && entityType !== "all") {
      query.entityType = entityType.toUpperCase();
    }

    // Search filter - search in userName, userEmail, action, entityType
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { userName: { $regex: escapedSearch, $options: "i" } },
        { userEmail: { $regex: escapedSearch, $options: "i" } },
        { action: { $regex: escapedSearch, $options: "i" } },
        { entityType: { $regex: escapedSearch, $options: "i" } },
        { "metadata.reason": { $regex: escapedSearch, $options: "i" } },
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

    // Type for the raw log document with possible additional fields
    type LogRecord = Record<string, unknown>;

    // Transform logs to expected format
    const transformedLogs = logs.map((rawLog) => {
      const log = rawLog as LogRecord;
      const action = (typeof log.action === "string" ? log.action : "").toLowerCase();
      const metadata = log.metadata as Record<string, unknown> | undefined;
      const context = log.context as Record<string, unknown> | undefined;
      const result = log.result as { success?: boolean; statusCode?: number; duration?: number } | undefined;

      // Derive category from action/entityType
      let category: "auth" | "navigation" | "crud" | "settings" | "api" | "error" = "api";
      if (action.includes("login") || action.includes("logout") || action.includes("auth") || action.includes("password")) {
        category = "auth";
      } else if (action.includes("view") || action.includes("navigate") || action.includes("visit")) {
        category = "navigation";
      } else if (action.includes("create") || action.includes("update") || action.includes("delete") || action.includes("add") || action.includes("remove")) {
        category = "crud";
      } else if (action.includes("settings") || action.includes("config") || action.includes("preference")) {
        category = "settings";
      } else if (result?.success === false || action.includes("error") || action.includes("fail")) {
        category = "error";
      }

      // Derive status from result.success
      const statusCode = (metadata?.statusCode as number | undefined) ?? 0;
      let status: "success" | "warning" | "error" = "success";
      if (result?.success === false) {
        status = "error";
      } else if (statusCode >= 400 && statusCode < 500) {
        status = "warning";
      }

      return {
        _id: String(log._id),
        userId: log.userId ? String(log.userId) : "system",
        userName: (log.userName as string) || (log.userEmail as string) || "Unknown",
        userEmail: (log.userEmail as string) || "",
        action: (log.action as string) || "unknown",
        entityType: (log.entityType as string) || "",
        entityId: (log.entityId as string) || "",
        // UI expects these fields
        category,
        status,
        tenantId: log.orgId ? String(log.orgId) : "",
        tenantName: (metadata?.orgName as string) || "",
        details: (metadata?.reason as string) || (metadata?.comment as string) || "",
        description: (metadata?.reason as string) || (metadata?.comment as string) || "",
        ipAddress: (context?.ipAddress as string) || "",
        userAgent: (context?.userAgent as string) || "",
        timestamp: log.timestamp,
        success: result?.success !== false,
        metadata: {
          path: (context?.endpoint as string) || "",
          method: (context?.method as string) || "",
          statusCode: statusCode || undefined,
          duration: (result?.duration as number | undefined) || (metadata?.duration as number | undefined),
          userAgent: (context?.userAgent as string) || "",
          device: (context?.device as string) || "",
          browser: (context?.browser as string) || "",
          os: (context?.os as string) || "",
          ip: (context?.ipAddress as string) || "",
          location: "",
        },
      };
    });

    return NextResponse.json(
      {
        logs: transformedLogs,
        total,
        page,
        pages: Math.ceil(total / limit),
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
    logger.error("[Superadmin User Logs] Error fetching logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch user logs" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
