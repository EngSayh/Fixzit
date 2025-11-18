import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Organization } from '@/server/models/Organization';
import { logger } from '@/lib/logger';

const COOKIE_NAME = 'support_org_id';

function serializeOrganization(org: {
  orgId: string;
  name: string;
  code?: string;
  legal?: { registrationNumber?: string };
  subscription?: { plan?: string };
}) {
  return {
    orgId: org.orgId,
    name: org.name,
    code: org.code ?? null,
    registrationNumber: org.legal?.registrationNumber ?? null,
    subscriptionPlan: org.subscription?.plan ?? null,
  };
}

async function ensureSuperAdmin() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = await ensureSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cookieOrgId = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieOrgId) {
    return NextResponse.json({ organization: null });
  }

  await connectToDatabase();
  const org = await Organization.findOne({ orgId: cookieOrgId })
    .select('orgId name code legal.registrationNumber subscription.plan')
    .lean();

  if (!org) {
    const res = NextResponse.json({ organization: null });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ organization: serializeOrganization(org) });
}

export async function POST(req: NextRequest) {
  const session = await ensureSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { orgId?: string; corporateId?: string; identifier?: string } = {};
  try {
    body = await req.json();
  } catch (error) {
    logger.warn('[support/impersonation] Failed to parse body', { error });
  }

  const identifier = body.orgId || body.corporateId || body.identifier;
  if (!identifier) {
    return NextResponse.json({ error: 'orgId or corporateId is required' }, { status: 400 });
  }

  await connectToDatabase();

  const org = await Organization.findOne({
    $or: [
      { orgId: identifier },
      { code: identifier },
      { 'legal.registrationNumber': identifier },
    ],
  })
    .select('orgId name code legal.registrationNumber subscription.plan')
    .lean();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const res = NextResponse.json({ organization: serializeOrganization(org) });
  res.cookies.set({
    name: COOKIE_NAME,
    value: org.orgId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}

export async function DELETE() {
  const session = await ensureSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return res;
}
