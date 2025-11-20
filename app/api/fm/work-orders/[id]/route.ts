/**
 * FM Work Orders API - Individual Work Order Operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type ModifyResult } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { WOStatus, type WorkOrder } from '@/types/fm';
import { logger } from '@/lib/logger';
import {
  getCanonicalUserId,
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from '../utils';
import { resolveTenantId } from '../../utils/tenant';
import { requireFmAbility } from '../../utils/auth';
import { FMErrors } from '../../errors';

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

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId('work order');
    }

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');
    const workOrder = await collection.findOne({
      _id: new ObjectId(id),
      tenantId,
    });

    if (!workOrder) {
      return FMErrors.notFound('Work order');
    }

    return NextResponse.json({ success: true, data: mapWorkOrderDocument(workOrder) });
  } catch (error) {
    logger.error('FM Work Order API - GET error', error as Error);
    return FMErrors.internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('EDIT')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId('work order');
    }

    const body = await req.json();
    const update: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    const allowedFields = [
      'title',
      'description',
      'status',
      'priority',
      'category',
      'propertyId',
      'unitId',
      'assigneeId',
      'technicianId',
      'scheduledAt',
      'startedAt',
      'completedAt',
      'estimatedCost',
      'actualCost',
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        update[field] = body[field];
      }
    });

    if (update.scheduledAt) update.scheduledAt = new Date(update.scheduledAt as string);
    if (update.startedAt) update.startedAt = new Date(update.startedAt as string);
    if (update.completedAt) update.completedAt = new Date(update.completedAt as string);

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');
    const existingWorkOrder = await collection.findOne({
      _id: new ObjectId(id),
      tenantId,
    });

    if (!existingWorkOrder) {
      return FMErrors.notFound('Work order');
    }

    const result = (await collection.findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      { $set: update },
      { returnDocument: 'after' }
    )) as unknown as ModifyResult<WorkOrderDocument>;

    const updatedDoc = result.value;
    if (!updatedDoc) {
      return FMErrors.notFound('Work order');
    }

    if (body.status && existingWorkOrder.status !== body.status) {
      await recordTimelineEntry(db, {
        workOrderId: id,
        tenantId,
        action: 'status_changed',
        description: `Status changed to ${body.status}`,
        metadata: { toStatus: body.status, fromStatus: existingWorkOrder.status },
        performedBy: actorId,
        performedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(updatedDoc),
    });
  } catch (error) {
    logger.error('FM Work Order API - PATCH error', error as Error);
    return FMErrors.internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await requireFmAbility('DELETE')(req);
    if (actor instanceof NextResponse) return actor;
    const tenantResult = resolveTenantId(req, actor.orgId || actor.tenantId);
    if ('error' in tenantResult) return tenantResult.error;
    const { tenantId } = tenantResult;
    const actorId = getCanonicalUserId(actor);
    if (!actorId) {
      return FMErrors.validationError('User identifier is required');
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return FMErrors.invalidId('work order');
    }

    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');
    const deleteResult = (await collection.findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      {
        $set: {
          status: WOStatus.CLOSED,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    )) as unknown as ModifyResult<WorkOrderDocument>;

    const deletedWorkOrder = deleteResult.value;
    if (!deletedWorkOrder) {
      return FMErrors.notFound('Work order');
    }

    await recordTimelineEntry(db, {
      workOrderId: id,
      tenantId,
      action: 'status_changed',
      description: 'Work order closed',
      metadata: { toStatus: WOStatus.CLOSED },
      performedBy: actorId,
      performedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Work order deleted successfully',
    });
  } catch (error) {
    logger.error('FM Work Order API - DELETE error', error as Error);
    return FMErrors.internalError();
  }
}
