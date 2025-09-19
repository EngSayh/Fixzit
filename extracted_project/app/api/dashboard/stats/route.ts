import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
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

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orgId } = auth;
    
    // Fetch dashboard statistics using raw SQL
    const [properties, units, workOrders, tenants] = await Promise.all([
      // Total properties
      query<any>(`
        SELECT COUNT(*) as count 
        FROM properties 
        WHERE "organizationId" = $1
      `, [orgId]),
      
      // Units statistics
      query<any>(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'OCCUPIED' THEN 1 END) as occupied,
          COUNT(CASE WHEN status = 'VACANT' THEN 1 END) as vacant
        FROM units 
        WHERE "organizationId" = $1
      `, [orgId]),
      
      // Work orders statistics
      query<any>(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
        FROM work_orders 
        WHERE "organizationId" = $1
      `, [orgId]),
      
      // Active tenants
      query<any>(`
        SELECT COUNT(*) as count
        FROM users
        WHERE "organizationId" = $1 AND role = 'TENANT' AND status = 'ACTIVE'
      `, [orgId])
    ]);

    // Recent work orders
    const recentWorkOrders = await query<any>(`
      SELECT 
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        wo."createdAt",
        p.name as property_name,
        u."firstName" || ' ' || u."lastName" as assigned_to
      FROM work_orders wo
      LEFT JOIN properties p ON wo."propertyId" = p.id
      LEFT JOIN users u ON wo."assignedTo" = u.id
      WHERE wo."organizationId" = $1
      ORDER BY wo."createdAt" DESC
      LIMIT 5
    `, [orgId]);

    // Calculate occupancy rate
    const unitsData = units[0] || { total: 0, occupied: 0, vacant: 0 };
    const occupancyRate = unitsData.total > 0 
      ? ((unitsData.occupied / unitsData.total) * 100).toFixed(1)
      : '0';

    // Build response
    const stats = {
      properties: parseInt(properties[0]?.count || '0'),
      units: parseInt(unitsData.total || '0'),
      occupiedUnits: parseInt(unitsData.occupied || '0'),
      vacantUnits: parseInt(unitsData.vacant || '0'),
      occupancyRate: parseFloat(occupancyRate),
      workOrders: {
        total: parseInt(workOrders[0]?.total || '0'),
        open: parseInt(workOrders[0]?.open || '0'),
        in_progress: parseInt(workOrders[0]?.in_progress || '0'),
        completed: parseInt(workOrders[0]?.completed || '0')
      },
      tenants: parseInt(tenants[0]?.count || '0'),
      recentActivity: recentWorkOrders.map((wo: any) => ({
        id: wo.id,
        type: 'work_order',
        title: wo.title,
        status: wo.status,
        priority: wo.priority,
        property: wo.property_name,
        assignee: wo.assigned_to,
        createdAt: wo.createdAt
      })),
      summary: {
        message: `${unitsData.occupied} of ${unitsData.total} units occupied`,
        occupancyPercentage: parseFloat(occupancyRate),
        alert: workOrders[0]?.open > 10 ? 'High number of open work orders' : null
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}