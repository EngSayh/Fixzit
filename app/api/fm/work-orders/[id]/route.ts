/**
 * FM Work Orders API - Individual Work Order Operations
 * GET /api/fm/work-orders/[id] - Get work order details
 * PATCH /api/fm/work-orders/[id] - Update work order
 * DELETE /api/fm/work-orders/[id] - Delete work order
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';
import { WOStatus, type WorkOrder } from '@/types/fm';
import { logger } from '@/lib/logger';

/**
 * GET - Fetch single work order with full details
 */
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

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const workOrder = await db.collection('workorders').findOne({
      _id: new ObjectId(id),
      tenantId,
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    const data = mapToWorkOrder(workOrder);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('FM Work Order API - GET error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH - Update work order (partial update)
 */
export async function PATCH(
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

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const body = await req.json();

    // Build update object (only update provided fields)
    const update: any = {
      updatedAt: new Date(),
    };

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
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    });

    // Handle date conversions
    if (update.scheduledAt) update.scheduledAt = new Date(update.scheduledAt);
    if (update.startedAt) update.startedAt = new Date(update.startedAt);
    if (update.completedAt) update.completedAt = new Date(update.completedAt);

    const db = await getDatabase();
    const result = await db.collection('workorders').findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }
    const updated = mapToWorkOrder(result.value);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('FM Work Order API - PATCH error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete work order (soft delete - set status to CANCELLED)
 */
export async function DELETE(
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

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Soft delete: set status to CLOSED and add deletedAt
    const result = await db.collection('workorders').findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      {
        $set: {
          status: WOStatus.CLOSED,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Work order deleted successfully',
    });
  } catch (error) {
    logger.error('FM Work Order API - DELETE error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapToWorkOrder(workOrder: any): WorkOrder {
  return {
    id: workOrder._id.toString(),
    _id: workOrder._id.toString(),
    tenantId: workOrder.tenantId,
    workOrderNumber: workOrder.workOrderNumber,
    title: workOrder.title,
    description: workOrder.description,
    status: workOrder.status,
    priority: workOrder.priority,
    category: workOrder.category,
    propertyId: workOrder.propertyId,
    unitId: workOrder.unitId,
    requesterId: workOrder.requesterId,
    assigneeId: workOrder.assigneeId,
    technicianId: workOrder.technicianId,
    scheduledAt: workOrder.scheduledAt,
    startedAt: workOrder.startedAt,
    completedAt: workOrder.completedAt,
    slaHours: workOrder.slaHours,
    estimatedCost: workOrder.estimatedCost,
    actualCost: workOrder.actualCost,
    currency: workOrder.currency,
    createdAt: workOrder.createdAt,
    updatedAt: workOrder.updatedAt,
  };
}
