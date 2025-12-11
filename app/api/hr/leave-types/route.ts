/**
 * @fileoverview HR Leave Types API
 * @description Manages leave type definitions including annual leave, sick leave,
 * maternity/paternity leave, and custom leave types per organization.
 * 
 * @module api/hr/leave-types
 * @requires HR, HR_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/leave-types - List all leave types for the organization
 * - POST /api/hr/leave-types - Create a new leave type
 * 
 * @queryParams (GET)
 * - search: Text search on leave type name/code
 * - limit: Maximum items to return
 * 
 * @requestBody (POST)
 * - code: (required) Unique leave type code (e.g., ANNUAL, SICK)
 * - name: (required) Display name
 * - description: Optional description
 * - isPaid: Whether leave is paid (default: true)
 * - annualEntitlementDays: Days entitled per year
 * 
 * @security
 * - RBAC: HR, HR_OFFICER, SUPER_ADMIN, CORPORATE_ADMIN
 * - Tenant-scoped: Leave types are organization-specific
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { LeaveTypeService } from "@/server/services/hr/leave-type.service";

// 🔒 STRICT v4.1: HR endpoints require HR, HR Officer, or Admin role
const HR_ALLOWED_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'HR', 'HR_OFFICER'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 RBAC check
    if (!session.user.role || !HR_ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "0", 10);

    await connectToDatabase();
    const leaveTypes = await LeaveTypeService.list(session.user.orgId, search, {
      limit: Number.isNaN(limit) || limit <= 0 ? undefined : limit,
    });

    return NextResponse.json({ leaveTypes });
  } catch (error) {
    logger.error("Failed to fetch leave types", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch leave types" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 RBAC check
    if (!session.user.role || !HR_ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    if (!body?.code || !body?.name) {
      return NextResponse.json(
        { error: "code and name are required" },
        { status: 400 },
      );
    }

    const leaveType = await LeaveTypeService.create(session.user.orgId, {
      code: body.code,
      name: body.name,
      description: body.description,
      isPaid: typeof body.isPaid === "boolean" ? body.isPaid : true,
      annualEntitlementDays: body.annualEntitlementDays ?? undefined,
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    logger.error("Failed to create leave type", error as Error);
    return NextResponse.json(
      { error: "Failed to create leave type" },
      { status: 500 },
    );
  }
}
