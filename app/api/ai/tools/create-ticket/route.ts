// app/api/ai/tools/create-ticket/route.ts - Create work order ticket via AI assistant
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';
const MOCK = process.env.USE_MOCK_DB === 'true' || process.env.DISABLE_DB === 'true';

/**
 * HTTP POST handler that creates a work order ticket via the AI assistant.
 *
 * Authenticates the current user, validates incoming JSON (requires `title` and `description`),
 * and either returns a synthetic ticket when running in mock mode or persists a new `work_orders`
 * document and an `ai_actions` audit record to MongoDB. The response includes a localized
 * success message (Arabic vs English) and minimal ticket metadata.
 *
 * Behavior summary:
 * - Returns 401 if the request is unauthenticated.
 * - Returns 400 if `title` or `description` are missing.
 * - In mock mode (or when DB is unavailable), returns a synthetic ticket without DB writes.
 * - In real mode, inserts a work order with attachments, computed priority score, extracted tags,
 *   timestamps, aiCreated/aiSource flags, and logs an audit entry in `ai_actions`.
 *
 * Returns a JSON NextResponse containing:
 * - success: boolean
 * - ticketId and ticket (id, title, status, priority, createdAt) on success
 * - error message on failure
 *
 * Status codes used:
 * - 200 on success
 * - 400 for invalid input
 * - 401 for unauthenticated requests
 * - 500 for unexpected server/DB errors (unless falling back to mock)
 */
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

/**
 * Convert a textual priority label into a numeric score.
 *
 * Maps priority strings to numeric values used for sorting/scoring:
 * 'low' → 1, 'medium' → 2, 'high' → 3, 'urgent' → 4. Unknown or unrecognized
 * inputs default to the medium score (2).
 *
 * @param priority - Priority label (e.g., 'low', 'medium', 'high', 'urgent')
 * @returns Numeric priority score (1–4), defaulting to 2 for unrecognized values
 */
function getPriorityScore(priority: string): number {
  const scores: Record<string, number> = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'urgent': 4
  };
  return scores[priority] || 2;
}

/**
 * Derives work-order tags from freeform text using keyword heuristics.
 *
 * Scans the input (typically title and description) for domain keywords and
 * returns matching tags such as "HVAC", "Electrical", "Plumbing", "Painting",
 * "Cleaning", and "Security". If no keywords match, returns `['General']`.
 *
 * @param text - Input text to analyze (e.g., title and description)
 * @returns An array of tag strings (at least one element)
 */
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
