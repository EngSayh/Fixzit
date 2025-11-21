/**
 * FM Work Orders API - GET /api/fm/work-orders
 * 
 * List all work orders with filtering, pagination, and search
 * Enforces tenant isolation via authenticated org context
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-unified';
import { WOStatus, WOPriority, type WorkOrder, WOCategory } from '@/types/fm';
import { logger } from '@/lib/logger';
import {
  mapWorkOrderDocument,
  recordTimelineEntry,
  type WorkOrderDocument,
} from './utils';
import {
  onTicketCreated,
  type NotificationChannel,
  type NotificationRecipient,
} from '@/lib/fm-notifications';
import { FMErrors } from '../errors';
import { requireFmAbility } from '../utils/auth';

export async function GET(req: NextRequest) {
  try {
    const abilityCheck = await requireFmAbility('VIEW')(req);
    if (abilityCheck instanceof NextResponse) return abilityCheck;
    const tenantId = abilityCheck.orgId ?? abilityCheck.tenantId;
    if (!tenantId) {
      return FMErrors.missingTenant();
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100); // Max 100 per page
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const propertyId = searchParams.get('propertyId');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');

    // Build query
    const query: Record<string, unknown> = { tenantId };

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
      // Escape special regex characters to prevent injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { workOrderNumber: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');

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
    return FMErrors.internalError();
  }
}

/**
 * FM Work Orders API - POST /api/fm/work-orders
 * 
 * Create a new work order
 */
export async function POST(req: NextRequest) {
  try {
    const abilityCheck = await requireFmAbility('CREATE')(req);
    if (abilityCheck instanceof NextResponse) return abilityCheck;
    const tenantId = abilityCheck.orgId ?? abilityCheck.tenantId;
    if (!tenantId) {
      return FMErrors.missingTenant();
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return FMErrors.validationError('Missing required fields: title, description', {
        required: ['title', 'description']
      });
    }

    // Validate enum fields if provided
    if (body.priority && !Object.values(WOPriority).includes(body.priority)) {
      return FMErrors.validationError('Invalid priority value', {
        allowed: Object.values(WOPriority)
      });
    }

    if (body.category && !Object.values(WOCategory).includes(body.category)) {
      return FMErrors.validationError('Invalid category value', {
        allowed: Object.values(WOCategory)
      });
    }

    // Connect to database
    const db = await getDatabase();
    const collection = db.collection<WorkOrderDocument>('workorders');

    // Generate work order number (format: WO-YYYYMMDD-XXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await collection.countDocuments({ tenantId });
    const workOrderNumber = `WO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Create work order document
    const workOrder: WorkOrderDocument = {
      tenantId,
      workOrderNumber,
      title: body.title,
      description: body.description,
      status: WOStatus.NEW,
      priority: body.priority || WOPriority.MEDIUM,
      category: body.category,
      propertyId: body.propertyId,
      unitId: body.unitId,
      requesterId: abilityCheck.id ?? abilityCheck.email,
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

    // Trigger notifications to relevant users
    try {
      // Get recipients (managers, assignee if exists)
      const recipients: NotificationRecipient[] = [];
      
      // Add assignee if specified
      if (workOrder.assigneeId) {
        const assignee = await db.collection('users').findOne({ _id: new ObjectId(workOrder.assigneeId) });
        if (assignee?.email) {
          recipients.push({
            userId: workOrder.assigneeId,
            name: assignee.name || assignee.email,
            email: assignee.email,
            phone: assignee.phone,
            preferredChannels: ['email', 'push'] as NotificationChannel[],
          });
        }
      }

      if (recipients.length > 0) {
        await onTicketCreated(
          workOrderNumber,
          abilityCheck.name || abilityCheck.email || 'User',
          body.priority || WOPriority.MEDIUM,
          body.description,
          recipients
        );
      }
    } catch (notifError) {
      // Log but don't fail the request
      logger.error('Failed to send work order creation notification', notifError as Error);
    }

    await recordTimelineEntry(db, {
      workOrderId: result.insertedId.toString(),
      tenantId,
      action: 'created',
      description: 'Work order created',
      metadata: { status: WOStatus.NEW },
      performedBy: abilityCheck.id ?? abilityCheck.email,
      performedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...workOrder,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('FM Work Orders API - POST error', error as Error);
    return FMErrors.internalError();
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
