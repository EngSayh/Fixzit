import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { LeaveTypeService } from '@/server/services/hr/leave-type.service';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '0', 10);

    await connectToDatabase();
    const leaveTypes = await LeaveTypeService.list(session.user.orgId, search, {
      limit: Number.isNaN(limit) || limit <= 0 ? undefined : limit,
    });

    return NextResponse.json({ leaveTypes });
  } catch (error) {
    logger.error('Failed to fetch leave types', { error });
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    if (!body?.code || !body?.name) {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }

    const leaveType = await LeaveTypeService.create(session.user.orgId, {
      code: body.code,
      name: body.name,
      description: body.description,
      isPaid: typeof body.isPaid === 'boolean' ? body.isPaid : true,
      annualEntitlementDays: body.annualEntitlementDays ?? undefined,
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    logger.error('Failed to create leave type', { error });
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 });
  }
}
