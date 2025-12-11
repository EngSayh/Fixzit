/**
 * @fileoverview HR Employees API
 * @description Manages employee records including listing, creation, and updates
 * for the human resources module.
 * 
 * @module api/hr/employees
 * @requires HR, HR_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/employees - List employees with pagination and filtering
 * - POST /api/hr/employees - Create a new employee record
 * 
 * @queryParams
 * - page: Page number (default: 1)
 * - limit: Items per page (max: 100, default: 50)
 * - status: Filter by employment status (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)
 * - department: Filter by department ID
 * - search: Text search on employee name/email
 * - includePii: Include sensitive compensation/bank data (requires HR role)
 * 
 * @security
 * - RBAC: HR, HR_OFFICER, SUPER_ADMIN, CORPORATE_ADMIN
 * - PII protection: Compensation and bank details stripped by default
 * - Tenant-scoped: Employees are isolated by organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { EmployeeService } from "@/server/services/hr/employee.service";
import { hasAllowedRole } from "@/lib/auth/role-guards";

// Define session user type with subRole support
interface SessionUser {
  role?: string;
  subRole?: string | null;
  orgId?: string;
}

// GET /api/hr/employees - List all employees for the organization
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 STRICT v4.1: HR endpoints require HR, HR Officer, or Admin role
    // Now supports TEAM_MEMBER + subRole: HR_OFFICER pattern
    const allowedRoles = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'HR', 'HR_OFFICER'];
    const user = session.user as SessionUser;
    if (!hasAllowedRole(user.role, user.subRole, allowedRoles)) {
      return NextResponse.json(
        { error: "Forbidden: HR access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const includePiiRequested = searchParams.get("includePii") === "true";

    if (department && !Types.ObjectId.isValid(department)) {
      return NextResponse.json(
        { error: "Invalid department parameter" },
        { status: 400 },
      );
    }

    // Build query
    // MINOR FIX: Use projection to exclude PII by default (compensation, bankDetails)
    // to avoid leaking sensitive data in bulk list responses
    // 🔒 STRICT v4.1: Support subRole for PII access (TEAM_MEMBER + HR_OFFICER)
    const piiAllowedRoles = ["HR", "HR_OFFICER"];
    const includePii =
      includePiiRequested &&
      hasAllowedRole(user.role, user.subRole, piiAllowedRoles);
    
    const {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    } = await EmployeeService.searchWithPagination(
      {
        orgId: session.user.orgId,
        employmentStatus: (() => {
          const allowed = new Set([
            "ACTIVE",
            "INACTIVE",
            "ON_LEAVE",
            "TERMINATED",
          ]);
          return status && allowed.has(status)
            ? (status as "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED")
            : undefined;
        })(),
        departmentId: department || undefined,
        text: search || undefined,
      },
      { page, limit, includePii },
    );
    
    const itemArray = Array.isArray(items) ? items : [];
    // Strip PII fields unless explicitly requested
    const sanitizedItems = includePii
      ? itemArray
      : itemArray.map((emp: Record<string, unknown>) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { compensation, bankDetails, ...safeEmployee } = emp;
          return safeEmployee;
        });

    return NextResponse.json({
      employees: sanitizedItems,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 },
    );
  }
}

// POST /api/hr/employees - Create a new employee
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 STRICT v4.1: HR endpoints require HR, HR Officer, or Admin role
    // Now supports TEAM_MEMBER + subRole: HR_OFFICER pattern
    const allowedRoles = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'HR', 'HR_OFFICER'];
    const user = session.user as SessionUser;
    if (!hasAllowedRole(user.role, user.subRole, allowedRoles)) {
      return NextResponse.json(
        { error: "Forbidden: HR access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();

    // Validate required fields
    if (
      !body.employeeCode ||
      !body.firstName ||
      !body.lastName ||
      !body.email ||
      !body.jobTitle ||
      !body.hireDate
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: employeeCode, firstName, lastName, email, jobTitle, hireDate",
        },
        { status: 400 },
      );
    }

    if (
      body.departmentId &&
      !Types.ObjectId.isValid(body.departmentId as string)
    ) {
      return NextResponse.json(
        { error: "Invalid departmentId" },
        { status: 400 },
      );
    }

    if (body.managerId && !Types.ObjectId.isValid(body.managerId as string)) {
      return NextResponse.json(
        { error: "Invalid managerId" },
        { status: 400 },
      );
    }
    const existing = await EmployeeService.getByCode(
      session.user.orgId,
      body.employeeCode,
    );
    if (existing) {
      return NextResponse.json(
        { error: `Employee code ${body.employeeCode} already exists` },
        { status: 409 },
      );
    }

    const employee = await EmployeeService.upsert({
      orgId: session.user.orgId,
      employeeCode: body.employeeCode,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      jobTitle: body.jobTitle,
      departmentId: body.departmentId,
      managerId: body.managerId,
      employmentType: body.employmentType || "FULL_TIME",
      employmentStatus: body.employmentStatus || "ACTIVE",
      hireDate: new Date(body.hireDate),
      technicianProfile: body.technicianProfile,
      compensation: body.compensation,
      bankDetails: body.bankDetails,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: unknown) {
    logger.error("Error creating employee:", error);

    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "Employee code or email already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 },
    );
  }
}
