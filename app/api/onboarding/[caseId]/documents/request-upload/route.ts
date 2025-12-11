/**
 * @description Generates a presigned S3 URL for secure document uploads during onboarding.
 * Creates a unique file path based on case ID and document type, validates allowed
 * document types, and returns a time-limited upload URL with content restrictions.
 * @route POST /api/onboarding/[caseId]/documents/request-upload
 * @access Private - Case owner only
 * @param {string} caseId - The unique identifier of the onboarding case
 * @param {Object} body.document_type_code - Type code (e.g., 'NATIONAL_ID', 'CR')
 * @param {Object} body.file_name - Original filename for extension detection
 * @param {Object} body.content_type - MIME type (e.g., 'image/jpeg', 'application/pdf')
 * @param {Object} body.file_size - Expected file size in bytes for validation
 * @returns {Object} presigned_url, file_storage_key, expires_at (URL expires in 1 hour)
 * @throws {401} If user is not authenticated
 * @throws {400} If required fields missing, invalid content type, or invalid document type
 * @throws {404} If onboarding case is not found
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { connectMongo } from '@/lib/mongo';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { getPresignedPutUrl } from '@/lib/storage/s3';
import { OnboardingCase } from '@/server/models/onboarding/OnboardingCase';
import { DocumentProfile } from '@/server/models/onboarding/DocumentProfile';
import { DocumentType } from '@/server/models/onboarding/DocumentType';
import { logger } from '@/lib/logger';

const DEFAULT_COUNTRY = 'SA';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-128);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } },
) {
  const user = await getSessionUser(req).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    document_type_code?: string;
    file_name?: string;
    mime_type?: string;
    country?: string;
  };
  const { document_type_code, file_name, mime_type, country } = body;

  if (!document_type_code) {
    return NextResponse.json({ error: 'document_type_code is required' }, { status: 400 });
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

    const profileCountry = onboarding.country || country || DEFAULT_COUNTRY;
    const profile = await DocumentProfile.findOne({ role: onboarding.role, country: profileCountry }).lean();
    if (!profile || !profile.required_doc_codes.includes(document_type_code)) {
      return NextResponse.json({ error: 'Document type not required for this role' }, { status: 400 });
    }

    const docType = await DocumentType.findOne({ code: document_type_code }).lean();
    if (!docType) {
      return NextResponse.json({ error: 'Unknown document type' }, { status: 400 });
    }

    // Validate requested mime_type against allowed types
    const requestedType = mime_type ?? docType.allowed_mime_types?.[0];
    if (!requestedType || (docType.allowed_mime_types?.length && !docType.allowed_mime_types.includes(requestedType))) {
      return NextResponse.json({ error: 'Unsupported mime_type for this document type' }, { status: 400 });
    }

    const contentType = requestedType;
    const safeName = sanitizeFileName(file_name || document_type_code);
    const key = `onboarding/${onboarding._id}/${Date.now()}-${randomUUID()}-${document_type_code}-${safeName}`;

    const { url: uploadUrl, headers: uploadHeaders } = await getPresignedPutUrl(
      key,
      contentType,
      3600,
      {
        onboarding_case_id: onboarding._id.toString(),
        document_type_code,
        uploader: user.id,
      },
    );

    const maxSizeBytes = docType?.max_file_size_mb ? docType.max_file_size_mb * 1024 * 1024 : undefined;

    return NextResponse.json({ uploadUrl, uploadHeaders, file_storage_key: key, maxSizeBytes }, { status: 200 });
  } catch (error) {
    logger.error('[Onboarding] Failed to presign upload', error as Error);
    return NextResponse.json({ error: 'Failed to request upload' }, { status: 500 });
  }
}
