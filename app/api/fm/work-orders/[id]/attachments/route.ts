/**
 * @fileoverview Work Order Attachments API
 * @description Manages file attachments (photos, documents) for work orders.
 * Supports image uploads with thumbnail generation.
 *
 * @route GET /api/fm/work-orders/[id]/attachments - List attachments
 * @route POST /api/fm/work-orders/[id]/attachments - Upload attachment
 * @module api/fm/work-orders/[id]/attachments
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - VIEW for GET, EDIT for POST/DELETE
 *
 * Attachment Types:
 * - image/*: Photos with auto-generated thumbnails
 * - application/pdf: PDF documents
 * - Other document types
 *
 * Quotas:
 * - Max attachments per work order: 50
 * - Max timeline entries per work order: 200
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";
import { unwrapFindOneResult } from "@/lib/mongoUtils.server";
import { logger } from "@/lib/logger";
import type { WorkOrderPhoto } from "@/types/fm";
import { WorkOrderAttachment } from "@/server/models/workorder/WorkOrderAttachment";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  assertWorkOrderQuota,
  getCanonicalUserId,
  recordTimelineEntry,
  WORK_ORDER_ATTACHMENT_LIMIT,
  WorkOrderQuotaError,
  WORK_ORDER_TIMELINE_LIMIT,
} from "../../utils";
import { resolveTenantId } from "../../../utils/tenant";
import { requireFmAbility } from "../../../utils/fm-auth";
import { FMErrors } from "../../../errors";

type AttachmentDocument = Partial<{
  _id: { toString?: () => string };
  id: string;
  workOrderId: string | ObjectId;
  url: string;
  thumbnailUrl: string | null | undefined;
  type: string | null;
  caption: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date | string | number;
}> & Record<string, unknown>;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "fm-workorders-attachments:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await requireFmAbility("VIEW")(req);
    if (actor instanceof NextResponse) return actor;
    const isSuperAdmin = actor.role === 'SUPER_ADMIN';
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId || actor.tenantId,
      { isSuperAdmin }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId: orgId } = tenantResolution;  // Use orgId for consistency

    if (!getCanonicalUserId(actor)) {
      return FMErrors.validationError("User identifier is required");
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const db = await getDatabase();
    const attachments = await db
      .collection(COLLECTIONS.WORKORDER_ATTACHMENTS)
      .find({ orgId, workOrderId })
      .sort({ uploadedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: attachments.map((doc) => mapAttachmentDocument(doc as AttachmentDocument)),
    });
  } catch (error) {
    logger.error("FM Work Order Attachments GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("EDIT")(req);
    if (actor instanceof NextResponse) return actor;
    const isSuperAdmin = actor.role === 'SUPER_ADMIN';
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId || actor.tenantId,
      { isSuperAdmin }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId: orgId } = tenantResolution;  // Use orgId for consistency

    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const body = await req.json();
    const url = (body?.url || "").trim();
    if (!url) {
      return FMErrors.validationError("Attachment URL is required");
    }

    const type: WorkOrderPhoto["type"] = body?.type ?? "attachment";
    const now = new Date();
    await getDatabase();
    await assertWorkOrderQuota(
      COLLECTIONS.WORKORDER_ATTACHMENTS,
      orgId,
      workOrderId,
      WORK_ORDER_ATTACHMENT_LIMIT,
    );
    const attachmentDoc = {
      orgId,  // STRICT v4.1: Use orgId instead of tenantId
      workOrderId,
      url,
      thumbnailUrl: body?.thumbnailUrl,
      caption: body?.caption,
      type,
      fileName: body?.fileName,
      fileSize: body?.fileSize,
      uploadedAt: now,
      metadata: body?.metadata,
      uploadedBy: {
        id: actorId,
        name: actor.name ?? undefined,
        email: actor.email ?? undefined,
      },
    };

    const result = await WorkOrderAttachment.create(attachmentDoc);

    await recordTimelineEntry({
      workOrderId,
      orgId,  // STRICT v4.1: Use orgId for timeline
      action: "photo_uploaded",
      description: body?.caption || body?.fileName || "Attachment uploaded",
      metadata: {
        attachmentId: result._id.toString(),
        type,
      },
      performedBy: actorId,
      performedAt: now,
    }, WORK_ORDER_TIMELINE_LIMIT);

    return NextResponse.json(
      {
        success: true,
        data: mapAttachmentDocument({
          _id: result._id,
          ...attachmentDoc,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WorkOrderQuotaError) {
      return FMErrors.rateLimited(error.message, {
        limit: error.limit,
        resource: "attachments",
      });
    }
    logger.error("FM Work Order Attachments POST error", error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireFmAbility("EDIT")(req);
    if (actor instanceof NextResponse) return actor;
    const isSuperAdmin = actor.role === 'SUPER_ADMIN';
    const tenantResolution = resolveTenantId(
      req,
      actor.orgId || actor.tenantId,
      { isSuperAdmin }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId: orgId } = tenantResolution;  // Use orgId for consistency

    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");
    if (!attachmentId) {
      return FMErrors.validationError(
        "attachmentId query parameter is required",
      );
    }
    if (!ObjectId.isValid(attachmentId)) {
      return FMErrors.invalidId("attachment");
    }

    await getDatabase();
    const result = unwrapFindOneResult(
      await WorkOrderAttachment.findOneAndDelete({
        _id: new ObjectId(attachmentId),
        orgId,
        workOrderId,
      }).lean(),
    );

    if (!result) {
      return FMErrors.notFound("Attachment");
    }

    await recordTimelineEntry({
      workOrderId,
      orgId,  // STRICT v4.1: Use orgId for timeline
      action: "photo_removed",
      description: `Attachment removed: ${result.caption || result.fileName || result.url}`,
      metadata: {
        attachmentId,
      },
      performedBy: actorId,
      performedAt: new Date(),
    }, WORK_ORDER_TIMELINE_LIMIT);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("FM Work Order Attachments DELETE error", error as Error);
    return FMErrors.internalError();
  }
}

function mapAttachmentDocument(doc: AttachmentDocument): WorkOrderPhoto {
  const uploadedAt =
    doc.uploadedAt instanceof Date
      ? doc.uploadedAt
      : new Date(doc.uploadedAt ?? Date.now());

  return {
    id: doc._id?.toString?.() ?? doc.id ?? "",
    url: doc.url ?? "",
    thumbnailUrl: doc.thumbnailUrl ?? undefined,
    type:
      (doc.type as "before" | "after" | "attachment" | undefined) ??
      "attachment",
    caption: doc.caption ?? doc.fileName ?? "",
    uploadedAt: uploadedAt.toISOString(),
  };
}
