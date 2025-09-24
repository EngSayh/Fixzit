// app/api/ai/tools/dispatch/route.ts - Dispatch/assign technician to a work order
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

/**
 * Dispatches a technician to a work order and records the action in the work order's history.
 *
 * Authenticates the caller, enforces role-based authorization (allowed roles: TECHNICIAN, MANAGEMENT, CORP_ADMIN, SUPER_ADMIN),
 * validates the request body, updates the matching work order scoped to the caller's organization, and appends a `dispatched` entry
 * to the work order's history.
 *
 * Request body (JSON):
 * - `workOrderId` (string, required): ID of the work order to dispatch.
 * - `technicianId` (string, optional): ID of the technician to assign; falls back to the current user ID if omitted.
 * - `scheduledDate` (string, optional): ISO date string for scheduling; falls back to the current date/time if omitted.
 * - `notes` (string, optional): Notes recorded with the dispatch history entry.
 *
 * Side effects:
 * - Updates the `assigneeId`, `scheduledDate`, and `updatedAt` fields of the work order.
 * - Pushes a history entry with `{ action: 'dispatched', performedBy, timestamp, notes }`.
 *
 * Returns a JSON NextResponse. Possible responses:
 * - 200: { success: true, data: { workOrderId, message: 'Dispatched' } }
 * - 400: Missing `workOrderId`
 * - 401: Unauthorized (no current user)
 * - 403: Forbidden (user role not allowed)
 * - 404: Work order not found (not found in user's organization)
 * - 500: Internal server error (dispatch failed)
 */
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


