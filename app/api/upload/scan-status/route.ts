import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { createSecureResponse } from '@/server/security/headers';
import { validateBucketPolicies } from '@/lib/security/s3-policy';
import { scanS3Object } from '@/lib/security/av-scan';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);

    if (!process.env.AWS_S3_BUCKET || !process.env.AV_SCAN_ENDPOINT) {
      return createSecureResponse({ error: 'Scan not configured' }, 503, req);
    }

    const { key } = await req.json().catch(() => ({}));
    if (!key || typeof key !== 'string') {
      return createSecureResponse({ error: 'Missing key' }, 400, req);
    }

    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return createSecureResponse({ error: 'Bucket policy/encryption invalid' }, 503, req);
    }

    const clean = await scanS3Object(key, process.env.AWS_S3_BUCKET);
    return NextResponse.json({ success: true, clean });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Upload Scan Status] Error', err);
    }
    return createSecureResponse({ error: 'Scan status error' }, 500, req);
  }
}
