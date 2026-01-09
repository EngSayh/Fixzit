/**
 * @fileoverview Export endpoint for user activity logs
 * Supports CSV/JSON export with filtering
 * @sprint 66
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { AuditLogModel } from "@/server/models/AuditLog";
import { connectDb } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };
const MAX_EXPORT_RECORDS = 10000; // Safety limit

// CSV escape helper to prevent injection
function escapeCsvField(value: unknown): string {
  const str = String(value ?? "");
  // Prevent CSV injection by prefixing dangerous characters
  const sanitized = str.replace(/^([=+\-@])/, "'$1");
  if (/[,"\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const range = searchParams.get("range") || "7d";
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const userId = searchParams.get("userId") || "";
    const includeEmails = searchParams.get("includeEmails") === "true";

    // Calculate date filter
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

    // Build query with filters
    const query: Record<string, unknown> = {
      timestamp: { $gte: startDate },
    };

    // Category filter
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

    // Status filter
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

    // Search filter - length cap to prevent expensive regex queries (max 100 chars)
    if (search) {
      const truncatedSearch = search.slice(0, 100);
      const escapedSearch = truncatedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { userName: { $regex: escapedSearch, $options: "i" } },
        { userEmail: { $regex: escapedSearch, $options: "i" } },
        { action: { $regex: escapedSearch, $options: "i" } },
        { entityType: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(MAX_EXPORT_RECORDS)
      .lean();

    // Log export action for audit trail
    logger.info("[Superadmin Export] User logs exported", {
      adminUser: session.username,
      format,
      recordCount: logs.length,
      filters: { range, category, status, userId, search: search ? "yes" : "no" },
      includeEmails,
    });

    // Transform logs
    type LogRecord = Record<string, unknown>;
    const transformedLogs = logs.map((rawLog) => {
      const log = rawLog as LogRecord;
      const action = (typeof log.action === "string" ? log.action : "").toLowerCase();
      const metadata = log.metadata as Record<string, unknown> | undefined;
      const result = log.result as { success?: boolean } | undefined;

      // Derive category
      let logCategory = "api";
      if (action.includes("login") || action.includes("logout") || action.includes("auth")) {
        logCategory = "auth";
      } else if (action.includes("view") || action.includes("navigate")) {
        logCategory = "navigation";
      } else if (action.includes("create") || action.includes("update") || action.includes("delete")) {
        logCategory = "crud";
      } else if (action.includes("settings") || action.includes("config")) {
        logCategory = "settings";
      } else if (result?.success === false) {
        logCategory = "error";
      }

      // Derive status
      const logStatus = result?.success === false ? "error" : "success";

      return {
        timestamp: log.timestamp,
        userId: log.userId ? String(log.userId) : "system",
        userName: (log.userName as string) || "Unknown",
        userEmail: includeEmails ? ((log.userEmail as string) || "") : "[REDACTED]",
        action: (log.action as string) || "unknown",
        category: logCategory,
        status: logStatus,
        tenantName: (metadata?.orgName as string) || "",
        details: (metadata?.reason as string) || "",
      };
    });

    if (format === "csv") {
      // Generate CSV
      const headers = includeEmails
        ? ["Timestamp", "User ID", "User Name", "Email", "Action", "Category", "Status", "Tenant", "Details"]
        : ["Timestamp", "User ID", "User Name", "Action", "Category", "Status", "Tenant", "Details"];

      const BOM = "\uFEFF";
      const csvRows = [
        headers.join(","),
        ...transformedLogs.map((log) => {
          const row = [
            new Date(log.timestamp as string | Date).toISOString(),
            escapeCsvField(log.userId),
            escapeCsvField(log.userName),
            ...(includeEmails ? [escapeCsvField(log.userEmail)] : []),
            escapeCsvField(log.action),
            escapeCsvField(log.category),
            escapeCsvField(log.status),
            escapeCsvField(log.tenantName),
            escapeCsvField(log.details),
          ];
          return row.join(",");
        }),
      ].join("\n");

      const filename = `user-activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
      
      return new NextResponse(BOM + csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          ...ROBOTS_HEADER,
        },
      });
    }

    // Default: JSON format
    return NextResponse.json(
      {
        logs: transformedLogs,
        exportedAt: new Date().toISOString(),
        recordCount: transformedLogs.length,
        filters: { range, category, status, userId, search: search || undefined },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Export] Error exporting logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
