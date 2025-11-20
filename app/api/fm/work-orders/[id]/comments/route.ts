import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import type { WorkOrderComment } from '@/types/fm';
import {
  assertWorkOrderQuota,
  buildWorkOrderUser,
  getCanonicalUserId,
  recordTimelineEntry,
  WorkOrderQuotaError,
  WORK_ORDER_COMMENT_LIMIT,
} from '../../utils';
import { resolveTenantId } from '../../../utils/tenant';
import { requireFmAbility } from '../../../utils/auth';
import { FMErrors } from '../../../errors';

const COMMENT_TYPES = new Set<WorkOrderComment['type']>(['comment', 'internal']);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('VIEW')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId('work order');
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const collection = db.collection('workorder_comments');
    const filter = { tenantId, workOrderId };

    const [comments, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const data: WorkOrderComment[] = comments.map(mapCommentDocument);

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
    logger.error('FM Work Order Comments GET error', error as Error);
    return FMErrors.internalError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('COMMENT')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return FMErrors.invalidId('work order');
    }

    const body = await req.json();
    const comment = (body?.comment || '').trim();
    const type: WorkOrderComment['type'] = COMMENT_TYPES.has(body?.type)
      ? body.type
      : 'comment';

    if (!comment) {
      return FMErrors.validationError('Comment text is required');
    }

    const db = await getDatabase();
    await assertWorkOrderQuota(
      db,
      'workorder_comments',
      tenantId,
      workOrderId,
      WORK_ORDER_COMMENT_LIMIT
    );
    const now = new Date();
    const commentDoc = {
      tenantId,
      workOrderId,
      workOrderObjectId: new ObjectId(workOrderId),
      comment,
      type,
      attachments: body?.attachments ?? [],
      createdAt: now,
      createdBy: {
        id: actorId,
        name: actor.name ?? undefined,
        email: actor.email ?? undefined,
      },
    };

    const result = await db.collection('workorder_comments').insertOne(commentDoc);

    await recordTimelineEntry(db, {
      workOrderId,
      tenantId,
      action: 'comment_added',
      description: comment.slice(0, 240),
      metadata: {
        commentId: result.insertedId.toString(),
        type,
      },
      performedBy: actorId,
      performedAt: now,
    });

    const createdComment: WorkOrderComment = mapCommentDocument({
      _id: result.insertedId,
      ...commentDoc,
    });

    return NextResponse.json(
      { success: true, data: createdComment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof WorkOrderQuotaError) {
      return FMErrors.rateLimited(error.message, {
        limit: error.limit,
        resource: 'comments',
      });
    }
    logger.error('FM Work Order Comments POST error', error as Error);
    return FMErrors.internalError();
  }
}

function mapCommentDocument(doc: any): WorkOrderComment {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  const createdBy = doc.createdBy || {};

  return {
    id: doc._id?.toString?.() ?? doc.id,
    workOrderId: doc.workOrderId,
    comment: doc.comment,
    type: COMMENT_TYPES.has(doc.type) ? doc.type : 'comment',
    createdAt: createdAt.toISOString(),
    user: buildWorkOrderUser(null, {
      id: createdBy.id ?? createdBy.email ?? undefined,
      firstName: createdBy.firstName ?? createdBy.name ?? undefined,
      lastName: createdBy.lastName ?? '',
      email: createdBy.email,
    }),
  };
}
