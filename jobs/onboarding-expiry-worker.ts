import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { connectMongo } from '@/lib/mongo';
import { logger } from '@/lib/logger';
import { VerificationDocument } from '@/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/models/onboarding/VerificationLog';

type ExpiryJob = { onboardingCaseId: string };

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

const QUEUE_NAME = process.env.EXPIRY_QUEUE_NAME || 'onboarding-expiry';

function buildWorker(): Worker<ExpiryJob> | null {
  if (!connection) {
    logger.warn('[OnboardingExpiry] Redis not configured; worker disabled');
    return null;
  }

  return new Worker<ExpiryJob>(
    QUEUE_NAME,
    async (_job: Job<ExpiryJob>) => {
      await connectMongo();
      const now = new Date();
      const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringDocs = await VerificationDocument.find({
        status: 'VERIFIED',
        expiry_date: { $lte: threshold },
      });

      for (const doc of expiringDocs) {
        doc.status = 'EXPIRED';
        await doc.save();
        await VerificationLog.create({
          document_id: doc._id,
          action: 'STATUS_CHANGE',
          performed_by_id: undefined,
          details: { to: 'EXPIRED', reason: 'Auto-expired by worker' },
        });
      }

      logger.info('[OnboardingExpiry] Processed expiring documents', { count: expiringDocs.length });
    },
    { connection },
  );
}

export function startOnboardingExpiryWorker(): Worker<ExpiryJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startOnboardingExpiryWorker();
  if (worker) {
    logger.info('[OnboardingExpiry] Worker started', { queue: QUEUE_NAME });
  } else {
    // eslint-disable-next-line no-console
    console.error('[OnboardingExpiry] Worker not started; Redis missing');
    process.exit(1);
  }
}
