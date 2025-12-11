/**
 * @fileoverview HR Leave Requests API
 * @description Manages employee leave requests including submission,
 * approval workflow, and leave balance tracking.
 * 
 * @module api/hr/leaves
 * @requires HR, HR_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/leaves - List leave requests with optional status filter
 * - POST /api/hr/leaves - Submit a new leave request
 * 
 * @queryParams (GET)
 * - status: Filter by request status (PENDING, APPROVED, REJECTED, CANCELLED)
 * 
 * @requestBody (POST)
 * - employeeId: (required) Employee ID
 * - leaveTypeId: (required) Leave type ID (annual, sick, etc.)
 * - startDate: (required) Leave start date
 * - endDate: (required) Leave end date
 * - numberOfDays: (required) Number of leave days
 * - reason: Optional reason for leave
 * 
 * @security
 * - RBAC: HR, HR_OFFICER, SUPER_ADMIN, CORPORATE_ADMIN
 * - Approval workflow: Requests start as PENDING
 * - Tenant-scoped: Leave requests are isolated by organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { LeaveService } from "@/server/services/hr/leave.service";
import type {
  LeaveRequestDoc,
  LeaveRequestStatus,
} from "@/server/models/hr.models";
import { Types } from "mongoose";

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
    const status = searchParams.get("status") as LeaveRequestStatus | null;

    await connectToDatabase();

    const requests = await LeaveService.list(
      session.user.orgId,
      status || undefined,
    );
    return NextResponse.json({ requests });
  } catch (error) {
    logger.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 RBAC check
    if (!session.user.role || !HR_ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    const body = await req.json();
    const missing = [
      "employeeId",
      "leaveTypeId",
      "startDate",
      "endDate",
      "numberOfDays",
    ].filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const leaveInput = {
      orgId: new Types.ObjectId(session.user.orgId),
      employeeId: new Types.ObjectId(body.employeeId),
      leaveTypeId: new Types.ObjectId(body.leaveTypeId),
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      numberOfDays: body.numberOfDays,
      status: "PENDING",
      reason: body.reason,
      approvalHistory: [],
    } as unknown as Omit<
      LeaveRequestDoc,
      "createdAt" | "updatedAt" | "isDeleted"
    >;
    const requestDoc = await LeaveService.request(leaveInput);

    return NextResponse.json(requestDoc, { status: 201 });
  } catch (error) {
    logger.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 RBAC check
    if (!session.user.role || !HR_ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.leaveRequestId || !body.status) {
      return NextResponse.json(
        { error: "Missing fields: leaveRequestId, status" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const updated = await LeaveService.updateStatus(
      session.user.orgId,
      body.leaveRequestId,
      body.status,
      session.user.id,
      body.comment,
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating leave request:", error);
    return NextResponse.json(
      { error: "Failed to update leave request" },
      { status: 500 },
    );
  }
}
