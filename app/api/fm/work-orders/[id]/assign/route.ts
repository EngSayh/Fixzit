import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { mapWorkOrderDocument } from '../../utils';

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
    const { assigneeId, technicianId, notes } = body ?? {};
    if (!assigneeId && !technicianId) {
      return NextResponse.json(
        { error: 'assigneeId or technicianId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();
    const update: Record<string, unknown> = {
      updatedAt: now,
      assignment: {
        assignedBy: session.user.id || session.user.email,
        assignedAt: now,
        notes,
      },
    };

    if (assigneeId) {
      update.assigneeId = assigneeId;
    }
    if (technicianId) {
      update.technicianId = technicianId;
    }

    const result = await db.collection('workorders').findOneAndUpdate(
      { _id: new ObjectId(workOrderId), tenantId },
      { $set: update },
      { returnDocument: 'after' }
    );

    const updated = result.value;
    if (!updated) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    await db.collection('workorder_timeline').insertOne({
      workOrderId,
      tenantId,
      action: 'assigned',
      description: notes
        ? `Assigned with note: ${notes}`
        : `Assignment updated`,
      metadata: {
        assigneeId,
        technicianId,
      },
      performedBy: session.user.id || session.user.email,
      performedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: mapWorkOrderDocument(updated),
      message: 'Work order assignment updated',
    });
  } catch (error) {
    logger.error('FM Work Order Assignment API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
