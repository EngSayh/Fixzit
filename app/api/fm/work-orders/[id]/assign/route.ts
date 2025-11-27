import { NextRequest, NextResponse } from "next/server";
import { ModifyResult, ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import {
  getCanonicalUserId,
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from "../../utils";
import { resolveTenantId } from "../../../utils/tenant";
import { requireFmAbility } from "../../../utils/auth";
import { FMErrors } from "../../../errors";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("ASSIGN")(req);
    if (actor instanceof NextResponse) return actor;
    const isSuperAdmin = actor.role === 'SUPER_ADMIN';
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId, { isSuperAdmin });
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const body = await req.json();
    const { assigneeId, technicianId, vendorId, notes } = body ?? {};
    if (!assigneeId && !technicianId && !vendorId) {
      return FMErrors.validationError("assigneeId, technicianId, or vendorId is required");
    }

    const db = await getDatabase();
    const now = new Date();
    // STRICT v4.1: Use canonical assignment.assignedTo structure only
    const update: Record<string, unknown> = {
      updatedAt: now,
      assignment: {
        assignedTo: {
          userId: assigneeId || technicianId,
          vendorId: vendorId,
          assignedAt: now,
        },
        assignedBy: actorId,
        assignedAt: now,
        notes,
      },
    };

    const collection = db.collection<WorkOrderDocument>("workorders");
    // RBAC-001 FIX: Use tenantId variable (has fallback) for STRICT v4 tenant isolation
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(workOrderId), orgId: tenantId },
      { $set: update },
      { returnDocument: "after" },
    );

    // @ts-expect-error - Fixed VSCode problem
    const updated = (result as ModifyResult<WorkOrderDocument> | null)?.value;
    if (!updated) {
      return FMErrors.notFound("Work order");
    }

    // RBAC-001 FIX: Use tenantId variable (has fallback) for timeline entry
    await recordTimelineEntry(db, {
      workOrderId,
      tenantId: tenantId, // FIX: Use tenantId variable (has fallback to actor.tenantId)
      action: "assigned",
      description: notes
        ? `Assigned with note: ${notes}`
        : "Assignment updated",
      metadata: { 
        userId: assigneeId || technicianId,
        vendorId,
        assignmentType: vendorId ? 'vendor' : 'internal',
      },
      performedBy: actorId,
      performedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(updated),
      message: "Work order assignment updated",
    });
  } catch (error) {
    logger.error("FM Work Order Assignment API error", error as Error);
    return FMErrors.internalError();
  }
}
