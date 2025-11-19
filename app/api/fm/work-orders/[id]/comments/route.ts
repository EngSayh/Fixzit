import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import type { WorkOrderComment } from '@/types/fm';
import { buildWorkOrderUser } from '../../utils';

const COMMENT_TYPES = new Set<WorkOrderComment['type']>(['comment', 'internal']);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing x-tenant-id header' }, { status: 400 });
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing x-tenant-id header' }, { status: 400 });
    }

    const workOrderId = params.id;
    if (!ObjectId.isValid(workOrderId)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const body = await req.json();
    const comment = (body?.comment || '').trim();
    const type: WorkOrderComment['type'] = COMMENT_TYPES.has(body?.type)
      ? body.type
      : 'comment';

    if (!comment) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const db = await getDatabase();
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
        id: session.user.id || session.user.email,
        name: session.user.name,
        email: session.user.email,
      },
    };

    const result = await db.collection('workorder_comments').insertOne(commentDoc);

    await db.collection('workorder_timeline').insertOne({
      workOrderId,
      tenantId,
      action: 'comment_added',
      description: comment.slice(0, 240),
      metadata: {
        commentId: result.insertedId.toString(),
        type,
      },
      performedBy: session.user.id || session.user.email,
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
    logger.error('FM Work Order Comments POST error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
