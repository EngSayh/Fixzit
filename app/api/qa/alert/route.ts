import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-unified';
import { getSessionUser } from '@/lib/auth-utils';
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

    // Log the alert to database with tenant isolation
    const native = await getDatabase();
    await native.collection('qa_alerts').insertOne({
      tenantId: user.orgId,
      userId: user.id,
      event,
      data,
      timestamp: new Date(),
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    console.warn(`�� QA Alert [${user.orgId}]: ${event}`, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process QA alert:', error);
    return NextResponse.json(
      { error: 'Failed to process alert', correlationId: crypto.randomUUID() },
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

    const native = await getDatabase();
    const alerts = await native.collection('qa_alerts')
      .find({ tenantId: user.orgId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Failed to fetch QA alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', correlationId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
