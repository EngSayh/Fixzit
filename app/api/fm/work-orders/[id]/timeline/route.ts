/**
 * @fileoverview Work Order Timeline API
 * @description Returns the complete activity timeline for a work order.
 * Includes status changes, assignments, comments, and attachments.
 *
 * @route GET /api/fm/work-orders/[id]/timeline - Get timeline entries
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
 * @returns {WorkOrderTimeline[]} Array of timeline entries, newest first
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import type { WorkOrderTimeline } from "@/types/fm";
import { WorkOrderTimeline as WorkOrderTimelineModel } from "@/server/models/workorder/WorkOrderTimeline";
import { buildWorkOrderUser } from "../../utils";
import { requireFmAbility } from "../../../utils/fm-auth";
import { resolveTenantId } from "../../../utils/tenant";
import { FMErrors } from "../../../errors";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

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
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-workorders-timeline:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

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

    // TD-001: Migrated from db.collection() to WorkOrderTimeline Mongoose model
    const filter = { orgId: tenantId, workOrderId };

    const [entries, total] = await Promise.all([
      WorkOrderTimelineModel.find(filter)
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkOrderTimelineModel.countDocuments(filter),
    ]);

    // Map with type assertion for lean() result
    const data: WorkOrderTimeline[] = entries.map((doc) => mapTimelineDocument(doc as unknown as TimelineDocument));

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
