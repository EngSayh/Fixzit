import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase, ONBOARDING_STATUSES, ONBOARDING_ROLES } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = user.orgId;
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const limitParam = Number(searchParams.get('limit') || 25);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

  const privilegedRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER']);
  const isPrivileged =
    privilegedRoles.has(user.role) || user.roles?.some((r) => privilegedRoles.has(r.toUpperCase?.() || r));

  const filter: Record<string, unknown> = {};
  // AUDIT-2025-11-29: Changed from org_id to orgId for consistency
  if (orgId) filter.orgId = orgId;
  if (status && ONBOARDING_STATUSES.includes(status as (typeof ONBOARDING_STATUSES)[number])) {
    filter.status = status;
  }
  if (role && ONBOARDING_ROLES.includes(role as (typeof ONBOARDING_ROLES)[number])) {
    filter.role = role;
  }
  if (!isPrivileged) {
    // Non-privileged users can only see their own cases
    filter.$or = [
      { subject_user_id: user.id },
      { created_by_id: user.id },
    ];
  }

  try {
    await connectMongo();
    if (orgId) {
      setTenantContext({ orgId });
    }
    const cases = await OnboardingCase.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(cases, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to list cases', { error });
    return NextResponse.json({ error: 'Failed to load onboarding queue' }, { status: 500 });
  } finally {
    clearTenantContext();
  }
}
