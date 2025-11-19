/**
 * FM Work Orders API - GET /api/fm/work-orders
 * 
 * List all work orders with filtering, pagination, and search
 * Enforces tenant isolation via x-tenant-id header
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDatabase } from '@/lib/mongodb-unified';
import { WOStatus, WOPriority, type WorkOrder } from '@/types/fm';
import { logger } from '@/lib/logger';
import { mapWorkOrderDocument } from './utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from header (required for multi-tenancy)
    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing x-tenant-id header' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const propertyId = searchParams.get('propertyId');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');

    // Build query
    const query: any = { tenantId };

    if (status) {
      query.status = { $in: status.split(',') };
    }

    if (priority) {
      query.priority = { $in: priority.split(',') };
    }

    if (propertyId) {
      query.propertyId = propertyId;
    }

    if (assigneeId) {
      query.assigneeId = assigneeId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { workOrderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection('workorders');

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [workOrders, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    // Transform MongoDB documents to WorkOrder interface
    const data: WorkOrder[] = workOrders.map(mapWorkOrderDocument);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('FM Work Orders API - GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * FM Work Orders API - POST /api/fm/work-orders
 * 
 * Create a new work order
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = req.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing x-tenant-id header' },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection('workorders');

    // Generate work order number (format: WO-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await collection.countDocuments({ tenantId });
    const workOrderNumber = `WO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Create work order document
    const workOrder = {
      tenantId,
      workOrderNumber,
      title: body.title,
      description: body.description,
      status: WOStatus.NEW,
      priority: body.priority || WOPriority.MEDIUM,
      category: body.category,
      propertyId: body.propertyId,
      unitId: body.unitId,
      requesterId: session.user.id || session.user.email,
      assigneeId: body.assigneeId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      estimatedCost: body.estimatedCost,
      currency: body.currency || 'SAR',
      slaHours: calculateSLA(body.priority || WOPriority.MEDIUM),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into database
    const result = await collection.insertOne(workOrder);

    // TODO: Trigger notifications
    // TODO: Add to timeline

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...workOrder,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('FM Work Orders API - POST error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate SLA hours based on priority
 */
function calculateSLA(priority: WOPriority): number {
  const slaMap: Record<WOPriority, number> = {
    [WOPriority.CRITICAL]: 4,   // 4 hours
    [WOPriority.HIGH]: 24,      // 1 day
    [WOPriority.MEDIUM]: 72,    // 3 days
    [WOPriority.LOW]: 168,      // 7 days
  };
  return slaMap[priority] || 72;
}
