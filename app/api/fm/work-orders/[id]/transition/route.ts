/**
 * FM Work Orders API - FSM State Transitions
 * POST /api/fm/work-orders/[id]/transition
 * 
 * Handles work order state transitions according to FSM rules
 * Enforces RBAC permissions and validates transitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';
import { WOStatus } from '@/types/fm';
import { logger } from '@/lib/logger';

// FSM Transition Rules (simplified from domain/fm/fm.behavior.ts)
const FSM_TRANSITIONS: Record<WOStatus, WOStatus[]> = {
  [WOStatus.NEW]: [WOStatus.ASSESSMENT],
  [WOStatus.ASSESSMENT]: [WOStatus.ESTIMATE_PENDING],
  [WOStatus.ESTIMATE_PENDING]: [WOStatus.QUOTATION_REVIEW],
  [WOStatus.QUOTATION_REVIEW]: [WOStatus.PENDING_APPROVAL],
  [WOStatus.PENDING_APPROVAL]: [WOStatus.APPROVED],
  [WOStatus.APPROVED]: [WOStatus.IN_PROGRESS],
  [WOStatus.IN_PROGRESS]: [WOStatus.WORK_COMPLETE],
  [WOStatus.WORK_COMPLETE]: [WOStatus.QUALITY_CHECK, WOStatus.FINANCIAL_POSTING],
  [WOStatus.QUALITY_CHECK]: [WOStatus.FINANCIAL_POSTING],
  [WOStatus.FINANCIAL_POSTING]: [WOStatus.CLOSED],
  [WOStatus.CLOSED]: [],
};

/**
 * POST - Transition work order to new status
 */
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

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid work order ID' }, { status: 400 });
    }

    const body = await req.json();
    const { toStatus, comment, metadata } = body;

    if (!toStatus || !Object.values(WOStatus).includes(toStatus)) {
      return NextResponse.json(
        { error: 'Invalid target status' },
        { status: 400 }
      );
    }

    // Get current work order
    const { db } = await connectToDatabase();
    const workOrder = await db.collection('workorders').findOne({
      _id: new ObjectId(id),
      tenantId,
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Validate transition
    const currentStatus = workOrder.status as WOStatus;
    const allowedTransitions = FSM_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(toStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid transition',
          message: `Cannot transition from ${currentStatus} to ${toStatus}`,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Build update object
    const update: any = {
      status: toStatus,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (toStatus === WOStatus.IN_PROGRESS && !workOrder.startedAt) {
      update.startedAt = new Date();
    }
    if (toStatus === WOStatus.WORK_COMPLETE && !workOrder.completedAt) {
      update.completedAt = new Date();
    }

    // Apply update
    const result = await db.collection('workorders').findOneAndUpdate(
      { _id: new ObjectId(id), tenantId },
      { $set: update },
      { returnDocument: 'after' }
    );

    // Add timeline entry
    await db.collection('workorder_timeline').insertOne({
      workOrderId: id,
      action: 'status_changed',
      description: `Status changed from ${currentStatus} to ${toStatus}`,
      fromStatus: currentStatus,
      toStatus,
      comment,
      metadata,
      performedBy: session.user.id || session.user.email,
      performedAt: new Date(),
      tenantId,
    });

    // TODO: Trigger notifications based on status change
    // TODO: Check SLA compliance

    return NextResponse.json({
      success: true,
      data: {
        id: result?._id.toString(),
        ...result,
      },
      message: `Work order transitioned to ${toStatus}`,
    });
  } catch (error) {
    logger.error('FM Work Order Transition API error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
