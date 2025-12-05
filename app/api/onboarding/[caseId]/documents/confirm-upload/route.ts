import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';
import { DocumentProfile } from '@/server/models/onboarding/DocumentProfile';
import { enqueueOnboardingOcr } from '@/jobs/onboarding-queue';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    document_type_code?: string;
    file_storage_key?: string;
    original_name?: string;
    mime_type?: string;
    size_bytes?: number;
  };

  const { document_type_code, file_storage_key, original_name, mime_type, size_bytes } = body;

  if (!document_type_code || !file_storage_key || !original_name) {
    return NextResponse.json({ error: 'document_type_code, file_storage_key, and original_name are required' }, { status: 400 });
  }

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

    const profileCountry = onboarding.country || 'SA';
    const profile = await DocumentProfile.findOne({ role: onboarding.role, country: profileCountry }).lean();
    if (!profile || !profile.required_doc_codes.includes(document_type_code)) {
      return NextResponse.json({ error: 'Document type not required for this role' }, { status: 400 });
    }

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
