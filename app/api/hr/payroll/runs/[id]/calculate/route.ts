import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDb } from '@/lib/mongo';
import { PayrollRun, Payslip } from '@/models/hr/Payroll';
import { Employee } from '@/server/models/Employee';
import { Timesheet } from '@/models/hr/Attendance';
import { calculateNetPay } from '@/services/hr/ksaPayrollService';

import { logger } from '@/lib/logger';
// POST /api/hr/payroll/runs/[id]/calculate - Calculate payroll for all active employees
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();

    const params = await props.params;

    // Fetch the payroll run
    const run = await PayrollRun.findOne({
      _id: params.id,
      orgId: session.user.orgId,
    });

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (run.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only calculate DRAFT payroll runs' },
        { status: 400 }
      );
    }

    // Fetch all ACTIVE employees
    const employees = await Employee.find({
      orgId: session.user.orgId,
      status: 'ACTIVE',
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalGOSI = 0;
    let totalSANED = 0;

    // Calculate payslip for each employee
    const payslips = [];

    for (const employee of employees) {
      const {
        baseSalary = 0,
        housingAllowance = 0,
        transportAllowance = 0,
        otherAllowances = [],
        gosiApplicable = false,
      } = employee.compensation;

      // Fetch approved overtime from timesheets
      const timesheets = await Timesheet.find({
        orgId: session.user.orgId,
        employeeId: employee._id,
        weekStart: { $gte: run.periodStart },
        weekEnd: { $lte: run.periodEnd },
        status: 'APPROVED',
      });

      const overtimeHours = timesheets.reduce((sum, ts) => sum + (ts.overtimeHours || 0), 0);

      // Determine if employee is Saudi national (for GOSI)
      const isSaudiNational = employee.nationality?.toLowerCase() === 'saudi' || gosiApplicable;
      
      // Check if new entrant (joined after 2024 for new GOSI rates)
      const joinDate = new Date(employee.employment.joinDate);
      const isNewEntrant = joinDate >= new Date('2024-01-01');

      // Calculate net pay using KSA compliance service
      const calculation = calculateNetPay(
        baseSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        overtimeHours,
        isSaudiNational,
        isNewEntrant
      );

      // Create payslip
      const payslip = new Payslip({
        orgId: session.user.orgId,
        payrollRunId: run._id,
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        iban: employee.bank?.iban || '',
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        earnings: calculation.earnings,
        deductions: calculation.deductions,
        grossPay: calculation.grossPay,
        netPay: calculation.netPay,
        gosiEmployee: calculation.gosi.breakdown.annuitiesEmployee + calculation.gosi.breakdown.sanedEmployee,
        gosiEmployer: calculation.gosi.breakdown.annuitiesEmployer + calculation.gosi.breakdown.occupationalHazards + calculation.gosi.breakdown.sanedEmployer,
        sanedEmployee: calculation.gosi.breakdown.sanedEmployee,
        sanedEmployer: calculation.gosi.breakdown.sanedEmployer,
        currency: 'SAR',
      });

      await payslip.save();
      payslips.push(payslip);

      // Accumulate totals
      totalGross += calculation.grossPay;
      totalNet += calculation.netPay;
      totalGOSI += calculation.gosi.employeeDeduction + calculation.gosi.employerContribution;
      totalSANED += calculation.gosi.breakdown.sanedEmployee + calculation.gosi.breakdown.sanedEmployer;
    }

    // Update the payroll run
    run.status = 'CALCULATED';
    run.totalGross = Math.round(totalGross * 100) / 100;
    run.totalNet = Math.round(totalNet * 100) / 100;
    run.totalGOSI = Math.round(totalGOSI * 100) / 100;
    run.totalSANED = Math.round(totalSANED * 100) / 100;
    run.employeeCount = employees.length;
    await run.save();

    return NextResponse.json({
      run,
      summary: {
        employeesProcessed: employees.length,
        totalGross: run.totalGross,
        totalNet: run.totalNet,
        totalGOSI: run.totalGOSI,
        totalSANED: run.totalSANED,
      },
    });
  } catch (error) {
    logger.error('Error calculating payroll:', error);
    return NextResponse.json(
      { error: 'Failed to calculate payroll' },
      { status: 500 }
    );
  }
}
