/**
 * @description Marks the onboarding tutorial as completed for a specific case.
 * Updates the tutorial_completed flag and records the completion timestamp.
 * Only the case owner or authorized reviewers can mark the tutorial complete.
 * @route PUT /api/onboarding/[caseId]/complete-tutorial
 * @access Private - Case owner or authorized reviewers
 * @param {string} caseId - The unique identifier of the onboarding case
 * @returns {Object} success: true, case: updated case with tutorial_completed=true
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not authorized to update this case
 * @throws {404} If onboarding case is not found
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function PUT(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "onboarding:tutorial:complete" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:complete-tutorial" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectMongo();
    // Defense-in-depth: Query scoped to user's org from the start
    // NO_LEAN: Document required for tutorial_completed update and save()
    const onboarding = await (/* NO_TENANT_SCOPE */ OnboardingCase.findOne({
      _id: params.caseId,
      $or: [
        { subject_user_id: user.id },
        { created_by_id: user.id },
        ...(user.orgId ? [{ orgId: user.orgId }] : []),
      ],
    }));
    if (!onboarding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    onboarding.tutorial_completed = true;
    onboarding.current_step = Math.max(onboarding.current_step, 4);
    await onboarding.save();

    return NextResponse.json({ status: 'complete' }, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to complete tutorial', error as Error);
    return NextResponse.json({ error: 'Failed to complete tutorial' }, { status: 500 });
  }
}
