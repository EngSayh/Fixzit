// app/api/ai/tools/list-tickets/route.ts - List user's work order tickets via AI assistant
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // new, in_progress, completed, cancelled
    const priority = searchParams.get('priority'); // low, medium, high, urgent

    // Connect to database
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);

    // Build query based on user permissions and role
    let query: any = {
      $or: [
        { createdBy: user.id }, // User's own tickets
        { assigneeId: user.id } // Tickets assigned to user
      ]
    };

    // Add filters if specified
    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    // Get tickets with related information
    const tickets = await db.collection('work_orders')
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'properties',
            localField: 'propertyId',
            foreignField: '_id',
            as: 'property'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'assigneeId',
            foreignField: '_id',
            as: 'assignee'
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            status: 1,
            priority: 1,
            priorityScore: 1,
            category: 1,
            createdAt: 1,
            updatedAt: 1,
            scheduledDate: 1,
            estimatedCost: 1,
            actualCost: 1,
            propertyName: { $arrayElemAt: ['$property.name', 0] },
            propertyAddress: { $arrayElemAt: ['$property.address', 0] },
            assigneeName: { $arrayElemAt: ['$assignee.name', 0] },
            assigneeEmail: { $arrayElemAt: ['$assignee.email', 0] },
            tags: 1,
            aiCreated: 1,
            aiSource: 1
          }
        }
      ])
      .toArray();

    await client.close();

    // Format tickets for response
    const formattedTickets = tickets.map((ticket: any) => ({
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      priorityScore: ticket.priorityScore,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      scheduledDate: ticket.scheduledDate,
      estimatedCost: ticket.estimatedCost,
      actualCost: ticket.actualCost,
      property: ticket.propertyName ? {
        name: ticket.propertyName,
        address: ticket.propertyAddress
      } : null,
      assignee: ticket.assigneeName ? {
        name: ticket.assigneeName,
        email: ticket.assigneeEmail
      } : null,
      tags: ticket.tags || [],
      aiCreated: ticket.aiCreated,
      aiSource: ticket.aiSource
    }));

    // Log the action for audit
    await logAction(user, 'list_tickets', { count: formattedTickets.length });

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      total: formattedTickets.length,
      message: user.locale === 'ar'
        ? `تم العثور على ${formattedTickets.length} تذكرة`
        : `Found ${formattedTickets.length} tickets`,
      summary: getTicketSummary(formattedTickets, user.locale || 'en')
    });

  } catch (error) {
    console.error('List tickets error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to list tickets'
    }, { status: 500 });
  }
}

async function logAction(user: any, action: string, details: any) {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);

    await db.collection('ai_actions').insertOne({
      type: action,
      userId: user.id,
      orgId: user.orgId,
      details,
      timestamp: new Date(),
      source: 'ai_assistant'
    });

    await client.close();
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

function getTicketSummary(tickets: any[], locale: string): string {
  const statusCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {});

  const priorityCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
    return acc;
  }, {});

  if (locale === 'ar') {
    return `ملخص: ${tickets.length} تذكرة • ${statusCounts.new || 0} جديدة • ${statusCounts.in_progress || 0} قيد التنفيذ • ${priorityCounts.high || 0} عالية الأولوية`;
  } else {
    return `Summary: ${tickets.length} tickets • ${statusCounts.new || 0} new • ${statusCounts.in_progress || 0} in progress • ${priorityCounts.high || 0} high priority`;
  }
}
