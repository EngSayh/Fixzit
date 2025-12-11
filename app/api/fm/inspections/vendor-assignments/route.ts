/**
 * @fileoverview FM Inspections Vendor Assignments API
 * @description Manages vendor assignments for property inspections.
 * Supports scheduling, status tracking, and assignment lifecycle.
 * @route GET /api/fm/inspections/vendor-assignments - List vendor assignments
 * @route POST /api/fm/inspections/vendor-assignments - Create an assignment
 * @access Protected - Requires authenticated session
 * @module fm/inspections
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";

const VENDOR_ASSIGNMENTS_API_ENABLED =
  process.env.VENDOR_ASSIGNMENTS_API_ENABLED === "true";
const VENDOR_ASSIGNMENTS_API_MOCKS =
  process.env.VENDOR_ASSIGNMENTS_API_MOCKS === "true" ||
  process.env.NODE_ENV !== "production";

type VendorAssignmentsMode =
  | "disabled"
  | "mock"
  | "flagged-mock"
  | "pending-real";

const resolveVendorAssignmentsMode = (): VendorAssignmentsMode => {
  if (!VENDOR_ASSIGNMENTS_API_ENABLED && !VENDOR_ASSIGNMENTS_API_MOCKS) {
    return "disabled";
  }

  if (VENDOR_ASSIGNMENTS_API_ENABLED && !VENDOR_ASSIGNMENTS_API_MOCKS) {
    return "pending-real";
  }

  if (VENDOR_ASSIGNMENTS_API_ENABLED && VENDOR_ASSIGNMENTS_API_MOCKS) {
    return "flagged-mock";
  }

  return "mock";
};

interface VendorAssignment {
  inspectionId: string;
  propertyId: string;
  vendorId: string;
  vendorName: string;
  trade: string;
  scheduledDate?: Date;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

/**
 * GET /api/fm/inspections/vendor-assignments
 *
 * Get vendor assignments for inspections
 *
 * Query params:
 * - propertyId: filter by property (optional)
 * - status: filter by status (optional)
 * - limit: max results (default 100)
 *
 * @returns Array of vendor assignments with aggregated statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has FM permissions
    // 🔒 SECURITY FIX: Include FM-specific roles per UserRole enum
    const userRole = session.user.role;
    const allowedRoles = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "MANAGER", "FM_MANAGER", "PROPERTY_MANAGER"];

    if (!session.user.isSuperAdmin && !allowedRoles.includes(userRole || "")) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const mode = resolveVendorAssignmentsMode();

    if (mode === "disabled") {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor assignments API disabled",
          note: "Set VENDOR_ASSIGNMENTS_API_MOCKS=true to enable mock responses while FMInspection integration is wired.",
        },
        { status: 503 },
      );
    }

    if (mode === "pending-real") {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor assignments data source not implemented yet",
          note: "Leave VENDOR_ASSIGNMENTS_API_ENABLED=false or enable VENDOR_ASSIGNMENTS_API_MOCKS=true until FMInspection-backed assignments are available.",
        },
        { status: 501 },
      );
    }

    // Real FMInspection integration not wired yet; allow mock payloads only when flags permit.
    const usingMockData = mode === "mock" || mode === "flagged-mock";

    // For now, return mock data structure
    // In production, this would query from FMInspection or similar collection
    const assignments: VendorAssignment[] = [
      {
        inspectionId: "INS-001",
        propertyId: propertyId || "PROP-001",
        vendorId: "VEND-001",
        vendorName: "AC Masters Co.",
        trade: "HVAC",
        scheduledDate: new Date("2025-11-25"),
        status: "scheduled",
      },
      {
        inspectionId: "INS-002",
        propertyId: propertyId || "PROP-002",
        vendorId: "VEND-002",
        vendorName: "Electrical Solutions",
        trade: "Electrical",
        scheduledDate: new Date("2025-11-26"),
        status: "scheduled",
      },
      {
        inspectionId: "INS-003",
        propertyId: propertyId || "PROP-003",
        vendorId: "VEND-003",
        vendorName: "Plumbing Pros",
        trade: "Plumbing",
        scheduledDate: new Date("2025-11-27"),
        status: "scheduled",
      },
    ];

    // Filter by status if provided
    let filteredAssignments = assignments;
    if (status && status !== "all") {
      filteredAssignments = assignments.filter((a) => a.status === status);
    }

    // Calculate statistics
    const stats = {
      total: filteredAssignments.length,
      scheduled: filteredAssignments.filter((a) => a.status === "scheduled")
        .length,
      inProgress: filteredAssignments.filter((a) => a.status === "in-progress")
        .length,
      completed: filteredAssignments.filter((a) => a.status === "completed")
        .length,
      uniqueVendors: new Set(filteredAssignments.map((a) => a.vendorId)).size,
      uniqueTrades: new Set(filteredAssignments.map((a) => a.trade)).size,
    };

    return NextResponse.json({
      success: true,
      source: usingMockData ? "mock" : "database",
      assignments: filteredAssignments.slice(0, limit),
      stats,
      note:
        mode === "flagged-mock"
          ? "VENDOR_ASSIGNMENTS_API_ENABLED is true but using mock data until FMInspection integration is completed."
          : "Mock vendor assignments payload. Set VENDOR_ASSIGNMENTS_API_MOCKS=true only in non-production or after integration is ready.",
    });
  } catch (error) {
    logger.error("Vendor assignments API error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/fm/inspections/vendor-assignments
 *
 * Create a new vendor assignment for an inspection
 *
 * Body: {
 *   inspectionId: string,
 *   propertyId: string,
 *   vendorId: string,
 *   trade: string,
 *   scheduledDate?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has FM write permissions
    // 🔒 SECURITY FIX: Include FM-specific roles per UserRole enum
    const userRole = session.user.role;
    const allowedRoles = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN", "MANAGER", "FM_MANAGER", "PROPERTY_MANAGER"];

    if (!session.user.isSuperAdmin && !allowedRoles.includes(userRole || "")) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { inspectionId, propertyId, vendorId, trade, scheduledDate } = body;

    const mode = resolveVendorAssignmentsMode();
    if (mode === "disabled") {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor assignments API disabled",
          note: "Set VENDOR_ASSIGNMENTS_API_MOCKS=true to allow mock creation responses while FMInspection integration is wired.",
        },
        { status: 503 },
      );
    }

    if (mode === "pending-real") {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor assignments persistence not implemented yet",
          note: "Disable VENDOR_ASSIGNMENTS_API_ENABLED or enable VENDOR_ASSIGNMENTS_API_MOCKS=true to use mock assignments until FMInspection-backed storage is available.",
        },
        { status: 501 },
      );
    }

    const usingMockData = mode === "mock" || mode === "flagged-mock";

    // Validate required fields
    if (!inspectionId || !propertyId || !vendorId || !trade) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: inspectionId, propertyId, vendorId, trade",
        },
        { status: 400 },
      );
    }

    // In production, this would:
    // 1. Verify inspection exists
    // 2. Verify vendor exists and has required trade certification
    // 3. Check vendor availability
    // 4. Create assignment record
    // 5. Send notification to vendor

    const assignment: VendorAssignment = {
      inspectionId,
      propertyId,
      vendorId,
      vendorName: `Vendor ${vendorId}`, // Would be fetched from DB
      trade,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      status: "scheduled",
    };

    logger.info("Vendor assignment created", {
      inspectionId,
      vendorId,
      trade,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        source: usingMockData ? "mock" : "database",
        assignment,
        message: "Vendor assigned successfully",
        note:
          mode === "flagged-mock"
            ? "VENDOR_ASSIGNMENTS_API_ENABLED is true but using mock data until FMInspection integration is completed."
            : "Mock vendor assignment created. Enable VENDOR_ASSIGNMENTS_API_MOCKS=true explicitly while integration is pending.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Create vendor assignment error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
