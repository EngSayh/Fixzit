/**
 * @fileoverview FM Inspections Vendor Assignments API
 * @description Manages vendor assignments for property inspections.
 * Supports scheduling, status tracking, and assignment lifecycle.
 * @route GET /api/fm/inspections/vendor-assignments - List vendor assignments
 * @route POST /api/fm/inspections/vendor-assignments - Create an assignment
 * @access Protected - Requires authenticated session
 * @module fm/inspections
 * @status PRODUCTION [AGENT-0008]
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";

// Collection names
const INSPECTIONS_COLLECTION = "inspections";
const VENDOR_ASSIGNMENTS_COLLECTION = "vendor_assignments";

interface VendorAssignment {
  _id?: ObjectId;
  orgId: string;
  inspectionId: string;
  propertyId: string;
  unitId?: string;
  vendorId: string;
  vendorName: string;
  trade: string;
  scheduledDate?: Date;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
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
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "fm-inspections-vendor-assignments:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const orgId = session.user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

    const db = await getDatabase();

    // Build query with tenant scoping
    const query: Record<string, unknown> = { orgId };
    
    if (propertyId) {
      query.propertyId = propertyId;
    }
    
    if (status && status !== "all") {
      query.status = status;
    }

    // Fetch vendor assignments from database
    const assignmentsFromDb = await db.collection(VENDOR_ASSIGNMENTS_COLLECTION)
      .find(query)
      .sort({ scheduledDate: -1, createdAt: -1 })
      .limit(limit)
      .toArray() as VendorAssignment[];

    // If no dedicated assignments, check inspections with assigned vendors
    let assignments: VendorAssignment[] = assignmentsFromDb;
    
    if (assignments.length === 0) {
      // Query inspections that have vendor assignments embedded
      const inspectionsWithVendors = await db.collection(INSPECTIONS_COLLECTION)
        .find({
          orgId,
          "assignedVendor.vendorId": { $exists: true },
          ...(propertyId ? { propertyId } : {}),
          ...(status && status !== "all" ? { status } : {}),
        })
        .limit(limit)
        .toArray();

      // Transform inspections to vendor assignment format
      assignments = inspectionsWithVendors
        .filter(insp => insp.assignedVendor)
        .map(insp => ({
          inspectionId: insp._id?.toString() || insp.inspectionId,
          propertyId: insp.propertyId,
          unitId: insp.unitId,
          vendorId: insp.assignedVendor.vendorId,
          vendorName: insp.assignedVendor.vendorName || "Vendor",
          trade: insp.assignedVendor.trade || insp.type || "General",
          scheduledDate: insp.scheduledDate,
          status: mapInspectionStatusToAssignment(insp.status),
          orgId,
          createdAt: insp.createdAt || new Date(),
          createdBy: insp.createdBy || "system",
        }));
    }

    // Calculate statistics
    const stats = {
      total: assignments.length,
      scheduled: assignments.filter((a) => a.status === "scheduled").length,
      inProgress: assignments.filter((a) => a.status === "in-progress").length,
      completed: assignments.filter((a) => a.status === "completed").length,
      cancelled: assignments.filter((a) => a.status === "cancelled").length,
      uniqueVendors: new Set(assignments.map((a) => a.vendorId)).size,
      uniqueTrades: new Set(assignments.map((a) => a.trade)).size,
    };

    return NextResponse.json({
      success: true,
      source: "database",
      assignments: assignments.slice(0, limit),
      stats,
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
 * Map inspection status to assignment status
 */
function mapInspectionStatusToAssignment(inspStatus: string): VendorAssignment["status"] {
  switch (inspStatus) {
    case "scheduled":
    case "pending":
      return "scheduled";
    case "in_progress":
    case "started":
      return "in-progress";
    case "completed":
    case "approved":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "scheduled";
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
 *   vendorName: string,
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

    const { data: body, error: parseError } = await parseBodySafe<{
      inspectionId?: string;
      propertyId?: string;
      unitId?: string;
      vendorId?: string;
      vendorName?: string;
      trade?: string;
      scheduledDate?: string;
    }>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { success: false, error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
    const { inspectionId, propertyId, unitId, vendorId, vendorName, trade, scheduledDate } = body;

    const orgId = session.user.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

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

    const db = await getDatabase();

    // 1. Verify inspection exists and belongs to org
    // Build query - check both _id (if valid ObjectId) and inspectionId field
    const inspectionQuery: Record<string, unknown> = { orgId };
    if (ObjectId.isValid(inspectionId)) {
      inspectionQuery.$or = [
        { _id: new ObjectId(inspectionId) },
        { inspectionId },
      ];
    } else {
      inspectionQuery.inspectionId = inspectionId;
    }
    
    const inspection = await db.collection(INSPECTIONS_COLLECTION).findOne(inspectionQuery);

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found or access denied" },
        { status: 404 },
      );
    }

    // 2. Check if vendor is already assigned to this inspection
    const existingAssignment = await db.collection(VENDOR_ASSIGNMENTS_COLLECTION).findOne({
      inspectionId,
      orgId,
      status: { $ne: "cancelled" },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { 
          error: "Vendor already assigned to this inspection",
          existingAssignment: {
            vendorId: existingAssignment.vendorId,
            vendorName: existingAssignment.vendorName,
            status: existingAssignment.status,
          },
        },
        { status: 409 },
      );
    }

    // 3. Create the assignment record
    const now = new Date();
    const assignment: VendorAssignment = {
      orgId,
      inspectionId,
      propertyId,
      unitId,
      vendorId,
      vendorName: vendorName || `Vendor ${vendorId}`,
      trade,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      status: "scheduled",
      createdAt: now,
      createdBy: session.user.id || "system",
    };

    const result = await db.collection(VENDOR_ASSIGNMENTS_COLLECTION).insertOne(assignment);

    // 4. Update the inspection with the assigned vendor
    await db.collection(INSPECTIONS_COLLECTION).updateOne(
      { _id: inspection._id },
      {
        $set: {
          assignedVendor: {
            vendorId,
            vendorName: assignment.vendorName,
            trade,
            assignedAt: now,
          },
          status: "scheduled",
          updatedAt: now,
        },
      },
    );

    logger.info("Vendor assignment created", {
      assignmentId: result.insertedId.toString(),
      inspectionId,
      vendorId,
      trade,
      orgId,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        source: "database",
        assignment: {
          ...assignment,
          _id: result.insertedId,
        },
        message: "Vendor assigned successfully",
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
