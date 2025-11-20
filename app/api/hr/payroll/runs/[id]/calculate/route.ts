import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import {
  Employee,
  AttendanceRecord,
  type PayrollLineDoc,
} from '@/server/models/hr.models';
import { PayrollService } from '@/server/services/hr/payroll.service';
import { calculateNetPay } from '@/services/hr/ksaPayrollService';

type RouteParams = { id: string };

export async function POST(
  _req: NextRequest,
  props: { params: Promise<RouteParams> }
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await props.params;
    const run = await PayrollService.getById(session.user.orgId, id);

    if (!run) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (run.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only calculate DRAFT payroll runs' },
        { status: 400 }
      );
    }

    const employees = await Employee.find({
      orgId: session.user.orgId,
      employmentStatus: 'ACTIVE',
      isDeleted: false,
    }).lean();

    if (!employees.length) {
      return NextResponse.json(
        { error: 'No active employees available for payroll calculation' },
        { status: 400 }
      );
    }

    const overtimeAggregate = await AttendanceRecord.aggregate<{ _id: string; totalMinutes: number }>([
      {
        $match: {
          orgId: session.user.orgId,
          isDeleted: false,
          date: { $gte: run.periodStart, $lte: run.periodEnd },
        },
      },
      { $group: { _id: '$employeeId', totalMinutes: { $sum: '$overtimeMinutes' } } },
    ]);

    const overtimeMinutesMap = new Map<string, number>(
      overtimeAggregate.map((entry) => [String(entry._id), entry.totalMinutes || 0])
    );

    const payrollLines: PayrollLineDoc[] = [];

    for (const employee of employees) {
      const compensation = employee.compensation || {
        baseSalary: employee.baseSalary || 0,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: [],
        currency: employee.currency || 'SAR',
      };

      const baseSalary = compensation.baseSalary || 0;
      const housingAllowance = compensation.housingAllowance || 0;
      const transportAllowance = compensation.transportAllowance || 0;
      const otherAllowances = compensation.otherAllowances || [];
      const otherAllowanceTotal = otherAllowances.reduce((sum, item) => sum + (item.amount || 0), 0);

      const overtimeMinutes = overtimeMinutesMap.get(String(employee._id)) || 0;
      const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

      const nationality = (employee.nationality || '').toLowerCase();
      const isSaudiNational = nationality === 'saudi' || nationality === 'saudi arabia';
      const isNewEntrant = employee.hireDate ? employee.hireDate >= new Date('2024-01-01') : false;

      const calculation = calculateNetPay(
        baseSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        overtimeHours,
        compensation.gosiApplicable ?? isSaudiNational,
        isNewEntrant
      );

      const overtimeComponent = calculation.earnings.find((earning) => earning.code === 'OVERTIME');

      payrollLines.push({
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        iban: employee.bankDetails?.iban,
        baseSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        allowances: housingAllowance + transportAllowance + otherAllowanceTotal,
        overtimeHours,
        overtimeAmount: overtimeComponent?.amount || 0,
        deductions: calculation.totalDeductions,
        taxDeduction: 0,
        gosiContribution: calculation.gosi.employerContribution,
        netPay: calculation.netPay,
        currency: compensation.currency || employee.currency || 'SAR',
        notes: undefined,
        earnings: calculation.earnings,
        deductionLines: calculation.deductions,
        gosiBreakdown: calculation.gosi.breakdown,
      });
    }

    const updatedRun = await PayrollService.updateCalculation(
      session.user.orgId,
      id,
      payrollLines,
      'IN_REVIEW'
    );

    if (!updatedRun) {
      return NextResponse.json(
        { error: 'Failed to persist payroll calculation results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      run: updatedRun,
      summary: {
        employeesProcessed: payrollLines.length,
        totals: updatedRun.totals,
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
