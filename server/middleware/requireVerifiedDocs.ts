import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { OnboardingCase } from '@/models/onboarding/OnboardingCase';
import { resolveEscalationContact } from '@/server/services/escalation.service';
import type { SessionUser } from './withAuthRbac';

type RequiredRole = 'TENANT' | 'VENDOR';

export async function ensureVerifiedDocs(
  user: SessionUser,
  requiredRole: RequiredRole,
  path?: string,
) {
  await connectMongo();
  const caseRecord = await OnboardingCase.findOne({
    subject_user_id: new Types.ObjectId(user.id),
    role: requiredRole,
    status: 'APPROVED',
  }).populate('documents');

  const notVerified =
    !caseRecord ||
    (caseRecord.documents as Array<{ status?: string }> | undefined)?.some(
      (doc) => doc.status !== 'VERIFIED',
    );

  if (notVerified) {
    const escalation = await resolveEscalationContact(user);
    return {
      error: NextResponse.json(
        {
          error: 'Verification pending. Please complete onboarding.',
          escalate_to: escalation,
        },
        { status: 403 },
      ),
    };
  }

  return {};
}
