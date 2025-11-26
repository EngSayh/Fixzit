/**
 * FM Work Orders API - Individual Work Order Operations
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type ModifyResult } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { WOStatus } from "@/types/fm";
import { logger } from "@/lib/logger";
import {
  getCanonicalUserId,
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from "../utils";
import { resolveTenantId } from "../../utils/tenant";
import { requireFmAbility } from "../../utils/auth";
import { FMErrors } from "../../errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("VIEW")(req);
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId, {
      isSuperAdmin: actor.isSuperAdmin,
      userId: actor.id,
      allowHeaderOverride: actor.isSuperAdmin,
    });
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId("work order");
    }

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>("workorders");
    
    // RBAC-005: Build role-based filter per STRICT v4 multi-tenant isolation
    const baseFilter: Record<string, unknown> = {
      _id: new ObjectId(id),
      orgId: actor.orgId, // Fixed: use orgId (not tenantId)
    };
    
    // Scope by role to enforce assignment/ownership
    // BLOCKER FIX: Add empty-unit guard for TENANT role and use canonical paths
    if (actor.role === "TENANT") {
      if (!actor.units?.length) {
        return NextResponse.json(
          { error: "No units assigned to this tenant" },
          { status: 403 }
        );
      }
      // Use $or to match both legacy and canonical field paths
      baseFilter.$or = [
        { "location.unitNumber": { $in: actor.units } },
        { unit_id: { $in: actor.units } },
        { unitId: { $in: actor.units } },
      ];
    }
    // BLOCKER FIX: Use correct session field 'id' (not 'userId') and canonical schema paths
    // MIGRATION FIX: Support both legacy flat fields and canonical paths for legacy data
    const actorId = actor.id;
    if (actor.role === "TECHNICIAN" && actorId) {
      // Support both canonical and legacy paths
      baseFilter.$or = [
        ...(baseFilter.$or || []),
        { "assignment.assignedTo.userId": actorId },
        { technicianId: actorId },
        { assignedTo: actorId },
      ];
    }
    if (actor.role === "VENDOR" && actor.vendorId) {
      // Support both canonical and legacy paths
      baseFilter.$or = [
        ...(baseFilter.$or || []),
        { "assignment.assignedTo.vendorId": actor.vendorId },
        { vendorId: actor.vendorId },
      ];
    }
    // ADMIN, MANAGER, FM_MANAGER, PROPERTY_MANAGER see all org work orders
    
    const workOrder = await collection.findOne(baseFilter);

    if (!workOrder) {
      return FMErrors.notFound("Work order");
    }

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(workOrder),
    });
  } catch (error) {
    logger.error("FM Work Order API - GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("EDIT")(req);
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId, {
      isSuperAdmin: actor.isSuperAdmin,
      userId: actor.id,
      allowHeaderOverride: actor.isSuperAdmin,
    });
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId("work order");
    }

    const body = await req.json();
    const update: Record<string, unknown> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };
    
    // RBAC-006: Build role-based filter for updates
    const baseFilter: Record<string, unknown> = {
      _id: new ObjectId(id),
      orgId: actor.orgId, // Fixed: use orgId (not tenantId)
    };
    
    // BLOCKER FIX: Add empty-unit guard for TENANT role and use canonical paths
    if (actor.role === "TENANT") {
      if (!actor.units?.length) {
        return NextResponse.json(
          { error: "No units assigned to this tenant" },
          { status: 403 }
        );
      }
      baseFilter.$or = [
        { "location.unitNumber": { $in: actor.units } },
        { unit_id: { $in: actor.units } },
        { unitId: { $in: actor.units } },
      ];
    }
    // BLOCKER FIX: Use correct session field 'id' (not 'userId') and canonical schema paths
    // MIGRATION FIX: Support both legacy flat fields and canonical paths for legacy data
    const actorIdForFilter = actor.id;
    if (actor.role === "TECHNICIAN" && actorIdForFilter) {
      // Support both canonical and legacy paths
      baseFilter.$or = [
        ...(baseFilter.$or || []),
        { "assignment.assignedTo.userId": actorIdForFilter },
        { technicianId: actorIdForFilter },
        { assignedTo: actorIdForFilter },
      ];
    }
    if (actor.role === "VENDOR" && actor.vendorId) {
      // Support both canonical and legacy paths
      baseFilter.$or = [
        ...(baseFilter.$or || []),
        { "assignment.assignedTo.vendorId": actor.vendorId },
        { vendorId: actor.vendorId },
      ];
    }
    
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "category",
      "propertyId",
      "unitId",
      "assignedTo", // Fixed: assignedTo (not assigneeId)
      "technicianId",
      "vendorId", // Added for vendor assignment tracking
      "scheduledAt",
      "startedAt",
      "completedAt",
      "estimatedCost",
      "actualCost",
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        update[field] = body[field];
      }
    });

    if (update.scheduledAt)
      update.scheduledAt = new Date(update.scheduledAt as string);
    if (update.startedAt)
      update.startedAt = new Date(update.startedAt as string);
    if (update.completedAt)
      update.completedAt = new Date(update.completedAt as string);

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>("workorders");
    
    // Use role-based filter for finding and updating (RBAC-006)
    const existingWorkOrder = await collection.findOne(baseFilter);

    if (!existingWorkOrder) {
      return FMErrors.notFound("Work order");
    }

    const result = (await collection.findOneAndUpdate(
      baseFilter, // Fixed: use role-based filter
      { $set: update },
      { returnDocument: "after" },
    )) as unknown as ModifyResult<WorkOrderDocument>;

    const updatedDoc = result.value;
    if (!updatedDoc) {
      return FMErrors.notFound("Work order");
    }

    if (body.status && existingWorkOrder.status !== body.status) {
      await recordTimelineEntry(db, {
        workOrderId: id,
        tenantId: tenantId, // FIX: Use tenantId variable (has fallback to actor.tenantId)
        action: "status_changed",
        description: `Status changed to ${body.status}`,
        metadata: {
          toStatus: body.status,
          fromStatus: existingWorkOrder.status,
        },
        performedBy: actorId,
        performedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(updatedDoc),
    });
  } catch (error) {
    logger.error("FM Work Order API - PATCH error", error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("DELETE")(req);
    if (actor instanceof NextResponse) return actor;
    // AUDIT-2025-11-26: Pass Super Admin context for proper audit logging
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId, {
      isSuperAdmin: actor.isSuperAdmin,
      userId: actor.id,
      allowHeaderOverride: actor.isSuperAdmin,
    });
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId("work order");
    }

    // RBAC-007: Build role-based filter for deletion
    const baseFilter: Record<string, unknown> = {
      _id: new ObjectId(id),
      orgId: actor.orgId, // Fixed: use orgId (not tenantId)
    };
    
    // BLOCKER FIX: Add empty-unit guard for TENANT role and use canonical paths
    if (actor.role === "TENANT") {
      if (!actor.units?.length) {
        return NextResponse.json(
          { error: "No units assigned to this tenant" },
          { status: 403 }
        );
      }
      baseFilter.$or = [
        { "location.unitNumber": { $in: actor.units } },
        { unit_id: { $in: actor.units } },
        { unitId: { $in: actor.units } },
      ];
    }
    // BLOCKER FIX: Use correct session field 'id' (not 'userId') and canonical schema paths
    const actorIdForDelete = actor.id;
    if (actor.role === "TECHNICIAN" && actorIdForDelete) {
      baseFilter["assignment.assignedTo.userId"] = actorIdForDelete;
    }
    if (actor.role === "VENDOR" && actor.vendorId) {
      baseFilter["assignment.assignedTo.vendorId"] = actor.vendorId;
    }

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>("workorders");
    const deleteResult = (await collection.findOneAndUpdate(
      baseFilter, // Fixed: use role-based filter
      {
        $set: {
          status: WOStatus.CLOSED,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    )) as unknown as ModifyResult<WorkOrderDocument>;

    const deletedWorkOrder = deleteResult.value;
    if (!deletedWorkOrder) {
      return FMErrors.notFound("Work order");
    }

    await recordTimelineEntry(db, {
      workOrderId: id,
      tenantId: tenantId, // FIX: Use tenantId variable (has fallback to actor.tenantId)
      action: "status_changed",
      description: "Work order closed",
      metadata: { toStatus: WOStatus.CLOSED },
      performedBy: actorId,
      performedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Work order deleted successfully",
    });
  } catch (error) {
    logger.error("FM Work Order API - DELETE error", error as Error);
    return FMErrors.internalError();
  }
}
