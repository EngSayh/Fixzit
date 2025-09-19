import { NextRequest, NextResponse } from 'next/server';
import { backendPrisma as prisma } from '@/lib/backend-prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit-secret-key';

async function verifyAuth(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/hr/employees - List employees
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const position = searchParams.get('position');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    // Build filter conditions
    const where: any = { orgId: auth.orgId };
    
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (position) {
      where.position = { contains: position, mode: 'insensitive' };
    }
    if (status) {
      where.employmentStatus = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.employee.count({ where });

    // Fetch employees with relations
    const employees = await prisma.employee.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        attendanceRecords: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          take: 1
        },
        leaveRequests: {
          where: {
            status: 'pending'
          },
          select: {
            id: true
          }
        }
      }
    });

    // Transform employees
    const transformedEmployees = employees.map(emp => ({
      id: emp.id,
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      position: emp.position,
      department: emp.department?.name,
      departmentId: emp.departmentId,
      manager: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null,
      employmentStatus: emp.employmentStatus,
      employmentType: emp.employmentType,
      joinDate: emp.joinDate,
      salary: emp.salary,
      isCheckedIn: emp.attendanceRecords.length > 0,
      pendingLeaveRequests: emp.leaveRequests.length,
      avatar: emp.user?.avatar
    }));

    return NextResponse.json({
      data: transformedEmployees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Employees fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/hr/employees - Create employee
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationalId,
      position,
      departmentId,
      managerId,
      employmentType,
      employmentStatus,
      joinDate,
      salary,
      bankAccountNumber,
      emergencyContact,
      emergencyPhone,
      address
    } = data;

    // Validate required fields
    if (!employeeId || !firstName || !lastName || !email || !position) {
      return NextResponse.json(
        { error: 'Employee ID, name, email, and position are required' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        employeeId,
        orgId: auth.orgId
      }
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 400 }
      );
    }

    // Create or find user account
    let userId = null;
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new user account for the employee
      const newUser = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash('Fixzit@123', 12), // Default password
          firstName,
          lastName,
          phone,
          orgId: auth.orgId,
          isActive: true
        }
      });
      userId = newUser.id;
    }

    // Create employee record
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        nationalId,
        position,
        departmentId,
        managerId,
        employmentType: employmentType || 'full_time',
        employmentStatus: employmentStatus || 'active',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        salary: salary || 0,
        bankAccountNumber,
        emergencyContact,
        emergencyPhone,
        address,
        userId,
        orgId: auth.orgId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        manager: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'employee_added',
        title: 'New Employee Added',
        message: `${firstName} ${lastName} has been added to the HR system`,
        userId: auth.userId,
        entityType: 'employee',
        entityId: employee.id,
        orgId: auth.orgId,
        createdBy: auth.userId
      }
    }).catch(err => {
      console.error('Failed to create notification:', err);
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Employee creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}