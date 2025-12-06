/**
 * Audit Log Export API Route
 *
 * Streams audit logs as CSV to prevent memory exhaustion.
 * Supports date range filtering.
 *
 * Memory-safe implementation:
 * - Uses Node.js streams to process large datasets
 * - Chunks data in batches of 100 records
 * - No in-memory accumulation of all records
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { AuditLogModel } from "@/server/models/AuditLog";
import { logger } from "@/lib/logger";

// Helper to escape CSV fields
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert audit log to CSV row
function auditToCsvRow(log: {
  _id: unknown;
  orgId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  timestamp: Date;
  context?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    endpoint?: string | null;
    method?: string | null;
  } | null;
  result?: {
    success?: boolean | null;
    errorMessage?: string | null;
  } | null;
  metadata?: unknown;
}): string {
  return [
    escapeCsvField(log.timestamp.toISOString()),
    escapeCsvField(log.userEmail || log.userName || log.userId),
    escapeCsvField(log.userId),
    escapeCsvField(log.action),
    escapeCsvField(log.entityType),
    escapeCsvField(log.entityId),
    escapeCsvField(log.entityName),
    escapeCsvField(log.result?.success === false ? "FAILURE" : "SUCCESS"),
    escapeCsvField(log.context?.ipAddress),
    escapeCsvField(log.context?.userAgent),
    escapeCsvField(log.context?.endpoint),
    escapeCsvField(log.context?.method),
    escapeCsvField(log.result?.errorMessage),
    escapeCsvField(log.metadata ? JSON.stringify(log.metadata) : ""),
  ].join(",");
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions (Super Admin or audit export permission)
    const isSuperAdmin = session.user.isSuperAdmin || false;
    const permissions = (session.user.permissions as string[]) || [];
    const canExport =
      isSuperAdmin ||
      permissions.includes("system:audit.export") ||
      permissions.includes("*");

    if (!canExport) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    // Only CSV is supported for now
    if (format !== "csv") {
      return NextResponse.json(
        { error: "Only CSV format is supported" },
        { status: 400 },
      );
    }

    // Connect to database
    await connectToDatabase();

    // Build query
    const query: { timestamp?: { $gte?: Date; $lte?: Date } } = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // CSV header
    const csvHeader =
      [
        "Timestamp",
        "User Email",
        "User ID",
        "Action",
        "Entity Type",
        "Entity ID",
        "Entity Name",
        "Status",
        "IP Address",
        "User Agent",
        "Endpoint",
        "Method",
        "Error Message",
        "Metadata",
      ].join(",") + "\n";

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send CSV header
          controller.enqueue(new TextEncoder().encode(csvHeader));

          // Stream data in batches
          const BATCH_SIZE = 100;
          let skip = 0;
          let hasMore = true;

          while (hasMore) {
            // Fetch batch
            const logs = await AuditLogModel.find(query)
              .sort({ timestamp: -1 })
              .skip(skip)
              .limit(BATCH_SIZE)
              .lean()
              .exec();

            if (logs.length === 0) {
              hasMore = false;
              break;
            }

            // Convert batch to CSV rows
            const csvRows =
              logs
                .map((log: Parameters<typeof auditToCsvRow>[0]) =>
                  auditToCsvRow(log),
                )
                .join("\n") + "\n";
            controller.enqueue(new TextEncoder().encode(csvRows));

            skip += BATCH_SIZE;

            // Check if we've reached the end
            if (logs.length < BATCH_SIZE) {
              hasMore = false;
            }
          }

          // Close stream
          controller.close();
        } catch (error) {
          logger.error("[AuditExport] Stream error", error as Error);
          controller.error(error);
        }
      },
    });

    // Return streaming response
    const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    logger.error("[AuditExport] Error", error as Error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
