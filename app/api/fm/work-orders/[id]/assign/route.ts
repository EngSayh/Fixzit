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
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
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
    const { assigneeId, technicianId, notes } = body ?? {};
    if (!assigneeId && !technicianId) {
      return FMErrors.validationError("assigneeId or technicianId is required");
    }

    const db = await getDatabase();
    const now = new Date();
    const update: Record<string, unknown> = {
      updatedAt: now,
      assignment: {
        assignedBy: actorId,
        assignedAt: now,
        notes,
      },
    };

    if (assigneeId) {
      update.assigneeId = assigneeId;
    }
    if (technicianId) {
      update.technicianId = technicianId;
    }

    const collection = db.collection<WorkOrderDocument>("workorders");
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(workOrderId), tenantId },
      { $set: update },
      { returnDocument: "after" },
    );

    // @ts-expect-error - Fixed VSCode problem
    const updated = (result as ModifyResult<WorkOrderDocument> | null)?.value;
    if (!updated) {
      return FMErrors.notFound("Work order");
    }

    await recordTimelineEntry(db, {
      workOrderId,
      tenantId,
      action: "assigned",
      description: notes
        ? `Assigned with note: ${notes}`
        : "Assignment updated",
      metadata: { assigneeId, technicianId },
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
