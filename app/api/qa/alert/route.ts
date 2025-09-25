import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';

/**
 * Receive a QA alert payload, persist it to the `qa_alerts` MongoDB collection, and respond with success.
 *
 * Expects a JSON body containing `event` and `data`. Inserts a document with `event`, `data`, `timestamp`, `ip`,
 * and `userAgent` into the `qa_alerts` collection and emits a console warning with the event and data.
 *
 * On success returns a JSON response `{ success: true }`. On failure returns a JSON error `{ error: 'Failed to process alert' }`
 * with HTTP status 500.
 *
 * Note: The function reads request headers (`x-forwarded-for`, `user-agent`) for IP and user agent values.
 *
 * @returns A NextResponse with `{ success: true }` on success, or an error JSON and status 500 on failure.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the alert to database
    const connection = await db();
    const nativeDb = (connection as any).connection?.db || (connection as any).db;
    await nativeDb.collection('qa_alerts').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    });

    console.warn(`🚨 QA Alert: ${event}`, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process QA alert:', error);
    return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
  }
}

/**
 * Retrieve up to 50 most recent QA alerts.
 *
 * Queries the `qa_alerts` collection and returns alerts sorted by `timestamp` descending (newest first).
 *
 * @returns A JSON NextResponse containing `{ alerts: Alert[] }` on success, or `{ error: 'Failed to fetch alerts' }` with HTTP status 500 on failure.
 */
export async function GET(req: NextRequest) {
  try {
    const conn = await db();
    const native = (conn as any).connection?.db || (conn as any).db;
    const alerts = await native.collection('qa_alerts')
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Failed to fetch QA alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
