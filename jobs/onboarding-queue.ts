import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@/lib/logger';

const OCR_QUEUE_NAME = process.env.OCR_QUEUE_NAME || 'onboarding-ocr';
const EXPIRY_QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';

// Resolution order: BULLMQ_REDIS_URL → REDIS_URL → REDIS_KEY (Vercel/GitHub naming)
const redisUrl = process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_KEY;
const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : null;

function buildQueue(name: string): Queue | null {
  if (!connection) {
    logger.warn(`[OnboardingQueue] Redis not configured, queue "${name}" disabled`);
    return null;
  }
  return new Queue(name, {
    connection,
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
  if (!expiryQueue) return null;
  try {
    const job = await expiryQueue.add('expiry-check', data);
    return job.id ? String(job.id) : null;
  } catch (error) {
    logger.error('[OnboardingQueue] Failed to enqueue expiry job', { error });
    return null;
  }
}
