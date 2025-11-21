import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getDatabase } from '@/lib/mongodb-unified';
import { WorkOrder } from '@/server/models/WorkOrder';
import { resolveSlaTarget, WorkOrderPriority } from '@/lib/sla';
import { deleteObject } from '@/lib/storage/s3';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const wo = await WorkOrder.findById(params.id);
  if (!wo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(wo, { status: 200 });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const db = await getDatabase();

  // Validate property if provided
  if (body.propertyId) {
    const count = await db.collection('properties').countDocuments({ _id: body.propertyId });
    if (count === 0) return NextResponse.json({ error: 'Invalid propertyId' }, { status: 422 });
  }

  // Validate assignee if provided
  if (body.assignment?.assignedTo?.userId) {
    const count = await db.collection('users').countDocuments({ _id: body.assignment.assignedTo.userId });
    if (count === 0) return NextResponse.json({ error: 'Invalid assignee' }, { status: 422 });
  }

  // Fetch existing for attachment diff
  const existing = await WorkOrder.findOne({ _id: params.id, tenantId: user.tenantId }).select({ attachments: 1 }).lean();
  const existingKeys = new Set((existing?.attachments || []).map((a: any) => a.key).filter(Boolean) as string[]);

  // Build update payload
  const update: Record<string, unknown> = { ...body };
  if (body.propertyId) {
    update.location = {
      propertyId: body.propertyId,
      ...(body.unitNumber ? { unitNumber: body.unitNumber } : {}),
    };
    delete update.propertyId;
    delete update.unitNumber;
  }

  if (body.assignment?.assignedTo?.userId) {
    update.assignment = {
      ...body.assignment,
      assignedAt: new Date(),
    };
  }

  if (body.priority) {
    const { slaMinutes, dueAt } = resolveSlaTarget(body.priority as WorkOrderPriority, new Date());
    update.slaMinutes = slaMinutes;
    update.dueAt = body.dueAt ? new Date(body.dueAt as string) : dueAt;
  }

  const updated = await WorkOrder.findOneAndUpdate(
    { _id: params.id, tenantId: user.tenantId },
    { $set: update },
    { new: true }
  );
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cleanup removed attachments (best effort)
  if (Array.isArray(body.attachments)) {
    const nextKeys = new Set((body.attachments as any[]).map((a) => a.key).filter(Boolean) as string[]);
    const removed = [...existingKeys].filter((k) => !nextKeys.has(k));
    if (removed.length) {
      void Promise.allSettled(
        removed.map(async (key) => {
          try {
            await deleteObject(key);
          } catch (err) {
            logger.error('[WorkOrder PATCH] S3 cleanup failed', { workOrderId: params.id, key, error: err as Error });
            throw err;
          }
        })
      ).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed) {
          logger.warn('[WorkOrder PATCH] S3 cleanup partial failure', {
            workOrderId: params.id,
            total: removed.length,
            failed,
          });
        }
      });
    }
  }

  return NextResponse.json(updated, { status: 200 });
}
