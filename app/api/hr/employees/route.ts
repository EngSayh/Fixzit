import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDb } from '@/lib/mongo';
import { Employee } from '@/server/models/Employee';

import { logger } from '@/lib/logger';
// GET /api/hr/employees - List all employees for the organization
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    // Build query
    const query: Record<string, unknown> = { orgId: session.user.orgId };
    if (status) query.status = status;
    if (department) query['employment.department'] = department;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      (Employee as any).find(query)
        .select('-bank.iban -documents') // Exclude sensitive data by default
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      (Employee as any).countDocuments(query),
    ]);

    return NextResponse.json({
      employees,
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

    await connectDb();

    const body = await req.json();

    // Validate required fields
    if (!body.employeeCode || !body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeCode, firstName, lastName, email' },
        { status: 400 }
      );
    }

    // Check for duplicate employee code within org
    const existing = await (Employee as any).findOne({
      orgId: session.user.orgId,
      employeeCode: body.employeeCode,
    });

    if (existing) {
      return NextResponse.json(
        { error: `Employee code ${body.employeeCode} already exists` },
        { status: 409 }
      );
    }

    // Create employee
    const employee = await (Employee as any).create({
      ...body,
      orgId: session.user.orgId,
      status: body.status || 'ONBOARDING',
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
