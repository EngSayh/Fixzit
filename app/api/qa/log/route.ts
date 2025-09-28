import { NextRequest, NextResponse } from 'next/server';
import { db, isMockDB, getNativeDb } from '@/src/lib/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the event to console for mock database
    if (isMockDB) {
      console.log(`📝 QA Log (Mock): ${event}`, data);
      return NextResponse.json({ success: true, mock: true });
    }

    // Log the event to database for real database
    const native = await getNativeDb();
    await native.collection('qa_logs').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
      sessionId: req.cookies.get('sessionId')?.value || 'unknown'
    });

    console.log(`📝 QA Log: ${event}`, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log QA event:', error);
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Number(searchParams.get('limit'));
    const limit = Math.min(Number.isFinite(parsed) && parsed > 0 ? parsed : 100, 1000);
    const eventType = searchParams.get('event');

    // Return empty array for mock database
    if (isMockDB) {
      return NextResponse.json({ logs: [], mock: true });
    }

    let query = {} as any;
    if (eventType) {
      query = { event: eventType };
    }

    const native = await getNativeDb();
    const logs = await native.collection('qa_logs')
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
