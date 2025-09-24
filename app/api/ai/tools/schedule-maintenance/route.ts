// app/api/ai/tools/schedule-maintenance/route.ts - Schedule preventive/routine maintenance
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { ObjectId } from 'mongodb';
import { getDatabase } from 'lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

/**
 * POST handler that schedules a preventive maintenance plan for a property.
 *
 * Validates the authenticated user's role, required input fields, constructs a maintenance
 * plan document, inserts it into the `maintenance_plans` collection, and returns a JSON
 * response indicating success or failure.
 *
 * Returns JSON responses with status codes:
 * - 200: successfully scheduled (response contains `data.id` and `message`).
 * - 400: missing required fields (`propertyId`, `type`, or `frequency`).
 * - 401: unauthenticated request.
 * - 403: authenticated user does not have an allowed role (allowed: TECHNICIAN, MANAGEMENT, CORP_ADMIN, SUPER_ADMIN).
 * - 500: server/database error while scheduling.
 *
 * Side effects:
 * - Inserts a document into the `maintenance_plans` MongoDB collection.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const allowed = ['TECHNICIAN', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'];
    if (!allowed.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { propertyId, type, frequency, startDate } = await req.json();
    if (!propertyId || !type || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();

    const plan = {
      propertyId,
      orgId: user.orgId,
      type,
      frequency,
      startDate: startDate ? new Date(startDate) : new Date(),
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'scheduled',
      source: 'ai_assistant'
    };

    const result = await db.collection('maintenance_plans').insertOne(plan as any);
    return NextResponse.json({ success: true, data: { id: result.insertedId.toString(), message: 'Scheduled' } });
  } catch (e) {
    console.error('Schedule maintenance error:', e);
    return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 });
  }
}


