/**
 * @description Confirms document upload completion and enqueues OCR processing.
 * Records the uploaded document metadata (S3 key, type, size) and creates
 * a VerificationDocument entry. Triggers background OCR analysis for identity
 * documents like national IDs and commercial registrations.
 * @route POST /api/onboarding/[caseId]/documents/confirm-upload
 * @access Private - Case owner only
 * @param {string} caseId - The unique identifier of the onboarding case
 * @param {Object} body.document_type_code - Type code (e.g., 'NATIONAL_ID', 'CR')
 * @param {Object} body.file_storage_key - S3 key where the document is stored
 * @param {Object} body.original_name - Original filename
 * @param {Object} body.mime_type - MIME type of the uploaded file
 * @param {Object} body.size_bytes - File size in bytes
 * @returns {Object} success: true, document: created VerificationDocument
 * @throws {401} If user is not authenticated
 * @throws {400} If required fields are missing
 * @throws {404} If onboarding case is not found
 */
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { parseBodySafe } from '@/lib/api/parse-body';
import { connectMongo } from '@/lib/mongo';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';
import { DocumentProfile } from '@/server/models/onboarding/DocumentProfile';
import { enqueueOnboardingOcr } from '@/jobs/onboarding-queue';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 20, windowMs: 60_000, keyPrefix: "onboarding:docs:confirm" });
  if (rateLimitResponse) return rateLimitResponse;

  const sessionResult = await getSessionOrNull(req, { route: "onboarding:docs:confirm-upload" });
  if (!sessionResult.ok) {
    return sessionResult.response; // 503 on infra error
  }
  const user = sessionResult.session;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: body, error: parseError } = await parseBodySafe<{
    document_type_code?: string;
    file_storage_key?: string;
    original_name?: string;
    mime_type?: string;
    size_bytes?: number;
  }>(req, { logPrefix: '[onboarding:docs:confirm-upload]' });
  if (parseError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { document_type_code, file_storage_key, original_name, mime_type, size_bytes } = body ?? {};

  if (!document_type_code || !file_storage_key || !original_name) {
    return NextResponse.json({ error: 'document_type_code, file_storage_key, and original_name are required' }, { status: 400 });
  }

  try {
    await connectMongo();
    // Defense-in-depth: Query scoped to user's org from the start
    // NO_LEAN: Document needed for status update and .save()
    // eslint-disable-next-line local/require-tenant-scope -- FALSE POSITIVE: Scoped by user id/orgId in $or
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

    const profileCountry = onboarding.country || 'SA';
    // PLATFORM-WIDE: DocumentProfile is global config by role/country
    const profile = await DocumentProfile.findOne({ role: onboarding.role, country: profileCountry }).lean();
    if (!profile || !profile.required_doc_codes.includes(document_type_code)) {
      return NextResponse.json({ error: 'Document type not required for this role' }, { status: 400 });
    }

    // PLATFORM-WIDE: VerificationDocument created with onboarding_case_id reference
    const doc = await VerificationDocument.create({
      onboarding_case_id: onboarding._id,
      document_type_code,
      file_storage_key,
      original_name,
      mime_type,
      size_bytes,
      status: 'PROCESSING',
      uploaded_by_id: new Types.ObjectId(user.id),
    });

    await VerificationLog.create({
      document_id: doc._id,
      action: 'UPLOADED',
      performed_by_id: user.id,
      details: { document_type_code, file_storage_key },
    });

    onboarding.status = 'UNDER_REVIEW';
    if (!onboarding.documents) onboarding.documents = [];
    onboarding.documents.push(doc._id);
    await onboarding.save();

    await enqueueOnboardingOcr({ docId: doc._id.toString(), onboardingCaseId: onboarding._id.toString() });

    return NextResponse.json({ docId: doc._id, status: doc.status }, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to confirm upload', error as Error);
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 });
  }
}
