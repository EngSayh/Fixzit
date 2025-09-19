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

// GET /api/properties - List properties
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter conditions
    const where: any = { orgId: auth.orgId };
    
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.property.count({ where });

    // Fetch properties with unit counts
    const properties = await prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        units: {
          select: {
            id: true,
            status: true
          }
        },
        _count: {
          select: {
            units: true,
            workOrders: true,
            invoices: true,
            expenses: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Transform properties to include statistics
    const transformedProperties = properties.map(property => {
      const occupiedUnits = property.units.filter(u => u.status === 'occupied').length;
      const vacantUnits = property.units.filter(u => u.status === 'vacant').length;
      const occupancyRate = property.units.length > 0 
        ? (occupiedUnits / property.units.length) * 100 
        : 0;

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        type: property.type,
        totalUnits: property.units.length,
        occupiedUnits,
        vacantUnits,
        occupancyRate: Math.round(occupancyRate),
        workOrdersCount: property._count.workOrders,
        invoicesCount: property._count.invoices,
        expensesCount: property._count.expenses,
        createdBy: `${property.creator.firstName} ${property.creator.lastName}`,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt
      };
    });

    return NextResponse.json({
      data: transformedProperties,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Properties fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create property
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const {
      name,
      address,
      type = 'residential',
      totalUnits = 0,
      units
    } = data;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Create property with optional units
    const property = await prisma.property.create({
      data: {
        name,
        address,
        type,
        totalUnits,
        orgId: auth.orgId,
        createdBy: auth.userId,
        // Create units if provided
        ...(units && units.length > 0 ? {
          units: {
            create: units.map((unit: any) => ({
              unitNumber: unit.unitNumber,
              type: unit.type || 'apartment',
              bedrooms: unit.bedrooms || 0,
              bathrooms: unit.bathrooms || 0,
              areaSqm: unit.areaSqm || 0,
              rentAmount: unit.rentAmount || 0,
              status: unit.status || 'vacant',
              orgId: auth.orgId
            }))
          }
        } : {})
      },
      include: {
        units: true,
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Create notification for property creation
    await prisma.notification.create({
      data: {
        type: 'property_created',
        title: 'New Property Added',
        message: `Property "${name}" has been added to the system`,
        userId: auth.userId,
        entityType: 'property',
        entityId: property.id,
        orgId: auth.orgId,
        createdBy: auth.userId
      }
    }).catch(err => {
      console.error('Failed to create notification:', err);
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Property creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    );
  }
}