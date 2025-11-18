import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Organization } from '@/server/models/Organization';
import { logger } from '@/lib/logger';

function sanitize(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_IDENTIFIER_LEN = 256;

const serialize = (org: {
  orgId: string;
  name: string;
  code?: string;
  legal?: { registrationNumber?: string };
  subscription?: { plan?: string };
}) => ({
  orgId: org.orgId,
  name: org.name,
  code: org.code ?? null,
  registrationNumber: org.legal?.registrationNumber ?? null,
  subscriptionPlan: org.subscription?.plan ?? null,
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawIdentifier = searchParams.get('identifier') || searchParams.get('corporateId') || '';
  const identifier = rawIdentifier.trim();

  if (!identifier) {
    return NextResponse.json({ error: 'identifier query param is required' }, { status: 400 });
  }

  if (identifier.length > MAX_IDENTIFIER_LEN) {
    return NextResponse.json({ error: 'identifier too long' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const regex = new RegExp(sanitize(identifier), 'i');
    const records = await Organization.find({
      $or: [
        { orgId: identifier },
        { code: regex },
        { name: regex },
        { 'legal.registrationNumber': identifier },
      ],
    })
      .select('orgId name code legal.registrationNumber subscription.plan')
      .limit(10)
      .lean();

    return NextResponse.json({ results: records.map(serialize) });
  } catch (error) {
    logger.error('Failed to search organizations', { error, identifier });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
