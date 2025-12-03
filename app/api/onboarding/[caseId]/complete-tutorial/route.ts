import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';

export async function PUT(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectMongo();
    // Defense-in-depth: Query scoped to user's org from the start
    const onboarding = await OnboardingCase.findOne({
      _id: params.caseId,
      $or: [
        { subject_user_id: user.id },
        { created_by_id: user.id },
        ...(user.orgId ? [{ orgId: user.orgId }] : []),
      ],
    });
    if (!onboarding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    onboarding.tutorial_completed = true;
    onboarding.current_step = Math.max(onboarding.current_step, 4);
    await onboarding.save();

    return NextResponse.json({ status: 'complete' }, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to complete tutorial', { error });
    return NextResponse.json({ error: 'Failed to complete tutorial' }, { status: 500 });
  }
}
