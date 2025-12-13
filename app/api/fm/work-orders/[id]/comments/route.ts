/**
 * @fileoverview Work Order Comments API
 * @description Manages comments and internal notes on work orders.
 * Supports both public comments (visible to all stakeholders) and
 * internal notes (visible only to staff).
 *
 * @route GET /api/fm/work-orders/[id]/comments - List comments
 * @route POST /api/fm/work-orders/[id]/comments - Add comment
 * @module api/fm/work-orders/[id]/comments
 * @requires Authentication - Valid session required
 * @requires Authorization - VIEW permission for GET, EDIT for POST
 *
 * Rate Limits:
 * - Comments per work order: 100 max
 * - Timeline entries per work order: 200 max
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import type { WorkOrderComment } from "@/types/fm";
import { WorkOrderComment as WorkOrderCommentModel } from "@/server/models/workorder/WorkOrderComment";
import {
  assertWorkOrderQuota,
  buildWorkOrderUser,
  getCanonicalUserId,
  recordTimelineEntry,
  WorkOrderQuotaError,
  WORK_ORDER_COMMENT_LIMIT,
  WORK_ORDER_TIMELINE_LIMIT,
} from "../../utils";
import { resolveTenantId } from "../../../utils/tenant";
import { requireFmAbility } from "../../../utils/fm-auth";
import { FMErrors } from "../../../errors";

/**
 * Zod schema for comment creation
 */
const CreateCommentSchema = z.object({
  comment: z.string().min(1, "Comment text is required").max(5000),
  type: z.enum(["comment", "internal"]).optional().default("comment"),
});

interface CommentDocument {
  _id?: { toString?: () => string };
  id?: string;
  workOrderId?: string | ObjectId;
  comment?: string;
  type?: string;
  createdAt?: Date | string | number;
  createdBy?: {
    id?: string | null;
    email?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  [key: string]: unknown;
}

const COMMENT_TYPES = new Set<WorkOrderComment["type"]>([
  "comment",
  "internal",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limit: 60 requests per minute
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`fm:comments:list:${clientIp}`, 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const actor = await requireFmAbility("VIEW")(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId: orgId } = tenantResult;

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const skip = (page - 1) * limit;

    const filter = { orgId, workOrderId };

    const [comments, total] = await Promise.all([
      WorkOrderCommentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkOrderCommentModel.countDocuments(filter),
    ]);

    const data: WorkOrderComment[] = comments.map((doc) =>
      mapCommentDocument(doc as CommentDocument),
    );

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
    logger.error("FM Work Order Comments GET error", error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limit: 30 comments per minute
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`fm:comments:create:${clientIp}`, 30, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const actor = await requireFmAbility("COMMENT")(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ("error" in tenantResult) return tenantResult.error;
    const { tenantId: orgId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError("User identifier is required");
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId("work order");
    }

    const { data: rawBody, error: parseError } = await parseBodySafe(req, { logPrefix: "[fm:work-order-comments]" });
    if (parseError) {
      return FMErrors.validationError("Invalid request body");
    }
    const parsed = CreateCommentSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      return FMErrors.validationError(
        parsed.error.issues[0]?.message || "Invalid comment data"
      );
    }
    
    const { comment, type } = parsed.data;
    const attachments = (rawBody as Record<string, unknown>)?.attachments ?? [];

    await assertWorkOrderQuota(
      "workorder_comments",
      orgId,
      workOrderId,
      WORK_ORDER_COMMENT_LIMIT,
    );
    const now = new Date();
    const commentDoc = {
      orgId,
      workOrderId,
      comment,
      type,
      attachments: attachments as unknown[],
      createdAt: now,
      createdBy: {
        id: actorId,
        name: actor.name ?? undefined,
        email: actor.email ?? undefined,
      },
    };

    const result = await WorkOrderCommentModel.create(commentDoc);

    await recordTimelineEntry(
      {
        workOrderId,
        orgId,
        action: "comment_added",
        description: comment.slice(0, 240),
        metadata: {
          commentId: result.id.toString(),
          type,
        },
        performedBy: actorId,
        performedAt: now,
      },
      WORK_ORDER_TIMELINE_LIMIT,
    );

    const createdComment: WorkOrderComment = mapCommentDocument({
      _id: result._id,
      ...commentDoc,
    });

    return NextResponse.json(
      { success: true, data: createdComment },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WorkOrderQuotaError) {
      return FMErrors.rateLimited(error.message, {
        limit: error.limit,
        resource: "comments",
      });
    }
    logger.error("FM Work Order Comments POST error", error as Error);
    return FMErrors.internalError();
  }
}

function mapCommentDocument(doc: CommentDocument): WorkOrderComment {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt
      : new Date(doc.createdAt ?? Date.now());
  const createdBy = doc.createdBy || {};

  const workOrderId =
    typeof doc.workOrderId === "string"
      ? doc.workOrderId
      : doc.workOrderId?.toString?.() ?? "";

  return {
    id: doc._id?.toString?.() ?? doc.id ?? "",
    workOrderId,
    comment: doc.comment ?? "",
    type: (COMMENT_TYPES.has(doc.type as "comment" | "internal")
      ? doc.type
      : "comment") as "comment" | "internal",
    createdAt: createdAt.toISOString(),
    user: buildWorkOrderUser(null, {
      id: createdBy.id ?? createdBy.email ?? undefined,
      firstName: createdBy.firstName ?? createdBy.name ?? undefined,
      lastName: createdBy.lastName ?? "",
      email: createdBy.email,
    }),
  };
}
