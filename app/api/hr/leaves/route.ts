import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { LeaveService } from '@/server/services/hr/leave.service';
import type { LeaveRequestStatus } from '@/server/models/hr.models';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as LeaveRequestStatus | null;

    await connectToDatabase();

    const requests = await LeaveService.list(session.user.orgId, status || undefined);
    return NextResponse.json({ requests });
  } catch (error) {
    logger.error('Error fetching leave requests:', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const missing = ['employeeId', 'leaveTypeId', 'startDate', 'endDate', 'numberOfDays'].filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
    }

    await connectToDatabase();

    const requestDoc = await LeaveService.request({
      orgId: session.user.orgId,
      employeeId: body.employeeId,
      leaveTypeId: body.leaveTypeId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      numberOfDays: body.numberOfDays,
      status: 'PENDING',
      reason: body.reason,
      approvalHistory: [],
    } as any);

    return NextResponse.json(requestDoc, { status: 201 });
  } catch (error) {
    logger.error('Error creating leave request:', error);
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.leaveRequestId || !body.status) {
      return NextResponse.json({ error: 'Missing fields: leaveRequestId, status' }, { status: 400 });
    }

    await connectToDatabase();

    const updated = await LeaveService.updateStatus(
      session.user.orgId,
      body.leaveRequestId,
      body.status,
      session.user.id,
      body.comment
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error('Error updating leave request:', error);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}
