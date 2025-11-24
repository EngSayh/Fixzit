import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { VerificationDocument, DOCUMENT_STATUSES } from '@/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/models/onboarding/VerificationLog';
import { OnboardingCase } from '@/models/onboarding/OnboardingCase';
import { DocumentProfile } from '@/models/onboarding/DocumentProfile';
import { createEntitiesFromCase } from '@/server/services/onboardingEntities';
import { logger } from '@/lib/logger';

const ALLOWED_DECISIONS: Array<(typeof DOCUMENT_STATUSES)[number]> = ['VERIFIED', 'REJECTED'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { decision?: string; rejection_reason?: string };
  const { decision, rejection_reason } = body;
  if (!decision || !ALLOWED_DECISIONS.includes(decision as (typeof DOCUMENT_STATUSES)[number])) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  try {
    await connectMongo();
    const doc = await VerificationDocument.findById(params.id);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const onboarding = await OnboardingCase.findById(doc.onboarding_case_id);
    if (!onboarding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (
      onboarding.subject_user_id?.toString() !== user.id &&
      onboarding.created_by_id?.toString() !== user.id &&
      onboarding.org_id?.toString() !== user.orgId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const previousStatus = doc.status;
    doc.status = decision as (typeof DOCUMENT_STATUSES)[number];
    doc.rejection_reason = rejection_reason;
    doc.verified_by_id = new Types.ObjectId(user.id);
    await doc.save();

    await VerificationLog.create({
      document_id: doc._id,
      action: 'STATUS_CHANGE',
      performed_by_id: user.id,
      details: { from: previousStatus, to: decision, rejection_reason },
    });

    if (decision === 'VERIFIED') {
      const [profile, docs] = await Promise.all([
        DocumentProfile.findOne({ role: onboarding.role, country: 'SA' }).lean(),
        VerificationDocument.find({ onboarding_case_id: onboarding._id }).lean(),
      ]);

      // Guard against auto-approval with missing profile/required_doc_codes
      if (!profile || !profile.required_doc_codes?.length) {
        logger.error('[Onboarding] Missing or empty DocumentProfile; skipping auto-approval', {
          onboardingId: onboarding._id,
          role: onboarding.role,
        });
      } else {
        const requiredCodes = profile.required_doc_codes;
        const allRequiredVerified = requiredCodes.every((code) =>
          docs.some((d) => d.document_type_code === code && d.status === 'VERIFIED'),
        );

        if (allRequiredVerified) {
          onboarding.status = 'APPROVED';
          onboarding.verified_by_id = new Types.ObjectId(user.id);
          onboarding.current_step = Math.max(onboarding.current_step, 3);
          await onboarding.save();
          await createEntitiesFromCase(onboarding);
        }
      }
    }

    return NextResponse.json({ status: doc.status }, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to review document', { error });
    return NextResponse.json({ error: 'Failed to review document' }, { status: 500 });
  }
}
