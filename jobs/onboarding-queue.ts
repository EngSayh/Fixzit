import { Queue } from '@/lib/queue';
import { Types } from 'mongoose';
import { logger } from '@/lib/logger';

const OCR_QUEUE_NAME = process.env.OCR_QUEUE_NAME || 'onboarding-ocr';
const EXPIRY_QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';


function buildQueue(name: string): Queue {
  return new Queue(name, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 500 },
      removeOnFail: { age: 604_800, count: 500 },
    },
  });
}

const ocrQueue = buildQueue(OCR_QUEUE_NAME);
const expiryQueue = buildQueue(EXPIRY_QUEUE_NAME);

type OcrJob = { docId: string; onboardingCaseId: string };

/**
 * ExpiryJob payload type
 * - orgId: Required for tenant-scoped processing (multi-tenant isolation)
 * - onboardingCaseId: Optional for case-specific processing
 */
type ExpiryJob = {
  orgId: string;
  onboardingCaseId?: string;
};

export async function enqueueOnboardingOcr(data: OcrJob): Promise<string | null> {
  if (!ocrQueue) return null;
  try {
    const job = await ocrQueue.add('ocr', data, { jobId: `ocr-${data.docId}` });
    return job.id ? String(job.id) : null;
  } catch (error) {
    logger.error('[OnboardingQueue] Failed to enqueue OCR job', { error });
    return null;
  }
}

export async function enqueueOnboardingExpiry(data: ExpiryJob): Promise<string | null> {
  // Validate required orgId to fail fast - worker requires it for tenant isolation
  if (!data.orgId || typeof data.orgId !== 'string' || data.orgId.trim() === '') {
    logger.error('[OnboardingQueue] Missing or invalid orgId for expiry job - cannot enqueue without tenant scope', {
      providedOrgId: data.orgId,
      onboardingCaseId: data.onboardingCaseId,
    });
    return null;
  }

  // Validate orgId is a valid ObjectId to prevent worker crashes
  const trimmedOrgId = data.orgId.trim();
  if (!Types.ObjectId.isValid(trimmedOrgId)) {
    logger.error('[OnboardingQueue] Invalid ObjectId format for orgId - cannot enqueue malformed job', {
      providedOrgId: data.orgId,
      onboardingCaseId: data.onboardingCaseId,
    });
    return null;
  }

  if (!expiryQueue) return null;
  try {
    // Use trimmed orgId to ensure consistency
    const job = await expiryQueue.add('expiry-check', { ...data, orgId: trimmedOrgId });
    return job.id ? String(job.id) : null;
  } catch (error) {
    logger.error('[OnboardingQueue] Failed to enqueue expiry job', { error });
    return null;
  }
}

