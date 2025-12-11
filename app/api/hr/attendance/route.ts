/**
 * @fileoverview HR Attendance API
 * @description Manages employee attendance records including clock-in/out,
 * time tracking, and attendance status management.
 * 
 * @module api/hr/attendance
 * @requires HR, HR_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/attendance - List attendance entries for an employee
 * - POST /api/hr/attendance - Log a new attendance entry
 * 
 * @queryParams (GET)
 * - employeeId: (required) Employee ID to fetch attendance for
 * - from: Start date filter (ISO 8601)
 * - to: End date filter (ISO 8601)
 * 
 * @requestBody (POST)
 * - employeeId: (required) Employee ID
 * - date: (required) Attendance date
 * - status: (required) PRESENT, ABSENT, LATE, LEAVE, HOLIDAY
 * - clockIn: Clock-in timestamp
 * - clockOut: Clock-out timestamp
 * - shiftTemplateId: Associated shift template
 * - notes: Additional notes
 * 
 * @security
 * - RBAC: HR, HR_OFFICER, SUPER_ADMIN, CORPORATE_ADMIN
 * - Tenant-scoped: Attendance records are isolated by organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { AttendanceService } from "@/server/services/hr/attendance.service";
import type { AttendanceStatus } from "@/server/models/hr.models";

// 🔒 STRICT v4.1: Attendance requires HR, HR Officer, or Admin role
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
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 },
      );
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    await connectToDatabase();

    const entries = await AttendanceService.list(
      session.user.orgId,
      employeeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );

    return NextResponse.json({ entries });
  } catch (error) {
    logger.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
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

    const body = await req.json();
    const required = ["employeeId", "date", "status"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const entry = await AttendanceService.logEntry({
      orgId: session.user.orgId,
      employeeId: body.employeeId,
      date: new Date(body.date),
      status: body.status as AttendanceStatus,
      shiftTemplateId: body.shiftTemplateId,
      clockIn: body.clockIn ? new Date(body.clockIn) : undefined,
      clockOut: body.clockOut ? new Date(body.clockOut) : undefined,
      source: body.source,
      notes: body.notes,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error("Error logging attendance:", error);
    return NextResponse.json(
      { error: "Failed to log attendance" },
      { status: 500 },
    );
  }
}
