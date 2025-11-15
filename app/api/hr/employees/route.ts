import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { EmployeeService } from '../../../../../server/services/hr/employee.service';
// GET /api/hr/employees - List all employees for the organization
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    // Build query
    const { items, total } = await EmployeeService.searchWithPagination(
      {
        orgId: session.user.orgId,
        employmentStatus: (status as any) || undefined,
        departmentId: department || undefined,
        text: search || undefined,
      },
      { page, limit }
    );

    return NextResponse.json({
      employees: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/hr/employees - Create a new employee
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();

    // Validate required fields
    if (!body.employeeCode || !body.firstName || !body.lastName || !body.email || !body.jobTitle || !body.hireDate) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeCode, firstName, lastName, email, jobTitle, hireDate' },
        { status: 400 }
      );
    }
    const existing = await EmployeeService.getByCode(session.user.orgId, body.employeeCode);
    if (existing) {
      return NextResponse.json(
        { error: `Employee code ${body.employeeCode} already exists` },
        { status: 409 }
      );
    }

    const employee = await EmployeeService.upsert({
      orgId: session.user.orgId,
      employeeCode: body.employeeCode,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      jobTitle: body.jobTitle,
      departmentId: body.departmentId,
      managerId: body.managerId,
      employmentType: body.employmentType || 'FULL_TIME',
      employmentStatus: body.employmentStatus || 'ONBOARDING',
      hireDate: new Date(body.hireDate),
      technicianProfile: body.technicianProfile,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: unknown) {
    logger.error('Error creating employee:', error);
    
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Employee code or email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
