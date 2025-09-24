import { NextRequest, NextResponse } from 'next/server';
import { db, isMockDB } from '@/src/lib/mongo';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

/**
 * Log a QA event (mock or real) and return a JSON response indicating success or failure.
 *
 * When running in mock mode, the event and data are written to the console and the response is
 * { success: true, mock: true }. In real mode the function ensures a native MongoDB connection,
 * attempts to create a 30-day TTL index on qa_logs.timestamp (errors ignored), and inserts a log
 * document into the qa_logs collection with minimal PII:
 * - event, data
 * - timestamp: current date
 * - ip: first value from the `x-forwarded-for` header or 'unknown'
 * - userAgent: truncated to 128 characters
 * - sessionId: truncated to 64 characters (or 'unknown')
 *
 * On success returns { success: true }. On failure returns a 500 JSON response { error: 'Failed to log event' }.
 *
 * @returns A NextResponse containing the JSON result ({ success: true } or an error payload).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the event to console for mock database
    if (isMockDB) {
      console.log(`📝 QA Log (Mock): ${event}`, data);
      return NextResponse.json({ success: true, mock: true });
    }

    // Ensure native database connection
    const conn: any = await (db as any);
    const nativeDb = conn?.connection?.db || conn?.db;
    if (!nativeDb) {
      throw new Error('Database not available');
    }

    // Ensure TTL index (30 days) on timestamp
    try {
      await nativeDb.collection('qa_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
    } catch {}

    // Log the event to database for real database, with minimal PII
    await nativeDb.collection('qa_logs').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || 'unknown',
      userAgent: (req.headers.get('user-agent') || '').slice(0, 128),
      sessionId: (req.cookies.get('sessionId')?.value || 'unknown').slice(0, 64)
    });

    console.log(`📝 QA Log: ${event}`, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log QA event:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

/**
 * Retrieve QA logs (admin-only).
 *
 * Checks the session user and allows access only to users with role SUPER_ADMIN, ADMIN, or CORPORATE_ADMIN.
 * Supports optional query parameters:
 * - `limit` (number, default 100, max 1000) to cap returned records.
 * - `event` (string) to filter logs by event type.
 *
 * In mock mode returns an empty logs array with `{ mock: true }`. In real mode queries the `qa_logs`
 * collection (sorted by timestamp descending) and returns `{ logs }`. On authentication failure returns
 * 401, on insufficient role returns 403, and on other errors returns 500 with an error payload.
 *
 * @returns A NextResponse with a JSON payload containing either `{ logs }`, `{ logs: [], mock: true }`,
 *          or an `{ error }` object and the appropriate HTTP status code.
 */
export async function GET(req: NextRequest) {
  try {
    // Admin-only access
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);
    if (!adminRoles.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const eventType = searchParams.get('event');

    // Return empty array for mock database
    if (isMockDB) {
      return NextResponse.json({ logs: [], mock: true });
    }

    let query = {};
    if (eventType) {
      query = { event: eventType };
    }

    const conn: any = await (db as any);
    const nativeDb = conn?.connection?.db || conn?.db;
    if (!nativeDb) {
      throw new Error('Database not available');
    }

    const logs = await nativeDb.collection('qa_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch QA logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
