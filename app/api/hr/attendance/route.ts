import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { AttendanceService } from '@/server/services/hr/attendance.service';
import type { AttendanceStatus } from '@/server/models/hr.models';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectToDatabase();

    const entries = await AttendanceService.list(
      session.user.orgId,
      employeeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );

    return NextResponse.json({ entries });
  } catch (error) {
    logger.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const required = ['employeeId', 'date', 'status'];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
    }

    await connectToDatabase();

    const entry = await AttendanceService.logEntry({
      orgId: session.user.orgId,
      employeeId: body.employeeId,
      date: new Date(body.date),
      status: body.status as AttendanceStatus,
      shiftTemplateId: body.shiftTemplateId,
      clockIn: body.clockIn ? new Date(body.clockIn) : undefined,
      clockOut: body.clockOut ? new Date(body.clockOut) : undefined,
      source: body.source,
      notes: body.notes,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error('Error logging attendance:', error);
    return NextResponse.json({ error: 'Failed to log attendance' }, { status: 500 });
  }
}
