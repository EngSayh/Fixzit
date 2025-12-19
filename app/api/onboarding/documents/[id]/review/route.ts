/**
 * @description Reviews and approves/rejects onboarding documents submitted by users.
 * Only authorized reviewers can perform document verification. On full approval,
 * triggers entity creation (Organization, User) from the onboarding case data.
 * Records review decision in VerificationLog for audit trail.
 * @route PATCH /api/onboarding/documents/[id]/review
 * @access Private - Authorized reviewers (SUPER_ADMIN, ADMIN, COMPLIANCE_OFFICER, REVIEWER)
 * @param {string} id - The unique identifier of the VerificationDocument
 * @param {Object} body.decision - Review decision: 'VERIFIED' or 'REJECTED'
 * @param {Object} body.rejection_reason - Required reason when rejecting a document
 * @returns {Object} success: true, document: updated document with review status
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not an authorized reviewer
 * @throws {400} If decision is invalid or rejection_reason missing for rejections
 * @throws {404} If document is not found
 */
import { NextRequest, NextResponse } from 'next/server';
import { Types, type PipelineStage } from 'mongoose';
import { parseBodySafe } from '@/lib/api/parse-body';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { VerificationDocument, DOCUMENT_STATUSES } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { DocumentProfile } from '@/server/models/onboarding/DocumentProfile';
import { createEntitiesFromCase } from '@/server/services/onboardingEntities';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const ALLOWED_DECISIONS: Array<(typeof DOCUMENT_STATUSES)[number]> = ['VERIFIED', 'REJECTED'];
const REVIEWER_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "onboarding:docs:review" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:docs:review" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: body, error: parseError } = await parseBodySafe<{ decision?: string; rejection_reason?: string }>(req, { logPrefix: '[onboarding:docs:review]' });
  if (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { decision, rejection_reason } = body ?? {};
  if (!decision || !ALLOWED_DECISIONS.includes(decision as (typeof DOCUMENT_STATUSES)[number])) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  try {
    await connectMongo();

    // First check if user has reviewer role
    const isReviewer =
      REVIEWER_ROLES.has(user.role) || user.roles?.some((r) => REVIEWER_ROLES.has(r.toUpperCase?.() || r));
    if (!isReviewer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    // SEC-002: Scope document lookup to org via onboarding case before revealing existence
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(params.id) } },
      {
        $lookup: {
          from: OnboardingCase.collection.name,
          localField: 'onboarding_case_id',
          foreignField: '_id',
          as: 'case',
        },
      },
      { $unwind: '$case' },
    ];
    if (!user.isSuperAdmin) {
      pipeline.push({ $match: { 'case.orgId': user.orgId } });
    }

    const [docWithCase] = await VerificationDocument.aggregate(pipeline, { maxTimeMS: 5_000 });
    if (!docWithCase) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Re-fetch as a document for updates now that org scope is verified
    // NO_LEAN: Document required for status update and save()
    const doc = await VerificationDocument.findById(params.id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const onboarding = docWithCase.case;

    const isSubmitter =
      onboarding.subject_user_id?.toString() === user.id ||
      onboarding.created_by_id?.toString() === user.id;
    if (isSubmitter) {
      return NextResponse.json({ error: 'Self-approval is not allowed' }, { status: 403 });
    }

    const previousStatus = doc.status;
    doc.status = decision as (typeof DOCUMENT_STATUSES)[number];
    // rejection_reason expects i18n object { en?, ar? } or undefined
    if (rejection_reason) {
      doc.rejection_reason = { en: rejection_reason };
    } else {
      doc.rejection_reason = undefined;
    }
    doc.verified_by_id = new Types.ObjectId(user.id);
    await doc.save();

    await VerificationLog.create({
      document_id: doc._id,
      action: 'STATUS_CHANGE',
      performed_by_id: user.id,
      details: { from: previousStatus, to: decision, rejection_reason },
    });

    if (decision === 'VERIFIED') {
      const profileCountry = onboarding.country || 'SA';
      const [profile, docs] = await Promise.all([
        DocumentProfile.findOne({ role: onboarding.role, country: profileCountry }).lean(),
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
    logger.error('[Onboarding] Failed to review document', error as Error);
    return NextResponse.json({ error: 'Failed to review document' }, { status: 500 });
  }
}
