// app/api/ai/tools/dispatch/route.ts - Dispatch/assign technician to a work order
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = ['TECHNICIAN', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'];
    if (!allowed.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workOrderId, technicianId, scheduledDate, notes } = await req.json();
    if (!workOrderId) return NextResponse.json({ error: 'workOrderId required' }, { status: 400 });

    const db = await getDatabase();

    const wo = await db.collection('work_orders').findOne({ _id: new ObjectId(workOrderId), orgId: user.orgId });
    if (!wo) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    await db.collection('work_orders').updateOne(
      { _id: new ObjectId(workOrderId) },
      {
        $set: {
          assigneeId: technicianId || user.id,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          updatedAt: new Date()
        },
        $push: {
          history: {
            $each: [{ action: 'dispatched', performedBy: user.id, timestamp: new Date(), notes }]
          }
        } as any
      }
    );

    return NextResponse.json({ success: true, data: { workOrderId, message: 'Dispatched' } });
  } catch (e) {
    console.error('Dispatch error:', e);
    return NextResponse.json({ error: 'Failed to dispatch' }, { status: 500 });
  }
}


