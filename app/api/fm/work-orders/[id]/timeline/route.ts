/**
 * Work Order Timeline API
 * 
 * Returns the complete activity timeline for a work order.
 * Includes status changes, assignments, comments, and attachments.
 * 
 * @module api/fm/work-orders/[id]/timeline
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - VIEW permission on work orders
 * 
 * Timeline Actions:
 * - created: Work order creation
 * - status_changed: Status transitions
 * - assigned: Assignment changes
 * - comment_added: New comments
 * - attachment_added: File uploads
 * - updated: Field modifications
 * 
 * @example GET /api/fm/work-orders/[id]/timeline
 * @returns {WorkOrderTimeline[]} Array of timeline entries, newest first
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { logger } from "@/lib/logger";
import type { WorkOrderTimeline } from "@/types/fm";
import { buildWorkOrderUser } from "../../utils";
import { requireFmAbility } from "../../../utils/auth";
import { resolveTenantId } from "../../../utils/tenant";
import { FMErrors } from "../../../errors";

interface TimelineDocument {
  _id?: { toString?: () => string };
  id?: string;
  workOrderId?: string;
  action?: string;
  description?: string;
  performedAt?: Date | string | number;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  comment?: string;
  [key: string]: unknown;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("VIEW")(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "25", 10),
      100,
    );
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WORKORDER_TIMELINE);
    // RBAC-002 FIX: Use tenantId variable (has fallback) for STRICT v4 tenant isolation
    const filter = { tenantId: tenantId, workOrderId };

    const [entries, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const data: WorkOrderTimeline[] = entries.map(mapTimelineDocument);

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
    logger.error("FM Work Order Timeline GET error", error as Error);
    return FMErrors.internalError();
  }
}

function mapTimelineDocument(doc: TimelineDocument): WorkOrderTimeline {
  const performedAt =
    doc.performedAt instanceof Date
      ? doc.performedAt
      : new Date(doc.performedAt ?? Date.now());

  return {
    id: doc._id?.toString?.() ?? doc.id ?? "",
    workOrderId: doc.workOrderId ?? "",
    action: doc.action ?? "updated",
    description: doc.description ?? "",
    performedAt: performedAt.toISOString(),
    user: buildWorkOrderUser(null, {
      id: doc.performedBy ?? undefined,
      firstName: doc.performedBy ?? "System",
    }),
    metadata:
      doc.metadata ?? (doc.comment ? { comment: doc.comment } : undefined),
  };
}
