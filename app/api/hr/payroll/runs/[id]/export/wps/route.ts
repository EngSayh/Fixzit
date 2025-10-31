import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { dbConnect } from '@/lib/mongo';
import { PayrollRun, Payslip } from '@/models/hr/Payroll';
import { generateWPSFile, validateWPSFile } from '@/services/hr/wpsService';

// GET /api/hr/payroll/runs/[id]/export/wps - Generate WPS/Mudad compliant file
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Fetch the payroll run
    const run = await PayrollRun.findOne({
      _id: params.id,
      orgId: session.user.orgId,
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (run.status === 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot export DRAFT payroll run. Calculate first.' },
        { status: 400 }
      );
    }

    // Fetch all payslips for this run
    const payslips = await Payslip.find({
      orgId: session.user.orgId,
      payrollRunId: run._id,
    }).lean();

    if (payslips.length === 0) {
      return NextResponse.json(
        { error: 'No payslips found for this run' },
        { status: 404 }
      );
    }

    // Generate period month in YYYY-MM format
    const periodMonth = new Date(run.periodEnd).toISOString().slice(0, 7);

    // Generate WPS file
    const wpsFile = generateWPSFile(payslips, session.user.orgId, periodMonth);

    // Validate the generated file
    const validation = validateWPSFile(wpsFile);

    if (!validation.isValid) {
      console.error('WPS validation failed:', validation.errors);
      return NextResponse.json(
        {
          error: 'WPS file validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // Return the CSV file
    return new NextResponse(wpsFile.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${wpsFile.filename}"`,
        'X-File-Checksum': wpsFile.checksum,
        'X-Record-Count': wpsFile.recordCount.toString(),
        'X-Total-Net-Salary': wpsFile.totalNetSalary.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating WPS file:', error);
    return NextResponse.json(
      { error: 'Failed to generate WPS file' },
      { status: 500 }
    );
  }
}
