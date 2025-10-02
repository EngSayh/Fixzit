import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the alert to database
    const native = await getDatabase();
    await native.collection('qa_alerts').insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
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
    const native = await getDatabase();
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
