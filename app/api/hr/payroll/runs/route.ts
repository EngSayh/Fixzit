import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { dbConnect } from '@/lib/mongo';
import { PayrollRun, Payslip } from '@/models/hr/Payroll';
import { Employee } from '@/models/hr/Employee';
import { Timesheet } from '@/models/hr/Attendance';
import { calculateNetPay } from '@/services/hr/ksaPayrollService';

// GET /api/hr/payroll/runs - List all payroll runs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { orgId: session.user.orgId };
    if (status) query.status = status;

    const runs = await PayrollRun.find(query)
      .sort({ periodEnd: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll runs' },
      { status: 500 }
    );
  }
}

// POST /api/hr/payroll/runs - Create a new DRAFT payroll run
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();

    if (!body.periodStart || !body.periodEnd || !body.cutOffDate) {
      return NextResponse.json(
        { error: 'Missing required fields: periodStart, periodEnd, cutOffDate' },
        { status: 400 }
      );
    }

    // Check for overlapping runs
    const existing = await PayrollRun.findOne({
      orgId: session.user.orgId,
      $or: [
        {
          periodStart: { $lte: new Date(body.periodEnd) },
          periodEnd: { $gte: new Date(body.periodStart) },
        },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A payroll run already exists for this period' },
        { status: 409 }
      );
    }

    const run = await PayrollRun.create({
      orgId: session.user.orgId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      cutOffDate: new Date(body.cutOffDate),
      status: 'DRAFT',
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    return NextResponse.json(
      { error: 'Failed to create payroll run' },
      { status: 500 }
    );
  }
}
