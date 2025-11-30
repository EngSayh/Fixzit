import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuditLogModel } from "@/server/models/AuditLog";
import { connectDb } from "@/lib/mongo";

import { logger } from "@/lib/logger";
/**
 * GET /api/admin/audit-logs
 *
 * Fetch audit logs with filters (Super Admin only)
 */
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

    // Parse and validate pagination with safe defaults and caps
    let limit = parseInt(searchParams.get("limit") || "100", 10);
    let skip = parseInt(searchParams.get("skip") || "0", 10);

    // Validate and cap pagination values to prevent DoS
    if (!Number.isInteger(limit) || limit < 1) {
      limit = 100;
    }
    if (!Number.isInteger(skip) || skip < 0) {
      skip = 0;
    }
    // Cap limit at 1000 and skip at 100000 for safety
    limit = Math.min(limit, 1000);
    skip = Math.min(skip, 100000);

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

    // Search logs
    const logs = await AuditLogModel.search({
      orgId,
      userId: userId || undefined,
      entityType: entityType || undefined,
      action: action || undefined,
      startDate,
      endDate,
      limit,
      skip,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    logger.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 },
    );
  }
}
