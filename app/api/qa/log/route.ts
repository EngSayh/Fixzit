import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/lib/auth-middleware';
import * as crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Tenant context required', correlationId: crypto.randomUUID() },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { event, data } = body;

    // Log the event to database with tenant isolation
    const native = await getDatabase();
    await native.collection('qa_logs').insertOne({
      tenantId: user.orgId,
      userId: user.id,
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      sessionId: req.cookies.get('sessionId')?.value || 'unknown'
    });

    console.log(`📝 QA Log [${user.orgId}]: ${event}`, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log QA event:', error);
    return NextResponse.json(
      { error: 'Failed to log event', correlationId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Tenant context required', correlationId: crypto.randomUUID() },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = Number(searchParams.get('limit'));
    const limit = Math.min(Number.isFinite(parsed) && parsed > 0 ? parsed : 100, 1000);
    const eventType = searchParams.get('event');

    // Query database with tenant isolation
    const query: Record<string, any> = { tenantId: user.orgId };
    if (eventType) {
      query.event = eventType;
    }

    const native = await getDatabase();
    const logs = await native.collection('qa_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch QA logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', correlationId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
