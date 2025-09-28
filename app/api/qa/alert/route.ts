import { NextRequest, NextResponse } from 'next/server';
import { db, isMockDB, getNativeDb } from '@/src/lib/mongo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the alert to console for mock database
    if (isMockDB) {
      console.warn(`🚨 QA Alert (Mock): ${event}`, data);
      return NextResponse.json({ success: true, mock: true });
    }

    // Log the alert to database for real database
    const native = await getNativeDb();
    await native.collection('qa_alerts').insertOne({
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

export async function GET(req: NextRequest) {
  try {
    // Return empty array for mock database
    if (isMockDB) {
      return NextResponse.json({ alerts: [], mock: true });
    }

    const native = await getNativeDb();
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
