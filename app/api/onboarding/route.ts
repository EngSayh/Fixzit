import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase, ONBOARDING_STATUSES, ONBOARDING_ROLES } from '@/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId') || user.orgId;
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const limitParam = Number(searchParams.get('limit') || 25);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

  const filter: Record<string, unknown> = {};
  if (orgId) filter.org_id = orgId;
  if (status && ONBOARDING_STATUSES.includes(status as (typeof ONBOARDING_STATUSES)[number])) {
    filter.status = status;
  }
  if (role && ONBOARDING_ROLES.includes(role as (typeof ONBOARDING_ROLES)[number])) {
    filter.role = role;
  }

  try {
    await connectMongo();
    const cases = await OnboardingCase.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(cases, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to list cases', { error });
    return NextResponse.json({ error: 'Failed to load onboarding queue' }, { status: 500 });
  }
}
