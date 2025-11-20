import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import type { WorkOrderTimeline } from '@/types/fm';
import { buildWorkOrderUser } from '../../utils';
import { requireFmAbility } from '../../../utils/auth';
import { resolveTenantId } from '../../../utils/tenant';
import { FMErrors } from '../../../errors';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const collection = db.collection('workorder_timeline');
    const filter = { tenantId, workOrderId };

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
    logger.error('FM Work Order Timeline GET error', error as Error);
    return FMErrors.internalError();
  }
}

function mapTimelineDocument(doc: any): WorkOrderTimeline {
  const performedAt =
    doc.performedAt instanceof Date
      ? doc.performedAt
      : new Date(doc.performedAt ?? Date.now());

  return {
    id: doc._id?.toString?.() ?? doc.id,
    workOrderId: doc.workOrderId,
    action: doc.action ?? 'updated',
    description: doc.description,
    performedAt: performedAt.toISOString(),
    user: buildWorkOrderUser(null, {
      id: doc.performedBy ?? undefined,
      firstName: doc.performedBy ?? 'System',
    }),
    metadata: doc.metadata ?? (doc.comment ? { comment: doc.comment } : undefined),
  };
}
