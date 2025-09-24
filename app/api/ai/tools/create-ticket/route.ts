// app/api/ai/tools/create-ticket/route.ts - Create work order ticket via AI assistant
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';
const MOCK = process.env.USE_MOCK_DB === 'true' || process.env.DISABLE_DB === 'true';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { title, description, priority = 'medium', category = 'maintenance' } = await req.json();

    // Validate input
    if (!title || !description) {
      return NextResponse.json({
        success: false,
        error: 'Title and description are required'
      }, { status: 400 });
    }

    // If mock mode, return a synthetic ticket
    if (MOCK) {
      const id = new ObjectId().toString();
      return NextResponse.json({
        success: true,
        ticketId: id,
        message: user.locale === 'ar' ? `تم إنشاء التذكرة بنجاح: ${title}` : `Ticket created successfully: ${title}`,
        ticket: { id, title, status: 'new', priority, createdAt: new Date() }
      });
    }

    // Database
    const db = await getDatabase();

    // Create work order ticket
    const workOrder = {
      title,
      description,
      priority: priority || 'medium',
      category: category || 'maintenance',
      status: 'new',
      createdBy: user.id,
      orgId: user.orgId,
      assigneeId: null,
      propertyId: null, // Can be set based on user's properties
      estimatedCost: null,
      actualCost: null,
      scheduledDate: null,
      completedDate: null,
      attachments: [{
        id: new ObjectId().toString(),
        userId: user.id,
        userName: user.name || user.email,
        content: `Ticket created via AI assistant: ${description}`,
        timestamp: new Date(),
        isInternal: false
      }],
      priorityScore: getPriorityScore(priority),
      tags: extractTags(title + ' ' + description),
      createdAt: new Date(),
      updatedAt: new Date(),
      aiCreated: true,
      aiSource: 'chat_assistant'
    };

    const result = await db.collection('work_orders').insertOne(workOrder as any);

    // Log the action for audit
    await db.collection('ai_actions').insertOne({
      type: 'create_ticket',
      userId: user.id,
      orgId: user.orgId,
      workOrderId: result.insertedId,
      details: { title, description, priority, category },
      timestamp: new Date(),
      source: 'ai_assistant'
    });

    return NextResponse.json({
      success: true,
      ticketId: result.insertedId.toString(),
      message: user.locale === 'ar'
        ? `تم إنشاء التذكرة بنجاح: ${title}`
        : `Ticket created successfully: ${title}`,
      ticket: {
        id: result.insertedId.toString(),
        title,
        status: 'new',
        priority,
        createdAt: workOrder.createdAt
      }
    });

  } catch (error) {
    console.error('Create ticket error:', error);
    // Fallback to mock on connection error
    if (MOCK || String(error).toLowerCase().includes('ecconnrefused')) {
      const id = new ObjectId().toString();
      return NextResponse.json({
        success: true,
        ticketId: id,
        message: 'Ticket created (mock) due to DB unavailability',
        ticket: { id, title: 'Mock Ticket', status: 'new', priority: 'medium', createdAt: new Date() }
      });
    }
    return NextResponse.json({
      success: false,
      error: 'Failed to create ticket'
    }, { status: 500 });
  }
}

function getPriorityScore(priority: string): number {
  const scores: Record<string, number> = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'urgent': 4
  };
  return scores[priority] || 2;
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();

  // Extract common keywords as tags
  if (lowerText.includes('ac') || lowerText.includes('air') || lowerText.includes('conditioning')) {
    tags.push('HVAC');
  }
  if (lowerText.includes('electric') || lowerText.includes('power') || lowerText.includes('lighting')) {
    tags.push('Electrical');
  }
  if (lowerText.includes('plumb') || lowerText.includes('water') || lowerText.includes('leak')) {
    tags.push('Plumbing');
  }
  if (lowerText.includes('paint') || lowerText.includes('wall') || lowerText.includes('ceiling')) {
    tags.push('Painting');
  }
  if (lowerText.includes('clean') || lowerText.includes('sanitiz')) {
    tags.push('Cleaning');
  }
  if (lowerText.includes('security') || lowerText.includes('lock') || lowerText.includes('door')) {
    tags.push('Security');
  }

  return tags.length > 0 ? tags : ['General'];
}
