/**
 * @fileoverview FM Work Orders API - Main Route
 * @description List and create FM work orders with filtering, pagination, and search.
 * Enforces tenant isolation via authenticated org context and RBAC permissions.
 * @route GET /api/fm/work-orders - List work orders with filtering
 * @route POST /api/fm/work-orders - Create a new work order
 * @access Protected - Requires VIEW or CREATE ability
 * @module fm/work-orders
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseBodySafe } from "@/lib/api/parse-body";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { WOStatus, WOPriority, type WorkOrder, WOCategory } from "@/types/fm";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import {
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from "./utils";
import {
  onTicketCreated,
  type NotificationChannel,
  type NotificationRecipient,
} from "@/lib/fm-notifications";
import { FMErrors } from "../errors";
import { requireFmAbility } from "../utils/fm-auth";

/**
 * Zod schema for work order creation
 */
const CreateWorkOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(5000),
  priority: z.nativeEnum(WOPriority).optional(),
  category: z.nativeEnum(WOCategory).optional(),
  unitId: z.string().optional(),
  propertyId: z.string().optional(),
  location: z.object({
    propertyId: z.string().optional(),
    unitNumber: z.string().optional(),
  }).optional(),
  attachments: z.array(z.any()).optional(),
  // Assignment fields
  assigneeId: z.string().optional(),
  assignedTo: z.string().optional(),
  vendorId: z.string().optional(),
  // Scheduling fields
  scheduledAt: z.string().optional(),
  estimatedCost: z.number().optional(),
  currency: z.string().optional(),
});

export async function GET(req: NextRequest) {
  // Rate limit: 60 requests per minute
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`fm:work-orders:list:${clientIp}`, 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const abilityCheck = await requireFmAbility("VIEW")(req);
    if (abilityCheck instanceof NextResponse) return abilityCheck;
    const tenantId = abilityCheck.orgId ?? abilityCheck.tenantId;
    if (!tenantId) {
      return FMErrors.missingTenant();
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    ); // Max 100 per page
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const propertyId = searchParams.get("propertyId");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");

    // Build query - RBAC-001: Use orgId per STRICT v4.1 (migrated from tenantId)
    // SEC-001 FIX: Use tenantId scope variable (with fallback) instead of raw abilityCheck.orgId
    const query: Record<string, unknown> = { orgId: tenantId };
    
    // Use $and to combine multiple filter conditions without overwriting
    const andFilters: Record<string, unknown>[] = [];

    // RBAC-002: TENANT role unit filtering per STRICT v4.1 spec
    // BLOCKER FIX: Use canonical schema path 'location.unitNumber' or 'unit_id'
    if (abilityCheck.role === "TENANT") {
      const userUnits = abilityCheck.units || [];
      if (userUnits.length === 0) {
        return NextResponse.json(
          { error: "No units assigned to this tenant" },
          { status: 403 }
        );
      }
      // Use both field names to support legacy and new documents
      // FIX: Add to $and array instead of setting $or directly (prevents search overwrite)
      andFilters.push({
        $or: [
          { "location.unitNumber": { $in: userUnits } },
          { unit_id: { $in: userUnits } },
          { unitId: { $in: userUnits } },
        ]
      });
    }

    if (status) {
      query.status = { $in: status.split(",") };
    }

    if (priority) {
      query.priority = { $in: priority.split(",") };
    }

    if (propertyId) {
      query.propertyId = propertyId;
    }

    // FIX: Use canonical schema path for assigneeId filter
    if (assigneeId) {
      andFilters.push({
        $or: [
          { "assignment.assignedTo.userId": assigneeId },
          { assignedTo: assigneeId }, // Legacy support
        ]
      });
    }

    // 🔒 RBAC-003: Filter by vendor for VENDOR role per STRICT v4
    // BLOCKER FIX: Use canonical schema path 'assignment.assignedTo.vendorId'
    // MIGRATION FIX: Support both legacy vendorId and canonical path for legacy data
    if (abilityCheck.role === "VENDOR" && abilityCheck.vendorId) {
      andFilters.push({
        $or: [
          { "assignment.assignedTo.vendorId": abilityCheck.vendorId },
          { vendorId: abilityCheck.vendorId }, // Legacy support
        ]
      });
    }

    // 🔒 RBAC-004: Filter by assignee for TECHNICIAN role per STRICT v4
    // BLOCKER FIX: Use canonical schema path 'assignment.assignedTo.userId' and correct session field 'id' (not 'userId')
    // MIGRATION FIX: Support both legacy flat fields and canonical path for legacy data
    const actorId = abilityCheck.id;
    if (abilityCheck.role === "TECHNICIAN" && actorId) {
      andFilters.push({
        $or: [
          { "assignment.assignedTo.userId": actorId },
          { technicianId: actorId }, // Legacy support
          { assignedTo: actorId }, // Legacy support
        ]
      });
    }

    // FIX: Add search to $and filters instead of overwriting $or
    if (search) {
      // Escape special regex characters to prevent injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andFilters.push({
        $or: [
          { title: { $regex: escapedSearch, $options: "i" } },
          { description: { $regex: escapedSearch, $options: "i" } },
          { workOrderNumber: { $regex: escapedSearch, $options: "i" } },
        ]
      });
    }
    
    // Apply $and filters if any exist
    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>(COLLECTIONS.WORK_ORDERS);

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [workOrders, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    // Transform MongoDB documents to WorkOrder interface
    const data: WorkOrder[] = workOrders.map(mapWorkOrderDocument);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("FM Work Orders API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

/**
 * FM Work Orders API - POST /api/fm/work-orders
 *
 * Create a new work order
 */
export async function POST(req: NextRequest) {
  // Rate limit: 30 work order creations per minute
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`fm:work-orders:create:${clientIp}`, 30, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const abilityCheck = await requireFmAbility("CREATE")(req);
    if (abilityCheck instanceof NextResponse) return abilityCheck;
    const tenantId = abilityCheck.orgId ?? abilityCheck.tenantId;
    if (!tenantId) {
      return FMErrors.missingTenant();
    }

    const { data: rawBody, error: parseError } = await parseBodySafe(req, { logPrefix: "[fm:work-orders]" });
    if (parseError) {
      return FMErrors.validationError("Invalid request body");
    }
    const parsed = CreateWorkOrderSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return FMErrors.validationError(
        firstError?.message || "Invalid work order data",
        { errors: parsed.error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })) }
      );
    }
    
    const body = parsed.data;

    // Validate enum fields if provided
    if (body.priority && !Object.values(WOPriority).includes(body.priority)) {
      return FMErrors.validationError("Invalid priority value", {
        allowed: Object.values(WOPriority),
      });
    }

    if (body.category && !Object.values(WOCategory).includes(body.category)) {
      return FMErrors.validationError("Invalid category value", {
        allowed: Object.values(WOCategory),
      });
    }
    
    // FIX: Validate tenant can only create work orders for their assigned units
    // STRICT v4: Tenant unit ownership enforcement
    if (abilityCheck.role === "TENANT") {
      const userUnits = abilityCheck.units || [];
      if (userUnits.length === 0) {
        return NextResponse.json(
          { error: "No units assigned to this tenant" },
          { status: 403 }
        );
      }
      // If unitId provided, validate it belongs to tenant's assigned units
      if (body.unitId && !userUnits.includes(body.unitId)) {
        return FMErrors.validationError(
          "Unit not allowed for this tenant. You can only create work orders for your assigned units.",
          { allowedUnits: userUnits }
        );
      }
      // If no unitId provided for tenant, require it
      if (!body.unitId) {
        return FMErrors.validationError(
          "Unit ID is required for tenant work orders",
          { allowedUnits: userUnits }
        );
      }
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>("workorders");

    // Generate work order number (format: WO-YYYYMMDD-XXXX)
    // DATA-001 FIX: Use orgId scope (via tenantId variable) for numbering consistency with reads
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await collection.countDocuments({ orgId: tenantId });
    const workOrderNumber = `WO-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    // Create work order document - BLOCKER FIX: use canonical schema fields
    // AUDIT-2025-11-26: Removed tenantId - use only orgId per STRICT v4.1
    // FIX: Use tenantId variable (which has fallback) not raw abilityCheck.orgId
    const workOrder: WorkOrderDocument = {
      orgId: tenantId, // FIX: Use scoped tenantId (has fallback to abilityCheck.tenantId)
      workOrderNumber,
      title: body.title,
      description: body.description,
      status: WOStatus.NEW,
      priority: body.priority || WOPriority.MEDIUM,
      category: body.category,
      propertyId: body.propertyId,
      // AUDIT-2025-11-26: Use only unitId (camelCase) per STRICT v4.1
      // Removed: unit_id (snake_case), location.unitNumber (redundant)
      unitId: body.unitId,
      requesterId: abilityCheck.id ?? abilityCheck.email,
      // BLOCKER FIX: Use canonical assignment structure from WorkOrder schema
      // AUDIT-2025-11-26: Removed legacy flat fields (assignedTo, technicianId, vendorId)
      // Use only canonical nested structure per STRICT v4.1
      assignment: {
        assignedTo: {
          userId: body.assigneeId || body.assignedTo,
          vendorId: body.vendorId,
          name: undefined, // Will be populated by service layer
        },
        assignedBy: abilityCheck.id,
        assignedAt: body.assigneeId || body.assignedTo || body.vendorId ? new Date() : undefined,
      },
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      estimatedCost: body.estimatedCost,
      currency: body.currency || "SAR",
      slaHours: calculateSLA(body.priority || WOPriority.MEDIUM),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into database
    const result = await collection.insertOne(workOrder);

    // Trigger notifications to relevant users
    try {
      // Get recipients (managers, assignee if exists)
      const recipients: NotificationRecipient[] = [];

      // Add assignee if specified - use canonical assignment structure
      // SEC-002 FIX: Scope user lookup to same org to prevent cross-org PII leakage
      const assigneeUserId = workOrder.assignment?.assignedTo?.userId;
      if (assigneeUserId) {
        const assigneeIdString = String(assigneeUserId);
        const assigneeObjectId = ObjectId.isValid(assigneeIdString)
          ? new ObjectId(assigneeIdString)
          : null;
        if (assigneeObjectId) {
          const assignee = await db
            .collection(COLLECTIONS.USERS)
            .findOne({ _id: assigneeObjectId, orgId: tenantId });
          if (assignee?.email) {
            recipients.push({
              userId: assigneeIdString,
              name: assignee.name || assignee.email,
              email: assignee.email,
              phone: assignee.phone,
              preferredChannels: ["email", "push"] as NotificationChannel[],
            });
          }
        }
      }

      if (recipients.length > 0) {
        await onTicketCreated(
          tenantId,
          workOrderNumber,
          abilityCheck.name || abilityCheck.email || "User",
          body.priority || WOPriority.MEDIUM,
          body.description,
          recipients,
        );
      }
    } catch (notifError) {
      // Log but don't fail the request
      logger.error(
        "Failed to send work order creation notification",
        notifError as Error,
      );
    }

    await recordTimelineEntry({
      workOrderId: result.insertedId.toString(),
      orgId: tenantId, // FIX: Use scoped tenantId (has fallback)
      action: "created",
      description: "Work order created",
      metadata: { status: WOStatus.NEW },
      performedBy: abilityCheck.id ?? abilityCheck.email,
      performedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.insertedId.toString(),
          ...workOrder,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("FM Work Orders API - POST error", error as Error);
    return FMErrors.internalError();
  }
}

/**
 * Calculate SLA hours based on priority
 */
function calculateSLA(priority: WOPriority): number {
  const slaMap: Record<WOPriority, number> = {
    [WOPriority.CRITICAL]: 4, // 4 hours
    [WOPriority.HIGH]: 24, // 1 day
    [WOPriority.MEDIUM]: 72, // 3 days
    [WOPriority.LOW]: 168, // 7 days
  };
  return slaMap[priority] || 72;
}
