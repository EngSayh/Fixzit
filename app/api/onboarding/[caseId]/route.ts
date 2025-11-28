import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase, type OnboardingStatus } from '@/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { setTenantContext } from '@/server/plugins/tenantIsolation';

const ALLOWED_STATUS_UPDATES: OnboardingStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'DOCS_PENDING'];
const REVIEWER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER']);

export async function GET(
  _req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const user = await getSessionUser(_req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectMongo();
  if (user.orgId) {
    setTenantContext({ orgId: user.orgId });
  }

  const onboarding = await OnboardingCase.findById(params.caseId).lean();
  if (!onboarding || (onboarding.subject_user_id?.toString() !== user.id && onboarding.created_by_id?.toString() !== user.id && onboarding.org_id?.toString() !== user.orgId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(onboarding, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = body.payload as Record<string, unknown> | undefined;
  const basic_info = body.basic_info as Record<string, unknown> | undefined;
  const status = body.status as OnboardingStatus | undefined;
  const current_step = typeof body.current_step === 'number' ? body.current_step : undefined;

  try {
    await connectMongo();
    if (user.orgId) {
      setTenantContext({ orgId: user.orgId });
    }
    const onboarding = await OnboardingCase.findById(params.caseId);
    if (!onboarding || (onboarding.subject_user_id?.toString() !== user.id && onboarding.created_by_id?.toString() !== user.id && onboarding.org_id?.toString() !== user.orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isReviewer =
      REVIEWER_ROLES.has(user.role) || user.roles?.some((r) => REVIEWER_ROLES.has(r.toUpperCase?.() || r));
    const isSubmitter =
      onboarding.subject_user_id?.toString() === user.id || onboarding.created_by_id?.toString() === user.id;

    if (payload) onboarding.payload = payload;
    if (basic_info) onboarding.basic_info = { ...onboarding.basic_info, ...basic_info };
    if (current_step) {
      const step = Math.max(onboarding.current_step || 1, current_step);
      onboarding.current_step = Math.min(step, 4);
    }

    if (status) {
      if (!ALLOWED_STATUS_UPDATES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
      }
      // Submitters can only move to SUBMITTED; reviewers control other statuses
      if (status === 'SUBMITTED' && isSubmitter) {
        onboarding.status = status;
      } else if (isReviewer) {
        onboarding.status = status;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await onboarding.save();
    return NextResponse.json({ id: onboarding._id, status: onboarding.status, current_step: onboarding.current_step });
  } catch (error) {
    logger.error('[Onboarding] Failed to update case', { error });
    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 });
  }
}
