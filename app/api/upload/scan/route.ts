import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { createSecureResponse } from '@/server/security/headers';
import { scanS3Object } from '@/lib/security/av-scan';
import { validateBucketPolicies } from '@/lib/security/s3-policy';
import { Config } from '@/lib/config/constants';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return createSecureResponse({ error: 'Unauthorized' }, 401, req);

    const { key } = await req.json().catch(() => ({}));
    if (!key || typeof key !== 'string') {
      return createSecureResponse({ error: 'Missing key' }, 400, req);
    }

    if (!Config.aws.s3.bucket || !Config.aws.scan.endpoint) {
      return createSecureResponse({ error: 'Scan not configured' }, 503, req);
    }

    const policiesOk = await validateBucketPolicies();
    if (!policiesOk) {
      return createSecureResponse({ error: 'Bucket policy/encryption invalid' }, 503, req);
    }

    const clean = await scanS3Object(key, Config.aws.s3.bucket);
    if (!clean) {
      return createSecureResponse({ success: false, clean: false, error: 'Scan failed or malware detected' }, 400, req);
    }

    return NextResponse.json({ success: true, clean: true });
  } catch (err) {
    logger.error('[Upload Scan] Error', err);
    return createSecureResponse({ error: 'Scan error' }, 500, req);
  }
}
